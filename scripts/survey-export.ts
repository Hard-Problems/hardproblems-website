// Export a year's survey responses as flat files for analysis in R,
// Python or a spreadsheet — for someone who has never seen this code.
//
//   npx tsx --env-file=.env.local scripts/survey-export.ts
//   npx tsx --env-file=.env.local scripts/survey-export.ts --include-test
//   npx tsx scripts/survey-export.ts --file sim.json --include-test
//
// Options:
//   --year 2026       survey year (default: the newest)
//   --out <dir>       where to write (default: survey-exports/<year>-exported-<date>,
//                     which .gitignore keeps out of the repo)
//   --include-test    keep test rows (source 'internal-preview' or
//                     'simulated'). Left out by default, so a real export
//                     never mixes them in.
//   --file <path>     read rows from a JSON file (a Supabase export or
//                     survey-simulate.ts output) instead of Supabase
//
// Writes:
//   responses.csv   one row per response, one column per answer
//   conjoint.csv    the job-choice question in long form: one row per
//                   card shown
//   codebook.csv    every column and every coded value, with labels
//   raw.json        the rows exactly as stored, for anything the CSVs miss
//   README.md       how the files fit together, and the caveats
//
// Reads Supabase with SUPABASE_URL / SUPABASE_SECRET_KEY. Read-only.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { allSurveys, getSurvey } from '../src/lib/survey';
import { PREVIEW_SOURCE } from '../src/lib/survey/preview';
import { parseRounds } from '../src/lib/survey/conjoint';
import { LIKERT_MIN } from '../src/lib/survey/types';
import type {
  ConjointQuestion,
  SurveyDefinition,
  SurveyQuestion
} from '../src/lib/survey/types';

type Row = {
  token: string;
  source: string | null;
  submitted_at: string;
  /** Missing on a database that predates the column. */
  language?: string | null;
  duration_ms?: number | null;
  answers: Record<
    string,
    { value?: unknown; otherText?: string; durationMs?: number }
  >;
};

const TEST_SOURCES = new Set([PREVIEW_SOURCE, 'simulated']);

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

async function loadRows(year: number): Promise<Row[]> {
  const file = arg('file');
  if (file) return JSON.parse(readFileSync(file, 'utf8')) as Row[];

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error(
      'Set SUPABASE_URL and SUPABASE_SECRET_KEY (run with --env-file=.env.local), or pass --file.'
    );
  }
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  // Columns added after the table was created (supabase/survey.sql). A
  // database without one still exports, with that column left blank.
  let fields = ['token', 'source', 'submitted_at', 'answers', 'language', 'duration_ms'];
  const rows: Row[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await db
      .from('survey_responses')
      .select(fields.join(', '))
      .eq('survey_year', year)
      .order('submitted_at', { ascending: true })
      .range(from, from + page - 1);
    const missing = error && ['language', 'duration_ms'].find((c) => fields.includes(c) && error.message.includes(c));
    if (missing) {
      console.warn(`No ${missing} column in the database; exporting without it (run supabase/survey.sql).`);
      fields = fields.filter((f) => f !== missing);
      from -= page;
      continue;
    }
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as unknown as Row[]));
    if (!data || data.length < page) break;
  }
  return rows;
}

// ---- CSV ----------------------------------------------------------------

type Cell = string | number | null | undefined;

// Every value quoted unless it is a plain number, so commas, quotes and
// the newlines in long answers survive. Free text cannot start with
// = + - @ (validation refuses it), so no cell runs as a formula.
function csvCell(v: Cell): string {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'number') return String(v);
  return `"${v.replace(/"/g, '""')}"`;
}

function csv(header: string[], rows: Cell[][]): string {
  return (
    [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n') + '\n'
  );
}

/** Column-safe: R and pandas both prefer underscores to hyphens. */
const col = (s: string) => s.replace(/-/g, '_');

// ---- columns ------------------------------------------------------------

type Column = {
  name: string;
  question: SurveyQuestion;
  describe: string;
  get: (row: Row) => Cell;
};

function columnsFor(survey: SurveyDefinition): Column[] {
  const cols: Column[] = [];
  for (const q of survey.questions) {
    const a = (row: Row) => row.answers?.[q.id];
    switch (q.kind) {
      case 'single':
      case 'country':
      case 'text':
      case 'textarea':
        cols.push({
          name: col(q.id),
          question: q,
          describe:
            q.kind === 'single'
              ? 'option id (see codebook)'
              : q.kind === 'country'
                ? 'country name'
                : 'free text',
          get: (r) => {
            const v = a(r)?.value;
            return typeof v === 'string' ? v : null;
          }
        });
        break;
      case 'likert':
        cols.push({
          name: col(q.id),
          question: q,
          describe: `rating ${LIKERT_MIN}–${LIKERT_MIN + q.labels.length - 1} (see codebook)`,
          get: (r) => {
            const v = a(r)?.value;
            return typeof v === 'string' ? Number(v) : null;
          }
        });
        break;
      case 'multi':
        for (const o of q.options) {
          cols.push({
            name: `${col(q.id)}__${col(o.id)}`,
            question: q,
            describe: `1 if “${o.label}” was ticked, 0 if not; blank if the question was not answered`,
            get: (r) => {
              const v = a(r)?.value;
              return Array.isArray(v) ? (v.includes(o.id) ? 1 : 0) : null;
            }
          });
        }
        break;
      case 'conjoint':
        cols.push({
          name: `${col(q.id)}_seconds`,
          question: q,
          describe:
            'seconds from the first pair appearing to the last pick; blank if not recorded. The choices themselves are in conjoint.csv',
          get: (r) => {
            const ms = a(r)?.durationMs;
            return typeof ms === 'number' ? Math.round(ms / 100) / 10 : null;
          }
        });
        break;
    }
    // The write-in behind an "Other…" option.
    if (
      (q.kind === 'single' || q.kind === 'multi') &&
      q.options.some((o) => o.isOther)
    ) {
      cols.push({
        name: `${col(q.id)}_other`,
        question: q,
        describe: 'free text written in when “Other” was chosen',
        get: (r) => a(r)?.otherText ?? null
      });
    }
  }
  return cols;
}

// ---- main ---------------------------------------------------------------

async function main() {
  const yearArg = arg('year');
  const survey = yearArg ? getSurvey(yearArg) : allSurveys()[0];
  if (!survey) throw new Error(`No survey for ${yearArg}`);

  const all = await loadRows(survey.year);
  const includeTest = flag('include-test');
  const rows = includeTest
    ? all
    : all.filter((r) => !TEST_SOURCES.has(r.source ?? ''));
  const testCount = all.filter((r) => TEST_SOURCES.has(r.source ?? '')).length;

  const date = new Date().toISOString().slice(0, 10);
  const out = arg('out') ?? join('survey-exports', `${survey.year}-exported-${date}`);
  mkdirSync(out, { recursive: true });

  // responses.csv
  const cols = columnsFor(survey);
  const base = ['respondent_id', 'submitted_at', 'source', 'language', 'survey_seconds'];
  writeFileSync(
    join(out, 'responses.csv'),
    csv(
      [...base, ...cols.map((c) => c.name)],
      rows.map((r) => [
        r.token,
        r.submitted_at,
        r.source,
        r.language,
        typeof r.duration_ms === 'number' ? Math.round(r.duration_ms / 100) / 10 : null,
        ...cols.map((c) => c.get(r))
      ])
    )
  );

  // conjoint.csv — one row per card, two per round.
  const conjoints = survey.questions.filter(
    (q): q is ConjointQuestion => q.kind === 'conjoint'
  );
  let cards = 0;
  for (const q of conjoints) {
    const lines: Cell[][] = [];
    for (const r of rows) {
      const v = r.answers?.[q.id]?.value;
      if (!Array.isArray(v)) continue;
      const rounds = parseRounds(q, v as string[]);
      if (!rounds) continue;
      rounds.forEach((round, i) => {
        for (const side of ['a', 'b'] as const) {
          const card = round[side];
          lines.push([
            r.token,
            i + 1,
            side === 'a' ? 'left' : 'right',
            round.pick === side ? 1 : 0,
            ...q.attributes.map((attr) => card[attr.id])
          ]);
        }
      });
    }
    cards += lines.length;
    writeFileSync(
      join(out, conjoints.length > 1 ? `conjoint-${q.id}.csv` : 'conjoint.csv'),
      csv(
        [
          'respondent_id',
          'round',
          'position',
          'chosen',
          ...q.attributes.map((attr) => col(attr.id))
        ],
        lines
      )
    );
  }

  // codebook.csv — every column, then every coded value under it.
  const book: Cell[][] = [
    ['respondent_id', '', 'id', 'Random id for the response. Not linked to a person.', '', ''],
    ['submitted_at', '', 'timestamp', 'When the response was saved (UTC).', '', ''],
    ['source', '', 'text', 'The ?source= tag on the link the respondent followed; blank if none. internal-preview = test data.', '', ''],
    ['language', '', 'text', 'The language the respondent read the survey in (en, fr, zh…). Answers are option ids, the same in every language; blank if not recorded.', '', ''],
    ['survey_seconds', '', 'number', 'Seconds from the first question shown to sending, breaks included; blank if not recorded. The bonus questions after sending are not counted.', '', '']
  ];
  for (const c of cols) {
    const q = c.question;
    book.push([c.name, q.id, q.kind, q.text, '', c.describe]);
    if (c.name === col(q.id) && q.kind === 'single') {
      for (const o of q.options) {
        book.push([c.name, q.id, '', '', o.id, o.label + (o.offScale ? ' (off the scale)' : '')]);
      }
    }
    if (q.kind === 'likert') {
      q.labels.forEach((label, i) =>
        book.push([c.name, q.id, '', '', LIKERT_MIN + i, label])
      );
    }
  }
  for (const q of conjoints) {
    const file = conjoints.length > 1 ? `conjoint-${q.id}.csv` : 'conjoint.csv';
    for (const attr of q.attributes) {
      book.push([`${file}: ${col(attr.id)}`, q.id, 'conjoint attribute', attr.label, '', '']);
      for (const l of attr.levels) {
        book.push([
          `${file}: ${col(attr.id)}`,
          q.id,
          '',
          '',
          l.id,
          l.label + (l.value !== undefined ? ` (numeric value ${l.value})` : '')
        ]);
      }
    }
  }
  writeFileSync(
    join(out, 'codebook.csv'),
    csv(['column', 'question_id', 'type', 'question_or_description', 'value', 'value_label'], book)
  );

  writeFileSync(join(out, 'raw.json'), JSON.stringify(rows, null, 2));

  // README.md
  const bySource = new Map<string, number>();
  for (const r of rows) bySource.set(r.source ?? '(none)', (bySource.get(r.source ?? '(none)') ?? 0) + 1);
  const surveyTimed = rows.filter((r) => typeof r.duration_ms === 'number').length;
  const byLanguage = new Map<string, number>();
  for (const r of rows) byLanguage.set(r.language ?? '(not recorded)', (byLanguage.get(r.language ?? '(not recorded)') ?? 0) + 1);
  const timed = rows.filter((r) =>
    conjoints.some((q) => typeof r.answers?.[q.id]?.durationMs === 'number')
  ).length;
  const q0 = conjoints[0];
  writeFileSync(
    join(out, 'README.md'),
    `# ${survey.title} — data export

Exported ${new Date().toISOString()} · ${rows.length} responses${
      includeTest
        ? ` · **includes ${testCount} test responses** (source \`${PREVIEW_SOURCE}\` or \`simulated\`) — drop them before reporting`
        : testCount
          ? ` · ${testCount} test responses left out`
          : ''
    }

| Source | Responses |
|---|---:|
${[...bySource].sort((a, b) => b[1] - a[1]).map(([s, n]) => `| ${s} | ${n} |`).join('\n')}

| Language | Responses |
|---|---:|
${[...byLanguage].sort((a, b) => b[1] - a[1]).map(([l, n]) => `| ${l} | ${n} |`).join('\n')}

**Whole-survey time:** \`survey_seconds\` is first question shown to sending, breaks included (${surveyTimed} of ${rows.length} responses have it). Use it, with \`job_choice_seconds\`, to drop responses that were too fast to be read.

## Files

- **responses.csv** — one row per response. \`respondent_id\` joins it to conjoint.csv.
- **conjoint.csv** — the “Which job would you take?” exercise, one row per job card shown (${cards} rows).
- **codebook.csv** — what every column means, and the label for every coded value.
- **raw.json** — the same rows exactly as stored, in case anything is needed that the CSVs flatten away.

## How answers are coded

- **Single choice:** the option id; labels are in the codebook. A blank means not answered (only optional questions and bonus questions can be blank).
- **Ratings:** ${LIKERT_MIN}–5, labels in the codebook.
- **Multiple choice:** one 0/1 column per option, named \`question__option\`. All blank means the question wasn’t answered.
- **“Other” write-ins:** in a \`question_other\` column next to the question.
- **Bonus questions** (asked after submitting, optional) are blank for anyone who skipped the bonus round.
- Some question wording swaps in the respondent’s role (\`{term}\` in the codebook), so people saw slightly different text.
- Free text has been length-capped and checked, but not edited.

## The job-choice exercise (conjoint.csv)
${
  q0
    ? `
Each respondent made ${q0.rounds} choices between two made-up jobs. Each round shows two fresh cards, drawn at random so that the two differ on almost every attribute; some impossible combinations never appear.

| Column | Meaning |
|---|---|
| respondent_id | joins to responses.csv |
| round | 1–${q0.rounds}, in the order played |
| position | \`left\` or \`right\` — the card’s column on a wide screen (on narrow screens the cards may stack, left on top) |
| chosen | 1 for the card picked, 0 for the other; exactly one per round |
${q0.attributes.map((a) => `| ${col(a.id)} | ${a.label} — level id, labels in the codebook |`).join('\n')}

This is the standard long format for conjoint packages (e.g. R’s \`cregg\`: cluster on \`respondent_id\`). There is a small built-in model in the repo as well (\`scripts/survey-conjoint.ts\`), useful as a cross-check.

**Timing:** \`${col(q0.id)}_seconds\` in responses.csv is how long the whole run took, first pair shown to last pick. ${timed} of ${rows.length} responses have it. Runs that are impossibly fast (under about 2 seconds a pair) are worth excluding.

**Not recorded:** time per round, and whether “Undo last choice” was used. After an Undo the same pair is shown again and only the final pick is stored.
`
    : '\nNone in this survey.\n'
}
## Caveats

- Anonymous and opt-in: whoever followed a link and chose to answer. There is no population to weight to, so treat results as describing respondents, and compare by \`source\`.
- No IP address or email address is stored with a response.
`
  );

  console.log(
    `Wrote ${rows.length} responses (${cards} conjoint cards) to ${out}/` +
      (includeTest ? ` — includes ${testCount} test rows` : testCount ? ` — ${testCount} test rows left out` : '')
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

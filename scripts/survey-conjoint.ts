// Report on the survey's job-choice (conjoint) question: which job
// attributes drive people's choices, and by how much.
//
//   npx tsx --env-file=.env.local scripts/survey-conjoint.ts
//   npx tsx --env-file=.env.local scripts/survey-conjoint.ts --by role
//   npx tsx scripts/survey-conjoint.ts --file responses.json
//
// Options:
//   --year 2026        survey year (default: the newest)
//   --question <id>    conjoint question (default: the survey's first)
//   --file <path>      read responses from a JSON export instead of
//                      Supabase: an array of rows with an `answers` field
//   --by <questionId>  also break importance down by the answer to a
//                      single-choice question (role, seniority, …)
//   --min <n>          smallest segment worth reporting (default 50)
//   --json             machine-readable output instead of Markdown
//
// Reads Supabase with SUPABASE_URL / SUPABASE_SECRET_KEY, the same
// variables the site uses, hence --env-file. Read-only.

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { allSurveys, getSurvey } from '../src/lib/survey';
import type { ConjointQuestion } from '../src/lib/survey/types';
import {
  analyseConjoint,
  choicesFrom,
  type ConjointResult
} from '../src/lib/survey/conjoint-analysis';

type Row = { answers: Record<string, { value?: unknown }> };

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
  const rows: Row[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await db
      .from('survey_responses')
      .select('answers')
      .eq('survey_year', year)
      .order('submitted_at', { ascending: true })
      .range(from, from + page - 1);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as Row[]));
    if (!data || data.length < page) break;
  }
  return rows;
}

const pct = (n: number) => `${Math.round(n)}%`;
const num = (n: number) => (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(2);
const bar = (n: number) => '█'.repeat(Math.max(1, Math.round(n / 2.5)));

function markdown(q: ConjointQuestion, r: ConjointResult): string {
  const out: string[] = [];
  out.push(
    `${r.respondents} respondents · ${r.choices} choices · ` +
      `pseudo-R² ${r.pseudoR2.toFixed(2)} · ` +
      `position bias ${num(r.positionBias)}`
  );
  if (r.respondents < 150) {
    out.push(
      '',
      `> Under 150 respondents: treat small differences as noise, and check the ± columns.`
    );
  }

  out.push('', '## What drives the choice', '');
  out.push('| Attribute | Importance | |', '|---|---:|---|');
  for (const a of r.attributes) {
    out.push(`| ${a.label} | ${pct(a.importance)} | ${bar(a.importance)} |`);
  }
  out.push(
    '',
    'Importance is how far each attribute can swing a choice between its best and worst level, as a share of the total — within the ranges tested.'
  );

  out.push('', '## Each level', '');
  const money = q.attributes.find((a) => a.id === r.moneyAttribute);
  for (const a of r.attributes) {
    out.push(`### ${a.label} (${pct(a.importance)})`, '');
    const priced = a.levels.some((l) => l.moneyEquivalent !== undefined);
    out.push(
      `| Level | Part-worth | ±95% |${priced ? ` Worth in ${money?.label.toLowerCase()} |` : ''}`,
      `|---|---:|---:|${priced ? '---:|' : ''}`
    );
    for (const l of [...a.levels].sort((x, y) => y.utility - x.utility)) {
      const worth =
        l.moneyEquivalent === undefined
          ? ''
          : l.moneyEquivalent < 0.5
            ? ' — |'
            : ` ${l.moneyEquivalent.toFixed(0)} pts |`;
      out.push(
        `| ${l.label} | ${num(l.utility)} | ${(1.96 * l.se).toFixed(2)} |${priced ? worth : ''}`
      );
    }
    out.push('');
  }
  if (r.moneyPerUnit !== undefined && money) {
    out.push(
      r.moneyPerUnit > 0
        ? `"Worth in ${money.label.toLowerCase()}" is each level's advantage over the attribute's least-liked level, in percentage points of pay — e.g. 12 pts means people would give up about 12% of salary for it.`
        : `${money.label} did not register as a positive, so nothing is priced in it.`
    );
  }
  return out.join('\n');
}

async function main() {
  const yearArg = arg('year');
  const survey = yearArg ? getSurvey(yearArg) : allSurveys()[0];
  if (!survey) throw new Error(`No survey for ${yearArg}`);
  const qid = arg('question');
  const q = survey.questions.find(
    (x): x is ConjointQuestion =>
      x.kind === 'conjoint' && (!qid || x.id === qid)
  );
  if (!q) throw new Error('No conjoint question found');

  const rows = await loadRows(survey.year);
  const choices = choicesFrom(q, rows);
  if (choices.length === 0) {
    console.log(`No answers to "${q.id}" yet (${rows.length} responses).`);
    return;
  }
  const overall = analyseConjoint(q, choices);

  // Segments: the same model fitted to each group of respondents.
  const by = arg('by');
  const min = Number(arg('min') ?? 50);
  const segments: { label: string; result: ConjointResult }[] = [];
  if (by) {
    const seg = survey.questions.find((x) => x.id === by);
    if (!seg) throw new Error(`No question "${by}"`);
    const labelOf = (v: string) =>
      ('options' in seg ? seg.options.find((o) => o.id === v)?.label : v) ?? v;
    const groups = new Map<string, Row[]>();
    for (const row of rows) {
      const v = row.answers?.[by]?.value;
      if (typeof v !== 'string') continue;
      groups.set(v, [...(groups.get(v) ?? []), row]);
    }
    for (const [value, group] of groups) {
      const c = choicesFrom(q, group);
      const n = new Set(c.map((x) => x.respondent)).size;
      if (n < min) continue;
      segments.push({ label: labelOf(value), result: analyseConjoint(q, c) });
    }
    segments.sort((a, b) => b.result.respondents - a.result.respondents);
  }

  if (flag('json')) {
    console.log(JSON.stringify({ overall, segments }, null, 2));
    return;
  }

  console.log(`# ${q.text} — ${survey.title}\n`);
  console.log(markdown(q, overall));
  if (by) {
    console.log(`\n## Importance by ${by}\n`);
    if (segments.length === 0) {
      console.log(`No group of "${by}" has ${min}+ respondents yet.`);
      return;
    }
    console.log(
      `| Attribute | ${segments.map((s) => `${s.label} (n=${s.result.respondents})`).join(' | ')} |`
    );
    console.log(`|---|${segments.map(() => '---:').join('|')}|`);
    for (const attr of q.attributes) {
      const cells = segments.map((s) =>
        pct(s.result.attributes.find((a) => a.id === attr.id)!.importance)
      );
      console.log(`| ${attr.label} | ${cells.join(' | ')} |`);
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

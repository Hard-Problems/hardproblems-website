import { SURVEY_2026 } from './2026';
import { LIKERT_POINTS } from './types';
import {
  getSurvey,
  isOpen,
  termFor,
  subjectFor,
  applyTerm,
  orderedOptions,
  normalizeSource
} from './index';
import {
  normalizeAnswers,
  validateSubmission,
  validateAnswer,
  type Answers
} from './validate';
import type { ConjointQuestion } from './types';
import {
  encodeRound,
  isExcluded,
  nextPair,
  parseRounds,
  sameCard,
  type Card,
  type Round
} from './conjoint';
import { analyseConjoint, choicesFrom } from './conjoint-analysis';

let pass = 0,
  fail = 0;
function check(name: string, cond: boolean, extra = '') {
  if (cond) {
    pass++;
  } else {
    fail++;
    console.log(`  FAIL ${name} ${extra}`);
  }
}

// ---- definition integrity -------------------------------------------
const qs = SURVEY_2026.questions;
check('26 questions', qs.length === 26, `got ${qs.length}`);
check('question ids unique', new Set(qs.map((q) => q.id)).size === qs.length);
for (const q of qs) {
  if ('options' in q) {
    check(
      `option ids unique in ${q.id}`,
      new Set(q.options.map((o) => o.id)).size === q.options.length
    );
  }
}
const roleQ = qs.find((q) => q.id === 'role')!;
check(
  'every role option has a term',
  'options' in roleQ &&
    roleQ.options.every((o) => o.id in SURVEY_2026.roleTerms)
);
check(
  'every roleSubjects key is a real role option',
  Object.keys(SURVEY_2026.roleSubjects ?? {}).every(
    (id) => 'options' in roleQ && roleQ.options.some((o) => o.id === id)
  )
);
// A scale one label short renders a point with no name, which is the
// kind of thing nobody notices until the results are in.
// A `scale` single choice is coloured by position in the given order,
// so shuffling it would scramble the colours; and it renders no
// "Please say more" box, so an "Other…" option on one could never be
// completed.
check(
  'scale questions keep their given order and have no Other',
  qs.every(
    (q) =>
      q.kind !== 'single' ||
      !q.scale ||
      ((q.order === undefined || q.order === 'given') &&
        q.options.every((o) => !o.isOther))
  )
);
check(
  'offScale is only used on scale questions',
  qs.every(
    (q) => q.kind !== 'single' || q.scale || q.options.every((o) => !o.offScale)
  )
);
check(
  'every likert scale labels every point',
  qs
    .filter((q) => q.kind === 'likert')
    .every((q) => q.kind === 'likert' && q.labels.length === LIKERT_POINTS)
);
check(
  'likert labels are non-empty and distinct',
  qs
    .filter((q) => q.kind === 'likert')
    .every(
      (q) =>
        q.kind === 'likert' &&
        q.labels.every((l) => l.trim().length > 0) &&
        new Set(q.labels).size === q.labels.length
    )
);
check(
  'exactly one optional question',
  qs.filter((q) => q.optional).length === 1
);
check(
  'the optional one is one-change',
  qs.find((q) => q.optional)?.id === 'one-change'
);

// ---- registry + open window -----------------------------------------
check('getSurvey(2026)', getSurvey(2026)?.year === 2026);
check('getSurvey("2026")', getSurvey('2026')?.year === 2026);
check(
  'getSurvey(bad) is null',
  getSurvey('2026abc') === null && getSurvey(1999) === null
);
check(
  'open on opening day',
  isOpen(SURVEY_2026, new Date('2026-11-11T00:00:01Z'))
);
check(
  'closed the day before opening',
  !isOpen(SURVEY_2026, new Date('2026-11-10T23:59:00Z'))
);
check(
  'open late on 30 Nov',
  isOpen(SURVEY_2026, new Date('2026-11-30T23:59:00Z'))
);
check(
  'CLOSED on 1 Dec',
  !isOpen(SURVEY_2026, new Date('2026-12-01T00:00:01Z'))
);
check(
  'closed before opening',
  !isOpen(SURVEY_2026, new Date('2026-01-01T00:00:00Z'))
);

// ---- role-driven wording --------------------------------------------
const pm = termFor(SURVEY_2026, { role: 'product-manager' });
const gd = termFor(SURVEY_2026, { role: 'graphic-designer' });
check('PM term', pm === 'product management', pm);
check('graphic designer term', gd === 'design', gd);
check('unanswered falls back', termFor(SURVEY_2026, {}) === 'design');
const metaphor = qs.find((q) => q.id === 'metaphor')!;
// How the metaphor question actually reads for a given role.
const asks = (role: string) =>
  applyTerm(
    metaphor.text,
    termFor(SURVEY_2026, { role }),
    subjectFor(SURVEY_2026, { role })
  );
check(
  '{Subject} capitalises',
  asks('product-manager') === 'Product management in 2026 feels like…',
  asks('product-manager')
);
// The two roles whose subject form is NOT their field noun.
check(
  'founder metaphor',
  asks('founder') === 'Being a founder in 2026 feels like…',
  asks('founder')
);
check(
  'other metaphor',
  asks('other') === 'My career in 2026 feels like…',
  asks('other')
);
check(
  'founder keeps a field noun for "a career in …"',
  applyTerm(
    qs.find((q) => q.id === 'would-recommend')!.text,
    termFor(SURVEY_2026, { role: 'founder' })
  ).includes('a career in startups'),
  applyTerm(
    qs.find((q) => q.id === 'would-recommend')!.text,
    termFor(SURVEY_2026, { role: 'founder' })
  )
);
check(
  'writer term',
  termFor(SURVEY_2026, { role: 'design-writer' }) === 'writing'
);
const five = qs.find((q) => q.id === 'still-here-in-5')!;
check(
  '{term} lowercase',
  applyTerm(five.text, pm).includes(
    'working in product management in five years'
  )
);

// ---- option ordering -------------------------------------------------
const matters = qs.find((q) => q.id === 'what-matters');
if (!matters || matters.kind !== 'multi')
  throw new Error('what-matters missing');
const a1 = orderedOptions(matters, 'seed-a').map((o) => o.id);
const a2 = orderedOptions(matters, 'seed-a').map((o) => o.id);
const b1 = orderedOptions(matters, 'seed-b').map((o) => o.id);
check(
  'shuffle is stable for one seed',
  JSON.stringify(a1) === JSON.stringify(a2)
);
check(
  'shuffle differs between seeds',
  JSON.stringify(a1) !== JSON.stringify(b1)
);
check(
  'shuffle keeps every option',
  new Set(a1).size === matters.options.length
);
const ai = qs.find((q) => q.id === 'ai-feelings');
if (!ai || ai.kind !== 'multi') throw new Error('ai-feelings missing');
check('Other stays last', orderedOptions(ai, 'x').slice(-1)[0].id === 'other');
const sectors = qs.find((q) => q.id === 'sectors');
if (!sectors || sectors.kind !== 'multi') throw new Error('sectors missing');
const alpha = orderedOptions(sectors, 'x').map((o) => o.label);
const alphaHead = alpha.slice(0, -1);
check(
  'sectors alphabetical, Other last',
  JSON.stringify(alphaHead) ===
    JSON.stringify([...alphaHead].sort((x, y) => x.localeCompare(y))) &&
    alpha[alpha.length - 1] === 'Other…'
);

// ---- ?source= --------------------------------------------------------
check(
  'source slugified',
  normalizeSource('Smashing Magazine') === 'smashing-magazine'
);
check(
  'source strips markup',
  normalizeSource('<script>alert(1)</script>') === 'script-alert-1-script'
);
check('source capped', normalizeSource('a'.repeat(500)).length === 64);
check('source empty', normalizeSource(null) === '');

// ---- conjoint helpers -------------------------------------------------
// Plays a whole run of choices the way the form does, with
// `choose` standing in for the respondent.
function playConjoint(
  q: ConjointQuestion,
  seed: string,
  choose: (a: Card, b: Card) => 'a' | 'b'
): string[] {
  const rounds: Round[] = [];
  while (rounds.length < q.rounds) {
    const { a, b } = nextPair(q, seed, rounds);
    rounds.push({ a, b, pick: choose(a, b) });
  }
  return rounds.map((r) => encodeRound(q, r));
}

// ---- validation: a good submission ----------------------------------
const COUNTRIES = ['United Kingdom', 'Canada'];
function goodAnswers(): Answers {
  const out: Answers = {};
  for (const q of qs) {
    if (q.kind === 'single')
      out[q.id] = {
        value: q.options[0].id,
        ...(q.options[0].isOther ? { otherText: 'x' } : {})
      };
    else if (q.kind === 'multi') out[q.id] = { value: [q.options[0].id] };
    else if (q.kind === 'likert') out[q.id] = { value: '3' };
    else if (q.kind === 'country') out[q.id] = { value: 'United Kingdom' };
    else if (q.kind === 'conjoint')
      out[q.id] = { value: playConjoint(q, 'test-seed', () => 'a') };
    else out[q.id] = { value: 'something' };
  }
  return out;
}
check(
  'complete submission passes',
  validateSubmission(SURVEY_2026, goodAnswers(), COUNTRIES).length === 0,
  JSON.stringify(
    validateSubmission(SURVEY_2026, goodAnswers(), COUNTRIES).slice(0, 3)
  )
);

// optional question may be omitted
const skipOptional = goodAnswers();
delete skipOptional['one-change'];
check(
  'optional question may be skipped',
  validateSubmission(SURVEY_2026, skipOptional, COUNTRIES).length === 0
);

// ---- validation: the attacks it must stop ---------------------------
const inject = (mutate: (a: Answers) => void) => {
  const a = goodAnswers();
  mutate(a);
  return validateSubmission(SURVEY_2026, a, COUNTRIES);
};
// A payload is attacker-controlled JSON: the wrong types must be
// rejected as answers, not crash validation into a 500.
for (const [name, bad] of [
  ['a number', { value: 5 }],
  ['a bare string', 'product-designer'],
  ['an array of numbers', { value: [1] }],
  ['a non-string otherText', { value: 'other', otherText: 7 }]
] as const) {
  let threw = false;
  let errs: ReturnType<typeof inject> = [];
  try {
    errs = inject((a) => {
      (a as Record<string, unknown>)['role'] = bad;
    });
  } catch {
    threw = true;
  }
  check(
    `rejects ${name} as an answer without throwing`,
    !threw && errs.some((e) => e.questionId === 'role')
  );
}

// The write-in is stored only alongside an "Other…" choice, the one case
// validation length-checks it. Otherwise it is dropped, so it cannot be
// used to store unchecked text against any question.
{
  const a = goodAnswers();
  a['role'] = { value: 'product-designer', otherText: 'x'.repeat(100_000) };
  a['role-security'] = { value: '3', otherText: 'y' };
  const stored = normalizeAnswers(SURVEY_2026, a);
  check(
    'otherText dropped unless Other is chosen',
    stored['role'].otherText === undefined &&
      stored['role-security'].otherText === undefined
  );
  const b = goodAnswers();
  b['role'] = { value: 'other', otherText: '  Design engineer ' };
  check(
    'otherText kept when Other is chosen',
    normalizeAnswers(SURVEY_2026, b)['role'].otherText === 'Design engineer'
  );
}

// "=", "+", "-" and "@" at the start of a cell run as a formula in a
// spreadsheet export.
for (const start of ['+', '-', '@']) {
  check(
    `rejects free text starting with ${start}`,
    inject((a) => {
      a['metaphor'] = { value: `${start}SUM(1)` };
    }).some((e) => e.questionId === 'metaphor')
  );
}
check(
  'rejects free text starting with =',
  inject((a) => {
    a['metaphor'] = { value: ' =HYPERLINK("http://x")' };
    a['one-change'] = { value: '=1+1' };
    a['role'] = { value: 'other', otherText: '=cmd' };
  }).filter((e) => ['metaphor', 'one-change', 'role'].includes(e.questionId))
    .length === 3
);
check(
  'allows = later in free text',
  !inject((a) => {
    a['metaphor'] = { value: 'a = b, +1, -2 @home' };
  }).some((e) => e.questionId === 'metaphor')
);

check(
  'rejects an option id that does not exist',
  inject((a) => {
    a['role'] = { value: 'admin' };
  }).some((e) => e.questionId === 'role')
);
check(
  'rejects an unknown question key',
  inject((a) => {
    a['is_admin'] = { value: 'true' };
  }).some((e) => e.questionId === 'is_admin')
);
check(
  'rejects a missing required answer',
  inject((a) => {
    delete a['burnout'];
  }).some((e) => e.questionId === 'burnout')
);
check(
  'rejects likert out of range',
  inject((a) => {
    a['role-security'] = { value: '9' };
  }).some((e) => e.questionId === 'role-security')
);
check(
  'rejects non-numeric likert',
  inject((a) => {
    a['role-security'] = { value: '3; DROP TABLE' };
  }).some((e) => e.questionId === 'role-security')
);
// `what-matters` used to cap selections at three. The cap is gone from
// the schema entirely, so this asserts the question now takes whatever
// anyone gives it.
check(
  'what-matters now accepts as many as you like',
  !inject((a) => {
    a['what-matters'] = {
      value: ['craft', 'purpose', 'autonomy', 'money', 'recognition']
    };
  }).some((e) => e.questionId === 'what-matters')
);
check(
  'rejects duplicate selections',
  inject((a) => {
    a['what-matters'] = { value: ['craft', 'craft'] };
  }).some((e) => e.questionId === 'what-matters')
);
check(
  'rejects an unlisted country',
  inject((a) => {
    a['country'] = { value: 'Atlantis' };
  }).some((e) => e.questionId === 'country')
);
check(
  'rejects over-length text',
  inject((a) => {
    a['metaphor'] = { value: 'x'.repeat(201) };
  }).some((e) => e.questionId === 'metaphor')
);
check(
  'rejects control characters',
  inject((a) => {
    a['metaphor'] = { value: 'hello\u0000world' };
  }).some((e) => e.questionId === 'metaphor')
);
check(
  'rejects array where a string belongs',
  inject((a) => {
    a['role'] = { value: ['product-designer'] };
  }).some((e) => e.questionId === 'role')
);
check(
  'requires Other text when Other is chosen',
  validateAnswer(roleQ, { value: 'other' }, COUNTRIES) !== null
);
check(
  'accepts Other with text',
  validateAnswer(
    roleQ,
    { value: 'other', otherText: 'Service designer' },
    COUNTRIES
  ) === null
);

// ---- alphabetical ordering, Other last --------------------------------
const roleOrdered = orderedOptions(roleQ as never, 'any-seed') as {
  id: string;
  label: string;
}[];
check(
  'role options alphabetical except last',
  JSON.stringify(roleOrdered.slice(0, -1).map((o) => o.label)) ===
    JSON.stringify(
      [...roleOrdered.slice(0, -1).map((o) => o.label)].sort((a, b) =>
        a.localeCompare(b)
      )
    )
);
check(
  'role "Other…" stays last',
  roleOrdered[roleOrdered.length - 1].id === 'other'
);
check(
  'role ordering keeps every option',
  roleOrdered.length === ('options' in roleQ ? roleQ.options.length : 0)
);

// ---- conjoint: card generation --------------------------------------
const jobQ = qs.find((q) => q.id === 'job-choice');
if (!jobQ || jobQ.kind !== 'conjoint') throw new Error('job-choice missing');
check(
  'conjoint level ids unique per attribute',
  jobQ.attributes.every(
    (a) => new Set(a.levels.map((l) => l.id)).size === a.levels.length
  )
);
{
  const lines = (jobQ.card ?? []).flatMap((line) => line.attributes);
  const inTitle = new Set(
    (jobQ.cardTitle ?? []).flatMap((t) => Object.keys(t.when))
  );
  check(
    'conjoint card lines repeat no attribute',
    new Set(lines).size === lines.length,
    lines.join(',')
  );
  check(
    'conjoint card shows every attribute, in a line or the title',
    jobQ.attributes.every((a) => lines.includes(a.id) || inTitle.has(a.id))
  );
  // Every card that can be drawn gets a title.
  const titled = (card: Card) =>
    (jobQ.cardTitle ?? []).some((t) =>
      Object.entries(t.when).every(([k, v]) => card[k] === v)
    );
  let untitled = 0;
  for (let i = 0; i < 200; i++) {
    const { a, b } = nextPair(jobQ, `title-${i}`, []);
    if (!titled(a) || !titled(b)) untitled++;
  }
  check('conjoint every card gets a title', untitled === 0, `${untitled}`);
}
// A `{attribute}` in card wording must name an attribute whose every
// level has a noun, or some card shows a literal "{organisation}".
check(
  'conjoint card wording only borrows nouns that exist',
  jobQ.attributes.every((attr) =>
    attr.levels.every((l) =>
      [...(l.short ?? '').matchAll(/\{(\w+)\}/g)].every(([, name]) => {
        const id = name.charAt(0).toLowerCase() + name.slice(1);
        const source = jobQ.attributes.find((a) => a.id === id);
        return !!source && source.levels.every((x) => !!x.noun);
      })
    )
  )
);
check(
  'conjoint exclusions name real attributes and levels',
  (jobQ.exclude ?? []).every((combo) =>
    Object.entries(combo).every(([attr, level]) =>
      jobQ.attributes.some(
        (a) => a.id === attr && a.levels.some((l) => l.id === level)
      )
    )
  )
);
{
  let ok = true;
  let overlapRows = 0;
  let rows = 0;
  for (let i = 0; i < 300; i++) {
    const value = playConjoint(jobQ, `seed-${i}`, (_a, _b) =>
      i % 2 ? 'a' : 'b'
    );
    const rounds = parseRounds(jobQ, value);
    if (!rounds) {
      ok = false;
      break;
    }
    for (const r of rounds) {
      if (sameCard(r.a, r.b) || isExcluded(jobQ, r.a) || isExcluded(jobQ, r.b))
        ok = false;
      for (const attr of jobQ.attributes) {
        rows++;
        if (r.a[attr.id] === r.b[attr.id]) overlapRows++;
      }
    }
  }
  check('conjoint cards valid, distinct and never excluded', ok);
  // Minimal overlap: the two cards should differ on nearly every row.
  check(
    'conjoint cards differ on almost every attribute',
    overlapRows / rows < 0.02,
    `${((overlapRows / rows) * 100).toFixed(1)}% rows matched`
  );
}
{
  const r1 = nextPair(jobQ, 'stable', []);
  const r2 = nextPair(jobQ, 'stable', []);
  check(
    'conjoint pair is stable for one seed',
    sameCard(r1.a, r2.a) && sameCard(r1.b, r2.b)
  );
  const other = nextPair(jobQ, 'different', []);
  check(
    'conjoint pair differs across seeds',
    !sameCard(r1.a, other.a) || !sameCard(r1.b, other.b)
  );
}

{
  // Every round is a fresh pair: the pick does not carry over, and
  // the pairs do not depend on which side was picked.
  const byB = parseRounds(
    jobQ,
    playConjoint(jobQ, 'fresh', () => 'b')
  )!;
  const byA = parseRounds(
    jobQ,
    playConjoint(jobQ, 'fresh', () => 'a')
  )!;
  check(
    'conjoint pick does not carry into the next pair',
    byB
      .slice(1)
      .every((r, i) => !sameCard(r.a, byB[i].b) && !sameCard(r.b, byB[i].b))
  );
  check(
    'conjoint pairs do not depend on the picks',
    byA.every((r, i) => sameCard(r.a, byB[i].a) && sameCard(r.b, byB[i].b))
  );
}

// ---- conjoint: validation ----------------------------------------------
const goodRun = playConjoint(jobQ, 'v', () => 'b');
check(
  'conjoint full run passes',
  validateAnswer(jobQ, { value: goodRun }) === null
);
check(
  'conjoint rejects an unfinished run',
  validateAnswer(jobQ, { value: goodRun.slice(0, 5) }) !== null
);
check(
  'conjoint rejects extra rounds',
  validateAnswer(jobQ, { value: [...goodRun, goodRun[0]] }) !== null
);
check(
  'conjoint rejects an undeclared level',
  validateAnswer(jobQ, {
    value: [
      goodRun[0].replace(/pay:[a-z0-9-]+/, 'pay:more-500'),
      ...goodRun.slice(1)
    ]
  }) !== null
);
check(
  'conjoint rejects two identical cards',
  validateAnswer(jobQ, {
    value: [
      `${goodRun[0].split('|')[0]}|${goodRun[0].split('|')[0]}|a`,
      ...goodRun.slice(1)
    ]
  }) !== null
);
check(
  'conjoint accepts a run saved under winner-stays-on',
  validateAnswer(jobQ, {
    value: goodRun.map((r, i) =>
      i === 0 ? r : `${goodRun[i - 1].split('|')[1]}|${r.split('|')[1]}|b`
    )
  }) === null
);
check(
  'conjoint rejects a bad pick',
  validateAnswer(jobQ, {
    value: [goodRun[0].replace(/\|b$/, '|c'), ...goodRun.slice(1)]
  }) !== null
);
check(
  'conjoint rejects a string value',
  validateAnswer(jobQ, { value: 'pay:same' }) !== null
);

// ---- conjoint: the analysis recovers known preferences -----------------
// Simulated respondents who choose by a known utility plus logistic
// noise. If the fit is right, it should hand those utilities back.
{
  const truth: Record<string, Record<string, number>> = {
    pay: { 'less-10': -0.8, same: -0.2, 'more-15': 0.3, 'more-30': 0.7 },
    level: { same: -0.25, promotion: 0.25 },
    mission: { commercial: -0.5, 'some-good': 0, 'for-good': 0.5 },
    organisation: {
      startup: 0.1,
      established: 0.2,
      public: -0.2,
      nonprofit: -0.1
    },
    brand: { household: 0.15, industry: 0.05, unknown: -0.2 },
    work: { ai: 0, established: 0 }
  };
  const appeal = (c: Card) =>
    Object.entries(c).reduce((s, [attr, level]) => s + truth[attr][level], 0);
  // Deterministic pseudo-random noise so the test never flakes.
  let state = 12345;
  const rand = () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
  const responses = Array.from({ length: 800 }, (_, i) => ({
    answers: {
      'job-choice': {
        value: playConjoint(jobQ, `sim-${i}`, (a, b) =>
          rand() < 1 / (1 + Math.exp(-(appeal(a) - appeal(b)))) ? 'a' : 'b'
        )
      }
    }
  }));
  const choices = choicesFrom(jobQ, responses);
  check('analysis reads every simulated choice', choices.length === 800 * 8);
  const result = analyseConjoint(jobQ, choices);
  const byId = Object.fromEntries(result.attributes.map((a) => [a.id, a]));
  check(
    'analysis ranks pay, then mission, most important',
    result.attributes[0].id === 'pay' && result.attributes[1].id === 'mission',
    result.attributes.map((a) => a.id).join(',')
  );
  check(
    'analysis importances sum to 100',
    Math.abs(result.attributes.reduce((s, a) => s + a.importance, 0) - 100) <
      1e-6
  );
  let worst = 0;
  for (const attr of result.attributes) {
    for (const l of attr.levels) {
      worst = Math.max(worst, Math.abs(l.utility - truth[attr.id][l.id]));
    }
  }
  check(
    'analysis recovers part-worths within 0.15',
    worst < 0.15,
    `worst error ${worst.toFixed(3)}`
  );
  check('analysis finds no position bias', Math.abs(result.positionBias) < 0.1);
  check(
    'analysis treats the zero-effect attribute as unimportant',
    byId['work'].importance < 3,
    `${byId['work'].importance.toFixed(1)}%`
  );
  // Truth: promotion is +0.5 over same; pay is ~0.0375 per point over
  // the 40-point range → roughly 13% of pay.
  const promo = byId['level'].levels.find((l) => l.id === 'promotion');
  check(
    'analysis prices a promotion in pay',
    promo?.moneyEquivalent !== undefined &&
      promo.moneyEquivalent > 8 &&
      promo.moneyEquivalent < 20,
    `${promo?.moneyEquivalent?.toFixed(1)}%`
  );
}

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

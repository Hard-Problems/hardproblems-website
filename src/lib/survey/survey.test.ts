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
import { validateSubmission, validateAnswer, type Answers } from './validate';

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
check('25 questions', qs.length === 25, `got ${qs.length}`);
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
check('open on 1 Nov', isOpen(SURVEY_2026, new Date('2026-11-01T12:00:00Z')));
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
check(
  'sectors alphabetical',
  JSON.stringify(alpha) ===
    JSON.stringify([...alpha].sort((x, y) => x.localeCompare(y)))
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
    a['pay'] = { value: '9' };
  }).some((e) => e.questionId === 'pay')
);
check(
  'rejects non-numeric likert',
  inject((a) => {
    a['pay'] = { value: '3; DROP TABLE' };
  }).some((e) => e.questionId === 'pay')
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

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

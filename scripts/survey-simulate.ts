// Simulated survey responses, for rehearsing the analysis before real
// data exists. NOT a preview of results: every pattern in this data
// was put there by the settings below.
//
//   npx tsx scripts/survey-simulate.ts
//   npx tsx scripts/survey-simulate.ts --n 2000 --seed b --out sim.json
//
// Options:
//   --n <count>      respondents to simulate (default 1000)
//   --seed <text>    any text; the same seed gives the same data
//   --out <path>     where to write the responses (default: the system
//                    temp folder, so it is never committed by accident)
//   --no-report      write the file only, skip the analysis report
//
// What it is for:
//
//   1. Testing the pipeline. Every response is built from the real
//      survey definition and passes the same validation the submit
//      route uses, so the file has exactly the shape of a Supabase
//      export: scripts/survey-conjoint.ts --file <out> reads it as-is.
//   2. Checking what the analysis can recover. The answers follow
//      PLANTED preferences (TRUTH, below). The report fits the real
//      analysis to growing samples and compares the estimates with the
//      truth — which shows how many responses are needed before the
//      job-choice weights, and the drivers of satisfaction, are clear.
//   3. Rehearsing data cleaning. A known share of responses are
//      deliberately bad — straight-liners, duplicates, junk text — and
//      the report shows how many simple checks catch.
//
// Writes nothing to the database. Rows carry source "simulated".

import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getSurvey } from '../src/lib/survey';
import { COUNTRY_NAMES } from '../src/lib/countries';
import { seededRandom } from '../src/lib/survey/random';
import {
  encodeRound,
  nextPair,
  type Card,
  type Round
} from '../src/lib/survey/conjoint';
import {
  analyseConjoint,
  choicesFrom,
  type ConjointResult
} from '../src/lib/survey/conjoint-analysis';
import type {
  ConjointQuestion,
  SurveyDefinition,
  SurveyQuestion
} from '../src/lib/survey/types';
import {
  normalizeAnswers,
  validateSubmission,
  type Answers
} from '../src/lib/survey/validate';

// ---- options ----------------------------------------------------------

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const N = Number(arg('n') ?? 1000);
const SEED = arg('seed') ?? 'simulated';
const OUT = arg('out') ?? join(tmpdir(), 'survey-simulated-2026.json');
const REPORT = !process.argv.includes('--no-report');

// ---- the planted truth ------------------------------------------------
//
// Job choice: each level's utility for an average respondent. Pay is
// per 1% of salary, with an extra penalty for a cut (loss aversion).
// Everyone's weights wobble around these (HETEROGENEITY), and founders
// care less about pay. Satisfaction: the weights on four underlying
// traits. Change any of these to see whether the analysis notices.

const TRUTH = {
  payPerPercent: 0.04,
  payCutPenalty: 0.3,
  levels: {
    level: { same: 0, promotion: 0.5 },
    mission: { commercial: 0, 'some-good': 0.35, 'for-good': 0.7 },
    organisation: {
      startup: 0,
      established: 0.1,
      public: -0.1,
      nonprofit: 0.05
    },
    brand: { household: 0.2, industry: 0.15, unknown: 0 },
    work: { ai: 0.1, established: 0 }
  } as Record<string, Record<string, number>>,
  positionBias: 0.1,
  heterogeneity: 0.3,
  founderPayScale: 0.6,
  // Satisfaction = these × the four traits, plus noise.
  satisfaction: { purpose: 0.45, payFair: 0.35, security: 0.2, burnout: -0.3 },
  satisfactionNoise: 0.6,
  // Shares of deliberately bad responses.
  straightLiners: 0.03,
  duplicates: 0.02,
  junkText: 0.02
};

// ---- randomness ---------------------------------------------------------

const rand = seededRandom(SEED);
const normal = () => {
  // Box–Muller.
  const u = Math.max(rand(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
};
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
// Standard normal CDF (Abramowitz & Stegun 7.1.26), for turning a
// trait into a position on an answer scale.
function phi(x: number): number {
  const t = 1 / (1 + (0.3275911 * Math.abs(x)) / Math.SQRT2);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-(x * x) / 2);
  return x >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}
function weighted<T>(items: readonly (readonly [T, number])[]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [item, w] of items) {
    if ((r -= w) <= 0) return item;
  }
  return items[items.length - 1][0];
}
function sample<T>(xs: readonly T[], k: number): T[] {
  const pool = [...xs];
  const out: T[] = [];
  while (out.length < k && pool.length) {
    out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  }
  return out;
}
const uuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(rand() * 16);
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

// ---- the survey ---------------------------------------------------------

const survey = getSurvey(2026) as SurveyDefinition;
const q = (id: string) => {
  const found = survey.questions.find((x) => x.id === id);
  if (!found) throw new Error(`No question "${id}" — has the survey changed?`);
  return found;
};
const jobChoice = survey.questions.find(
  (x): x is ConjointQuestion => x.kind === 'conjoint'
)!;
const optionIds = (question: SurveyQuestion, keepOther = false): string[] =>
  'options' in question
    ? question.options
        .filter((o) => keepOther || (!o.isOther && !o.offScale))
        .map((o) => o.id)
    : [];

/** A trait (≈ standard normal) as one option of a best-first scale. */
function onScale(id: string, x: number, offScaleChance = 0.03): string {
  const question = q(id);
  const off =
    'options' in question
      ? question.options.find((o) => o.offScale)
      : undefined;
  if (off && rand() < offScaleChance) return off.id;
  const ids = optionIds(question);
  const i = Math.min(ids.length - 1, Math.floor((1 - phi(x)) * ids.length));
  return ids[i];
}
/** A trait as a 0–5 likert value (stored as a string). */
const onLikert = (x: number) => String(Math.min(5, Math.floor(phi(x) * 6)));

// ---- one respondent --------------------------------------------------

const ROLES = [
  ['product-designer', 30],
  ['ux-designer', 12],
  ['product-manager', 15],
  ['design-researcher', 8],
  ['ui-designer', 5],
  ['brand-designer', 5],
  ['graphic-designer', 5],
  ['service-designer', 4],
  ['founder', 4],
  ['design-writer', 3],
  ['other', 3],
  ['motion-designer', 2],
  ['industrial-designer', 2],
  ['illustrator', 2]
] as const;
const COUNTRIES = [
  ['United States', 35],
  ['United Kingdom', 20],
  ['Germany', 6],
  ['Canada', 6],
  ['India', 6],
  ['Netherlands', 4],
  ['Australia', 4],
  ['France', 3],
  ['Spain', 2],
  ['Brazil', 2],
  ['Sweden', 2],
  ['Ireland', 2],
  ['Singapore', 2],
  ['Nigeria', 1],
  ['Kenya', 1]
] as const;
const METAPHORS = [
  'a ship in fog',
  'building the plane while flying it',
  'a treadmill that keeps speeding up',
  'a garden in a drought',
  'an orchestra without a conductor',
  'a game of musical chairs',
  'a rollercoaster',
  'learning a new language every month',
  'herding cats',
  'a renovation that never ends',
  'surfing a big wave',
  'a puzzle with missing pieces'
];
const BONUS_LINES = {
  'one-change': [
    'More honesty about layoffs and hiring.',
    'Less chasing trends, more craft.',
    'Clearer career paths past senior.',
    'Fewer pointless rebrands.',
    'More time with real users.'
  ],
  admire: [
    'A former manager who always made time for juniors.',
    'Teams doing public-sector design well.',
    'Researchers who share their methods openly.'
  ],
  'amazing-work': [
    'A local council service redesign.',
    'An open-source design system.',
    'A health charity rebuilding its booking flow.'
  ]
} as const;

type Respondent = {
  answers: Answers;
  role: string;
  /** For the report: the planted satisfaction, and what was bad. */
  satisfaction: number;
  bad?: 'straight-liner' | 'duplicate' | 'junk-text';
};

function cardUtility(
  card: Card,
  w: Record<string, Record<string, number>>,
  payScale: number
) {
  let u = 0;
  for (const attr of jobChoice.attributes) {
    const level = card[attr.id];
    if (attr.id === 'pay') {
      const pct = attr.levels.find((l) => l.id === level)?.value ?? 0;
      u +=
        payScale *
        (TRUTH.payPerPercent * pct - (pct < 0 ? TRUTH.payCutPenalty : 0));
    } else {
      u += w[attr.id]?.[level] ?? 0;
    }
  }
  return u;
}

function respondent(index: number): Respondent {
  const role = weighted(ROLES);
  const seed = `${SEED}:${index}`;

  // The four traits behind the scale answers, and satisfaction from them.
  const purpose = normal();
  const payFair = normal();
  const security = normal();
  const burnout = -0.3 * security + Math.sqrt(1 - 0.09) * normal();
  const craft = normal();
  const s = TRUTH.satisfaction;
  const satisfaction =
    s.purpose * purpose +
    s.payFair * payFair +
    s.security * security +
    s.burnout * burnout +
    TRUTH.satisfactionNoise * normal();

  // This person's job-choice weights: the truth, wobbled.
  const w: Record<string, Record<string, number>> = {};
  for (const [attr, levels] of Object.entries(TRUTH.levels)) {
    w[attr] = {};
    for (const [level, u] of Object.entries(levels)) {
      w[attr][level] = u + (u === 0 ? 0 : TRUTH.heterogeneity * normal());
    }
  }
  const payScale =
    (role === 'founder' ? TRUTH.founderPayScale : 1) *
    Math.max(0.2, 1 + TRUTH.heterogeneity * normal());

  const rounds: Round[] = [];
  for (let r = 0; r < jobChoice.rounds; r++) {
    const { a, b } = nextPair(jobChoice, seed, rounds);
    const diff = cardUtility(a, w, payScale) - cardUtility(b, w, payScale);
    rounds.push({
      a,
      b,
      pick: rand() < sigmoid(diff + TRUTH.positionBias) ? 'a' : 'b'
    });
  }

  const answers: Answers = {
    role:
      role === 'other'
        ? { value: 'other', otherText: 'Design engineer' }
        : { value: role },
    'career-satisfaction': {
      value: onScale('career-satisfaction', satisfaction)
    },
    'role-security': { value: onLikert(security) },
    skill: { value: onScale('skill', 0.8 + craft) },
    passion: {
      value: onScale('passion', 0.6 * satisfaction + 0.5 * craft + 0.3)
    },
    pay: { value: onScale('pay', payFair) },
    'benefit-to-world': { value: onScale('benefit-to-world', purpose) },
    'job-choice': { value: rounds.map((r) => encodeRound(jobChoice, r)) },
    'what-matters': {
      value: sample(optionIds(q('what-matters')), 2 + Math.floor(rand() * 2))
    },
    feelings: {
      value: sample(
        satisfaction > 0
          ? [
              'optimistic',
              'excited',
              'confident',
              'grateful',
              'fulfilled',
              'curious'
            ]
          : [
              'uncertain',
              'anxious',
              'frustrated',
              'exhausted',
              'undervalued',
              'restless'
            ],
        1 + Math.floor(rand() * 3)
      )
    },
    metaphor: { value: METAPHORS[Math.floor(rand() * METAPHORS.length)] },
    'still-here-in-5': { value: onLikert(0.6 * satisfaction + 0.5 * normal()) },
    'would-recommend': {
      value: rand() < sigmoid(1.2 * satisfaction) ? 'yes' : 'no'
    },
    'work-you-hoped-for': {
      value: rand() < sigmoid(satisfaction) ? 'yes' : 'no'
    },
    // Best first ("never"), so more burnout is further down the scale.
    burnout: { value: onScale('burnout', -burnout) },
    'proud-of-shipping': {
      value: rand() < sigmoid(0.8 * craft + 0.5) ? 'yes' : 'no'
    },
    'ai-usage': {
      value: onLikert(
        (role === 'product-manager'
          ? 0.5
          : role === 'illustrator'
            ? -0.8
            : 0.2) + normal()
      )
    },
    'ai-feelings': {
      value: sample(optionIds(q('ai-feelings')), 1 + Math.floor(rand() * 2))
    },
    'manages-people': { value: rand() < 0.3 ? 'yes' : 'no' },
    experience: {
      value: weighted([
        ['student', 3],
        ['recent-graduate', 5],
        ['1-4', 25],
        ['5-9', 30],
        ['10-19', 27],
        ['20-plus', 10]
      ])
    },
    country: { value: weighted(COUNTRIES) },
    'org-size': {
      value: weighted([
        ['1', 4],
        ['2-9', 8],
        ['10-49', 18],
        ['50-249', 22],
        ['250-999', 18],
        ['1000-plus', 30]
      ])
    },
    'designer-pm-count': {
      value: weighted([
        ['1-4', 30],
        ['5-9', 20],
        ['10-19', 18],
        ['20-49', 15],
        ['50-plus', 17]
      ])
    },
    'org-type': {
      value: weighted(optionIds(q('org-type')).map((id) => [id, 1] as const))
    },
    sectors: {
      value: sample(optionIds(q('sectors')), 1 + Math.floor(rand() * 2))
    }
  };

  // The bonus round, answered by some.
  for (const [id, share] of [
    ['one-change', 0.35],
    ['admire', 0.25],
    ['amazing-work', 0.2]
  ] as const) {
    if (rand() < share) {
      const lines = BONUS_LINES[id];
      answers[id] = { value: lines[Math.floor(rand() * lines.length)] };
    }
  }

  return { answers, role, satisfaction };
}

/** Someone clicking the first option of everything. */
function straightLine(r: Respondent): Respondent {
  const answers = { ...r.answers };
  for (const question of survey.questions) {
    if (question.kind === 'single' && question.id !== 'role') {
      answers[question.id] = { value: optionIds(question)[0] };
    } else if (question.kind === 'likert') {
      answers[question.id] = { value: '0' };
    } else if (question.kind === 'conjoint') {
      const rounds: Round[] = [];
      for (let i = 0; i < question.rounds; i++) {
        const { a, b } = nextPair(question, `${SEED}:sl:${rand()}`, rounds);
        rounds.push({ a, b, pick: 'a' });
      }
      answers[question.id] = {
        value: rounds.map((x) => encodeRound(question, x))
      };
    }
  }
  return { ...r, answers, bad: 'straight-liner' };
}

// ---- generate ---------------------------------------------------------

const people: Respondent[] = [];
for (let i = 0; i < N; i++) {
  let r = respondent(i);
  const roll = rand();
  if (roll < TRUTH.straightLiners) r = straightLine(r);
  else if (roll < TRUTH.straightLiners + TRUTH.duplicates && people.length) {
    const original = people[Math.floor(rand() * people.length)];
    r = {
      ...original,
      answers: structuredClone(original.answers),
      bad: 'duplicate'
    };
  } else if (roll < TRUTH.straightLiners + TRUTH.duplicates + TRUTH.junkText) {
    r = {
      ...r,
      answers: {
        ...r.answers,
        metaphor: { value: ['asdf', 'n/a', 'idk', 'x'][Math.floor(rand() * 4)] }
      },
      bad: 'junk-text'
    };
  }
  const errors = validateSubmission(survey, r.answers, COUNTRY_NAMES);
  if (errors.length) {
    throw new Error(
      `Simulated response ${i} is invalid: ${JSON.stringify(errors)}`
    );
  }
  people.push(r);
}

const start = Date.parse('2026-11-11T08:00:00Z');
const rows = people.map((p, i) => ({
  token: uuid(),
  survey_year: survey.year,
  answers: normalizeAnswers(survey, p.answers),
  source: 'simulated',
  submitted_at: new Date(start + i * 17 * 60 * 1000).toISOString()
}));
writeFileSync(OUT, JSON.stringify(rows, null, 1));
console.error(`Wrote ${rows.length} simulated responses to ${OUT}`);

if (!REPORT) process.exit(0);

// ---- report ---------------------------------------------------------

const out: string[] = [];
const say = (line = '') => out.push(line);
const pct = (x: number) => `${x.toFixed(1)}%`;

say(`# Simulated survey: what the analysis recovers`);
say();
say(
  `${N} simulated respondents, seed "${SEED}". Every pattern below was planted;`
);
say(
  `the question is only whether the analysis finds it, and at what sample size.`
);
say();

// Job choice. The planted importance, from the average respondent's
// weights (founders' smaller pay weight included).
const founderShare =
  ROLES.find(([r]) => r === 'founder')![1] /
  ROLES.reduce((s, [, w]) => s + w, 0);
const avgPayScale = 1 - founderShare * (1 - TRUTH.founderPayScale);
const payLevels = jobChoice.attributes.find((a) => a.id === 'pay')!.levels;
const truthRange: Record<string, number> = {
  pay: (() => {
    const us = payLevels.map(
      (l) =>
        avgPayScale *
        (TRUTH.payPerPercent * (l.value ?? 0) -
          ((l.value ?? 0) < 0 ? TRUTH.payCutPenalty : 0))
    );
    return Math.max(...us) - Math.min(...us);
  })()
};
for (const [attr, levels] of Object.entries(TRUTH.levels)) {
  const us = Object.values(levels);
  truthRange[attr] = Math.max(...us) - Math.min(...us);
}
const totalRange = Object.values(truthRange).reduce((s, v) => s + v, 0);
const truthImportance = Object.fromEntries(
  Object.entries(truthRange).map(([k, v]) => [k, (v / totalRange) * 100])
);

const sizes = [100, 250, 500, 1000, 2000].filter((n) => n <= N);
if (!sizes.includes(N)) sizes.push(N);
const fits: [number, ConjointResult][] = sizes.map((n) => [
  n,
  analyseConjoint(jobChoice, choicesFrom(jobChoice, rows.slice(0, n)))
]);

say(`## 1. Job choice: importance of each attribute`);
say();
say(
  `How much each attribute can swing a choice, as a share of all of them. Planted vs estimated:`
);
say();
say(`| Attribute | Planted | ${sizes.map((n) => `n=${n}`).join(' | ')} |`);
say(`|---|---|${sizes.map(() => '---').join('|')}|`);
for (const attr of jobChoice.attributes) {
  const cells = fits.map(([, f]) =>
    pct(f.attributes.find((a) => a.id === attr.id)!.importance)
  );
  say(
    `| ${attr.label} | ${pct(truthImportance[attr.id])} | ${cells.join(' | ')} |`
  );
}
say();
const worstError = fits.map(
  ([n, f]) =>
    [
      n,
      Math.max(
        ...f.attributes.map((a) =>
          Math.abs(a.importance - truthImportance[a.id])
        )
      )
    ] as const
);
say(
  `Largest error in any attribute's importance: ${worstError.map(([n, e]) => `n=${n}: ${e.toFixed(1)} pts`).join(', ')}.`
);
say();

// Pay equivalents for the levels that matter most.
say(`## 2. Job choice: levels priced in pay`);
say();
say(
  `What each level is worth in % of salary, over the attribute's least-liked level. Planted vs estimated (± one standard error of the level's utility, as a guide to precision):`
);
say();
const priced = [
  ['mission', 'for-good'],
  ['mission', 'some-good'],
  ['level', 'promotion'],
  ['brand', 'household']
] as const;
say(`| Level | Planted | ${sizes.map((n) => `n=${n}`).join(' | ')} |`);
say(`|---|---|${sizes.map(() => '---').join('|')}|`);
for (const [attr, level] of priced) {
  const truthWorth =
    (TRUTH.levels[attr][level] -
      Math.min(...Object.values(TRUTH.levels[attr]))) /
    (TRUTH.payPerPercent * avgPayScale);
  const label = jobChoice.attributes
    .find((a) => a.id === attr)!
    .levels.find((l) => l.id === level)!.label;
  const cells = fits.map(([, f]) => {
    const l = f.attributes
      .find((a) => a.id === attr)!
      .levels.find((x) => x.id === level)!;
    return l.moneyEquivalent === undefined
      ? '—'
      : `${l.moneyEquivalent.toFixed(0)}% (±${l.se.toFixed(2)})`;
  });
  say(`| ${label} | ${truthWorth.toFixed(0)}% | ${cells.join(' | ')} |`);
}
say();
const big = fits[fits.length - 1][1];
say(
  `Model fit at n=${sizes[sizes.length - 1]}: pseudo-R² ${big.pseudoR2.toFixed(2)}, position bias ${big.positionBias.toFixed(2)} (planted ${TRUTH.positionBias}).`
);
say();
say(
  `Note: estimated pay equivalents run a little off the planted ones, because pay was planted with an extra penalty for a cut that the model's straight-line pay term cannot represent. That is the kind of modelling choice this rehearsal is meant to surface.`
);
say();

// Satisfaction drivers: OLS of the satisfaction scale on four scales.
say(`## 3. What drives satisfaction`);
say();
const scaleScore = (id: string, value: unknown): number | null => {
  const ids = optionIds(q(id));
  const i = ids.indexOf(String(value));
  return i < 0 ? null : (ids.length - 1 - i) / (ids.length - 1);
};
type Obs = { y: number; x: number[] };
const observe = (subset: typeof rows): Obs[] =>
  subset.flatMap((row) => {
    const a = row.answers;
    const y = scaleScore(
      'career-satisfaction',
      a['career-satisfaction']?.value
    );
    const purpose = scaleScore(
      'benefit-to-world',
      a['benefit-to-world']?.value
    );
    const fair = scaleScore('pay', a.pay?.value);
    const sec = Number(a['role-security']?.value) / 5;
    // How much burnout: 0 = never, 1 = always.
    const never = scaleScore('burnout', a.burnout?.value);
    const burn = never === null ? undefined : 1 - never;
    if (y === null || purpose === null || fair === null || burn === undefined)
      return [];
    return [{ y, x: [1, purpose, fair, sec, burn] }];
  });
function ols(obs: Obs[]): number[] {
  const p = obs[0].x.length;
  const xtx = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  const xty = new Array<number>(p).fill(0);
  for (const { y, x } of obs) {
    for (let i = 0; i < p; i++) {
      xty[i] += x[i] * y;
      for (let j = 0; j < p; j++) xtx[i][j] += x[i] * x[j];
    }
  }
  // Solve by Gaussian elimination.
  const m = xtx.map((row, i) => [...row, xty[i]]);
  for (let c = 0; c < p; c++) {
    let pivot = c;
    for (let r = c + 1; r < p; r++)
      if (Math.abs(m[r][c]) > Math.abs(m[pivot][c])) pivot = r;
    [m[c], m[pivot]] = [m[pivot], m[c]];
    for (let r = 0; r < p; r++) {
      if (r === c) continue;
      const f = m[r][c] / m[c][c];
      for (let k = c; k <= p; k++) m[r][k] -= f * m[c][k];
    }
  }
  return m.map((row, i) => row[p] / row[i]);
}
say(
  `A straight-line fit of the satisfaction answer (0 = completely dissatisfied, 1 = completely satisfied) on four other answers, each scaled 0–1. Planted order of strength: purpose > fair pay > burnout (negative) > security.`
);
say();
say(`| Driver | Planted weight | ${sizes.map((n) => `n=${n}`).join(' | ')} |`);
say(`|---|---|${sizes.map(() => '---').join('|')}|`);
const coefs = sizes.map((n) => ols(observe(rows.slice(0, n))));
const drivers = [
  ['Useful to society', TRUTH.satisfaction.purpose],
  ['Paid appropriately', TRUTH.satisfaction.payFair],
  ['Secure in role', TRUTH.satisfaction.security],
  ['Burnout', TRUTH.satisfaction.burnout]
] as const;
drivers.forEach(([label, planted], i) => {
  say(
    `| ${label} | ${planted > 0 ? '+' : ''}${planted} | ${coefs.map((b) => (b[i + 1] >= 0 ? '+' : '') + b[i + 1].toFixed(2)).join(' | ')} |`
  );
});
say();
say(
  `Estimates are in answer-scale units, not the planted trait units, so compare signs and order rather than sizes.`
);
say();

// Data quality.
say(`## 4. Data cleaning`);
say();
const planted = (kind: Respondent['bad']) =>
  people.filter((p) => p.bad === kind).length;
const seen = new Map<string, number>();
let dupes = 0;
for (const row of rows) {
  const key = JSON.stringify(row.answers);
  if (seen.has(key)) dupes++;
  seen.set(key, 1);
}
const allSameSide = rows.filter((row) => {
  const v = row.answers['job-choice']?.value;
  if (!Array.isArray(v)) return false;
  const picks = v.map((s) => s.slice(-1));
  return picks.every((p) => p === picks[0]);
}).length;
const junk = rows.filter((row) =>
  /^(asdf|n\/a|idk|x)$/i.test(String(row.answers.metaphor?.value ?? ''))
).length;
say(`| Problem | Planted | Simple check | Caught |`);
say(`|---|---|---|---|`);
say(
  `| Exact duplicates | ${planted('duplicate')} | identical answers | ${dupes} |`
);
say(
  `| Straight-liners | ${planted('straight-liner')} | all 8 job picks on the same side | ${allSameSide} |`
);
say(
  `| Junk text | ${planted('junk-text')} | metaphor is asdf / n/a / idk / x | ${junk} |`
);
say();
say(
  `"All 8 picks on the same side" also flags a few genuine respondents by chance (about 1 in 128), so it is a flag for review, not proof.`
);

console.log(out.join('\n'));

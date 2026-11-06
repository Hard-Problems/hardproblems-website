// Turning conjoint answers into "what matters, and how much".
//
// The model is the standard one for paired choices: a binary logit on
// the difference between the two cards. Each card's appeal is the sum
// of a utility for each of its levels; the chance of picking card A is
// σ(appeal(A) − appeal(B) + positionBias). Fitting that by maximum
// likelihood gives a utility ("part-worth") for every level, and from
// those everything else:
//
//   - importance: how much an attribute CAN swing a choice — the gap
//     between its best and worst level, as a share of all such gaps.
//     It answers "which attributes drive decisions", within the ranges
//     tested. (Widen the pay range and pay would look more important;
//     that is a property of the method worth saying out loud in any
//     report.)
//   - part-worths: which level of each attribute people prefer, and by
//     how much. Centred, so the levels of one attribute sum to zero.
//   - pay equivalents: when the money attribute carries numeric
//     `value`s, every other level priced in pay — "a for-good mission
//     is worth giving up 12% of salary".
//
// Standard errors are clustered by respondent: one person's eight
// choices are not eight independent people, and treating them as such
// would make every result look more certain than it is.
//
// Dependency-free on purpose (this repo has no stats library and does
// not need one for a model with ~15 parameters).

import type { ConjointQuestion } from './types';
import { parseRounds, type Card, type Round } from './conjoint';

export type Choice = Round & { respondent: number };

/** Every valid choice in a set of responses. Malformed answers are skipped. */
export function choicesFrom(
  q: ConjointQuestion,
  responses: readonly { answers: Record<string, unknown> }[]
): Choice[] {
  const out: Choice[] = [];
  responses.forEach((row, respondent) => {
    const a = row.answers?.[q.id] as { value?: unknown } | undefined;
    if (!a || !Array.isArray(a.value)) return;
    const rounds = parseRounds(q, a.value as string[]);
    if (!rounds) return;
    for (const r of rounds) out.push({ ...r, respondent });
  });
  return out;
}

// ---- small linear algebra ---------------------------------------------

type Matrix = number[][];

function zeros(n: number, m = n): Matrix {
  return Array.from({ length: n }, () => new Array<number>(m).fill(0));
}

/** Gauss–Jordan with partial pivoting. Throws on a singular matrix. */
function invert(input: Matrix): Matrix {
  const n = input.length;
  const a = input.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  ]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
    }
    if (Math.abs(a[pivot][col]) < 1e-12) throw new Error('singular matrix');
    [a[col], a[pivot]] = [a[pivot], a[col]];
    const p = a[col][col];
    for (let j = 0; j < 2 * n; j++) a[col][j] /= p;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = a[r][col];
      if (f === 0) continue;
      for (let j = 0; j < 2 * n; j++) a[r][j] -= f * a[col][j];
    }
  }
  return a.map((row) => row.slice(n));
}

function multiply(x: Matrix, y: Matrix): Matrix {
  const out = zeros(x.length, y[0].length);
  for (let i = 0; i < x.length; i++) {
    for (let k = 0; k < y.length; k++) {
      if (x[i][k] === 0) continue;
      for (let j = 0; j < y[0].length; j++) out[i][j] += x[i][k] * y[k][j];
    }
  }
  return out;
}

// ---- the model ----------------------------------------------------------

/**
 * Columns of the design matrix. Column 0 is the intercept (a lean
 * towards whichever card is shown first); then one column per level
 * except each attribute's first, which is the reference the others
 * are measured against. With `numeric`, that attribute is instead one
 * column holding its levels' `value`s.
 */
type Column =
  | { kind: 'intercept' }
  | { kind: 'level'; attr: string; level: string }
  | { kind: 'numeric'; attr: string; values: Record<string, number> };

function columnsFor(q: ConjointQuestion, numeric?: string): Column[] {
  const cols: Column[] = [{ kind: 'intercept' }];
  for (const attr of q.attributes) {
    if (attr.id === numeric) {
      const values: Record<string, number> = {};
      for (const l of attr.levels) values[l.id] = l.value ?? 0;
      cols.push({ kind: 'numeric', attr: attr.id, values });
      continue;
    }
    for (const l of attr.levels.slice(1)) {
      cols.push({ kind: 'level', attr: attr.id, level: l.id });
    }
  }
  return cols;
}

function code(col: Column, card: Card): number {
  if (col.kind === 'intercept') return 0;
  if (col.kind === 'numeric') return col.values[card[col.attr]] ?? 0;
  return card[col.attr] === col.level ? 1 : 0;
}

function row(cols: Column[], c: Choice): number[] {
  return cols.map((col) =>
    col.kind === 'intercept' ? 1 : code(col, c.a) - code(col, c.b)
  );
}

type RawFit = {
  cols: Column[];
  beta: number[];
  /** Cluster-robust covariance of `beta`. */
  cov: Matrix;
  logLik: number;
};

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

/**
 * Newton–Raphson on the logit log-likelihood.
 *
 * A whisper of ridge (`RIDGE`) keeps the step defined when a level
 * never loses, or a small segment never saw some combination — without
 * it the estimate runs off to infinity instead of reporting "large".
 */
const RIDGE = 1e-4;

function fitLogit(cols: Column[], choices: readonly Choice[]): RawFit {
  const p = cols.length;
  const xs = choices.map((c) => row(cols, c));
  const ys = choices.map((c) => (c.pick === 'a' ? 1 : 0));
  let beta = new Array<number>(p).fill(0);

  let info = zeros(p);
  for (let iter = 0; iter < 50; iter++) {
    const grad = beta.map((b) => -RIDGE * b);
    info = zeros(p);
    for (let i = 0; i < p; i++) info[i][i] = RIDGE;
    xs.forEach((x, n) => {
      const z = x.reduce((s, v, j) => s + v * beta[j], 0);
      const pr = sigmoid(z);
      const w = pr * (1 - pr);
      for (let i = 0; i < p; i++) {
        if (x[i] === 0) continue;
        grad[i] += x[i] * (ys[n] - pr);
        for (let j = 0; j < p; j++) info[i][j] += w * x[i] * x[j];
      }
    });
    const step = multiply(
      invert(info),
      grad.map((g) => [g])
    ).map((r) => r[0]);
    beta = beta.map((b, i) => b + step[i]);
    if (Math.max(...step.map(Math.abs)) < 1e-8) break;
  }

  // Sandwich: bread⁻¹ · meat · bread⁻¹, with the meat summed per
  // respondent so their choices count as one cluster.
  const scores = new Map<number, number[]>();
  let logLik = 0;
  xs.forEach((x, n) => {
    const z = x.reduce((s, v, j) => s + v * beta[j], 0);
    const pr = sigmoid(z);
    logLik += ys[n] ? Math.log(pr) : Math.log(1 - pr);
    const s = scores.get(choices[n].respondent) ?? new Array<number>(p).fill(0);
    for (let i = 0; i < p; i++) s[i] += x[i] * (ys[n] - pr);
    scores.set(choices[n].respondent, s);
  });
  const meat = zeros(p);
  for (const s of scores.values()) {
    for (let i = 0; i < p; i++) {
      for (let j = 0; j < p; j++) meat[i][j] += s[i] * s[j];
    }
  }
  const g = scores.size;
  const correction = g > 1 ? g / (g - 1) : 1;
  const bread = invert(info);
  const cov = multiply(multiply(bread, meat), bread).map((r) =>
    r.map((v) => v * correction)
  );
  return { cols, beta, cov, logLik };
}

// ---- results --------------------------------------------------------

export type LevelResult = {
  id: string;
  label: string;
  /** Centred part-worth: the attribute's levels sum to zero. */
  utility: number;
  /** Clustered standard error of `utility`. */
  se: number;
  /**
   * Worth of this level over the attribute's least-liked level, in the
   * money attribute's units (percent of pay). Absent for the money
   * attribute itself, or when pay did not register as a positive.
   */
  moneyEquivalent?: number;
};

export type AttributeResult = {
  id: string;
  label: string;
  /** Share of all attributes' utility ranges, in percent. Sums to 100. */
  importance: number;
  levels: LevelResult[];
};

export type ConjointResult = {
  respondents: number;
  choices: number;
  /** Sorted most important first. */
  attributes: AttributeResult[];
  /**
   * Lean towards the left/first card, as a log-odds. Near zero is
   * what you want; a large value means people were picking by position.
   */
  positionBias: number;
  /**
   * McFadden's pseudo-R²: 0 is no better than a coin, and 0.2–0.4 is
   * considered a good fit for choice models.
   */
  pseudoR2: number;
  /** Utility per unit of the money attribute (per 1% of pay). */
  moneyPerUnit?: number;
  moneyAttribute?: string;
};

/**
 * Fit the model and summarise it.
 *
 * The money attribute is whichever one gives every level a numeric
 * `value` — `pay` in 2026. Pass `moneyAttribute: null` to skip the
 * pay-equivalent step.
 */
export function analyseConjoint(
  q: ConjointQuestion,
  choices: readonly Choice[],
  options: { moneyAttribute?: string | null } = {}
): ConjointResult {
  const fit = fitLogit(columnsFor(q), choices);
  const respondents = new Set(choices.map((c) => c.respondent)).size;

  const attributes: AttributeResult[] = q.attributes.map((attr) => {
    // Raw utilities: 0 for the reference level, the coefficient for
    // the rest. Centring subtracts their mean, which is a linear map —
    // so its standard error comes from c' Σ c with c the weights.
    const idx = attr.levels.map((l, i) =>
      i === 0
        ? -1
        : fit.cols.findIndex(
            (c) => c.kind === 'level' && c.attr === attr.id && c.level === l.id
          )
    );
    const raw = idx.map((j) => (j < 0 ? 0 : fit.beta[j]));
    const mean = raw.reduce((s, v) => s + v, 0) / raw.length;
    const k = attr.levels.length;
    const levels: LevelResult[] = attr.levels.map((l, i) => {
      const weights = new Map<number, number>();
      idx.forEach((j, m) => {
        if (j < 0) return;
        weights.set(j, (m === i ? 1 : 0) - 1 / k);
      });
      let variance = 0;
      for (const [a, wa] of weights) {
        for (const [b, wb] of weights) variance += wa * wb * fit.cov[a][b];
      }
      return {
        id: l.id,
        label: l.label,
        utility: raw[i] - mean,
        se: Math.sqrt(Math.max(variance, 0))
      };
    });
    return { id: attr.id, label: attr.label, importance: 0, levels };
  });

  const ranges = attributes.map((a) => {
    const us = a.levels.map((l) => l.utility);
    return Math.max(...us) - Math.min(...us);
  });
  const total = ranges.reduce((s, r) => s + r, 0) || 1;
  attributes.forEach((a, i) => {
    a.importance = (ranges[i] / total) * 100;
  });

  // Null-model log-likelihood: every choice a coin flip.
  const pseudoR2 = 1 - fit.logLik / (choices.length * Math.log(0.5));

  const result: ConjointResult = {
    respondents,
    choices: choices.length,
    attributes: [...attributes].sort((a, b) => b.importance - a.importance),
    positionBias: fit.beta[0],
    pseudoR2
  };

  // Pay equivalents. A second fit with pay as one number, so its
  // coefficient is "utility per 1% of pay"; every other level's
  // coefficient divided by it is that level priced in pay.
  const money =
    options.moneyAttribute === null
      ? undefined
      : (options.moneyAttribute ??
        q.attributes.find((a) => a.levels.every((l) => l.value !== undefined))
          ?.id);
  if (money) {
    const linear = fitLogit(columnsFor(q, money), choices);
    const perUnit =
      linear.beta[
        linear.cols.findIndex((c) => c.kind === 'numeric' && c.attr === money)
      ];
    result.moneyAttribute = money;
    result.moneyPerUnit = perUnit;
    if (perUnit > 0) {
      for (const attr of result.attributes) {
        if (attr.id === money) continue;
        const def = q.attributes.find((a) => a.id === attr.id)!;
        const raw = def.levels.map((l, i) => {
          if (i === 0) return 0;
          const j = linear.cols.findIndex(
            (c) => c.kind === 'level' && c.attr === attr.id && c.level === l.id
          );
          return linear.beta[j];
        });
        const worst = Math.min(...raw);
        attr.levels.forEach((l, i) => {
          l.moneyEquivalent = (raw[i] - worst) / perUnit;
        });
      }
    }
  }

  return result;
}

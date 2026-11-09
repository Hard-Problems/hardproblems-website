// Choice-based conjoint: building the job cards, pairing them (two
// fresh cards every round), and the stored form of an answer.
//
// Pure and server/client safe, like the rest of this folder. The form
// uses it to decide what to show next; validate.ts uses it to check a
// submission; conjoint-analysis.ts uses it to read answers back.
//
// ---- Stored form -----------------------------------------------------
//
// An answer is `value: string[]`, one string per choice, in order:
//
//   "pay:same,mission:for-good,…|pay:more-30,mission:commercial,…|b"
//
// That is card A, card B and the pick, each card listing every
// attribute as `attribute:level` in definition order. Self-describing
// on purpose: the row in the database can be read without this code,
// and the server can check every id against the definition without
// knowing the respondent's seed (which never leaves the browser).

import type { ConjointQuestion } from './types';
import { seededRandom } from './random';

/** Attribute id → level id. */
export type Card = Record<string, string>;
export type Side = 'a' | 'b';
export type Round = { a: Card; b: Card; pick: Side };

/** Generous ceiling on one stored round, checked before parsing. */
const MAX_ROUND_LENGTH = 1000;

export function encodeCard(q: ConjointQuestion, card: Card): string {
  return q.attributes.map((attr) => `${attr.id}:${card[attr.id]}`).join(',');
}

export function encodeRound(q: ConjointQuestion, round: Round): string {
  return `${encodeCard(q, round.a)}|${encodeCard(q, round.b)}|${round.pick}`;
}

/**
 * Strict: every attribute present, in definition order, with a level
 * the definition declares, and nothing else. Anything off is null
 * rather than repaired — see the allowlisting note in validate.ts.
 */
export function parseCard(q: ConjointQuestion, raw: string): Card | null {
  const parts = raw.split(',');
  if (parts.length !== q.attributes.length) return null;
  const card: Card = {};
  for (let i = 0; i < parts.length; i++) {
    const attr = q.attributes[i];
    const [attrId, levelId, ...rest] = parts[i].split(':');
    if (rest.length > 0 || attrId !== attr.id) return null;
    if (!attr.levels.some((l) => l.id === levelId)) return null;
    card[attrId] = levelId;
  }
  return card;
}

export function parseRound(q: ConjointQuestion, raw: string): Round | null {
  if (typeof raw !== 'string' || raw.length > MAX_ROUND_LENGTH) return null;
  const parts = raw.split('|');
  if (parts.length !== 3) return null;
  const a = parseCard(q, parts[0]);
  const b = parseCard(q, parts[1]);
  const pick = parts[2];
  if (!a || !b || (pick !== 'a' && pick !== 'b')) return null;
  return { a, b, pick };
}

export function sameCard(x: Card, y: Card): boolean {
  const keys = Object.keys(x);
  return (
    keys.length === Object.keys(y).length && keys.every((k) => x[k] === y[k])
  );
}

export function isExcluded(q: ConjointQuestion, card: Card): boolean {
  return (q.exclude ?? []).some((combo) =>
    Object.entries(combo).every(([attr, level]) => card[attr] === level)
  );
}

/**
 * One random card.
 *
 * With `rival`, every attribute takes a DIFFERENT level from the
 * rival's where it has more than one ("minimal overlap"). Each choice
 * then says something about every attribute at once — an attribute
 * that is the same on both cards cannot have decided anything — which
 * is the most information a single choice can carry.
 *
 * If the exclusions make a minimal-overlap card impossible after a
 * few tries, the overlap rule is relaxed rather than the exclusions:
 * a card that matches its rival on one row is a weaker question, a
 * card describing a job that cannot exist is a bad one.
 */
function drawCard(q: ConjointQuestion, rand: () => number, rival?: Card): Card {
  const pick = <T>(xs: T[]): T => xs[Math.floor(rand() * xs.length)];
  for (let attempt = 0; attempt < 200; attempt++) {
    const strict = rival && attempt < 50;
    const card: Card = {};
    for (const attr of q.attributes) {
      let levels = attr.levels.map((l) => l.id);
      if (strict && levels.length > 1) {
        levels = levels.filter((l) => l !== rival[attr.id]);
      }
      card[attr.id] = pick(levels);
    }
    if (isExcluded(q, card)) continue;
    if (rival && sameCard(card, rival)) continue;
    return card;
  }
  // Unreachable with any sensible definition; fail loudly in testing
  // rather than show a broken card.
  throw new Error(`conjoint ${q.id}: could not draw a valid card`);
}

/**
 * The two cards for the next choice.
 *
 * Deterministic from the seed and the round number, so going back and
 * forward through the survey shows the same cards. Every round is two
 * fresh cards, independent of earlier picks.
 *
 * This used to be "winner stays on": the pick stayed and met a new
 * challenger. That halved the reading, but people tend to stick with
 * a job they have already chosen, and that stickiness would have
 * leaked into the attribute weights; later rounds also became lopsided
 * (a strong incumbent against a random card), and a lopsided choice
 * says little. Independent pairs are the standard design and keep each
 * choice a clean comparison. Any lean to one side is still measured:
 * the analysis fits a position term.
 */
export function nextPair(
  q: ConjointQuestion,
  seed: string,
  rounds: readonly Round[]
): { a: Card; b: Card } {
  const rand = seededRandom(`${seed}:${q.id}:${rounds.length}`);
  const a = drawCard(q, rand);
  return { a, b: drawCard(q, rand, a) };
}

/** The stored strings, parsed. Null if any round is malformed. */
export function parseRounds(
  q: ConjointQuestion,
  value: readonly string[]
): Round[] | null {
  const rounds: Round[] = [];
  for (const raw of value) {
    const r = parseRound(q, raw);
    if (!r) return null;
    rounds.push(r);
  }
  return rounds;
}

/**
 * Check a complete answer. Returns an error message, or null.
 *
 * Beyond the per-card allowlisting, it checks the right number of
 * rounds, two different cards each time and no card that the
 * exclusions forbid. A payload that fails any of these was not made by
 * our form.
 */
export function validateConjoint(
  q: ConjointQuestion,
  value: readonly string[]
): string | null {
  if (value.length < q.rounds) {
    return `Please make all ${q.rounds} choices.`;
  }
  const invalid = 'Please choose from the jobs shown.';
  if (value.length > q.rounds) return invalid;
  const rounds = parseRounds(q, value);
  if (!rounds) return invalid;
  for (const r of rounds) {
    if (sameCard(r.a, r.b)) return invalid;
    if (isExcluded(q, r.a) || isExcluded(q, r.b)) return invalid;
  }
  return null;
}

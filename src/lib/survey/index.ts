// Registry and the helpers shared by the page, the form and the API.
//
// Everything here is pure and server/client safe — no database, no
// `next/headers` — so the client form and the submit route can both
// import it and therefore cannot disagree about what a valid answer is.

import type { Article } from '../articles';
import type { SurveyDefinition, SurveyQuestion } from './types';
import { SURVEY_2026 } from './2026';

const SURVEYS: SurveyDefinition[] = [SURVEY_2026];

export function getSurvey(year: number | string): SurveyDefinition | null {
  const n = typeof year === 'number' ? year : Number(year);
  if (!Number.isInteger(n)) return null;
  return SURVEYS.find((s) => s.year === n) ?? null;
}

/** Every year we have run, newest first — for listings and cross-links. */
export function allSurveys(): SurveyDefinition[] {
  return [...SURVEYS].sort((a, b) => b.year - a.year);
}

/**
 * Whether the form accepts answers right now.
 *
 * Deliberately separate from "does this page exist": after closing, the
 * permalink still renders the questionnaire and the intro, it just
 * cannot be filled in. Checked again on the server at submit time, since
 * a client that was loaded before the deadline could otherwise post
 * after it.
 */
export function isOpen(
  survey: SurveyDefinition,
  now: Date = new Date()
): boolean {
  const t = now.getTime();
  return t >= Date.parse(survey.opensAt) && t < Date.parse(survey.closesAt);
}

export function findQuestion(
  survey: SurveyDefinition,
  id: string
): SurveyQuestion | null {
  return survey.questions.find((q) => q.id === id) ?? null;
}

/**
 * The wording to substitute for `{term}`, from the respondent's answer
 * to the role question.
 */
export function termFor(
  survey: SurveyDefinition,
  answers: Record<string, unknown>
): string {
  const chosen = answers[survey.termSourceId];
  const id =
    typeof chosen === 'string'
      ? chosen
      : Array.isArray(chosen) && typeof chosen[0] === 'string'
        ? (chosen[0] as string)
        : '';
  return survey.roleTerms[id] ?? survey.defaultTerm;
}

/**
 * Substitute `{term}` and `{Term}` in a question's text.
 *
 * `{Term}` is the sentence-initial form — "Design in 2026 feels like…" —
 * and only the first letter is touched, so "product management" becomes
 * "Product management" rather than being title-cased into something
 * nobody writes.
 */
export function applyTerm(text: string, term: string): string {
  const capitalised = term.charAt(0).toUpperCase() + term.slice(1);
  return text.replace(/\{term\}/g, term).replace(/\{Term\}/g, capitalised);
}

// ---------------------------------------------------------------------
// Option ordering
//
// `shuffle` has to be stable for one respondent across a whole sitting:
// the brief asks for back/forward navigation, and a list that reorders
// itself when you return to it is disorienting and invites a mis-click.
// So the order is derived from a seed generated once per response and
// kept with the answers, rather than from Math.random() at render time.
// It also means the server can reproduce exactly what the respondent
// saw, if we ever need to.
// ---------------------------------------------------------------------

/** xmur3 + mulberry32: small, dependency-free, deterministic from a string. */
function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * The options for a question, in the order they should be shown.
 *
 * `seed` should be the per-response seed; the question id is mixed in so
 * two shuffled questions don't come out correlated.
 */
export function orderedOptions<T extends { id: string; label: string }>(
  question: { id: string; options?: T[]; order?: string },
  seed: string
): T[] {
  const options = question.options ?? [];
  switch (question.order) {
    case 'alpha':
      return [...options].sort((a, b) => a.label.localeCompare(b.label));
    case 'alphaExceptLast': {
      // Alphabetical, but "Other…" stays at the bottom. Sorted into
      // place it would sit under O, in the middle of the real choices,
      // where it reads as one of them rather than as the escape hatch.
      const head = options.slice(0, -1);
      const tail = options.slice(-1);
      return [
        ...[...head].sort((a, b) => a.label.localeCompare(b.label)),
        ...tail
      ];
    }
    case 'shuffle':
      return shuffled(options, seededRandom(`${seed}:${question.id}`));
    case 'shuffleExceptLast': {
      // "Other…" belongs at the bottom; a respondent scanning for it
      // should always find it in the same place.
      const head = options.slice(0, -1);
      const tail = options.slice(-1);
      return [
        ...shuffled(head, seededRandom(`${seed}:${question.id}`)),
        ...tail
      ];
    }
    default:
      return options;
  }
}

/**
 * Where the link was shared, from `?source=`.
 *
 * Captured blindly, as the brief asks, but not stored blindly: it is
 * lowercased and reduced to a short slug. That keeps it useful for
 * grouping and means a crafted link cannot smuggle anything into the
 * database, the Slack notification or any later report.
 */
export const MAX_SOURCE_LENGTH = 64;

export function normalizeSource(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SOURCE_LENGTH);
}

/**
 * The survey shaped as an Article, so it can be rendered by the
 * homepage's existing <ArticleCard> rather than by a second card
 * component that would have to be kept visually in step by eye.
 *
 * It is not an article and does not pretend to be one in the markup:
 * the caller passes `href` so the card links to /survey/<year>, and a
 * plain "Survey" kicker instead of an article type — "Survey" is not a
 * type, and linking it would point at a /articles/type/ page that 404s.
 *
 * `publishedAt` is the opening date, which is what lights the card's
 * "NEW" badge for the first 30 days the survey is open.
 */
export function surveyAsArticle(survey: SurveyDefinition): Article {
  const opens = survey.opensAt.slice(0, 10);
  return {
    slug: `survey-${survey.year}`,
    title: survey.title,
    excerpt: survey.intro,
    author: 'Hard Problems',
    publishedAt: opens,
    updatedAt: opens,
    status: 'published',
    // Empty so the card renders no type link; the caller supplies
    // `kickerLabel` instead.
    articleType: '',
    topics: [],
    organizations: [],
    people: [],
    readingTime: 5,
    featured: false,
    image: survey.image,
    imageAlt: `${survey.title} — take part`,
    // The Article type carries the body copy; a card never reads it,
    // and the survey's "body" is the questionnaire itself.
    content: '',
    contentHtml: ''
  };
}

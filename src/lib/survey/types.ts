// Schema for the annual survey.
//
// The point of this file is that a year's questionnaire is DATA, not
// code: `2026.ts` is a single exported object, and the page, the
// progress bar, the client-side validation and the server-side
// validation are all derived from it. Adding next year's survey should
// mean writing one new definition file and nothing else.
//
// That is also the security story. The server validates a submission by
// walking this definition — an answer is accepted only if its question
// exists, its shape matches the declared kind, and (for choice
// questions) the option id is one this definition declares. Nothing
// free-form reaches storage except the fields explicitly declared as
// text, and those carry their own length caps.

export type SurveyOption = {
  /**
   * Stable identifier, stored in the database and compared against on
   * submit. Keep these unchanged between years where a question is
   * unchanged, so answers remain comparable year over year — the labels
   * can be reworded freely, the ids should not be.
   */
  id: string;
  label: string;
  /**
   * Reveals a free-text input when chosen ("Other…"). The text is stored
   * alongside the option id, capped at OTHER_MAX_LENGTH.
   */
  isOther?: boolean;
};

/**
 * How to order the options when rendering.
 *
 * `shuffle` and `shuffleExceptLast` are seeded per respondent so the
 * order stays put when they navigate backwards and forwards — a list
 * that reshuffles under you is both disorienting and a good way to
 * record an accidental answer.
 */
export type OptionOrder =
  'given' | 'alpha' | 'alphaExceptLast' | 'shuffle' | 'shuffleExceptLast';

type BaseQuestion = {
  /**
   * Stable across years. Used as the step's URL fragment, the storage
   * key, and the column this answer lands in for analysis.
   */
  id: string;
  /**
   * The question, as asked. May contain `{term}` or `{Term}`, which are
   * replaced with the wording derived from the respondent's answer to
   * the role question — see `termSourceId` on SurveyDefinition.
   */
  text: string;
  /** Rendered as a GDS-style hint above the inputs, not as placeholder text. */
  hint?: string;
  /** Only question 25 is optional; everything else must be answered. */
  optional?: boolean;
  /**
   * Put this question on a shared step with its neighbours.
   *
   * One question per page is the GDS default and the right one for
   * anything that needs thought. It is the wrong one for a run of
   * short factual questions — role, experience, country, company size
   * — where a page each turns five seconds of typing into five page
   * loads, and the length of the survey becomes the reason people
   * leave it.
   *
   * CONSECUTIVE questions sharing a group id render as one step, under
   * the heading in `groups`. The questions stay separate entries here,
   * so storage, validation and analysis are unchanged — this only
   * affects how many of them appear at once.
   */
  group?: string;
};

/** One choice from a list. Radio buttons; selecting one advances the step. */
export type SingleQuestion = BaseQuestion & {
  kind: 'single';
  options: SurveyOption[];
  order?: OptionOrder;
  /**
   * Radios by default. `select` is for long lists of ordered values —
   * years of experience, company size — where radios take a screenful
   * for something nobody needs to compare side by side.
   *
   * Presentation only: the answer is still one option id, validated by
   * exactly the same rule.
   */
  as?: 'radio' | 'select';
};

/** Several choices from a list. Checkboxes; needs an explicit Continue. */
export type MultiQuestion = BaseQuestion & {
  kind: 'multi';
  options: SurveyOption[];
  order?: OptionOrder;
};

/**
 * A 0–5 scale with labelled ends. Rendered as six radio buttons rather
 * than a slider: GDS advises against sliders because they are hard to
 * operate with a keyboard, invisible to a screen reader as a set of
 * discrete choices, and impossible to leave genuinely unanswered.
 */
export type LikertQuestion = BaseQuestion & {
  kind: 'likert';
  /**
   * One label per point, low to high — LIKERT_POINTS of them.
   *
   * Every point is named rather than just the two ends. A bare 0-5 row
   * with captions underneath asks the respondent to invent the middle
   * for themselves, and two people reading "3" as "fine" and "could be
   * worse" produce the same number from different answers. Naming each
   * point is what makes the results comparable.
   *
   * It is also why these render as a vertical list: six labels do not
   * fit across a reading column, and shrinking them to fit is how you
   * get a scale nobody reads.
   */
  labels: readonly string[];
};

/** Single-line free text. */
export type TextQuestion = BaseQuestion & {
  kind: 'text';
  maxLength: number;
};

/** Multi-line free text. */
export type TextareaQuestion = BaseQuestion & {
  kind: 'textarea';
  maxLength: number;
};

/**
 * Country picker. The list is not inlined here because the site already
 * carries a 178-country table; the renderer supplies it so this
 * definition stays about the questionnaire.
 */
export type CountryQuestion = BaseQuestion & {
  kind: 'country';
};

export type SurveyQuestion =
  | SingleQuestion
  | MultiQuestion
  | LikertQuestion
  | TextQuestion
  | TextareaQuestion
  | CountryQuestion;

export const LIKERT_MIN = 0;
export const LIKERT_MAX = 5;
/** How many labels a Likert question must carry. */
export const LIKERT_POINTS = LIKERT_MAX - LIKERT_MIN + 1;

/** Cap on the free text behind an "Other…" option. */
export const OTHER_MAX_LENGTH = 100;

export type SurveyDefinition = {
  /** Calendar year, and the URL segment: /survey/2026. */
  year: number;
  title: string;
  /** Shown on the landing page above the Start button. */
  intro: string;
  /**
   * Card and social-share image, as a site-absolute path. Follows the
   * articles' convention: `thumb-*` images are used for listings and for
   * openGraph/twitter, not as an on-page hero.
   *
   * It matters more here than on an article — the end of the survey asks
   * people to share the link, so this is the picture that travels.
   */
  image?: string;
  /**
   * Inclusive opening date and EXCLUSIVE closing instant. After this the
   * permalink still renders — the questionnaire, the intro and the
   * results when they exist — but the form itself is closed.
   */
  opensAt: string;
  closesAt: string;
  /**
   * The question whose answer supplies `{term}`. Its options each carry
   * a `term`; see roleTerms below.
   */
  termSourceId: string;
  /**
   * Headings for the shared steps — see `group` on a question. Keyed by
   * group id; a group with no entry here falls back to no heading.
   */
  groups?: Record<string, { title: string; hint?: string }>;
  /** Option id → the wording used for `{term}` in later questions. */
  roleTerms: Record<string, string>;
  /**
   * Option id → the sentence SUBJECT used for `{Subject}`, for roles
   * whose field noun cannot also serve as one.
   *
   * Most roles need only `roleTerms`: "design" works both as the
   * subject of "Design in 2026 feels like…" and inside "a career in
   * design". "Founder" has no single noun that does both — "Being a
   * founder in 2026 feels like…" but "a career in startups" — so the
   * two forms are allowed to diverge. Partial: anything absent here
   * falls back to its `roleTerms` entry.
   */
  roleSubjects?: Record<string, string>;
  /** Fallback when the role question is somehow unanswered. */
  defaultTerm: string;
  questions: SurveyQuestion[];
};

// The shape of one translation of the survey.
//
// A translation replaces WORDS only. Every id — question, option,
// attribute, level, group — is the same in every language, so a French
// answer and an English one are stored identically and analysed
// together. The only trace of the language in a response is its
// `language` column.
//
// Two parts:
//   - `content`: the year's questionnaire (questions, options, job-card
//     wording), keyed by the definition's ids. See content.ts.
//   - `ui`: everything else the survey shows — buttons, the start page,
//     the prize draw, the thank-you page, validation messages. See
//     ui-en.ts, which is the English source and defines the keys.
//
// Placeholders in braces — {n}, {total}, {title}, {link} — are filled in
// by the form and must survive translation unchanged (the test checks).

import type { EN_UI } from './ui-en';

export type LevelContent = {
  label: string;
  /** Wording on the job card, when shorter than `label`. */
  short?: string;
  /**
   * For a level whose card wording depends on another attribute (the
   * brand line names the kind of organisation: "Well-known charity"):
   * the full wording for each of that attribute's levels, keyed by its
   * level id. Lets a language agree adjectives with the noun's gender
   * instead of assembling a phrase from parts.
   */
  shortFor?: Record<string, string>;
  /** A plain noun for this level, used by English `{organisation}`. */
  noun?: string;
};

export type QuestionContent = {
  text: string;
  hint?: string;
  /** Option id → label, for single and multi questions. */
  options?: Record<string, string>;
  /** Likert labels, low to high, one per point. */
  labels?: string[];
  /** Conjoint: attribute id → its row name and level wording. */
  attributes?: Record<
    string,
    { label: string; levels: Record<string, LevelContent> }
  >;
  /** Conjoint: the card titles, in the order of the definition's `cardTitle`. */
  cardTitles?: string[];
};

export type SurveyContent = {
  title: string;
  shortTitle?: string;
  intro: string;
  why?: string[];
  roleTerms: Record<string, string>;
  roleSubjects?: Record<string, string>;
  /** Role id → question id → that question's whole wording for the role. */
  roleQuestionText?: Record<string, Record<string, string>>;
  defaultTerm: string;
  groups?: Record<string, { title: string; hint?: string }>;
  questions: Record<string, QuestionContent>;
};

/** Plural forms, by Intl.PluralRules category. `other` is required. */
export type Plural = Partial<Record<Intl.LDMLPluralRule, string>> & {
  other: string;
};

/**
 * The interface strings. Derived from the English file so a key added
 * there is required everywhere — a translation missing it fails to
 * type-check.
 */
export type SurveyUi = DeepStrings<typeof EN_UI>;

type DeepStrings<T> = T extends string
  ? string
  : T extends readonly string[]
    ? string[]
    : T extends Plural
      ? Plural
      : { [K in keyof T]: DeepStrings<T[K]> };

export type SurveyTranslation = {
  /** Matches a `code` in languages.ts. */
  code: string;
  content: SurveyContent;
  ui: SurveyUi;
};

// Validation, derived entirely from the year's definition.
//
// Used in both places: the client calls it per step to decide whether
// Continue is allowed, and the submit route calls it over the whole
// payload before anything is written. Sharing it is what stops the two
// drifting into disagreement — and the server's copy is the one that
// counts, since the client's can be bypassed by anyone with a terminal.
//
// The security posture is allowlisting, not sanitising. A choice answer
// is accepted only if the definition declares that option id; anything
// else is rejected rather than cleaned up. The only free text that
// reaches storage is the fields explicitly declared `text`, `textarea`
// or the string behind an `isOther` option, each capped by the
// definition. So there is no code path where an attacker-chosen string
// lands anywhere without having passed a declared length limit.

import type { SurveyDefinition, SurveyQuestion } from './types';
import { LIKERT_MIN, LIKERT_MAX, OTHER_MAX_LENGTH } from './types';
import { validateConjoint } from './conjoint';

/**
 * One question's answer.
 *
 * `value` is the option id, the Likert number as a string, the country
 * name, the free text, or — for a conjoint question — one encoded
 * string per choice (see conjoint.ts). `otherText` carries the
 * write-in when an `isOther` option is chosen.
 */
export type Answer = {
  value: string | string[];
  otherText?: string;
};

export type Answers = Record<string, Answer>;

export type FieldError = { questionId: string; message: string };

// Control characters have no business in any of these fields, and they
// are a classic way to smuggle payloads past a naive log or CSV export.
// Newlines are allowed only in textarea answers, handled below.
const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

// A cell starting with "=" is run as a formula when an export is opened
// in a spreadsheet, so no free-text answer may begin with one.
const FORMULA_START = /^=/;
const FORMULA_MESSAGE = 'Please don’t start your answer with “=”.';

function cleanLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function isBlank(a: Answer | undefined): boolean {
  if (!a) return true;
  if (Array.isArray(a.value)) return a.value.length === 0;
  return typeof a.value === 'string' && a.value.trim().length === 0;
}

/**
 * Whether an answer has the shape our form sends: an object whose
 * `value` is a string or an array of strings, and whose `otherText`, if
 * present, is a string. Checked before anything else touches it — the
 * payload is attacker-controlled JSON, and a number where a string
 * belongs would otherwise throw deep inside validation as a 500.
 */
function isWellFormed(a: unknown): a is Answer {
  if (typeof a !== 'object' || a === null || Array.isArray(a)) return false;
  const { value, otherText } = a as Record<string, unknown>;
  const valueOk =
    typeof value === 'string' ||
    (Array.isArray(value) && value.every((v) => typeof v === 'string'));
  return valueOk && (otherText === undefined || typeof otherText === 'string');
}

/**
 * Validate one answer. Returns an error message, or null when valid.
 *
 * `countryNames` is passed in rather than imported so this module stays
 * free of the site's data tables — the caller owns the country list.
 */
export function validateAnswer(
  question: SurveyQuestion,
  answer: Answer | undefined,
  countryNames: readonly string[] = [],
  label?: string
): string | null {
  if (answer !== undefined && answer !== null && !isWellFormed(answer)) {
    return 'Please answer this question again.';
  }
  if (isBlank(answer)) {
    if (question.optional) return null;
    // Named when the caller can supply the wording. A step holding
    // five questions produces five identical "Please answer this
    // question" lines otherwise, which says nothing about which one —
    // and the summary is what a screen reader reads on failure,
    // without the headings around it for context.
    //
    // The caller passes the question as DISPLAYED, with `{term}`
    // already substituted; this module has no way to resolve those.
    return label ? `Please answer “${label}”` : 'Please answer this question.';
  }
  const a = answer as Answer;

  switch (question.kind) {
    case 'single': {
      if (typeof a.value !== 'string') return 'Please choose one option.';
      const option = question.options.find((o) => o.id === a.value);
      if (!option) return 'Please choose one of the options.';
      if (option.isOther) return validateOtherText(a.otherText);
      return null;
    }

    case 'multi': {
      if (!Array.isArray(a.value)) return 'Please choose at least one option.';
      if (new Set(a.value).size !== a.value.length) {
        return 'Please choose each option only once.';
      }
      const known = new Set(question.options.map((o) => o.id));
      if (!a.value.every((v) => typeof v === 'string' && known.has(v))) {
        return 'Please choose from the options listed.';
      }
      const otherChosen = question.options.some(
        (o) => o.isOther && a.value.includes(o.id)
      );
      if (otherChosen) return validateOtherText(a.otherText);
      return null;
    }

    case 'likert': {
      if (typeof a.value !== 'string') return 'Please choose a rating.';
      // Strict integer parse — "3abc" and "3.5" are both rejected rather
      // than silently coerced by Number().
      if (!/^\d+$/.test(a.value)) return 'Please choose a rating.';
      const n = Number(a.value);
      if (n < LIKERT_MIN || n > LIKERT_MAX) return 'Please choose a rating.';
      return null;
    }

    case 'conjoint': {
      if (!Array.isArray(a.value)) {
        return `Please make all ${question.rounds} choices.`;
      }
      return validateConjoint(question, a.value);
    }

    case 'country': {
      if (typeof a.value !== 'string') return 'Please choose a country.';
      if (!countryNames.includes(a.value)) {
        return 'Please choose a country from the list.';
      }
      return null;
    }

    case 'text': {
      if (typeof a.value !== 'string') return 'Please write an answer.';
      const v = cleanLine(a.value);
      if (!v) return question.optional ? null : 'Please write an answer.';
      if (CONTROL_CHARS.test(v)) return 'Please remove any special characters.';
      if (FORMULA_START.test(v)) return FORMULA_MESSAGE;
      if (v.length > question.maxLength) {
        return `Please keep this under ${question.maxLength} characters.`;
      }
      return null;
    }

    case 'textarea': {
      if (typeof a.value !== 'string') return 'Please write an answer.';
      // Newlines are meaningful here, so only collapse trailing space.
      const v = a.value.trim();
      if (!v) return question.optional ? null : 'Please write an answer.';
      if (CONTROL_CHARS.test(v)) return 'Please remove any special characters.';
      if (FORMULA_START.test(v)) return FORMULA_MESSAGE;
      if (v.length > question.maxLength) {
        return `Please keep this under ${question.maxLength} characters.`;
      }
      return null;
    }
  }
}

function validateOtherText(text: string | undefined): string | null {
  const v = cleanLine(text ?? '');
  if (!v) return 'Please say what you mean by “Other”.';
  if (CONTROL_CHARS.test(v)) return 'Please remove any special characters.';
  if (FORMULA_START.test(v)) return FORMULA_MESSAGE;
  if (v.length > OTHER_MAX_LENGTH) {
    return `Please keep this under ${OTHER_MAX_LENGTH} characters.`;
  }
  return null;
}

/**
 * Validate a whole submission.
 *
 * Also rejects answers to questions this survey does not have, rather
 * than ignoring them: an unexpected key means the payload did not come
 * from our form, and storing it would let anyone write arbitrary columns
 * into the response record.
 */
export function validateSubmission(
  survey: SurveyDefinition,
  answers: Answers,
  countryNames: readonly string[] = []
): FieldError[] {
  const errors: FieldError[] = [];

  const known = new Set(survey.questions.map((q) => q.id));
  for (const id of Object.keys(answers)) {
    if (!known.has(id)) {
      errors.push({ questionId: id, message: 'Unknown question.' });
    }
  }

  for (const question of survey.questions) {
    const message = validateAnswer(
      question,
      answers[question.id],
      countryNames
    );
    if (message) errors.push({ questionId: question.id, message });
  }

  return errors;
}

/**
 * The stored form of a submission: trimmed, with unknown keys dropped
 * and every string already length-checked by validateSubmission.
 *
 * Call this only after validation passes.
 */
export function normalizeAnswers(
  survey: SurveyDefinition,
  answers: Answers
): Answers {
  const out: Answers = {};
  for (const question of survey.questions) {
    const a = answers[question.id];
    if (isBlank(a)) continue;
    const value = Array.isArray(a.value)
      ? a.value.map((v) => v.trim())
      : question.kind === 'textarea'
        ? a.value.trim()
        : cleanLine(a.value);
    // The write-in is kept only when an "Other…" option is actually
    // chosen — the only case validation checks it. Anything else is
    // dropped: the form can legitimately send a stale one (typed, then
    // a different option picked), and a crafted payload could otherwise
    // store unchecked text of any length against any question.
    const otherChosen =
      (question.kind === 'single' || question.kind === 'multi') &&
      question.options.some(
        (o) =>
          o.isOther &&
          (Array.isArray(value) ? value.includes(o.id) : value === o.id)
      );
    const otherText =
      otherChosen && a.otherText ? cleanLine(a.otherText) : undefined;
    out[question.id] = otherText ? { value, otherText } : { value };
  }
  return out;
}

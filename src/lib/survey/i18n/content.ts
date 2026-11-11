// Moving a questionnaire's words in and out of its definition.
//
// `extractContent` reads every translatable string out of a definition,
// keyed by id — that is the English source a translation follows, and
// what `scripts/survey-i18n-source.ts` prints for translators.
//
// `localizeSurvey` does the reverse: it takes the definition and a
// translation and returns the same definition with the words replaced.
// Ids, order, rules, exclusions, card layout — everything that is not a
// word — come from the definition untouched, so the form, validation and
// storage cannot tell a translated survey from the English one.
//
// Pure, server and client safe.

import type {
  ConjointQuestion,
  SurveyDefinition,
  SurveyQuestion
} from '../types';
import type { QuestionContent, SurveyContent } from './types';

export function extractContent(survey: SurveyDefinition): SurveyContent {
  const questions: Record<string, QuestionContent> = {};
  for (const q of survey.questions) {
    const c: QuestionContent = { text: q.text };
    if (q.hint) c.hint = q.hint;
    if (q.kind === 'single' || q.kind === 'multi') {
      c.options = Object.fromEntries(q.options.map((o) => [o.id, o.label]));
    }
    if (q.kind === 'likert') c.labels = [...q.labels];
    if (q.kind === 'conjoint') {
      c.attributes = Object.fromEntries(
        q.attributes.map((a) => [
          a.id,
          {
            label: a.label,
            levels: Object.fromEntries(
              a.levels.map((l) => [
                l.id,
                {
                  label: l.label,
                  ...(l.short !== undefined && { short: l.short }),
                  ...(l.noun !== undefined && { noun: l.noun })
                }
              ])
            )
          }
        ])
      );
      if (q.cardTitle) c.cardTitles = q.cardTitle.map((t) => t.label);
    }
    questions[q.id] = c;
  }
  return {
    title: survey.title,
    ...(survey.shortTitle !== undefined && { shortTitle: survey.shortTitle }),
    intro: survey.intro,
    ...(survey.why && { why: [...survey.why] }),
    roleTerms: { ...survey.roleTerms },
    ...(survey.roleSubjects && { roleSubjects: { ...survey.roleSubjects } }),
    ...(survey.roleQuestionText && {
      roleQuestionText: structuredClone(survey.roleQuestionText)
    }),
    defaultTerm: survey.defaultTerm,
    ...(survey.notWorking && {
      notWorking: structuredClone({
        questions: survey.notWorking.questions,
        ...(survey.notWorking.groups && { groups: survey.notWorking.groups })
      })
    }),
    ...(survey.groups && {
      groups: Object.fromEntries(
        Object.entries(survey.groups).map(([id, g]) => [
          id,
          { title: g.title, ...(g.hint !== undefined && { hint: g.hint }) }
        ])
      )
    }),
    questions
  };
}

/**
 * The definition with a translation's words in place of its own.
 *
 * Anything the translation lacks keeps the definition's English — but
 * the test (survey.test.ts) requires every translation to be complete,
 * so in practice this fallback only covers a key added to the definition
 * after the translations were written.
 */
export function localizeSurvey(
  survey: SurveyDefinition,
  content: SurveyContent
): SurveyDefinition {
  return {
    ...survey,
    title: content.title,
    shortTitle: content.shortTitle ?? survey.shortTitle,
    intro: content.intro,
    why: content.why ?? survey.why,
    roleTerms: { ...survey.roleTerms, ...content.roleTerms },
    roleSubjects: { ...survey.roleSubjects, ...content.roleSubjects },
    // Replaced, not merged: a translation's whole-question wording for a
    // role must not fall back to an English sentence.
    roleQuestionText: content.roleQuestionText ?? survey.roleQuestionText,
    defaultTerm: content.defaultTerm,
    // Replaced, not merged, like roleQuestionText: half-translated
    // wording would mix languages within one survey. `when` is not
    // words, so it always comes from the definition.
    notWorking:
      survey.notWorking && content.notWorking
        ? { ...content.notWorking, when: survey.notWorking.when }
        : survey.notWorking,
    groups: survey.groups
      ? Object.fromEntries(
          Object.entries(survey.groups).map(([id, g]) => [
            id,
            {
              ...g,
              title: content.groups?.[id]?.title ?? g.title,
              hint: content.groups?.[id]?.hint ?? g.hint
            }
          ])
        )
      : undefined,
    questions: survey.questions.map((q) =>
      localizeQuestion(q, content.questions[q.id])
    )
  };
}

function localizeQuestion(
  q: SurveyQuestion,
  c: QuestionContent | undefined
): SurveyQuestion {
  if (!c) return q;
  const base = {
    text: c.text,
    hint: q.hint === undefined ? undefined : (c.hint ?? q.hint)
  };
  switch (q.kind) {
    case 'single':
    case 'multi':
      return {
        ...q,
        ...base,
        options: q.options.map((o) => ({
          ...o,
          label: c.options?.[o.id] ?? o.label
        }))
      };
    case 'likert':
      return {
        ...q,
        ...base,
        labels:
          c.labels && c.labels.length === q.labels.length ? c.labels : q.labels
      };
    case 'conjoint':
      return localizeConjoint(q, c, base);
    default:
      return { ...q, ...base };
  }
}

function localizeConjoint(
  q: ConjointQuestion,
  c: QuestionContent,
  base: { text: string; hint?: string }
): ConjointQuestion {
  return {
    ...q,
    ...base,
    attributes: q.attributes.map((a) => {
      const ca = c.attributes?.[a.id];
      return {
        ...a,
        label: ca?.label ?? a.label,
        levels: a.levels.map((l) => {
          const cl = ca?.levels[l.id];
          if (!cl) return l;
          const shortFor = cl.shortFor;
          return {
            ...l,
            label: cl.label,
            short: shortFor ? undefined : (cl.short ?? l.short),
            noun: cl.noun ?? l.noun,
            // The attribute the English wording names in braces — the
            // one whose level picks the phrase.
            shortBy: shortFor
              ? { attribute: referencedAttribute(l.short), values: shortFor }
              : undefined
          };
        })
      };
    }),
    cardTitle: q.cardTitle?.map((t, i) => ({
      ...t,
      label: c.cardTitles?.[i] ?? t.label
    }))
  };
}

/** "Well-known {organisation}" → "organisation". */
export function referencedAttribute(text: string | undefined): string {
  const m = text?.match(/\{(\w+)\}/);
  if (!m) return '';
  return m[1].charAt(0).toLowerCase() + m[1].slice(1);
}

/**
 * Alphabetical option lists put in order once, on the server, in the
 * respondent's language — and marked `given` so the form keeps that
 * order. Sorting in the browser instead could disagree with the
 * server's render (their collation data is not always the same
 * version), which React reports as a hydration error and fixes by
 * re-rendering the list under the respondent's cursor.
 */
export function presortAlphabetical(
  survey: SurveyDefinition,
  locale: string
): SurveyDefinition {
  let compare: (a: string, b: string) => number;
  try {
    compare = new Intl.Collator(locale).compare;
  } catch {
    compare = (a, b) => a.localeCompare(b);
  }
  return {
    ...survey,
    questions: survey.questions.map((q) => {
      if (q.kind !== 'single' && q.kind !== 'multi') return q;
      if (q.order === 'alpha') {
        return {
          ...q,
          order: 'given',
          options: [...q.options].sort((a, b) => compare(a.label, b.label))
        };
      }
      if (q.order === 'alphaExceptLast') {
        const head = q.options.slice(0, -1);
        return {
          ...q,
          order: 'given',
          options: [
            ...head.sort((a, b) => compare(a.label, b.label)),
            ...q.options.slice(-1)
          ]
        };
      }
      return q;
    })
  };
}

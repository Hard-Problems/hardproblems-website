// The bonus round: optional questions asked AFTER the answers are sent.
//
// A group marked `afterSend` in the definition (see `groups` on
// SurveyDefinition) is left out of the numbered steps. The main
// answers are submitted first; the bonus round follows, and anything
// written there is added to the stored response by /api/survey/bonus.
// Leaving at the bonus round therefore loses nothing but the bonus
// answers.

import type { SurveyDefinition, SurveyQuestion } from './types';

export function isBonusQuestion(
  survey: SurveyDefinition,
  question: Pick<SurveyQuestion, 'group'>
): boolean {
  return Boolean(question.group && survey.groups?.[question.group]?.afterSend);
}

/** The questions asked before sending — the numbered steps. */
export function mainQuestions(survey: SurveyDefinition): SurveyQuestion[] {
  return survey.questions.filter((q) => !isBonusQuestion(survey, q));
}

/** The bonus round, asked after sending. */
export function bonusQuestions(survey: SurveyDefinition): SurveyQuestion[] {
  return survey.questions.filter((q) => isBonusQuestion(survey, q));
}

/**
 * How long after sending the bonus answers can still be added. Long
 * enough for anyone actually writing them; short enough that a token
 * someone found later is useless.
 */
export const BONUS_WINDOW_MS = 2 * 60 * 60 * 1000;

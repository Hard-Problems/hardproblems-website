// Early access for internal testing, before a survey opens.
//
// Visiting /survey/<year>?access=<code> with the right code shows the
// working form, and the submit route accepts its response, in the days
// before `opensAt`. Everyone else sees the "opens on…" notice, and
// search engines are told not to index the page (see page.tsx).
//
// SERVER ONLY. The code lives in the SURVEY_PREVIEW_CODE environment
// variable — deliberately not NEXT_PUBLIC_, so it is never in the
// JavaScript sent to browsers. Unset, or shorter than
// MIN_CODE_LENGTH, early access is simply off.
//
// Responses sent this way are stored with `source` set to
// PREVIEW_SOURCE, so test data can be removed before launch with:
//   delete from survey_responses where source = 'internal-preview';

import { timingSafeEqual } from 'crypto';
import type { SurveyDefinition } from './types';

export const PREVIEW_SOURCE = 'internal-preview';

// Long enough that it cannot be guessed against the rate limit.
const MIN_CODE_LENGTH = 12;

export function isValidPreviewCode(code: unknown): boolean {
  const expected = process.env.SURVEY_PREVIEW_CODE ?? '';
  if (expected.length < MIN_CODE_LENGTH) return false;
  if (typeof code !== 'string') return false;
  const a = Buffer.from(code);
  const b = Buffer.from(expected);
  // Constant-time, so response timing does not leak how much of a
  // guess was right.
  return a.length === b.length && timingSafeEqual(a, b);
}

/** True before the survey's opening moment. */
export function opensLater(
  survey: SurveyDefinition,
  now: Date = new Date()
): boolean {
  return now.getTime() < Date.parse(survey.opensAt);
}

/**
 * Whether this request gets early access: only before opening, and
 * only with the right code. After opening the code does nothing — the
 * survey is open to everyone anyway.
 */
export function hasEarlyAccess(
  survey: SurveyDefinition,
  code: unknown,
  now: Date = new Date()
): boolean {
  return opensLater(survey, now) && isValidPreviewCode(code);
}

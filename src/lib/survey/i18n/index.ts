// The survey's translations, and picking one.
//
// SERVER ONLY in practice: this imports every language, so it belongs
// in the page (a server component), which hands the form the one
// translation it needs as props. Importing it from the client form
// would put all of them in the browser bundle.
//
// The translations are of the 2026 questionnaire. Next year's survey
// changes the questions, so it needs its own; the test fails for any
// question a translation does not cover.

import type { SurveyDefinition } from '../types';
import { SURVEY_2026 } from '../2026';
import { extractContent, localizeSurvey, presortAlphabetical } from './content';
import {
  DEFAULT_LANGUAGE,
  SURVEY_LANGUAGES,
  findLanguage,
  type SurveyLanguage
} from './languages';
import { EN_UI } from './ui-en';
import type { SurveyTranslation, SurveyUi } from './types';
import { TRANSLATIONS_2026 } from './translations';

export const EN_TRANSLATION: SurveyTranslation = {
  code: 'en',
  content: extractContent(SURVEY_2026),
  ui: EN_UI as unknown as SurveyUi
};

const BY_YEAR: Record<number, Record<string, SurveyTranslation>> = {
  2026: Object.fromEntries(
    [EN_TRANSLATION, ...TRANSLATIONS_2026].map((t) => [t.code, t])
  )
};

/** The languages this year's survey can be taken in, in picker order. */
export function languagesFor(survey: SurveyDefinition): SurveyLanguage[] {
  const available = BY_YEAR[survey.year] ?? {};
  return SURVEY_LANGUAGES.filter((l) => l.code in available);
}

/**
 * The survey in `code`'s language, falling back to English for an
 * unknown code or a year without that translation.
 */
export function translate(
  survey: SurveyDefinition,
  code: unknown
): {
  language: SurveyLanguage;
  survey: SurveyDefinition;
  ui: SurveyUi;
} {
  const available = BY_YEAR[survey.year] ?? {};
  const t =
    (typeof code === 'string' && available[code]) ||
    available[DEFAULT_LANGUAGE];
  const language = findLanguage(t?.code) ?? findLanguage(DEFAULT_LANGUAGE)!;
  const localized =
    !t || t.code === DEFAULT_LANGUAGE
      ? survey
      : localizeSurvey(survey, t.content);
  return {
    language,
    survey: presortAlphabetical(localized, language.htmlLang),
    ui: t && t.code !== DEFAULT_LANGUAGE ? t.ui : EN_TRANSLATION.ui
  };
}

/** Every translation of a year, English included — for the test. */
export function translationsFor(year: number): SurveyTranslation[] {
  return Object.values(BY_YEAR[year] ?? {});
}

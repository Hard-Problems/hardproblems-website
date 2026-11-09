// The languages the survey can be taken in.
//
// `code` is what the URL carries (?lang=fr) and what is stored in the
// response's `language` column — short and stable, so keep it unchanged
// once responses exist. `htmlLang` is the fuller BCP 47 tag for the
// page's `lang` attribute, which tells browsers, screen readers and
// fonts which variant this is (Simplified Chinese, Brazilian
// Portuguese, Punjabi in Gurmukhi script).
//
// Pure data, safe on server and client.

export type SurveyLanguage = {
  code: string;
  htmlLang: string;
  /** The language's name in itself, for the picker: "Français". */
  nativeName: string;
  /** The English name, for reports and code. */
  englishName: string;
  dir: 'ltr' | 'rtl';
};

export const SURVEY_LANGUAGES: readonly SurveyLanguage[] = [
  {
    code: 'en',
    htmlLang: 'en',
    nativeName: 'English',
    englishName: 'English',
    dir: 'ltr'
  },
  {
    code: 'zh',
    htmlLang: 'zh-Hans',
    nativeName: '中文',
    englishName: 'Mandarin Chinese (Simplified)',
    dir: 'ltr'
  },
  {
    code: 'hi',
    htmlLang: 'hi',
    nativeName: 'हिन्दी',
    englishName: 'Hindi',
    dir: 'ltr'
  },
  {
    code: 'ur',
    htmlLang: 'ur',
    nativeName: 'اردو',
    englishName: 'Urdu',
    dir: 'rtl'
  },
  {
    code: 'es',
    htmlLang: 'es-419',
    nativeName: 'Español',
    englishName: 'Spanish (Latin American)',
    dir: 'ltr'
  },
  {
    code: 'fr',
    htmlLang: 'fr',
    nativeName: 'Français',
    englishName: 'French',
    dir: 'ltr'
  },
  {
    code: 'bn',
    htmlLang: 'bn',
    nativeName: 'বাংলা',
    englishName: 'Bengali',
    dir: 'ltr'
  },
  {
    code: 'pt',
    htmlLang: 'pt-BR',
    nativeName: 'Português',
    englishName: 'Portuguese (Brazilian)',
    dir: 'ltr'
  },
  {
    code: 'ja',
    htmlLang: 'ja',
    nativeName: '日本語',
    englishName: 'Japanese',
    dir: 'ltr'
  },
  {
    code: 'pa',
    htmlLang: 'pa-Guru',
    nativeName: 'ਪੰਜਾਬੀ',
    englishName: 'Punjabi (Gurmukhi)',
    dir: 'ltr'
  },
  {
    code: 'tr',
    htmlLang: 'tr',
    nativeName: 'Türkçe',
    englishName: 'Turkish',
    dir: 'ltr'
  },
  {
    code: 'vi',
    htmlLang: 'vi',
    nativeName: 'Tiếng Việt',
    englishName: 'Vietnamese',
    dir: 'ltr'
  },
  {
    code: 'mr',
    htmlLang: 'mr',
    nativeName: 'मराठी',
    englishName: 'Marathi',
    dir: 'ltr'
  },
  {
    code: 'ko',
    htmlLang: 'ko',
    nativeName: '한국어',
    englishName: 'Korean',
    dir: 'ltr'
  },
  {
    code: 'id',
    htmlLang: 'id',
    nativeName: 'Bahasa Indonesia',
    englishName: 'Indonesian',
    dir: 'ltr'
  },
  {
    code: 'jv',
    htmlLang: 'jv',
    nativeName: 'Basa Jawa',
    englishName: 'Javanese',
    dir: 'ltr'
  },
  {
    code: 'de',
    htmlLang: 'de',
    nativeName: 'Deutsch',
    englishName: 'German',
    dir: 'ltr'
  },
  {
    code: 'ta',
    htmlLang: 'ta',
    nativeName: 'தமிழ்',
    englishName: 'Tamil',
    dir: 'ltr'
  },
  {
    code: 'ha',
    htmlLang: 'ha',
    nativeName: 'Hausa',
    englishName: 'Hausa',
    dir: 'ltr'
  },
  {
    code: 'ar',
    htmlLang: 'ar',
    nativeName: 'العربية',
    englishName: 'Arabic (Modern Standard)',
    dir: 'rtl'
  }
];

export const DEFAULT_LANGUAGE = 'en';

export function findLanguage(code: unknown): SurveyLanguage | null {
  if (typeof code !== 'string') return null;
  return SURVEY_LANGUAGES.find((l) => l.code === code) ?? null;
}

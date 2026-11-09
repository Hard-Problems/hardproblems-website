// Prints the English source of the survey's text as JSON — the input
// for writing a translation in src/lib/survey/i18n/translations/.
//
//   npx tsx scripts/survey-i18n-source.ts > survey-en.json
//
// `content` is the questionnaire (keyed by question, option, attribute
// and level id); `ui` is the interface text. A translation file has the
// same shape, with the words translated and every id and {placeholder}
// unchanged. See src/lib/survey/i18n/types.ts.

import { getSurvey } from '../src/lib/survey';
import { extractContent } from '../src/lib/survey/i18n/content';
import { EN_UI } from '../src/lib/survey/i18n/ui-en';

const year = Number(process.argv[2] ?? 2026);
const survey = getSurvey(year);
if (!survey) {
  console.error(`No survey for ${year}.`);
  process.exit(1);
}
console.log(
  JSON.stringify({ content: extractContent(survey), ui: EN_UI }, null, 2)
);

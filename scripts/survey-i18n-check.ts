// Checks one translation file for completeness and broken placeholders.
//
//   npx tsx scripts/survey-i18n-check.ts src/lib/survey/i18n/translations/fr.ts
//
// The file must export one SurveyTranslation (any export name). Exits 1
// and lists the problems if there are any.

import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { getSurvey } from '../src/lib/survey';
import { checkTranslation } from '../src/lib/survey/i18n/check';
import type { SurveyTranslation } from '../src/lib/survey/i18n/types';

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: npx tsx scripts/survey-i18n-check.ts <file>');
    process.exit(2);
  }
  const mod = (await import(pathToFileURL(resolve(file)).href)) as Record<
    string,
    unknown
  >;
  const t = Object.values(mod).find(
    (v): v is SurveyTranslation =>
      typeof v === 'object' && v !== null && 'code' in v && 'content' in v
  );
  if (!t) {
    console.error(`${file} exports no translation.`);
    process.exit(2);
  }
  const problems = checkTranslation(t, getSurvey(2026)!);
  if (problems.length === 0) {
    console.log(`${t.code}: OK`);
    return;
  }
  console.log(`${t.code}: ${problems.length} problem(s)`);
  for (const p of problems) console.log(`  ${p}`);
  process.exit(1);
}
void main();

// Mechanical checks on a translation: complete, same shape as the
// English, every {placeholder} kept. It cannot judge the translation
// itself — only that nothing is missing, extra or broken.
//
// Used by survey.test.ts for every registered translation, and by
//   npx tsx scripts/survey-i18n-check.ts <file>
// while writing one.

import type { SurveyDefinition } from '../types';
import { extractContent, referencedAttribute } from './content';
import { EN_UI } from './ui-en';
import type { SurveyTranslation } from './types';

/**
 * The questions whose English wording depends on the role (`{term}`,
 * `{Subject}`, or a role's own sentence). A translation words these out
 * in full for every role in `roleQuestionText`, rather than relying on
 * a noun dropped into a sentence — which only works in English.
 */
export function roleWordedQuestions(survey: SurveyDefinition): string[] {
  const own = new Set(
    Object.values(survey.roleQuestionText ?? {}).flatMap((q) => Object.keys(q))
  );
  return survey.questions
    .filter(
      (q) => /\{(term|Term|subject|Subject)\}/.test(q.text) || own.has(q.id)
    )
    .map((q) => q.id);
}

export function roleIds(survey: SurveyDefinition): string[] {
  const q = survey.questions.find((x) => x.id === survey.termSourceId);
  return q && 'options' in q ? q.options.map((o) => o.id) : [];
}

const placeholders = (s: string) =>
  [...s.matchAll(/\{(\w+)\}/g)]
    .map((m) => m[1])
    .sort()
    .join(',');

export function checkTranslation(
  t: SurveyTranslation,
  survey: SurveyDefinition
): string[] {
  const problems: string[] = [];
  const en = extractContent(survey);
  const isEnglish = t.code === 'en';

  // Compare two values of the same English shape, recursively.
  function compare(
    path: string,
    source: unknown,
    target: unknown,
    opts: { allowEmpty?: boolean } = {}
  ) {
    if (typeof source === 'string') {
      if (typeof target !== 'string') {
        problems.push(`${path}: missing`);
        return;
      }
      if (target.trim() === '' && source.trim() !== '' && !opts.allowEmpty) {
        problems.push(`${path}: empty`);
      }
      if (placeholders(source) !== placeholders(target)) {
        problems.push(
          `${path}: placeholders {${placeholders(source)}} became {${placeholders(target)}}`
        );
      }
      return;
    }
    if (Array.isArray(source)) {
      if (!Array.isArray(target)) {
        problems.push(`${path}: should be a list`);
        return;
      }
      if (target.length !== source.length) {
        problems.push(
          `${path}: ${target.length} items, English has ${source.length}`
        );
      }
      source.forEach((s, i) => compare(`${path}[${i}]`, s, target[i], opts));
      return;
    }
    if (typeof source === 'object' && source !== null) {
      if (typeof target !== 'object' || target === null) {
        problems.push(`${path}: missing`);
        return;
      }
      for (const k of Object.keys(target)) {
        if (!(k in source)) problems.push(`${path}.${k}: not in English`);
      }
      for (const [k, v] of Object.entries(source)) {
        compare(
          `${path}.${k}`,
          v,
          (target as Record<string, unknown>)[k],
          opts
        );
      }
    }
  }

  // ---- ui ------------------------------------------------------------
  // Plural forms are per language (Japanese has one, Arabic six), so
  // only `other` is required and each form keeps {n}.
  const { fields, prize, header, ...restUi } = EN_UI;
  const tu = t.ui as unknown as typeof EN_UI;
  compare(
    'ui',
    restUi,
    Object.fromEntries(
      Object.entries(tu).filter(
        ([k]) => !['fields', 'prize', 'header'].includes(k)
      )
    )
  );
  const { charsRemaining, ...restFields } = fields;
  compare(
    'ui.fields',
    restFields,
    Object.fromEntries(
      Object.entries(tu.fields ?? {}).filter(([k]) => k !== 'charsRemaining')
    )
  );
  const forms = (tu.fields?.charsRemaining ?? {}) as Record<string, string>;
  if (!forms.other) problems.push('ui.fields.charsRemaining.other: missing');
  for (const [k, v] of Object.entries(forms)) {
    if (!['zero', 'one', 'two', 'few', 'many', 'other'].includes(k)) {
      problems.push(`ui.fields.charsRemaining.${k}: not a plural category`);
    }
    if (placeholders(v) !== placeholders(charsRemaining.other)) {
      problems.push(`ui.fields.charsRemaining.${k}: must contain {n}`);
    }
  }
  // The rest of a phrase ("Exit" + " survey") may be empty where a
  // language cannot split it.
  for (const [k, v] of Object.entries(header)) {
    compare(`ui.header.${k}`, v, tu.header?.[k as keyof typeof header], {
      allowEmpty: k === 'exitRest' || k === 'privacyRest'
    });
  }
  for (const k of Object.keys(tu.header ?? {})) {
    if (!(k in header)) problems.push(`ui.header.${k}: not in English`);
  }
  // `termsNote` is empty in English and required in every translation.
  compare(
    'ui.prize',
    isEnglish ? prize : { ...prize, termsNote: 'x' },
    tu.prize
  );
  if (isEnglish && tu.prize?.termsNote) {
    problems.push('ui.prize.termsNote: should be empty in English');
  }

  // ---- content ---------------------------------------------------------
  const tc = t.content;
  const roleWorded = new Set(roleWordedQuestions(survey));
  compare('content.title', en.title, tc.title);
  compare('content.shortTitle', en.shortTitle ?? '', tc.shortTitle ?? '', {
    allowEmpty: en.shortTitle === undefined
  });
  compare('content.intro', en.intro, tc.intro);
  compare('content.why', en.why ?? [], tc.why ?? []);
  compare('content.roleTerms', en.roleTerms, tc.roleTerms);
  compare('content.roleSubjects', en.roleSubjects ?? {}, tc.roleSubjects ?? {});
  compare('content.defaultTerm', en.defaultTerm, tc.defaultTerm);
  compare('content.groups', en.groups ?? {}, tc.groups ?? {});
  compare('content.notWorking', en.notWorking ?? {}, tc.notWorking ?? {});

  if (!isEnglish) {
    // Every role, every role-worded question, as a whole sentence.
    for (const role of roleIds(survey)) {
      for (const qid of roleWorded) {
        const s = tc.roleQuestionText?.[role]?.[qid];
        if (!s || !s.trim()) {
          problems.push(`content.roleQuestionText.${role}.${qid}: missing`);
        } else if (/\{\w+\}/.test(s)) {
          problems.push(
            `content.roleQuestionText.${role}.${qid}: should be a whole sentence, no {placeholders}`
          );
        }
      }
    }
  }

  for (const q of survey.questions) {
    const path = `content.questions.${q.id}`;
    const ec = en.questions[q.id];
    const c = tc.questions?.[q.id];
    if (!c) {
      problems.push(`${path}: missing`);
      continue;
    }
    compare(`${path}.text`, ec.text, c.text);
    if (ec.hint !== undefined) compare(`${path}.hint`, ec.hint, c.hint);
    else if (c.hint !== undefined)
      problems.push(`${path}.hint: not in English`);
    if (ec.options) compare(`${path}.options`, ec.options, c.options);
    if (ec.labels) compare(`${path}.labels`, ec.labels, c.labels);
    if (ec.cardTitles)
      compare(`${path}.cardTitles`, ec.cardTitles, c.cardTitles);
    if (ec.attributes && q.kind === 'conjoint') {
      for (const a of q.attributes) {
        const ca = c.attributes?.[a.id];
        const ap = `${path}.attributes.${a.id}`;
        if (!ca) {
          problems.push(`${ap}: missing`);
          continue;
        }
        compare(`${ap}.label`, a.label, ca.label);
        for (const l of a.levels) {
          const cl = ca.levels?.[l.id];
          const lp = `${ap}.levels.${l.id}`;
          if (!cl) {
            problems.push(`${lp}: missing`);
            continue;
          }
          compare(`${lp}.label`, l.label, cl.label);
          const ref = referencedAttribute(l.short);
          if (ref && !isEnglish) {
            // Wording that names another attribute: one whole phrase
            // per level of that attribute.
            const other = q.attributes.find((x) => x.id === ref);
            for (const ol of other?.levels ?? []) {
              const v = cl.shortFor?.[ol.id];
              if (!v || !v.trim()) {
                problems.push(`${lp}.shortFor.${ol.id}: missing`);
              }
            }
            if (cl.short !== undefined) {
              problems.push(`${lp}.short: use shortFor instead`);
            }
          } else if (l.short !== undefined) {
            compare(`${lp}.short`, l.short, cl.short);
          }
        }
      }
    }
  }
  return problems;
}

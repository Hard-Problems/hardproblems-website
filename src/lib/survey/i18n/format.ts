// Filling the {placeholders} in translated strings. Pure, server and
// client safe.

import type { Plural } from './types';

/** "Step {n} of {total}" + { n: 3, total: 21 } → "Step 3 of 21". */
export function fill(
  template: string,
  params: Record<string, string | number> = {}
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match
  );
}

/**
 * The template split around its placeholders, for rendering when a
 * placeholder is an element (a link, italics) rather than text: the
 * caller maps each `{key}` part to whatever it should be.
 */
export function splitTemplate(
  template: string
): ({ text: string } | { key: string })[] {
  const parts: ({ text: string } | { key: string })[] = [];
  let last = 0;
  for (const m of template.matchAll(/\{(\w+)\}/g)) {
    if (m.index > last) parts.push({ text: template.slice(last, m.index) });
    parts.push({ key: m[1] });
    last = m.index + m[0].length;
  }
  if (last < template.length) parts.push({ text: template.slice(last) });
  return parts;
}

/** The plural form for `n` in `locale`, with {n} filled in. */
export function plural(forms: Plural, n: number, locale: string): string {
  let category: Intl.LDMLPluralRule = 'other';
  try {
    category = new Intl.PluralRules(locale).select(n);
  } catch {
    // An unknown locale: `other` reads acceptably everywhere.
  }
  return fill(forms[category] ?? forms.other, { n });
}

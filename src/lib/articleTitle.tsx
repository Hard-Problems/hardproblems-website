import { Fragment, type ReactNode } from 'react';

// Split a title on `_..._` Markdown italic pairs and render each pair
// as <em>. Kept intentionally small — no full Markdown parser, just
// underscore pairs, which is all we use in article titles today
// (mostly to italicize book titles in book-review headlines like
// "_Why Design is Hard_ by Scott Berkun and Bryan Zug").
export function renderTitleWithItalics(title: string): ReactNode {
  const parts = title.split(/_([^_]+)_/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <em key={i}>{part}</em> : <Fragment key={i}>{part}</Fragment>
  );
}

// Strip the same underscore pairs to plain text, for surfaces that
// can't render mixed rich text: <title>, OG title, JSON-LD headline,
// aria-labels, and email templates.
export function titleAsText(title: string): string {
  return title.replace(/_([^_]+)_/g, '$1');
}

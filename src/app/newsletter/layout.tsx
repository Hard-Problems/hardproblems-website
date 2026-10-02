import type { Metadata } from 'next';

// The metadata lives here rather than in page.tsx because that page is a
// 'use client' component — it fetches the Beehiiv RSS feed in the
// browser — and a client component cannot export `metadata`. A layout
// for the single route is the standard way to attach it.
//
// Without this the page fell back to the layout's site-wide title and
// description, which nine pages were sharing verbatim. openGraph and
// twitter are set too: Next does not derive them from `title`, and each
// replaces the root layout's wholesale rather than merging, so `card` is
// repeated here. The route's own opengraph-image.tsx still supplies the
// image.
const DESCRIPTION =
  'The email newsletter for designers and technologists who want to work on hard problems. Four or five emails a month, no spam, easy unsubscribe.';

export const metadata: Metadata = {
  title: 'Newsletter for designers and technologists — Hard Problems',
  description: DESCRIPTION,
  openGraph: {
    title: 'Newsletter for designers and technologists',
    description: DESCRIPTION
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Newsletter for designers and technologists',
    description: DESCRIPTION
  }
};

export default function NewsletterLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return children;
}

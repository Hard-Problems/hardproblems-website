// Author profile page — /authors/<slug>. One page per entry in
// AUTHORS (see src/lib/authors.ts). Renders:
//   - The author's photo (floated right) + name + bio
//   - Every article they've published on the site
//   - schema.org Person JSON-LD with LinkedIn/website as `sameAs`
//
// Pre-rendered at build time via generateStaticParams — new contributors
// automatically get a page when they're added to AUTHORS.

import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import ArticleCard from '../../../components/ArticleCard';
import { SITE_URL } from '../../../lib/siteUrl';
import {
  AUTHORS,
  authorSameAs,
  getAuthorBySlug
} from '../../../lib/authors';
import {
  getAllArticles,
  getAuthorImage
} from '../../../lib/articles';
import articleStyles from '../../articles/page.module.scss';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return AUTHORS.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params
}: Props): Promise<Metadata> {
  const { slug } = await params;
  const author = getAuthorBySlug(slug);
  if (!author) return { title: 'Author — Hard Problems' };
  return {
    title: `${author.name} — Hard Problems`,
    description: author.bio.split('\n\n')[0] ?? author.bio
  };
}

// Bare-hostname detector (URL_RE): matches things like `simple.org`,
// `Healthicons.org`, `mahimachandak.com` inside prose. TLD list is
// deliberately conservative — matching every possible TLD would
// false-positive on "e.g." or "vs.co". Extend if a bio mentions a
// domain we don't cover.
const URL_PATTERN =
  '\\b(?:[a-zA-Z][\\w-]*\\.)+(?:org|com|io|net|co|dev|ai|so|app|xyz|edu|gov|health|us|uk)\\b';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Renders bio text with two kinds of auto-links:
//   1. Bare hostnames (see URL_PATTERN) → wrap in an anchor to the
//      hostname prefixed with https://.
//   2. Author-declared phrase mappings (Author.phraseLinks) — exact,
//      case-sensitive matches like "Google Ventures" → gv.com.
// Both are combined into a single regex pass so matches don't
// overlap or run twice on the same span.
function linkify(
  text: string,
  phraseLinks: Record<string, string> | undefined
): ReactNode[] {
  const phrases = phraseLinks ? Object.keys(phraseLinks) : [];
  // Longest first so "Google Ventures" wins over a hypothetical
  // shorter "Google" in the same map.
  phrases.sort((a, b) => b.length - a.length);
  const phrasePattern = phrases.length
    ? `\\b(?:${phrases.map(escapeRegExp).join('|')})\\b`
    : null;
  const combined = new RegExp(
    phrasePattern ? `${phrasePattern}|${URL_PATTERN}` : URL_PATTERN,
    'g'
  );

  const parts: ReactNode[] = [];
  let lastEnd = 0;
  let match: RegExpExecArray | null;
  while ((match = combined.exec(text)) !== null) {
    if (match.index > lastEnd) {
      parts.push(text.slice(lastEnd, match.index));
    }
    const matched = match[0];
    // Phrase link takes precedence — matches whose text is a key in
    // phraseLinks use the mapped URL directly. Everything else falls
    // through to the URL-hostname branch.
    const phraseHref = phraseLinks?.[matched];
    const href = phraseHref
      ? phraseHref
      : /^https?:\/\//.test(matched)
        ? matched
        : `https://${matched}`;
    parts.push(
      <a
        key={`${match.index}-${matched}`}
        href={href}
        target="_blank"
        rel="noreferrer"
      >
        {matched}
      </a>
    );
    lastEnd = match.index + matched.length;
  }
  if (lastEnd < text.length) parts.push(text.slice(lastEnd));
  return parts;
}

export default async function AuthorPage({ params }: Props) {
  const { slug } = await params;
  const author = getAuthorBySlug(slug);
  if (!author) notFound();

  // Every article this author has written on the site.
  const articles = getAllArticles().filter(
    (a) => a.author?.trim() === author.name
  );
  const avatar = getAuthorImage(author.slug);
  const bioParagraphs = author.bio
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  // schema.org Person — feeds Google's author authority signals.
  // Every off-site link (LinkedIn, personal site, Bluesky, …) is
  // declared via `sameAs`, which is Google's official way to link an
  // author entity across the web.
  const sameAs = authorSameAs(author);
  const personJsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: author.name,
    description: bioParagraphs[0] ?? author.bio,
    url: `${SITE_URL}/authors/${author.slug}`,
    image: avatar ? `${SITE_URL}${avatar}` : undefined,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
    worksFor: {
      '@type': 'Organization',
      name: 'Hard Problems',
      url: SITE_URL
    }
  };

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '1.5rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />

      {/* Photo floats to the top-right; the H2 + links + bio flow
          around it. `shape-outside: circle()` would round the wrap
          for a perfect halo, but a rectangular flow is fine here. */}
      {avatar && (
        <Image
          src={avatar}
          width={160}
          height={160}
          alt=""
          style={{
            float: 'right',
            marginLeft: '2.5rem',
            marginBottom: '2rem',
            marginTop: '0.5rem',
            borderRadius: '50%'
          }}
        />
      )}

      <h1 className="page-title" style={{ margin: '0 0 0.25rem' }}>
        {author.name}
      </h1>

      {author.links && author.links.length > 0 && (
        <p
          style={{
            margin: '2rem 0',
            fontSize: '0.875rem',
            color: '#666'
          }}
        >
          {author.links.map((link, i) => (
            <span key={link.url}>
              {i > 0 && ' · '}
              <Link href={link.url} target="_blank" rel="noreferrer">
                {link.label}
              </Link>
            </span>
          ))}
        </p>
      )}

      {bioParagraphs.map((paragraph, i) => (
        <p key={i} style={{ fontSize: '1.05rem', color: '#333' }}>
          {linkify(paragraph, author.phraseLinks)}
        </p>
      ))}

      {articles.length > 0 && (
        <>
          {/* Clear the float so the articles list starts on a new row
              below the photo, not wrapping around it. */}
          <h3 style={{ marginTop: '4.5rem', clear: 'both' }}>
            Articles by {author.name}
          </h3>
          <ul className={articleStyles.articleList}>
            {articles.map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </ul>
        </>
      )}
    </main>
  );
}

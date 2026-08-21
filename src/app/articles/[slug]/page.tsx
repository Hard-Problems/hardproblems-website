import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { BookOpen } from 'lucide-react';
import ArticleCard from '../../../components/ArticleCard';
import DesignInternApplicationForm from '../../../components/DesignInternApplicationForm';
import NewsletterModule from '../../../components/NewsletterModule';
import {
  articleTypeSlug,
  formatPublishedDate,
  getAllArticles,
  getArticleBySlug,
  getAuthorImage,
  topicDisplay
} from '../../../lib/articles';
import {
  authorInternalUrl,
  authorSameAs,
  getAuthorByName,
  getAuthorUrl
} from '../../../lib/authors';
import { titleAsText } from '../../../lib/articleTitle';
import styles from './article.module.scss';

// Regenerate at most every hour so a scheduled article's own URL
// (status: published + future `publishedAt`) starts serving once
// its date arrives — no redeploy required.
export const revalidate = 3600;

// Hand-picked slugs shown in the "Top articles" rail at the bottom of
// every article page. Order here is the order they render. Extra slugs
// past the first three serve as backfill when the current article is
// itself one of the picks (so the rail always shows three cards).
const TOP_ARTICLE_SLUGS = [
  'books-designers-hard-problems',
  'hard-problems-explained',
  'use-a-spreadsheet-to-choose-your-next-role',
  'join-nonprofit-board-or-advisory-group',
  'hard-problems-job-board',
  'missing-piece-design-career',
  'tricks-find-meaningful-job-linkedin'
];

type Props = { params: Promise<{ slug: string }> };

// Split the article HTML at the boundary where the byline should be
// inserted. Preferred boundary is the end of the `.intro` paragraph (the
// lede); if there's no intro, fall back to the end of the H1 (title) so
// the byline still sits between the title and the body copy.
function splitForByline(html: string): { before: string; after: string } {
  const introIdx = html.search(/class=["']intro["']/i);
  if (introIdx !== -1) {
    const close = html.indexOf('</p>', introIdx);
    if (close !== -1) {
      const end = close + '</p>'.length;
      return { before: html.slice(0, end), after: html.slice(end) };
    }
  }
  const h1 = /<\/h1>/i.exec(html);
  if (h1) {
    const end = h1.index + h1[0].length;
    return { before: html.slice(0, end), after: html.slice(end) };
  }
  return { before: '', after: html };
}

// Split around a `<div id="...">` slot marker so a React component
// can be rendered inline at that position. Returns { before, after }
// with the marker itself dropped, or null if the marker isn't
// present. Used for embedding the design-intern application form
// inline in its article body via the marker
// `<div id="design-intern-application-form"></div>`.
function splitAtSlot(
  html: string,
  slotId: string
): { before: string; after: string } | null {
  const re = new RegExp(
    `<div\\s+id=["']${slotId}["']\\s*>\\s*</div>`,
    'i'
  );
  const m = re.exec(html);
  if (!m) return null;
  return {
    before: html.slice(0, m.index),
    after: html.slice(m.index + m[0].length)
  };
}

// Pre-render every published article at build time. New articles ship by
// adding a .md file under content/articles/.
export function generateStaticParams() {
  return getAllArticles().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params
}: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article || article.status !== 'published') {
    return { title: 'Article — Hard Problems' };
  }
  const plainTitle = titleAsText(article.title);
  const title = article.seoTitle ?? `${plainTitle} — Hard Problems`;
  const description = article.seoDescription || article.excerpt;
  return {
    title,
    description,
    alternates: article.canonicalUrl
      ? { canonical: article.canonicalUrl }
      : undefined,
    openGraph: {
      type: 'article',
      title: plainTitle,
      description,
      publishedTime: article.publishedAt || undefined,
      modifiedTime: article.updatedAt || undefined,
      authors: article.author ? [article.author] : undefined,
      images: article.image ? [article.image] : undefined
    },
    twitter: {
      card: 'summary_large_image',
      title: plainTitle,
      description,
      images: article.image ? [article.image] : undefined
    }
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  // 404 if the article doesn't exist at all, or if it's a draft /
  // in-review item. Articles whose `publishedAt` is in the future ARE
  // still served at their canonical URL — they're just hidden from
  // listings and search until their date arrives, so a direct link
  // (from an author preview, an early recipient, or a scheduled tweet)
  // continues to work.
  //
  // Articles with an `expiresAt` in the past also 404 — the field is
  // meant for hard-deadline posts (job openings with an application
  // cutoff, event listings, etc.) where continuing to serve the URL
  // would invite late applications after the role's closed.
  const isExpired =
    !!article?.expiresAt &&
    (() => {
      const raw = article.expiresAt!.trim();
      const ms = Date.parse(raw);
      if (Number.isNaN(ms)) return false;
      const now = new Date();
      const todayUTC = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate()
      );
      const e = new Date(ms);
      const expiryUTC = Date.UTC(
        e.getUTCFullYear(),
        e.getUTCMonth(),
        e.getUTCDate()
      );
      return expiryUTC < todayUTC;
    })();
  if (
    !article ||
    (article.status !== 'published' &&
      process.env.NODE_ENV !== 'development') ||
    (isExpired && process.env.NODE_ENV !== 'development')
  )
    notFound();

  const { before, after } = splitForByline(article.contentHtml);

  // Build the "Top articles" rail. Filter out the current article so a
  // post never recommends itself, and skip any slug that doesn't resolve
  // to a published article (so a typo in the list above degrades
  // gracefully). Cap at 3 — extra slugs in TOP_ARTICLE_SLUGS act as
  // backfill when one of the top picks is the current article.
  const topArticles = TOP_ARTICLE_SLUGS.map((s) => getArticleBySlug(s))
    .filter(
      (a): a is NonNullable<typeof a> =>
        a != null && a.status === 'published' && a.slug !== article.slug
    )
    .slice(0, 3);

  // Build counts for every articleType and topic across all published
  // articles, used to annotate each row in "More articles about…".
  const allArticles = getAllArticles();
  const typeCounts = new Map<string, number>();
  const topicCounts = new Map<string, number>();
  for (const a of allArticles) {
    if (a.articleType) {
      typeCounts.set(
        a.articleType,
        (typeCounts.get(a.articleType) || 0) + 1
      );
    }
    for (const t of a.topics) {
      topicCounts.set(t, (topicCounts.get(t) || 0) + 1);
    }
  }

  // schema.org Article structured data — feeds Google's article-rich-
  // result surfaces (headline, author, publish date) and reinforces
  // E-E-A-T signals (an article authored by a named Person is treated
  // as more authoritative than the same content authored by
  // "Website"). Serialised inline as a <script type="application/ld+json">
  // right before the article body.
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: titleAsText(article.title),
    description: article.excerpt || article.seoDescription || undefined,
    image: article.image
      ? [`https://hardproblems.com${article.image}`]
      : undefined,
    datePublished: article.publishedAt || undefined,
    dateModified: article.updatedAt || article.publishedAt || undefined,
    author: (() => {
      if (!article.author) return undefined;
      const profile = getAuthorByName(article.author);
      const sameAs = profile ? authorSameAs(profile) : [];
      return {
        '@type': 'Person',
        name: article.author,
        url: profile
          ? `https://hardproblems.com${authorInternalUrl(profile.slug)}`
          : undefined,
        sameAs: sameAs.length > 0 ? sameAs : undefined
      };
    })(),
    publisher: {
      '@type': 'Organization',
      name: 'Hard Problems',
      logo: {
        '@type': 'ImageObject',
        url: 'https://hardproblems.com/opengraph-image'
      }
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://hardproblems.com/articles/${article.slug}`
    },
    articleSection: article.articleType || undefined,
    keywords: article.topics.length ? article.topics.join(', ') : undefined
  };

  return (
    <>
      <script
        type="application/ld+json"
        // JSON stringified from vetted frontmatter — no untrusted
        // user input reaches this string.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <NewsletterModule variant="under-nav" />
      <section className={styles.articleWrap}>
        <article className={styles.article}>
        <header className={styles.header}>
          {article.articleType && (
            <p className={styles.preTitleLabel}>
              <Link
                href={`/articles/type/${articleTypeSlug(article.articleType)}`}
              >
                {article.articleType}
              </Link>
            </p>
          )}
        </header>

        <div className={styles.body}>
          <div dangerouslySetInnerHTML={{ __html: before }} />
          <ArticleByline article={article} />
          {(() => {
            const formSlot = splitAtSlot(
              after,
              'design-intern-application-form'
            );
            if (!formSlot) {
              return (
                <div dangerouslySetInnerHTML={{ __html: after }} />
              );
            }
            return (
              <>
                <div
                  dangerouslySetInnerHTML={{ __html: formSlot.before }}
                />
                <DesignInternApplicationForm />
                <div
                  dangerouslySetInnerHTML={{ __html: formSlot.after }}
                />
              </>
            );
          })()}
        </div>

        {(() => {
          // Only render "Related content…" if at least one tag row
          // would land on a listing page with articles other than
          // this one. If every tag row's count is 1 (i.e. this
          // article is the sole occupant of each category it belongs
          // to — common for a first-of-its-kind post like a job
          // opening), the section would just point back to itself
          // and adds no navigation value, so hide it.
          const hasSiblingContent =
            (!!article.articleType &&
              (typeCounts.get(article.articleType) ?? 0) > 1) ||
            article.topics.some((t) => (topicCounts.get(t) ?? 0) > 1);
          return hasSiblingContent;
        })() && (
          <>
            <h2 className={`${styles.tagsLabel} section-label`}>
              Related content&hellip;
            </h2>
            <ul className={styles.topics}>
              {article.articleType && (
                <li>
                  <Link
                    href={`/articles/type/${articleTypeSlug(article.articleType)}`}
                    className={styles.topicTag}
                  >
                    <span>{article.articleType}</span>
                    <span className={styles.topicTagMeta}>
                      <span className={styles.topicTagCount}>
                        {typeCounts.get(article.articleType) ?? 0}
                      </span>
                      <BookOpen
                        className={styles.topicTagIcon}
                        aria-hidden="true"
                      />
                    </span>
                  </Link>
                </li>
              )}
              {article.topics.map((t) => (
                <li key={t}>
                  <Link
                    href={`/articles/type/${t}`}
                    className={styles.topicTag}
                  >
                    <span>{topicDisplay(t)}</span>
                    <span className={styles.topicTagMeta}>
                      <span className={styles.topicTagCount}>
                        {topicCounts.get(t) ?? 0}
                      </span>
                      <BookOpen
                        className={styles.topicTagIcon}
                        aria-hidden="true"
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
        </article>

        {topArticles.length > 0 && (
          <aside className={styles.topArticles}>
            <h2 className={`${styles.topArticlesHeading} section-label`}>
              Top articles
            </h2>
            <ul className={styles.topArticlesList}>
              {topArticles.map((a) => (
                <ArticleCard key={a.slug} article={a} />
              ))}
            </ul>
          </aside>
        )}
      </section>
    </>
  );
}

// Byline row shown above the article body: "By <Author> · <Date> · N min read".
// Each piece is conditional, so the dot separators only appear between pieces
// that are actually rendered. Author becomes a link when we have a URL for them.
function ArticleByline({
  article
}: {
  article: ReturnType<typeof getArticleBySlug>;
}) {
  if (!article) return null;
  // Prefer the internal author profile page (keeps readers on-site and
  // strengthens internal link equity for the author page). Falls back to
  // the LinkedIn/external URL if the author isn't in the AUTHORS
  // registry — matches the pre-registry behaviour so existing bylines
  // don't regress.
  const authorProfile = getAuthorByName(article.author);
  const authorUrl = authorProfile
    ? authorInternalUrl(authorProfile.slug)
    : article.author
      ? getAuthorUrl(article.author)
      : null;
  const authorLinkIsInternal = !!authorProfile;
  const parts: React.ReactNode[] = [];

  if (article.author) {
    const name = <strong>{article.author}</strong>;
    const avatarSrc = getAuthorImage(article.authorSlug);
    const avatar = avatarSrc ? (
      <Image
        src={avatarSrc}
        width={64}
        height={64}
        alt=""
        className={styles.authorAvatar}
      />
    ) : null;
    parts.push(
      <span key="author">
        {avatar &&
          (authorUrl ? (
            <Link
              href={authorUrl}
              {...(authorLinkIsInternal
                ? {}
                : { target: '_blank', rel: 'noreferrer' })}
              aria-hidden="true"
              tabIndex={-1}
              className={`${styles.authorAvatarLink} hover-saturate`}
            >
              {avatar}
            </Link>
          ) : (
            avatar
          ))}
        By{' '}
        {authorUrl ? (
          <Link
            href={authorUrl}
            {...(authorLinkIsInternal
              ? {}
              : { target: '_blank', rel: 'noreferrer' })}
            className={styles.authorLink}
          >
            {name}
          </Link>
        ) : (
          name
        )}
      </span>
    );
  }
  if (article.publishedAt) {
    parts.push(
      <time key="date" dateTime={article.publishedAt}>
        {formatPublishedDate(article.publishedAt)}
      </time>
    );
  }
  if (article.readingTime) {
    const articleTypeLower = article.articleType?.toLowerCase();
    const unit =
      articleTypeLower === 'video'
        ? 'video'
        : articleTypeLower === 'podcast'
          ? 'podcast'
          : 'read';
    parts.push(
      <span key="read" className={styles.bylineReadingTime}>
        {article.readingTime} min {unit}
      </span>
    );
  }

  return (
    <p className={styles.byline}>
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 && <span aria-hidden="true"> · </span>}
          {part}
        </span>
      ))}
    </p>
  );
}

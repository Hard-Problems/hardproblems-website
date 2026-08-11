import Image from 'next/image';
import Link from 'next/link';
import { SquarePlay, Headphones, Sparkle } from 'lucide-react';
import {
  type Article,
  articleTypeSlug,
  formatPublishedDate
} from '../lib/articles';
import { renderTitleWithItalics, titleAsText } from '../lib/articleTitle';
import styles from '../app/articles/page.module.scss';

// Shared card used by both /articles (full listing) and
// /articles/topic/[topic] (per-topic listings). Keeping a single component
// keeps the two surfaces visually identical.
//
// `compact` enables a mobile-only horizontal layout used on the
// homepage for the 4th-and-later cards (image left, text right, top
// rule). Desktop falls back to the normal stacked card.
// `hero` enables a desktop-only wider layout — full-grid-width with
// image on the left and text on the right. Used for the 7th article
// on the homepage as a "secondary hero" break in the article list.
// On mobile the hero flag has no effect (compact still applies).
export default function ArticleCard({
  article,
  compact = false,
  hero = false,
  hideDate = false
}: {
  article: Article;
  compact?: boolean;
  hero?: boolean;
  hideDate?: boolean;
}) {
  const articleTypeLower = article.articleType?.toLowerCase();
  const isVideo = articleTypeLower === 'video';
  const isPodcast = articleTypeLower === 'podcast';

  // "NEW" badge appears on the meta line for any article published in
  // the last 30 days. Comparison uses local time; a few hours of skew
  // doesn't matter for a 30-day window.
  let isNew = false;
  if (article.publishedAt && !hideDate) {
    const published = new Date(article.publishedAt).getTime();
    if (!Number.isNaN(published)) {
      const ageDays = (Date.now() - published) / 86400000;
      isNew = ageDays >= 0 && ageDays < 30;
    }
  }
  const showDate = !hideDate && !!article.publishedAt;

  return (
    <li
      className={`${styles.articleCard} ${
        compact ? styles.articleCardCompact : ''
      } ${hero ? styles.articleCardHero : ''}`}
    >
      {(isNew || article.articleType) && (
        <div className={styles.articleCardKicker}>
          {article.articleType && (
            <Link
              href={`/articles/type/${articleTypeSlug(article.articleType)}`}
              className={styles.articleType}
            >
              {article.articleType}
            </Link>
          )}
          {isNew && (
            <span className={styles.articleCardNew}>
              <Sparkle
                className={styles.articleCardNewIcon}
                aria-hidden="true"
              />
              NEW
            </span>
          )}
        </div>
      )}
      <Link
        href={`/articles/${article.slug}`}
        className={`${styles.articleCardLink} hover-saturate`}
      >
        {(article.image || article.thumbnailVideo) && (
          <div className={styles.articleCardImageWrap}>
            {article.thumbnailVideo ? (
              <video
                className={styles.articleCardVideo}
                poster={article.image}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                aria-label={article.imageAlt ?? titleAsText(article.title)}
              >
                {article.thumbnailVideoWebm && (
                  <source src={article.thumbnailVideoWebm} type="video/webm" />
                )}
                <source src={article.thumbnailVideo} type="video/mp4" />
              </video>
            ) : (
              article.image && (
                <Image
                  src={article.image}
                  alt={article.imageAlt ?? ''}
                  width={1200}
                  height={800}
                  className={styles.articleCardImage}
                />
              )
            )}
            {isVideo && (
              <span className={styles.articleCardBadge}>
                <SquarePlay
                  className={styles.articleCardBadgeIcon}
                  aria-hidden="true"
                />
                Watch
              </span>
            )}
            {isPodcast && (
              <span className={styles.articleCardBadge}>
                <Headphones
                  className={styles.articleCardBadgeIcon}
                  aria-hidden="true"
                />
                Listen
              </span>
            )}
          </div>
        )}
        <div className={styles.articleCardBody}>
          {(article.readingTime || showDate) && (
            <p className={styles.articleCardReadingTime}>
              {article.readingTime ? (
                <>
                  {article.readingTime} min{' '}
                  {isVideo ? 'watch' : isPodcast ? 'podcast' : 'read'}
                </>
              ) : null}
              {article.readingTime && showDate && (
                <span aria-hidden="true"> · </span>
              )}
              {showDate && (
                <time dateTime={article.publishedAt}>
                  {formatPublishedDate(article.publishedAt)}
                </time>
              )}
            </p>
          )}
          <h3 className={styles.articleCardTitle}>
            {renderTitleWithItalics(article.title)}
          </h3>
          {article.excerpt && (
            <p className={styles.articleCardExcerpt}>{article.excerpt}</p>
          )}
        </div>
      </Link>
    </li>
  );
}

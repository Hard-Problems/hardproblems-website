import Link from 'next/link';
import Image from 'next/image';
import type { Article } from '../lib/articles';
import { renderTitleWithItalics } from '../lib/articleTitle';
import styles from '../app/articles/page.module.scss';

// Very compact article listing — one row per article with a small
// thumbnail (desktop only), a reading-time meta line, and the title.
// Mobile collapses the thumbnails and renders as a bulleted list.
export default function CompactArticleList({
  articles
}: {
  articles: Article[];
}) {
  if (articles.length === 0) return null;
  return (
    <ul className={styles.compactList}>
      {articles.map((article) => {
        const type = article.articleType?.toLowerCase();
        const unit =
          type === 'video'
            ? 'watch'
            : type === 'podcast'
              ? 'podcast'
              : 'read';
        return (
          <li key={article.slug} className={styles.compactListItem}>
            <Link
              href={`/articles/${article.slug}`}
              className={`${styles.compactListLink} hover-saturate`}
            >
              {article.image && (
                <div className={styles.compactListThumb}>
                  <Image
                    src={article.image}
                    alt={article.imageAlt ?? ''}
                    width={400}
                    height={300}
                    className={styles.compactListImg}
                  />
                </div>
              )}
              {article.readingTime > 0 && (
                <span className={styles.compactListMeta}>
                  {article.readingTime} min {unit}
                </span>
              )}
              <h4 className={styles.compactListTitle}>
                {renderTitleWithItalics(article.title)}
              </h4>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

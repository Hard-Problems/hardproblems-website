import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ArticleCard from '../../../../components/ArticleCard';
import CategoriesSidebar from '../../../../components/CategoriesSidebar';
import CategoriesDropdown, {
  type CategoryEntry
} from '../../../../components/CategoriesDropdown';
import {
  articleTypeSlug,
  getAllArticles,
  pluralize,
  topicDisplay,
  type Article
} from '../../../../lib/articles';
import styles from '../../page.module.scss';

// Regenerate at most every hour so scheduled articles (status:
// published + future `publishedAt`) surface in each category listing
// once their date arrives — no redeploy required.
export const revalidate = 3600;

// Assemble the [All, …type slugs…, …topic slugs…] entries the sidebar
// + dropdown share. Server-side so the client dropdown doesn't have to
// touch the filesystem-backed article helpers.
function buildCategoryEntries(allArticles: Article[]): CategoryEntry[] {
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
  const rest: CategoryEntry[] = [];
  for (const [type, count] of typeCounts) {
    rest.push({
      key: `type:${articleTypeSlug(type)}`,
      label: type,
      href: `/articles/type/${articleTypeSlug(type)}`,
      count
    });
  }
  for (const [topic, count] of topicCounts) {
    rest.push({
      key: `type:${topic}`,
      label: topicDisplay(topic),
      href: `/articles/type/${topic}`,
      count
    });
  }
  rest.sort((a, b) =>
    a.label.toLowerCase().localeCompare(b.label.toLowerCase())
  );
  return [
    {
      key: 'type:all',
      label: 'All',
      href: '/articles/type/all',
      count: allArticles.length
    },
    ...rest
  ];
}

type Props = { params: Promise<{ type: string }> };

// Pre-render one page per distinct category — combining articleType
// slugs (`book-reviews`, `podcast`, etc.) and topic slugs (`careers`,
// `public-health`, etc.) into a single URL space. Also emits the
// special `all` route that lists every published article.
export function generateStaticParams() {
  const slugs = new Set<string>();
  slugs.add('all');
  for (const article of getAllArticles()) {
    if (article.articleType) {
      slugs.add(articleTypeSlug(article.articleType));
    }
    for (const t of article.topics) slugs.add(t);
  }
  return Array.from(slugs).map((type) => ({ type }));
}

// Resolve a URL slug against every published article. Prefers article
// type over topic if the same slug matches both (arbitrary but stable).
type Match = {
  label: string;
  articles: ReturnType<typeof getAllArticles>;
};
function resolveMatch(slug: string): Match | null {
  const all = getAllArticles();
  const byType = all.filter(
    (a) => articleTypeSlug(a.articleType) === slug
  );
  if (byType.length > 0) {
    return { label: byType[0].articleType, articles: byType };
  }
  const byTopic = all.filter((a) => a.topics.includes(slug));
  if (byTopic.length > 0) {
    return { label: topicDisplay(slug), articles: byTopic };
  }
  return null;
}

export async function generateMetadata({
  params
}: Props): Promise<Metadata> {
  const { type } = await params;
  if (type === 'all') {
    return {
      title: 'All content — Hard Problems',
      description: 'Every article from Hard Problems.'
    };
  }
  const match = resolveMatch(type);
  if (!match) return { title: 'Articles — Hard Problems' };
  const label = pluralize(match.label);
  return {
    title: `${label} — Hard Problems`,
    description: `${label} from Hard Problems.`
  };
}

export default async function TypePage({ params }: Props) {
  const { type } = await params;
  const allArticles = getAllArticles();
  const isAll = type === 'all';

  let articles = allArticles;
  let label = 'All content';
  if (!isAll) {
    const match = resolveMatch(type);
    if (!match) notFound();
    articles = match.articles;
    label = match.label;
  }

  return (
    <section>
      <div className={styles.typeLayout}>
        <aside className={styles.typeFilters}>
          <CategoriesSidebar
            allArticles={allArticles}
            activeKey={`type:${type}`}
          />
          <CategoriesDropdown
            entries={buildCategoryEntries(allArticles)}
            activeKey={`type:${type}`}
          />
        </aside>
        <div className={styles.typeResults}>
          {/* Visually hidden — the categories sidebar already flags the
              active type visually. Keeps the heading landmark for
              screen readers and search crawlers. */}
          <h2 className="sr-only">{label}</h2>
          <ul
            className={`${styles.articleList} ${styles.articleListTwoCol}`}
          >
            {articles.map((article) => (
              <ArticleCard key={article.slug} article={article} compact />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

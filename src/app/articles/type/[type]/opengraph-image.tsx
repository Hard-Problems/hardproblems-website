import {
  OG_SIZE,
  createOGImage
} from '../../../../lib/og-template';
import {
  articleTypeSlug,
  articleTypeSubtitle,
  getAllArticles,
  pluralize
} from '../../../../lib/articles';

export const alt = 'Articles by type — Hard Problems';
export const size = OG_SIZE;
export const contentType = 'image/png';

type Props = { params: Promise<{ type: string }> };

// Pre-render one card per distinct articleType across all published
// articles — same set as the type page's generateStaticParams.
export function generateStaticParams() {
  const types = new Set<string>();
  for (const article of getAllArticles()) {
    if (article.articleType) {
      types.add(articleTypeSlug(article.articleType));
    }
  }
  return Array.from(types).map((type) => ({ type }));
}

export default async function Image({ params }: Props) {
  const { type } = await params;
  const article = getAllArticles().find(
    (a) => articleTypeSlug(a.articleType) === type
  );
  // Plural label (e.g. "Book Reviews") if we know the original casing.
  // No matching type means a topic slug (or an unknown one), so fall
  // back to the title-cased slug unpluralized — topics are subject
  // areas, and "Climate Changes" reads as a typo.
  const label = article
    ? pluralize(article.articleType)
    : type
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
  return createOGImage({
    title: label,
    subtitle: articleTypeSubtitle(type)
  });
}

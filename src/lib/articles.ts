import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';
import markdownItAttrs from 'markdown-it-attrs';

// All articles live as Markdown files under content/articles/. Adding a new
// file there is the entire workflow for publishing an article — the file
// system is the CMS.
const ARTICLES_DIR = path.join(process.cwd(), 'content/articles');
const TEAM_IMAGE_DIR = path.join(process.cwd(), 'public/images/team');

// Returns the public path to an author's headshot (jpg or png) when one
// exists in /public/images/team, otherwise null. Used by the article-page
// byline to show a small avatar next to the author's name.
export function getAuthorImage(authorSlug: string | undefined): string | null {
  if (!authorSlug) return null;
  for (const ext of ['jpg', 'png']) {
    const file = `${authorSlug}.${ext}`;
    if (fs.existsSync(path.join(TEAM_IMAGE_DIR, file))) {
      return `/images/team/${file}`;
    }
  }
  return null;
}

// markdown-it-attrs gives us the Pandoc-style `{#id .class key=val}` syntax
// that the source articles use for heading anchors, paragraph classes, and
// image classes (e.g. `{.float-right}` on inline cover images).
const md: MarkdownIt = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true
}).use(markdownItAttrs);

// Defense-in-depth for markdown rendering. Source articles live in the
// repo and are fully trusted today, but running the rendered HTML
// through a strict allowlist means an accidentally-added <script> or
// on* handler in a markdown file (or a future CMS ingestion path) can't
// execute in a reader's browser.
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    ...sanitizeHtml.defaults.allowedTags,
    'img',
    'figure',
    'figcaption',
    'video',
    'source',
    'iframe',
    'span',
    'del',
    'sub',
    'sup'
  ],
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    // NB: sanitize-html treats a tag-specific list as REPLACING the '*'
    // wildcard for that tag. Anything we want on <a>, <img>, etc. must
    // be listed here explicitly — including `class`, which our styles
    // (e.g. `.article-image-link { display: inline-block }`) depend on.
    '*': ['class', 'id', 'aria-hidden'],
    a: ['href', 'name', 'target', 'rel', 'class', 'id'],
    img: [
      'src',
      'alt',
      'width',
      'height',
      'loading',
      'srcset',
      'sizes',
      'class',
      'id'
    ],
    video: [
      'src',
      'poster',
      'autoplay',
      'loop',
      'muted',
      'playsinline',
      'preload',
      'controls',
      'width',
      'height',
      'class',
      'id'
    ],
    source: ['src', 'type'],
    iframe: [
      'src',
      'width',
      'height',
      'title',
      'allow',
      'allowfullscreen',
      'loading',
      'referrerpolicy',
      'style',
      'class',
      'id'
    ],
    div: ['class', 'id'],
    span: ['class', 'id']
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesAppliedToAttributes: ['href', 'src', 'poster'],
  // Only permit iframes from known-embed sources we actually use in
  // articles (YouTube nocookie for videos, Google Maps for the
  // coworking location). Anything else gets stripped.
  allowedIframeHostnames: [
    'www.youtube.com',
    'www.youtube-nocookie.com',
    'www.google.com',
    'maps.google.com'
  ],
  // Enforce link hygiene — external links get target=_blank +
  // rel="noopener noreferrer" so opened tabs can't reach back into
  // our page context.
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }, true)
  }
};

export type ArticleStatus = 'draft' | 'review' | 'published';

export type Article = {
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  authorSlug?: string;
  publishedAt: string; // ISO date string (YYYY-MM-DD)
  updatedAt: string;
  // Optional auto-removal date (YYYY-MM-DD). When set, the article is
  // hidden from all listings AND its canonical URL 404s starting the
  // day AFTER `expiresAt` — visible ALL day on the expiry date UTC,
  // gone at midnight UTC the next day. Same one-day grace pattern as
  // the jobs sheet's Column T. Used for time-limited posts like job
  // openings with a hard application deadline.
  expiresAt?: string;
  status: ArticleStatus;
  articleType: string; // e.g. "Article", "Book Review", "Podcast"
  topics: string[];
  organizations: string[];
  people: string[];
  readingTime: number; // minutes
  featured: boolean;
  image?: string; // path under /public, used as thumbnail + OG image
  imageAlt?: string;
  // Optional looping video shown in the listing thumbnail box. `image`
  // is still used as the poster/fallback and as the OG/social image.
  thumbnailVideo?: string; // path under /public (mp4); webm sibling auto-used
  thumbnailVideoWebm?: string;
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
  // Raw markdown body — useful for excerpt extraction or RSS feeds later.
  content: string;
  // Rendered HTML body, ready to be dangerouslySetInnerHTML'd.
  contentHtml: string;
};

// Wrap standalone <img> tags in an anchor that opens the source file
// in a new tab, so readers can view the full-resolution image. Skip
// images that are:
//   1. Already inside an <a>...</a> (the markdown author gave them a
//      specific link), or
//   2. Tagged with `.float-right` — inline aside images (portraits,
//      small illustrations) where click-to-enlarge would be off-tone.
// We walk tag-by-tag with a running anchor-depth counter so nested
// anchors and text between tags are handled correctly.
function wrapImagesInLinks(html: string): string {
  const tagRe = /<(\/?)(a|img)\b([^>]*)>/gi;
  let result = '';
  let lastIndex = 0;
  let anchorDepth = 0;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(html)) !== null) {
    result += html.slice(lastIndex, m.index);
    const [full, slash, tagName, attrs] = m;
    if (tagName.toLowerCase() === 'a') {
      if (slash === '/') {
        anchorDepth = Math.max(0, anchorDepth - 1);
      } else {
        anchorDepth++;
      }
      result += full;
    } else {
      const isFloatRight =
        /class\s*=\s*["'][^"']*\bfloat-right\b[^"']*["']/i.test(attrs);
      const srcMatch = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
      if (anchorDepth > 0 || isFloatRight || !srcMatch) {
        result += full;
      } else {
        result += `<a href="${srcMatch[1]}" target="_blank" rel="noopener noreferrer" class="article-image-link">${full}</a>`;
      }
    }
    lastIndex = m.index + full.length;
  }
  result += html.slice(lastIndex);
  return result;
}

function listArticleFiles(): string[] {
  if (!fs.existsSync(ARTICLES_DIR)) return [];
  return fs
    .readdirSync(ARTICLES_DIR)
    .filter((f) => f.endsWith('.md') || f.endsWith('.markdown'));
}

function readArticleFile(filename: string): Article | null {
  const filePath = path.join(ARTICLES_DIR, filename);
  if (!fs.existsSync(filePath)) return null;
  const slug = filename.replace(/\.(md|markdown)$/, '');
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = matter(raw);
  const data = parsed.data as Partial<Article>;
  const content = parsed.content;
  const contentHtml = sanitizeHtml(
    wrapImagesInLinks(md.render(content)),
    SANITIZE_OPTIONS
  );

  return {
    slug: typeof data.slug === 'string' && data.slug ? data.slug : slug,
    title: data.title ?? slug,
    excerpt: data.excerpt ?? '',
    author: data.author ?? '',
    authorSlug: data.authorSlug,
    publishedAt: data.publishedAt ?? '',
    updatedAt: data.updatedAt ?? data.publishedAt ?? '',
    expiresAt: data.expiresAt,
    status: (data.status as ArticleStatus) ?? 'draft',
    articleType: data.articleType ?? 'Article',
    topics: Array.isArray(data.topics) ? data.topics : [],
    organizations: Array.isArray(data.organizations)
      ? data.organizations
      : [],
    people: Array.isArray(data.people) ? data.people : [],
    readingTime:
      typeof data.readingTime === 'number'
        ? data.readingTime
        : estimateReadingTime(content),
    featured: data.featured === true,
    image: data.image,
    imageAlt: data.imageAlt,
    thumbnailVideo: data.thumbnailVideo,
    thumbnailVideoWebm: data.thumbnailVideoWebm,
    seoTitle: data.seoTitle,
    seoDescription: data.seoDescription,
    canonicalUrl: data.canonicalUrl,
    content,
    contentHtml
  };
}

// ~250 words/minute average reading speed, rounded up to whole minutes.
function estimateReadingTime(content: string): number {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 250));
}

// True if the article should appear in PUBLIC LISTINGS right now:
// status is `published` AND its `publishedAt` date (if set) is on or
// before today in UTC.
//
// An article with a future `publishedAt` is "scheduled": it stays out
// of every listing (homepage, category pages, feeds, sitemap) AND out
// of any future search index / results, but its canonical
// `/articles/<slug>` URL still serves the article — so a direct link
// (from an author preview, an early recipient, a scheduled tweet)
// continues to work. Once the date arrives, ISR revalidation on the
// listing pages surfaces it automatically.
//
// Use this in every code path that enumerates articles for display or
// discovery (getAllArticles, sitemap, RSS, any future search).
// Do NOT use it for direct-slug rendering — that path only checks
// `status === 'published'`.
//
// Missing / unparseable `publishedAt` is treated as "always visible"
// so authors don't have to backfill a date on legacy content.
export function isArticleLiveNow(article: Article): boolean {
  if (article.status !== 'published') return false;
  const now = new Date();
  const todayUTC = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );
  // Optional auto-removal: article disappears the day AFTER
  // `expiresAt`. Mirrors the jobs-sheet Column T expiry pattern in
  // fetchJobs.ts — strictly less than, so a 2026-09-15 expiry stays
  // visible ALL of Sept 15 UTC and drops at midnight UTC on Sept 16.
  const expiryRaw = (article.expiresAt || '').trim();
  if (expiryRaw) {
    const expiryMs = Date.parse(expiryRaw);
    if (!Number.isNaN(expiryMs)) {
      const e = new Date(expiryMs);
      const expiryUTC = Date.UTC(
        e.getUTCFullYear(),
        e.getUTCMonth(),
        e.getUTCDate()
      );
      if (expiryUTC < todayUTC) return false;
    }
  }
  const raw = (article.publishedAt || '').trim();
  if (!raw) return true;
  const publishMs = Date.parse(raw);
  if (Number.isNaN(publishMs)) return true;
  return publishMs <= todayUTC;
}

// Returns all published articles, newest-first. Drafts, in-review items,
// and articles with a future publication date are all excluded here so
// they never leak into the public site. `getArticleBySlug` still returns
// them so authors can preview during local dev via the page component's
// dev-only escape hatch.
export function getAllArticles(): Article[] {
  const articles = listArticleFiles()
    .map(readArticleFile)
    .filter((a): a is Article => a !== null)
    .filter(isArticleLiveNow);

  return articles.sort((a, b) =>
    (b.publishedAt || '').localeCompare(a.publishedAt || '')
  );
}

export function getArticleBySlug(slug: string): Article | null {
  // Look up by frontmatter `slug` first (canonical), falling back to the
  // filename. Allows the file on disk to be renamed without breaking URLs.
  for (const file of listArticleFiles()) {
    const article = readArticleFile(file);
    if (!article) continue;
    if (article.slug === slug) return article;
  }
  return null;
}

// Turn a topic slug (kebab-case, lower) into the display form: dashes →
// spaces, first letter capitalized, rest lower-case. So "social-impact"
// becomes "Social impact" and "ai" becomes "Ai".
export function topicDisplay(topic: string): string {
  const spaced = topic.replace(/-/g, ' ').trim();
  if (!spaced) return '';
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

// Convert an article-type label (e.g. "Book Review") to a URL slug
// ("book-review"). Used by the breadcrumb link and the /articles/type/
// route handler.
export function articleTypeSlug(type: string): string {
  return type.trim().toLowerCase().replace(/\s+/g, '-');
}

// Naive pluralisation good enough for the article-type labels we use
// (Article, Book Review, Podcast, Interview, etc.). Doesn't handle
// irregulars — extend if we add a type like "Analysis" later.
export function pluralize(label: string): string {
  if (!label) return '';
  if (label.endsWith('s')) return label;
  if (/[^aeiou]y$/i.test(label)) return label.slice(0, -1) + 'ies';
  return label + 's';
}

// Friendly subtitles for the topic / type OG cards. Kept in this single
// place so we can re-use them anywhere we want a one-line description of
// a topic or article type. Unmapped slugs fall back to no subtitle.
const TOPIC_SUBTITLES: Record<string, string> = {
  careers: 'Building a career around the problems that matter.',
  'social-impact':
    'Writing on impact-driven work and the people doing it.',
  'job-search':
    'Practical advice for finding meaningful roles at orgs doing meaningful work.',
  design: 'How designers can apply themselves to hard problems.',
  'decision-making':
    'Approaches for making big career decisions with more clarity.',
  frameworks:
    'Tools and rubrics for approaching hard problems.',
  'tech-for-good': 'Using technology to make a positive difference.'
};

export function topicSubtitle(topic: string): string | undefined {
  return TOPIC_SUBTITLES[topic];
}

const ARTICLE_TYPE_SUBTITLES: Record<string, string> = {
  article:
    'Reflections and writing about hard problems and impact-driven careers.',
  advice:
    'Practical guidance for navigating impact-driven careers and the work that matters.',
  'book-reviews':
    'Books and reading recommendations for impact-driven careers and the work that matters.',
  tools:
    'Practical tools and rubrics for thinking through impact-driven work.',
  opinion:
    'Personal takes on careers, design, and the work that matters.',
  podcast:
    'Conversations with designers working on hard problems.',
  video:
    'Talks, conference sessions, and videos on design and the hard problems that matter.',
  announcements:
    'Updates and stories about Hard Problems — what we’re building and why.'
};

export function articleTypeSubtitle(
  typeSlug: string
): string | undefined {
  return ARTICLE_TYPE_SUBTITLES[typeSlug];
}

// Helper used by the article page header. Formats a `YYYY-MM-DD`
// frontmatter date. Pinned to UTC because `new Date('YYYY-MM-DD')`
// parses as UTC midnight; without the `timeZone: 'UTC'` option the
// formatter would render in the caller's local zone, so a machine or
// serverless region west of UTC displays the *previous* day
// (e.g. "2026-08-01" → "31 Jul 2026" in US timezones).
export function formatPublishedDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  });
}

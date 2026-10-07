import type { MetadataRoute } from 'next';
import { getAllArticles, articleTypeSlug } from '../lib/articles';
import { AUTHORS } from '../lib/authors';
import { fetchJobs } from './jobs/fetchJobs';
import {
  locationSlug,
  qualifyingCountries
} from './jobs/locations';
import { buildJobSlugs, jobKey } from './jobs/jobSlug';
import { SITE_URL } from '../lib/siteUrl';
import { META_REGIONS } from './jobs/filters';

// Next.js auto-serves this at /sitemap.xml. Regenerates alongside
// the site's ISR revalidate cycle, so new articles and qualifying
// location pages appear in the sitemap within an hour of publish.
//
// Priority + changeFrequency are hints, not hard signals — Google
// mostly uses them for its own crawl-budget planning.

const SITE = SITE_URL;

// Every top-level marketing page. Article-listing (/articles) and the
// jobs board (/jobs) are the two "hub" pages, given a higher priority
// so Googlebot revisits them more often.
const TOP_LEVEL: Array<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
}> = [
  { path: '/', priority: 1.0, changeFrequency: 'daily' },
  { path: '/jobs', priority: 0.9, changeFrequency: 'daily' },
  { path: '/articles', priority: 0.9, changeFrequency: 'daily' },
  { path: '/about', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/coworking', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/events', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/give', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/newsletter', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/podcast', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/conduct', priority: 0.3, changeFrequency: 'yearly' }
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Top-level pages.
  const top: MetadataRoute.Sitemap = TOP_LEVEL.map((t) => ({
    url: `${SITE}${t.path}`,
    lastModified: now,
    changeFrequency: t.changeFrequency,
    priority: t.priority
  }));

  // Published articles + the article-type index pages that group them.
  const articles = getAllArticles();
  const articleUrls: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${SITE}/articles/${a.slug}`,
    lastModified: a.updatedAt || a.publishedAt || undefined,
    changeFrequency: 'monthly',
    priority: 0.7
  }));

  // Distinct articleType values → one /articles/type/[slug] page each.
  const types = new Set<string>();
  for (const a of articles) if (a.articleType) types.add(a.articleType);
  const typeUrls: MetadataRoute.Sitemap = Array.from(types).map((t) => ({
    url: `${SITE}/articles/type/${articleTypeSlug(t)}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.6
  }));

  // SEO jobs-by-location pages. Includes every region (always) plus
  // countries with ≥10 active jobs. Countries below that threshold
  // still resolve on-demand via dynamicParams but aren't in the
  // sitemap — Google can find them via internal links.
  const jobs = await fetchJobs();
  const regionUrls: MetadataRoute.Sitemap = META_REGIONS.map((r) => ({
    url: `${SITE}/jobs/${locationSlug(r.name)}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.8
  }));
  const countryUrls: MetadataRoute.Sitemap = qualifyingCountries(jobs).map(
    (c) => ({
      url: `${SITE}/jobs/${locationSlug(c)}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.7
    })
  );

  // One /jobs/role/<slug> entry per live job. These are the pages that
  // carry JobPosting structured data, so they're the ones Google needs
  // to find. Expired jobs are pruned from the snapshot, so they drop
  // out of here automatically and their pages 404 — which is what
  // Google asks for with closed postings.
  const jobSlugs = buildJobSlugs(jobs);
  const roleUrls: MetadataRoute.Sitemap = [
    ...new Set(
      jobs.map((j) => jobSlugs.get(jobKey(j))).filter((s): s is string => !!s)
    )
  ].map((slug) => ({
    url: `${SITE}/jobs/role/${slug}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.6
  }));

  // One /authors/<slug> entry per contributor in the AUTHORS registry.
  const authorUrls: MetadataRoute.Sitemap = AUTHORS.map((a) => ({
    url: `${SITE}/authors/${a.slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.5
  }));

  return [
    ...top,
    ...articleUrls,
    ...typeUrls,
    ...regionUrls,
    ...countryUrls,
    ...roleUrls,
    ...authorUrls
  ];
}

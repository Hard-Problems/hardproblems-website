import type { NextRequest } from 'next/server';
import { fetchJobs, type SerializedJob } from '../fetchJobs';
import { filterJobs, parseFiltersFromParams } from '../filters';
import { orgTypeDisplay } from '../orgType';

// Cache aligned with fetchJobs(): re-render the feed at most every 10 min.
export const revalidate = 600;

// Same fallback-path headroom as the jobs page — this route shares
// fetchJobs(), so it inherits the same worst case if the snapshot is
// missing.
export const maxDuration = 60;

const FEED_TITLE = 'Hard Problems — Job board';
const FEED_DESCRIPTION =
  'Jobs at organizations working on the hard problems: climate change, health, public services, and education.';
const ORIGIN_FALLBACK = 'https://hardproblems.com';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildItemTitle(job: SerializedJob): string {
  if (job.title && job.company) return `${job.title} at ${job.company}`;
  return job.title || job.company || 'Untitled role';
}

function buildItemDescription(job: SerializedJob): string {
  // RSS readers display this in the item preview. Plain-text-ish; we just
  // escape for XML at render time.
  const lines: string[] = [];
  if (job.description) lines.push(job.description);

  const meta: string[] = [];
  const place = [job.city, job.country].filter((s) => s.length > 0).join(', ');
  if (place) meta.push(place);
  if (job.remote) meta.push(job.remote);
  if (job.salary && job.salary.toLowerCase() !== 'n/a') meta.push(job.salary);
  if (job.sector) meta.push(job.sector);
  const orgLabel = orgTypeDisplay(job.typeOfOrg);
  if (orgLabel) meta.push(orgLabel);
  if (meta.length > 0) lines.push(meta.join(' · '));

  return lines.join('\n\n');
}

function buildPubDate(job: SerializedJob): string {
  // Prefer the human-curated "Job listed date" (column A); fall back to
  // "Date created" (column P) so an item without a listed date still gets
  // a stable timestamp instead of "now" (which would re-publish to readers
  // every time the feed is regenerated).
  const ts = job.date ?? job.dateCreated;
  if (ts) {
    const d = new Date(ts);
    if (!Number.isNaN(d.getTime())) return d.toUTCString();
  }
  return new Date().toUTCString();
}

export async function GET(request: NextRequest) {
  const jobs = await fetchJobs();
  const filters = parseFiltersFromParams(request.nextUrl.searchParams);
  const filtered = filterJobs(jobs, filters);

  // Use the request origin in dev; fall back to the production URL otherwise
  // so cron-style consumers still get absolute links if they ever hit a
  // serverless instance without one.
  const origin = request.nextUrl.origin || ORIGIN_FALLBACK;
  const search = request.nextUrl.search;
  const selfUrl = `${origin}/jobs/feed.xml${search}`;
  const pageUrl = `${origin}/jobs${search}`;

  const items = filtered
    .map((job) => {
      const link = job.url || pageUrl;
      const pubDate = buildPubDate(job);
      return [
        '    <item>',
        `      <title>${escapeXml(buildItemTitle(job))}</title>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <guid isPermaLink="${job.url ? 'true' : 'false'}">${escapeXml(
          link
        )}</guid>`,
        `      <pubDate>${pubDate}</pubDate>`,
        `      <description>${escapeXml(buildItemDescription(job))}</description>`,
        '    </item>'
      ].join('\n');
    })
    .join('\n');

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(FEED_TITLE)}</title>`,
    `    <link>${escapeXml(pageUrl)}</link>`,
    `    <atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml" />`,
    `    <description>${escapeXml(FEED_DESCRIPTION)}</description>`,
    '    <language>en</language>',
    `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
    items,
    '  </channel>',
    '</rss>',
    ''
  ].join('\n');

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      // 10-minute browser cache + 10-minute shared (CDN) cache with a 1-hour
      // stale-while-revalidate window so feed readers polling on the way to
      // a fresh build still get an immediate response.
      'Cache-Control':
        'public, max-age=600, s-maxage=600, stale-while-revalidate=3600'
    }
  });
}

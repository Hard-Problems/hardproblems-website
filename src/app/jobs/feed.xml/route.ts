import type { NextRequest } from 'next/server';
import { fetchJobs, type SerializedJob } from '../fetchJobs';
import {
  filterJobs,
  hoverDescription,
  isHardProblemsPick,
  paragraphs,
  parseFiltersFromParams
} from '../filters';
import { orgTypeDisplay } from '../orgType';
import { buildJobSlugs, jobKey } from '../jobSlug';
import { SITE_URL } from '../../../lib/siteUrl';

// Cache aligned with fetchJobs(): re-render the feed at most every 10 min.
export const revalidate = 600;

// Same fallback-path headroom as the jobs page — this route shares
// fetchJobs(), so it inherits the same worst case if the snapshot is
// missing.
export const maxDuration = 60;

const FEED_TITLE = 'Hard Problems — Job board';
const FEED_DESCRIPTION =
  'Jobs at organizations working on the hard problems: climate change, health, public services, and education.';
const ORIGIN_FALLBACK = SITE_URL;

// Escapes text destined for the INSIDE of the HTML we put in
// <description>. That content gets escaped a second time by escapeXml on
// its way into the XML, and a reader undoes exactly one of those layers
// before handing the result to its HTML renderer — so a literal "&" has
// to survive as "&amp;" at the HTML stage, and a literal "<" must not
// arrive looking like a tag.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

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

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
];

// "12 Nov 2026" from the sheet's UTC-midnight ISO string. Read in UTC for
// the same reason the job page does: a western timezone would otherwise
// shift a midnight date back a day.
function formatDeadline(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  // A deadline that has passed is noise — the job is on its way off the
  // board anyway (see pruneExpiredJobs).
  if (d.getTime() < Date.now()) return null;
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// Built as HTML, not plain text. Readers overwhelmingly render
// <description> as HTML, where a newline is just whitespace and
// collapses to a space — which is why Column U's two paragraphs (the
// organisation, then "As <role>, you would…") ran together into a wall
// of text. <p> is the only thing that reliably survives.
function buildItemDescription(job: SerializedJob): string {
  const blocks: string[] = [];

  // hoverDescription() prefers Column U (the job-specific blurb) and
  // falls back to Column M (the company one). This used to read Column M
  // directly, so for the ~84% of live jobs that have a U value the feed
  // described the ORGANISATION while the board described the ROLE.
  // Sharing the helper is what stops the two drifting again.
  //
  // paragraphs() splits on any run of newlines — the same helper the
  // board's tooltip and the job page use, so all three break the text in
  // exactly the same places.
  const summary = hoverDescription(job);
  if (summary) blocks.push(...paragraphs(summary));

  // Column W. The reason this board exists, in a sentence or two — worth
  // the space in a feed where the reader has nothing else to go on.
  if (job.impactSummary) blocks.push(...paragraphs(job.impactSummary));

  // Facts a reader acts on, inline. The taxonomy fields that used to sit
  // here (sector, org type) moved to <category> below, where a reader can
  // filter on them instead of reading them in a widening trail of dots.
  const meta: string[] = [];
  const place = [job.city, job.country].filter((s) => s.length > 0).join(', ');
  if (place) meta.push(place);
  if (job.remote) meta.push(job.remote);
  if (job.salary && job.salary.toLowerCase() !== 'n/a') meta.push(job.salary);
  const deadline = formatDeadline(job.expiresAt);
  if (deadline) meta.push(`Apply by ${deadline}`);
  if (meta.length > 0) blocks.push(meta.join(' · '));

  return blocks.map((b) => `<p>${escapeHtml(b)}</p>`).join('');
}

// <category> is RSS's own field for this, so readers can group and filter
// on it rather than parsing it back out of the description.
function buildCategories(job: SerializedJob): string[] {
  const out: string[] = [];
  if (job.sector) out.push(job.sector);
  if (job.role) out.push(job.role);
  if (job.seniority) out.push(job.seniority);
  const orgLabel = orgTypeDisplay(job.typeOfOrg);
  if (orgLabel) out.push(orgLabel);
  // Carried as a category rather than a title prefix: it stays out of the
  // way for readers that ignore categories, and does not churn the title
  // of every pick for those that do.
  if (isHardProblemsPick(job.goodForWorld)) out.push('Our Pick');
  // A job whose sector and role type happen to match would otherwise
  // emit the same category twice.
  return [...new Set(out)];
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

  // Built from the UNFILTERED set, which is what /jobs/role/[slug]
  // resolves against. Building it from `filtered` would hand a job whose
  // title collides with another a shorter, unsuffixed slug — one that
  // 404s on the real page. See buildJobSlugs().
  const slugs = buildJobSlugs(jobs);

  // Use the request origin in dev; fall back to the production URL otherwise
  // so cron-style consumers still get absolute links if they ever hit a
  // serverless instance without one.
  const origin = request.nextUrl.origin || ORIGIN_FALLBACK;
  const search = request.nextUrl.search;
  const selfUrl = `${origin}/jobs/feed.xml${search}`;
  const pageUrl = `${origin}/jobs${search}`;

  const items = filtered
    .map((job) => {
      // Point readers at the job's own page rather than straight out to
      // the employer. The page carries the full description, the
      // structured data and the apply button, and it keeps the click on
      // a URL we control — an employer listing that moves or expires
      // leaves a dead link in every reader that cached this item.
      //
      // Every job here came from the same fetchJobs() call the page
      // route resolves against, so a slug is always present; the
      // fallbacks are belt and braces.
      const slug = slugs.get(jobKey(job));
      const link = slug ? `${origin}/jobs/role/${slug}` : job.url || pageUrl;

      // The guid deliberately does NOT follow the link. Readers treat it
      // as the item's identity, so changing its VALUE would re-publish
      // every job on this feed as unread — ~575 items into whatever
      // inbox, channel or automation is subscribed. Keeping the employer
      // URL preserves continuity for existing subscribers.
      //
      // isPermaLink="false" marks it as an opaque identifier rather than
      // a URL to visit, which is what makes readers follow <link>
      // instead. That attribute change is safe: readers key on the value.
      const guid = job.url || link;
      const pubDate = buildPubDate(job);
      return [
        '    <item>',
        `      <title>${escapeXml(buildItemTitle(job))}</title>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <guid isPermaLink="false">${escapeXml(guid)}</guid>`,
        `      <pubDate>${pubDate}</pubDate>`,
        ...buildCategories(job).map(
          (c) => `      <category>${escapeXml(c)}</category>`
        ),
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

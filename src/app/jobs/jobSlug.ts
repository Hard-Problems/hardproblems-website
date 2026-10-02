import type { SerializedJob } from './fetchJobs';

// Stable URL slugs for the per-job pages at /jobs/role/<slug>.
//
// Built from company + title because that is what a human would search
// for and what reads well in a result. The sheet has no stable job ID,
// so the slug IS the identity — which makes determinism the whole
// problem this file solves.

// Max length of the company+title portion. Long enough for the
// longest real titles (the current max is 90 chars) without producing
// URLs that wrap in search results.
const MAX_SLUG = 90;

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function baseSlug(job: SerializedJob): string {
  const base = `${slugify(job.company)}-${slugify(job.title)}`
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base.slice(0, MAX_SLUG).replace(/-+$/, '');
}

// Short deterministic token from the apply URL, used only to separate
// jobs that would otherwise share a slug. Not security-sensitive — it
// just has to be stable and collision-resistant enough for a handful
// of duplicate postings. (djb2; 6 hex chars.)
function urlToken(job: SerializedJob): string {
  let h = 5381;
  const s = job.url || `${job.company}|${job.title}`;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(6, '0').slice(-6);
}

// Map every job to its slug, disambiguating collisions.
//
// Two postings can legitimately share company + title — the same role
// listed twice, or two openings on the same team. When that happens
// EVERY job sharing the base gets the token suffix, not just the
// second one. Suffixing only the later duplicate would mean the first
// job's URL depended on whether the other one happened to exist, so
// removing one would silently change the other's URL.
//
// Caveat worth knowing: a slug is still set-dependent in one way — if
// a collision disappears entirely (one of the pair expires), the
// survivor's base no longer collides and it loses the suffix on the
// next rebuild. That affects only the handful of duplicate postings
// (currently 4 pairs out of 585).
export function buildJobSlugs(jobs: SerializedJob[]): Map<string, string> {
  const counts = new Map<string, number>();
  for (const job of jobs) {
    const b = baseSlug(job);
    counts.set(b, (counts.get(b) ?? 0) + 1);
  }
  const out = new Map<string, string>();
  for (const job of jobs) {
    const b = baseSlug(job);
    out.set(jobKey(job), (counts.get(b) ?? 0) > 1 ? `${b}-${urlToken(job)}` : b);
  }
  return out;
}

// Identity for a job within one snapshot. The apply URL is unique in
// practice (3 duplicate rows out of ~590) and is the closest thing the
// sheet has to a primary key.
export function jobKey(job: SerializedJob): string {
  return job.url || `${job.company}|${job.title}`;
}

// Resolve a slug back to its job, or null. Rebuilds the same map, so
// it always agrees with buildJobSlugs() for a given job set.
export function findJobBySlug(
  jobs: SerializedJob[],
  slug: string
): { job: SerializedJob; slug: string } | null {
  const slugs = buildJobSlugs(jobs);
  for (const job of jobs) {
    if (slugs.get(jobKey(job)) === slug) return { job, slug };
  }
  return null;
}

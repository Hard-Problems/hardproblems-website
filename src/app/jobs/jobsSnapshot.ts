import { Redis } from '@upstash/redis';
import type { SerializedJob } from './fetchJobs';

// Durable snapshot of the parsed jobs sheet, refreshed on a schedule by
// /api/cron/sync-jobs and read by fetchJobs() on every render.
//
// Why this exists: the jobs board is `force-dynamic`, so it re-renders
// per request. Pulling the 1.6MB Sheet CSV inside that render meant
// Next's stale-while-revalidate refresh ran on the request's function
// invocation, which repeatedly hit Vercel's 15s ceiling
// ("Vercel Runtime Timeout Error"). The task was killed before the
// refreshed CSV reached the Data Cache, so the stale entry survived
// indefinitely and the board silently stopped showing new jobs. Moving
// the fetch onto a cron takes it off the request path entirely.
//
// Requires the same two env vars as the rate limiter:
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN
// When either is unset (local dev, build steps without Upstash) every
// helper here no-ops and fetchJobs() falls back to fetching the Sheet
// directly — the pre-existing behaviour.

// Bump the version suffix if SerializedJob's shape changes, so a new
// deploy can't read a payload written under the previous schema.
const SNAPSHOT_KEY = 'hp:jobs:snapshot:v1';

// How long a snapshot stays readable. Comfortably longer than the sync
// interval so one skipped cron run doesn't empty the board, but short
// enough that a sync broken for hours degrades to the direct-fetch
// fallback rather than serving silently ancient data.
const SNAPSHOT_TTL_SECONDS = 6 * 60 * 60;

export type JobsSnapshot = {
  // ISO timestamp of the sync that produced this payload. Returned by
  // the cron endpoint and useful when debugging staleness.
  syncedAt: string;
  // Jobs as parsed from the sheet, sorted, but WITHOUT the date window
  // applied — see applyDateWindow() in fetchJobs.ts. Storing them
  // unfiltered means expiry and the 45-day cutoff are evaluated
  // against the current time on read, so a snapshot written 15 minutes
  // ago still hides a job that expired 5 minutes ago.
  jobs: SerializedJob[];
};

let cached: Redis | null = null;
let bootstrapped = false;

function getRedis(): Redis | null {
  if (bootstrapped) return cached;
  bootstrapped = true;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  cached = new Redis({ url, token });
  return cached;
}

// Read the current snapshot, or null when there isn't a usable one
// (Upstash unconfigured, key expired, or any Redis error). Never
// throws — a Redis outage must degrade to the direct-fetch fallback,
// not take the jobs board down.
export async function readJobsSnapshot(): Promise<JobsSnapshot | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const snapshot = await redis.get<JobsSnapshot>(SNAPSHOT_KEY);
    if (!snapshot || !Array.isArray(snapshot.jobs)) return null;
    // An empty array is a valid parse in principle but always means
    // something went wrong upstream, and serving it would blank the
    // board. Treat it as "no snapshot" so the caller falls back.
    if (snapshot.jobs.length === 0) return null;
    return snapshot;
  } catch (err) {
    console.warn('[jobsSnapshot] read failed, falling back to sheet', err);
    return null;
  }
}

// Persist a freshly parsed set of jobs. Returns false when the write
// didn't happen (Upstash unconfigured or erroring) so the caller can
// report it rather than claiming a successful sync.
export async function writeJobsSnapshot(
  jobs: SerializedJob[]
): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  // Refuse to overwrite a good snapshot with an empty one — a sheet
  // fetch that returns a valid-but-empty CSV shouldn't be able to
  // clear the board until the TTL lapses.
  if (jobs.length === 0) return false;
  const snapshot: JobsSnapshot = {
    syncedAt: new Date().toISOString(),
    jobs
  };
  try {
    await redis.set(SNAPSHOT_KEY, snapshot, { ex: SNAPSHOT_TTL_SECONDS });
    return true;
  } catch (err) {
    console.warn('[jobsSnapshot] write failed', err);
    return false;
  }
}

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { SerializedJob } from './fetchJobs';

// Durable snapshot of the parsed jobs sheet, refreshed on a schedule by
// /api/cron/sync-jobs and read by fetchJobs() on every render.
//
// Why this exists: the jobs board is `force-dynamic`, so it re-renders
// per request. Pulling the ~1.6MB Sheet CSV inside that render meant
// Next's stale-while-revalidate refresh ran on the request's function
// invocation, which repeatedly hit Vercel's 15s ceiling
// ("Vercel Runtime Timeout Error"). The task was killed before the
// refreshed CSV reached the Data Cache, so the stale entry survived
// indefinitely and the board silently stopped showing new jobs. Moving
// the fetch onto a cron takes it off the request path entirely.
//
// Backed by Postgres (table: jobs_snapshot) rather than Redis
// specifically because SUPABASE_URL / SUPABASE_SECRET_KEY are known to
// be set in Production, whereas UPSTASH_REDIS_REST_* are not.
//
// When those env vars are missing (local dev, build steps) every helper
// here no-ops and fetchJobs() falls back to fetching the Sheet directly
// — the pre-existing behaviour.

const TABLE = 'jobs_snapshot';

// Two pinned rows, not one.
//
// Row 1 is every field the sheet has. Row 2 is the same jobs with
// `fullJobDescription` (Column X) blanked — and that one field is 67%
// of the payload, so the board's read drops from ~2.8MB to ~0.9MB.
//
// Why this exists: Column X was added for the per-job pages, and only
// those pages read it. The board, the location hubs, the homepage
// teaser and the RSS feed never show it — but every one of them was
// pulling it across the network and parsing it on each render, because
// the snapshot is one blob. As Column X filled in, that read grew past
// a second and `/jobs` started timing out under cold starts.
const ROW_ID_FULL = 1;
const ROW_ID_BOARD = 2;

/**
 * Which snapshot to read.
 *
 * 'board' for anything that renders a list of jobs; 'full' only for a
 * job's own page, which is the one surface that shows Column X.
 */
export type SnapshotVariant = 'board' | 'full';

// How long a snapshot stays usable. Postgres has no TTL, so staleness
// is enforced here on read. Comfortably longer than the 15-minute sync
// interval so one skipped run doesn't empty the board, but short enough
// that a sync broken for hours degrades to the direct-fetch fallback
// rather than serving silently ancient data.
const MAX_SNAPSHOT_AGE_MS = 6 * 60 * 60 * 1000;

export type JobsSnapshot = {
  // ISO timestamp of the sync that produced this payload. Useful when
  // debugging staleness.
  syncedAt: string;
  // Jobs as parsed from the sheet, sorted, but WITHOUT the date window
  // applied — see applyDateWindow() in fetchJobs.ts. Storing them
  // unfiltered means expiry and the 45-day cutoff are evaluated against
  // the current time on read, so a snapshot written 15 minutes ago
  // still hides a job that expired 5 minutes ago.
  jobs: SerializedJob[];
};

let cached: SupabaseClient | null = null;
let bootstrapped = false;

// Unlike alertsDb(), this returns null instead of throwing when the env
// is incomplete. A missing env var must degrade fetchJobs() to its
// fallback, not throw on every render of the jobs board.
function getDb(): SupabaseClient | null {
  if (bootstrapped) return cached;
  bootstrapped = true;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.warn('[jobsSnapshot] SUPABASE_URL/SECRET_KEY unset, skipping');
    return null;
  }
  // Guard against a present-but-unusable value. `vercel env pull`
  // writes the literal placeholder "[SENSITIVE]" for variables marked
  // Sensitive, and createClient THROWS on a malformed URL — which
  // would take down `next build` and every render rather than
  // degrading to the direct-fetch fallback.
  if (!/^https?:\/\//.test(url)) {
    console.warn('[jobsSnapshot] SUPABASE_URL is not a valid URL, skipping');
    return null;
  }
  try {
    // Caching of these reads is left to route-level config on purpose.
    // Forcing `no-store` here made every caller dynamic, which broke
    // static generation for /jobs/[location] — those pages then failed
    // the snapshot read at build time and silently fell back to pulling
    // the 1.6MB Sheet. The board itself is `force-dynamic` so its reads
    // are uncached regardless, and the location pages want their ISR
    // window to apply.
    cached = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  } catch (err) {
    console.warn('[jobsSnapshot] could not create Supabase client', err);
    cached = null;
  }
  return cached;
}

// Read the current snapshot, or null when there isn't a usable one
// (Supabase unconfigured, no row yet, row too old, or any query error).
// Never throws — a database problem must degrade to the direct-fetch
// fallback, not take the jobs board down.
export async function readJobsSnapshot(
  variant: SnapshotVariant = 'board'
): Promise<JobsSnapshot | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const { data, error } = await db
      .from(TABLE)
      .select('synced_at, jobs')
      .eq('id', variant === 'full' ? ROW_ID_FULL : ROW_ID_BOARD)
      .maybeSingle();
    if (error) {
      await degraded('read failed', new Error(error.message));
      return null;
    }
    if (!data) {
      // The board row does not exist until the first sync after this
      // was deployed. Fall back to the full row rather than dropping to
      // the Sheets API, so a deploy does not blank the board for up to
      // fifteen minutes while waiting for the cron.
      if (variant === 'board') {
        console.warn('[jobsSnapshot] no board row yet, using the full one');
        return readJobsSnapshot('full');
      }
      await degraded('no snapshot row found', new Error('no-snapshot-row'));
      return null;
    }
    if (!Array.isArray(data.jobs)) {
      await degraded(
        `jobs column is ${typeof data.jobs}, not array`,
        new Error('jobs-column-not-array')
      );
      return null;
    }
    // An empty array is a valid parse in principle but always means
    // something went wrong upstream, and serving it would blank the
    // board. Treat it as "no snapshot" so the caller falls back.
    if (data.jobs.length === 0) {
      await degraded('snapshot row has zero jobs', new Error('snapshot-empty'));
      return null;
    }

    const syncedAt = data.synced_at as string;
    const age = Date.now() - new Date(syncedAt).getTime();
    if (!Number.isFinite(age) || age > MAX_SNAPSHOT_AGE_MS) {
      await degraded(
        `snapshot too old (${syncedAt}), falling back`,
        new Error('snapshot-stale'),
        { syncedAt, ageHours: Math.round(age / 3_600_000) }
      );
      return null;
    }

    healthy();
    console.log(
      `[jobsSnapshot] read ok: ${data.jobs.length} jobs, synced ${syncedAt}`
    );
    return { syncedAt, jobs: data.jobs as SerializedJob[] };
  } catch (err) {
    await degraded('read threw, falling back to sheet', err);
    return null;
  }
}

/**
 * Why this returns a REASON and not just false.
 *
 * It used to return a bare boolean, so the caller could say a sync had
 * failed but never why — and the why lived only in a `console.warn`.
 * On 2026-10-17 that line held
 * `violates check constraint "jobs_snapshot_id_check"`, which named the
 * unrun migration outright, and it sat unread for eight hours while the
 * caller reported a featureless "snapshot-write-failed". The reason
 * travels now so it can reach the alert instead of the log.
 */
export type SnapshotWriteResult = { ok: true } | { ok: false; reason: string };

// Persist a freshly parsed set of jobs.
export async function writeJobsSnapshot(
  jobs: SerializedJob[]
): Promise<SnapshotWriteResult> {
  const db = getDb();
  if (!db) return { ok: false, reason: 'Supabase is not configured' };
  // Refuse to overwrite a good snapshot with an empty one — a sheet
  // fetch that returns a valid-but-empty CSV shouldn't be able to clear
  // the board.
  if (jobs.length === 0) {
    return { ok: false, reason: 'refused to write an empty snapshot' };
  }
  try {
    const syncedAt = new Date().toISOString();
    // Blanked rather than deleted, so the shape stays identical to
    // SerializedJob and nothing downstream has to special-case a
    // missing key — `fullJobDescription || jobDescription` already
    // falls through on an empty string.
    const boardJobs = jobs.map((job) => ({ ...job, fullJobDescription: '' }));

    // Both rows in one call, so the two can never be left describing
    // different syncs.
    const { error } = await db.from(TABLE).upsert(
      [
        { id: ROW_ID_FULL, synced_at: syncedAt, jobs },
        { id: ROW_ID_BOARD, synced_at: syncedAt, jobs: boardJobs }
      ],
      { onConflict: 'id' }
    );
    if (error) {
      await report('jobsSnapshot: write failed', new Error(error.message));
      return { ok: false, reason: error.message };
    }
    return { ok: true };
  } catch (err) {
    await report('jobsSnapshot: write threw', err);
    return {
      ok: false,
      reason: err instanceof Error ? err.message : String(err)
    };
  }
}

// ---- read-side degradation ------------------------------------------
//
// The write path above catches a broken sync. This catches everything
// else that makes the snapshot unusable while the cron is perfectly
// healthy — Supabase unreachable, the row deleted, a payload that is
// not an array. Without it those states are invisible: fetchJobs()
// falls back to the Sheets API, the board keeps rendering, and the only
// evidence is a warning per request.
//
// "Per request" is exactly the problem, and why this is a flag rather
// than a straight logError. A degradation is sustained — every render
// of the board, every job page, the sitemap and the RSS feed take this
// path for as long as it lasts. Reporting each one would bury PostHog
// in thousands of identical events during the window when it most needs
// to be readable. So: the first failure in a process reports, the rest
// are logged and nothing more, and a successful read re-arms it.
//
// The unit is the process, not the incident. A serverless deployment
// runs many instances, so a real outage produces one event per instance
// rather than one event — which is the right trade: still a tiny
// number, and the spread across instances tells you the problem is
// systemic rather than one bad lambda.
let degradationReported = false;

/** A good read ends the current episode, so the next one reports. */
function healthy(): void {
  degradationReported = false;
}

/**
 * Log a read failure, and report the first one of an episode.
 *
 * Awaited by its callers. Fire-and-forget would be cheaper, but a
 * serverless function can freeze the moment it returns its response and
 * take the unflushed event with it — and this fires once per process,
 * on a request that is already falling back to a multi-second Sheets
 * fetch, so the few hundred milliseconds buy delivery of the one event
 * that says the board is degraded.
 */
async function degraded(
  detail: string,
  error: unknown,
  extra?: Record<string, unknown>
): Promise<void> {
  console.warn(`[jobsSnapshot] ${detail}`);
  if (degradationReported) return;
  degradationReported = true;
  await report('jobsSnapshot: read degraded', error, { detail, ...extra });
}

/**
 * Report a snapshot WRITE failure to PostHog.
 *
 * Imported dynamically, and only on the failure path, because this
 * module is pulled in by fetchJobs() and so by the board, every job
 * page, the location hubs, the sitemap and the RSS feed. A top-level
 * import would load posthog-node into all of them to serve an error
 * case that should never run.
 *
 * Deliberately NOT used on the read path above. Those warnings fire
 * once per render, so routing them here would emit an event per request
 * for the whole duration of a degradation — the periods when traffic is
 * least worth drowning. A failed write happens four times an hour at
 * most, and it is the root cause anyway: the read-side warnings are
 * symptoms of it.
 */
async function report(
  tag: string,
  error: unknown,
  extra?: Record<string, unknown>
): Promise<void> {
  try {
    const { logError } = await import('../../lib/posthog-server');
    logError(tag, error, extra);
  } catch {
    // Reporting must never be the reason a sync fails.
    console.warn(`[jobsSnapshot] could not report: ${tag}`, error);
  }
}

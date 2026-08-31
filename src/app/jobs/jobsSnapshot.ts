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

// The single pinned row. See the migration for why there's only one.
const ROW_ID = 1;

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
  if (!url || !key) return null;
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
export async function readJobsSnapshot(): Promise<JobsSnapshot | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const { data, error } = await db
      .from(TABLE)
      .select('synced_at, jobs')
      .eq('id', ROW_ID)
      .maybeSingle();
    if (error) {
      console.warn('[jobsSnapshot] read failed:', error.message);
      return null;
    }
    if (!data || !Array.isArray(data.jobs)) return null;
    // An empty array is a valid parse in principle but always means
    // something went wrong upstream, and serving it would blank the
    // board. Treat it as "no snapshot" so the caller falls back.
    if (data.jobs.length === 0) return null;

    const syncedAt = data.synced_at as string;
    const age = Date.now() - new Date(syncedAt).getTime();
    if (!Number.isFinite(age) || age > MAX_SNAPSHOT_AGE_MS) {
      console.warn(`[jobsSnapshot] snapshot too old (${syncedAt}), falling back`);
      return null;
    }

    return { syncedAt, jobs: data.jobs as SerializedJob[] };
  } catch (err) {
    console.warn('[jobsSnapshot] read threw, falling back to sheet', err);
    return null;
  }
}

// Persist a freshly parsed set of jobs. Returns false when the write
// didn't happen (Supabase unconfigured or erroring) so the caller can
// report it rather than claiming a successful sync.
export async function writeJobsSnapshot(
  jobs: SerializedJob[]
): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  // Refuse to overwrite a good snapshot with an empty one — a sheet
  // fetch that returns a valid-but-empty CSV shouldn't be able to clear
  // the board.
  if (jobs.length === 0) return false;
  try {
    const { error } = await db
      .from(TABLE)
      .upsert(
        { id: ROW_ID, synced_at: new Date().toISOString(), jobs },
        { onConflict: 'id' }
      );
    if (error) {
      console.warn('[jobsSnapshot] write failed:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[jobsSnapshot] write threw', err);
    return false;
  }
}

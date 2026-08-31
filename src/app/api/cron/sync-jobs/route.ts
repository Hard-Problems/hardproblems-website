import { NextResponse } from 'next/server';
import { fetchSheetCsv, parseJobsCsv } from '../../../jobs/fetchJobs';
import { writeJobsSnapshot } from '../../../jobs/jobsSnapshot';
import { isCronAuthorized } from '../../../../lib/cronAuth';

// GET /api/cron/sync-jobs
//
// Pulls the Google Sheet, parses it, and writes the result to the
// jobs_snapshot table for fetchJobs() to read. Called by Vercel Cron
// (see vercel.json).
//
// This exists to keep the ~1.6MB Sheet fetch off the request path. It
// used to run inside the `force-dynamic` jobs render via Next's
// stale-while-revalidate refresh, which repeatedly hit Vercel's 15s
// function ceiling; the task was killed before the refreshed CSV
// reached the Data Cache, so the stale entry survived and the board
// stopped showing new jobs. See jobsSnapshot.ts.
//
// Returns a summary JSON so a run can be inspected in the Vercel logs
// or by hitting it manually with the CRON_SECRET.

// Never cache this route — it must hit the Sheet on every invocation.
export const dynamic = 'force-dynamic';

// The sheet fetch plus parse is well under this in practice (~1-2s),
// but the whole point of this endpoint is that it can take its time
// without a user waiting on it. Generous ceiling so a slow response
// from Google can't reintroduce the timeout that caused the original
// bug.
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json(
      { ok: false, error: 'unauthorized' },
      { status: 401 }
    );
  }

  // true = bypass the Next Data Cache. Non-negotiable here: without it
  // this cron re-reads the stale entry it exists to replace.
  const csv = await fetchSheetCsv(true);
  if (csv === null) {
    // Leave the existing snapshot in place — a stale board beats an
    // empty one, and the TTL gives us hours of runway to notice.
    console.warn('[jobs/sync] sheet fetch failed, keeping previous snapshot');
    return NextResponse.json(
      { ok: false, error: 'sheet-fetch-failed' },
      { status: 502 }
    );
  }

  const jobs = parseJobsCsv(csv);
  if (jobs.length === 0) {
    console.warn('[jobs/sync] sheet parsed to zero jobs, keeping previous');
    return NextResponse.json(
      { ok: false, error: 'empty-parse', bytes: csv.length },
      { status: 502 }
    );
  }

  const written = await writeJobsSnapshot(jobs);
  if (!written) {
    // Supabase unconfigured or erroring. fetchJobs() still works via
    // its direct-fetch fallback, so this is degraded rather than
    // broken.
    console.warn('[jobs/sync] snapshot write failed');
    return NextResponse.json(
      { ok: false, error: 'snapshot-write-failed', parsed: jobs.length },
      { status: 500 }
    );
  }

  console.log(`[jobs/sync] wrote snapshot: ${jobs.length} jobs`);
  return NextResponse.json({
    ok: true,
    parsed: jobs.length,
    bytes: csv.length,
    syncedAt: new Date().toISOString()
  });
}

import { NextResponse } from 'next/server';
import {
  fetchSheetRows,
  parseJobsRows,
  pruneExpiredJobs
} from '../../../jobs/fetchJobs';
import { sheetsApiConfigured } from '../../../jobs/sheetsClient';
import { writeJobsSnapshot } from '../../../jobs/jobsSnapshot';
import { isCronAuthorized } from '../../../../lib/cronAuth';
import { logError } from '../../../../lib/posthog-server';
import { postToSlackWebsite } from '../../../../lib/slack';

// GET /api/cron/sync-jobs
//
// Pulls the Google Sheet, parses it, and writes the result to the
// jobs_snapshot table for fetchJobs() to read. Called by Vercel Cron
// (see vercel.json).
//
// This is the only thing in the app that needs to reach Google: the
// board itself reads the snapshot this writes. That is what lets the
// sheet be Restricted and shared with a single service account — see
// sheetsClient.ts.
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

/**
 * The single failure exit: report it, ping Slack, answer the caller.
 *
 * All three in one place because they have drifted before — the point
 * of an alert is that it fires for every way this can fail, and three
 * hand-written copies is how one of them quietly ends up without a
 * ping.
 *
 * Why Slack as well as PostHog. A failed run returns a 5xx *response*,
 * which Vercel counts as a successful invocation — no error rate, no
 * alert — and the uptime monitor only watches the site, which stays up
 * on fetchJobs()'s fallback. On 2026-10-17 that combination hid a
 * broken sync for eight hours; it surfaced only when the snapshot aged
 * past its TTL and the board emptied in local dev. PostHog records
 * these, but a record is not a notification.
 *
 * At most four of these an hour, and only while the sync is actually
 * broken. Anything that fires per request belongs in PostHog alone —
 * see the degradation flag in jobsSnapshot.ts.
 */
async function syncFailed(
  code: string,
  summary: string,
  status: number,
  extra: Record<string, unknown> = {}
): Promise<NextResponse> {
  logError(`jobs/sync: ${summary}`, new Error(code), extra);

  const context = Object.entries(extra)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');
  try {
    await postToSlackWebsite({
      text:
        `:rotating_light: Jobs sync failed — ${summary} (\`${code}\`).` +
        (context ? ` ${context}.` : '') +
        ' The board keeps serving its existing snapshot until that' +
        ' snapshot ages out, then falls back to reading the Sheet on' +
        ' every request.',
      // The message carries no links worth previewing, and an unfurl
      // would push the detail below the fold in the channel.
      unfurl_links: false
    });
  } catch (err) {
    // A Slack outage must not change what the cron reports.
    logError('jobs/sync: slack post failed', err, { code });
  }

  return NextResponse.json({ ok: false, error: code, ...extra }, { status });
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json(
      { ok: false, error: 'unauthorized' },
      { status: 401 }
    );
  }

  // No cache-busting argument any more: the Sheets API read is an
  // authenticated no-store request, so the Data Cache staleness that
  // this endpoint was built to defeat cannot recur through it.
  const rows = await fetchSheetRows();
  if (rows === null) {
    // Leave the existing snapshot in place — a stale board beats an
    // empty one, and the TTL gives us hours of runway to notice.
    //
    // `configured` separates "the credentials are missing" from "the
    // read failed", which are very different things to go and fix.
    return syncFailed(
      'sheet-fetch-failed',
      'could not read the Google Sheet, keeping the previous snapshot',
      502,
      { configured: sheetsApiConfigured() }
    );
  }

  const parsed = parseJobsRows(rows);
  if (parsed.length === 0) {
    return syncFailed(
      'empty-parse',
      'the sheet was read but parsed to zero jobs, keeping the previous snapshot',
      502,
      { rows: rows.length }
    );
  }

  // Only jobs that are live or scheduled — see pruneExpiredJobs(). The
  // emptiness check above runs on the full parse, so a sheet that parses
  // fine but happens to be all-expired is not reported as a bad parse.
  const jobs = pruneExpiredJobs(parsed);

  const written = await writeJobsSnapshot(jobs);
  if (!written.ok) {
    // `reason` is the database's own message — on 2026-10-17 it read
    // `violates check constraint "jobs_snapshot_id_check"`, which named
    // the unrun migration outright. Carrying it into the alert is the
    // difference between "the sync broke" and knowing what to do.
    return syncFailed(
      'snapshot-write-failed',
      'parsed the sheet but could not write the snapshot',
      500,
      { reason: written.reason, parsed: jobs.length }
    );
  }

  console.log(
    `[jobs/sync] wrote snapshot: ${jobs.length} jobs (pruned ${parsed.length - jobs.length} expired)`
  );
  return NextResponse.json({
    ok: true,
    parsed: parsed.length,
    kept: jobs.length,
    rows: rows.length,
    syncedAt: new Date().toISOString()
  });
}

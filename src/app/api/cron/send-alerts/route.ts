import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { fetchJobs } from '../../../jobs/fetchJobs';
import { filterJobs, parseFiltersFromParams } from '../../../jobs/filters';
import type { SerializedJob } from '../../../jobs/fetchJobs';
import { alertsDb } from '../../../../lib/alerts/supabase';
import { alertsFromAddress, getResend } from '../../../../lib/alerts/resend';
import {
  digestHtml,
  digestSubject,
  digestText
} from '../../../../lib/alerts/emails';
import { filtersToSearchParams } from '../../../../lib/alerts/filters';
import { siteUrl } from '../../../../lib/alerts/http';
import { logError } from '../../../../lib/posthog-server';

// GET /api/cron/send-alerts
//
// Daily digest sender. Called by Vercel Cron at 06:00 UTC (see
// vercel.json) and returns a summary JSON so we can inspect what it
// did in the Vercel logs.
//
// Auth: requires `Authorization: Bearer $CRON_SECRET` — Vercel Cron
// sends this header automatically when the env var is set on the
// project.
//
// Flow per active subscriber:
//   1. Skip if we already sent to them in the last 20h (accidental
//      double-firing guard).
//   2. Apply their saved filters to today's Sheets snapshot.
//   3. Subtract job URLs already logged in alert_sent for them.
//   4. If ≥1 new match, send the digest, insert one alert_sent row per
//      job URL, bump last_digest_at.
//   5. If 0 new matches, silently skip — no empty-inbox email.

// Cap the total per-run to a safe upper bound. With ~500 subscribers
// we won't come close; this is a runaway-fleet backstop.
const MAX_SUBSCRIBERS_PER_RUN = 5000;

// Fresh-digest window: if we sent to a subscriber less than this many
// hours ago, skip. Guards against Vercel Cron ever double-firing and
// against ad-hoc manual `curl` re-triggers.
const RECENT_DIGEST_HOURS = 20;

// Absolute cap on jobs per digest email, in case a subscriber has
// filters so broad that "new since last digest" balloons.
const MAX_JOBS_PER_DIGEST = 30;

// Only include jobs whose listed date falls within this rolling window.
// Keeps digests focused on recent listings rather than working backwards
// through the historical backlog whenever the daily quota isn't met.
// A 3-day window means a cron miss (or the subscriber signing up
// yesterday) still catches recently-added jobs on the next successful
// run.
const RECENT_JOBS_WINDOW_DAYS = 3;

// How long a row in alert_sent is kept. Must stay comfortably above
// fetchJobs' MAX_AGE_DAYS (45): once a job is too old to be listed it
// can no longer be sent, so its dedupe rows are dead weight. Raising
// MAX_AGE_DAYS past this without raising this too would let an old job
// be emailed to a subscriber a second time.
const SENT_RETENTION_DAYS = 90;

type ActiveSubscriber = {
  id: string;
  email: string;
  filters: Record<string, unknown>;
  unsubscribe_token: string;
  last_digest_at: string | null;
};

function isAuthorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = request.headers.get('authorization') ?? '';
  const expectedHeader = `Bearer ${expected}`;
  // Length pre-check — timingSafeEqual requires equal-length buffers.
  // The length itself is not sensitive (`Bearer ` + fixed-length secret),
  // so a fast-path bail on length mismatch doesn't leak useful info.
  if (header.length !== expectedHeader.length) return false;
  try {
    return timingSafeEqual(
      Buffer.from(header),
      Buffer.from(expectedHeader)
    );
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, {
      status: 401
    });
  }

  let db;
  try {
    db = alertsDb();
  } catch (err) {
    logError('[alerts/cron] misconfigured', err);
    return NextResponse.json({ ok: false, error: 'misconfigured' }, {
      status: 500
    });
  }

  const jobs = await fetchJobs();
  if (jobs.length === 0) {
    console.log('[alerts/cron] no jobs in sheet, aborting');
    return NextResponse.json({
      ok: true,
      totals: { subscribers: 0, sent: 0, skipped: 0, failed: 0 }
    });
  }

  const { data: subscribers, error: fetchErr } = await db
    .from('alert_subscribers')
    .select('id, email, filters, unsubscribe_token, last_digest_at')
    .eq('status', 'active')
    .limit(MAX_SUBSCRIBERS_PER_RUN);

  if (fetchErr) {
    logError('[alerts/cron] subscribers fetch failed', fetchErr);
    return NextResponse.json({ ok: false, error: 'db_fetch_failed' }, {
      status: 500
    });
  }

  const rows = (subscribers ?? []) as ActiveSubscriber[];
  const now = Date.now();
  const site = siteUrl();
  const resend = getResend();
  const from = alertsFromAddress();

  const totals = {
    subscribers: rows.length,
    sent: 0,
    skipped: 0,
    failed: 0,
    skippedRecent: 0,
    skippedEmpty: 0,
    prunedSent: 0
  };

  for (const sub of rows) {
    try {
      // 1. Recency guard.
      if (sub.last_digest_at) {
        const ageMs = now - new Date(sub.last_digest_at).getTime();
        if (ageMs < RECENT_DIGEST_HOURS * 3600 * 1000) {
          totals.skipped++;
          totals.skippedRecent++;
          continue;
        }
      }

      // 2. Apply the subscriber's saved filters. filtersToSearchParams
      // handles the JSONB → URL-shape round-trip; then we parse those
      // params through the same helper the /jobs page uses so the
      // matching logic stays perfectly aligned with the UI.
      const params = filtersToSearchParams(sub.filters);
      const parsed = parseFiltersFromParams(params);
      const allMatching = filterJobs(jobs, parsed);

      // Restrict to jobs listed within the last N days so the digest
      // stays focused on "recent" listings and doesn't slowly drain
      // the older backlog whenever the daily count is low.
      const cutoffMs =
        now - RECENT_JOBS_WINDOW_DAYS * 24 * 3600 * 1000;
      const matching = allMatching.filter((j) => {
        if (!j.date) return false;
        const jobMs = new Date(j.date).getTime();
        return !Number.isNaN(jobMs) && jobMs >= cutoffMs;
      });

      if (matching.length === 0) {
        totals.skipped++;
        totals.skippedEmpty++;
        continue;
      }

      // 3. Subtract already-sent job URLs. Chunked SELECT so we don't
      // exceed URL-length limits when a subscriber has been active for
      // a long time.
      const { data: sentRows, error: sentErr } = await db
        .from('alert_sent')
        .select('job_url')
        .eq('subscriber_id', sub.id);
      if (sentErr) {
        logError('[alerts/cron] alert_sent lookup failed', sentErr, {
          subscriberId: sub.id
        });
        totals.failed++;
        continue;
      }
      const alreadySent = new Set(
        (sentRows ?? []).map((r: { job_url: string }) => r.job_url)
      );
      const fresh = matching
        .filter((j): j is SerializedJob => Boolean(j.url))
        .filter((j) => !alreadySent.has(j.url));

      if (fresh.length === 0) {
        totals.skipped++;
        totals.skippedEmpty++;
        continue;
      }

      const digestJobs = fresh.slice(0, MAX_JOBS_PER_DIGEST);

      // 4. Send the digest.
      const boardParams = filtersToSearchParams(sub.filters).toString();
      const boardUrl = boardParams
        ? `${site}/jobs?${boardParams}`
        : `${site}/jobs`;
      const unsubscribeUrl = `${site}/api/alerts/unsubscribe?token=${sub.unsubscribe_token}`;

      try {
        const result = await resend.emails.send({
          from,
          to: sub.email,
          replyTo: 'contact@hardproblems.com',
          subject: digestSubject(digestJobs),
          html: digestHtml({
            jobs: digestJobs,
            filters: sub.filters,
            unsubscribeUrl,
            boardUrl
          }),
          text: digestText({
            jobs: digestJobs,
            filters: sub.filters,
            unsubscribeUrl,
            boardUrl
          }),
          headers: {
            'List-Unsubscribe': `<${unsubscribeUrl}>, <mailto:contact@hardproblems.com?subject=unsubscribe>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
          }
        });
        if (result.error) {
          console.error(
            '[alerts/cron] resend returned error',
            result.error,
            { subscriberId: sub.id }
          );
          totals.failed++;
          continue;
        }
      } catch (err) {
        logError('[alerts/cron] resend threw', err, {
          subscriberId: sub.id
        });
        totals.failed++;
        continue;
      }

      // 5. Log every job URL to alert_sent so we don't send it again.
      // Use upsert with `ignoreDuplicates: true` so a single already-
      // logged row doesn't blow away the entire batch (which would
      // leave the fresh rows unrecorded → they'd re-send tomorrow).
      const sentAt = new Date().toISOString();
      const insertRows = digestJobs.map((j) => ({
        subscriber_id: sub.id,
        job_url: j.url,
        sent_at: sentAt
      }));
      const { error: insertErr } = await db
        .from('alert_sent')
        .upsert(insertRows, {
          onConflict: 'subscriber_id,job_url',
          ignoreDuplicates: true
        });
      if (insertErr) {
        logError('[alerts/cron] alert_sent upsert failed', insertErr, {
          subscriberId: sub.id,
          count: insertRows.length
        });
      }

      // 6. Bump last_digest_at.
      const { error: touchErr } = await db
        .from('alert_subscribers')
        .update({ last_digest_at: sentAt })
        .eq('id', sub.id);
      if (touchErr) {
        logError('[alerts/cron] last_digest_at update failed', touchErr, {
          subscriberId: sub.id
        });
      }

      totals.sent++;
    } catch (err) {
      logError('[alerts/cron] subscriber failed', err, {
        subscriberId: sub.id
      });
      totals.failed++;
    }
  }

  // Retention sweep for alert_sent, which had never been pruned and had
  // reached ~45k rows.
  //
  // The table exists only to stop a job being emailed to the same
  // subscriber twice, so a row stops being useful the moment its job
  // can no longer appear in a digest. Jobs are hidden once they pass
  // MAX_AGE_DAYS (45) in fetchJobs, so anything older than that is
  // already incapable of being re-sent. SENT_RETENTION_DAYS is double
  // that, which leaves room for the window to be widened without this
  // sweep quietly becoming a re-send bug.
  //
  // Deliberately unindexed: there is no index on sent_at, so this is a
  // sequential scan, but it runs once a day over a table this size and
  // adding one would tax every digest insert to save a few ms here.
  //
  // Failure is logged, not fatal — a digest run that sent mail must not
  // report failure because its housekeeping step did.
  const prunedBefore = new Date(
    Date.now() - SENT_RETENTION_DAYS * 86_400_000
  ).toISOString();
  const { data: prunedRows, error: pruneErr } = await db
    .from('alert_sent')
    .delete()
    .lt('sent_at', prunedBefore)
    .select('id');
  if (pruneErr) {
    logError('[alerts/cron] alert_sent prune failed', pruneErr, {
      before: prunedBefore
    });
  } else {
    totals.prunedSent = prunedRows?.length ?? 0;
  }

  console.log('[alerts/cron] finished', totals);
  return NextResponse.json({ ok: true, totals });
}

// Vercel Cron POSTs are legal too. Same handler for both.
export const POST = GET;

// Cap the function's runtime at 300s (the Vercel Pro maximum for
// serverless functions). Well above what we need today (~30s at ~50
// subscribers) but headroom for growth without hitting the default
// 60s wall.
export const maxDuration = 300;


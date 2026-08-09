import { NextResponse } from 'next/server';
import {
  EMAIL_RE,
  MAX_EMAIL_LENGTH,
  clientIp,
  isAllowedOrigin,
  looksLikeBot,
  rateLimit
} from '../../../../lib/alerts/http';
import { isAllowedByRateLimit } from '../../../../lib/alerts/rate-limit';
import { alertsDb } from '../../../../lib/alerts/supabase';
import { postToSlackForms } from '../../../../lib/slack';
import { logError } from '../../../../lib/posthog-server';

// POST /api/podcast/suggest
// Body: {
//   suggesterName, suggesterEmail?, guestName,
//   guestProfileUrl, reason, hp?
// }
//
// Stores the suggestion in `podcast_guest_suggestions` (Supabase) and
// pings the private forms channel in Slack.

const MAX_NAME = 200;
const MAX_URL = 2048;
const MAX_LONG = 4000;

function pick(rec: Record<string, unknown>, key: string): string {
  const v = rec[key];
  return typeof v === 'string' ? v.trim() : '';
}

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json(
      { ok: false, error: 'Invalid request.' },
      { status: 403 }
    );
  }
  if (looksLikeBot(request)) {
    return NextResponse.json({ ok: true });
  }

  const ip = clientIp(request);
  const upstashOk = await isAllowedByRateLimit(ip);
  if (!upstashOk || !rateLimit(ip)) {
    return NextResponse.json(
      { ok: false, error: 'Too many submissions. Please try again shortly.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid request.' },
      { status: 400 }
    );
  }
  const rec = (body ?? {}) as Record<string, unknown>;

  if (typeof rec.hp === 'string' && rec.hp.trim()) {
    return NextResponse.json({ ok: true });
  }

  const suggesterName = pick(rec, 'suggesterName').slice(0, MAX_NAME);
  const suggesterEmail = pick(rec, 'suggesterEmail');
  const guestName = pick(rec, 'guestName').slice(0, MAX_NAME);
  const guestProfileUrl = pick(rec, 'guestProfileUrl').slice(0, MAX_URL);
  const reason = pick(rec, 'reason').slice(0, MAX_LONG);

  if (!suggesterName) {
    return NextResponse.json(
      { ok: false, error: 'Please enter your name.' },
      { status: 400 }
    );
  }
  // Suggester email is OPTIONAL (matches the Google Form behaviour).
  // If provided though, it needs to be valid.
  if (suggesterEmail) {
    if (
      suggesterEmail.length > MAX_EMAIL_LENGTH ||
      !EMAIL_RE.test(suggesterEmail)
    ) {
      return NextResponse.json(
        { ok: false, error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }
  }
  if (!guestName) {
    return NextResponse.json(
      { ok: false, error: "Please enter the guest's name." },
      { status: 400 }
    );
  }
  if (!guestProfileUrl) {
    return NextResponse.json(
      { ok: false, error: "Please add the guest's LinkedIn or website URL." },
      { status: 400 }
    );
  }
  if (!reason) {
    return NextResponse.json(
      { ok: false, error: 'Please explain why you recommend this guest.' },
      { status: 400 }
    );
  }

  try {
    const { error } = await alertsDb()
      .from('podcast_guest_suggestions')
      .insert({
        suggester_name: suggesterName,
        suggester_email: suggesterEmail || null,
        guest_name: guestName,
        guest_profile_url: guestProfileUrl,
        recommendation_reason: reason,
        source: 'website'
      });
    if (error) throw new Error(error.message);
  } catch (err) {
    logError('[podcast/suggest] db insert failed', err, {
      suggesterName,
      guestName
    });
    return NextResponse.json(
      {
        ok: false,
        error: "We couldn't save your suggestion right now. Please try again."
      },
      { status: 502 }
    );
  }

  const fromLine = suggesterEmail
    ? `${suggesterName} <${suggesterEmail}>`
    : suggesterName;
  try {
    await postToSlackForms({
      text:
        `:microphone: *New podcast guest suggestion*\n` +
        `*Suggested by:* ${fromLine}\n` +
        `*Guest:* ${guestName}\n` +
        `*Guest profile:* ${guestProfileUrl}\n` +
        `*Why:* ${reason}`,
      unfurl_links: false
    });
  } catch (err) {
    logError('[podcast/suggest] slack post failed', err, { guestName });
  }

  return NextResponse.json({ ok: true });
}

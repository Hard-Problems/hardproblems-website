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
import { postToSlackForms } from '../../../../lib/slack';
import { logError } from '../../../../lib/posthog-server';

// POST /api/jobs/submit
// Body: { url: string, hp?: string }
//
// Accepts a user-submitted job listing URL and forwards it to Slack
// (#website channel) for the team to triage. No storage — Slack IS
// the queue. Same origin / bot / rate-limit protections as the
// subscribe routes.

const URL_RE = /^https?:\/\/[^\s]{4,2048}$/i;

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json(
      { ok: false, error: 'Invalid request.' },
      { status: 403 }
    );
  }

  if (looksLikeBot(request)) {
    // Silent 200 — no signal that the bot filter caught them.
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

  // Honeypot: real users leave `hp` blank.
  if (typeof rec.hp === 'string' && rec.hp.trim()) {
    return NextResponse.json({ ok: true });
  }

  const url = String(rec.url ?? '').trim();
  if (!url || !URL_RE.test(url)) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Please paste a full URL (starting with http:// or https://).'
      },
      { status: 400 }
    );
  }

  const email = String(rec.email ?? '').trim();
  if (
    !email ||
    email.length > MAX_EMAIL_LENGTH ||
    !EMAIL_RE.test(email)
  ) {
    return NextResponse.json(
      { ok: false, error: 'Please enter a valid email address.' },
      { status: 400 }
    );
  }

  try {
    await postToSlackForms({
      text: `:briefcase: New job submission from ${email}: ${url}`,
      unfurl_links: true
    });
  } catch (err) {
    logError('[jobs/submit] slack post failed', err, { url, email });
    return NextResponse.json(
      { ok: false, error: "We couldn't submit that right now. Please try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}

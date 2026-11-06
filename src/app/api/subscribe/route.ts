import { NextResponse } from 'next/server';
import { isAllowedByRateLimit } from '../../../lib/alerts/rate-limit';
import { logError } from '../../../lib/posthog-server';

// Server-side endpoint that proxies newsletter signups to the Beehiiv
// API. Called from the custom NewsletterForm client component so the
// BEEHIIV_API_KEY never leaves the server.
//
// Env vars required (set in .env.local locally + Vercel project
// settings for production):
//   BEEHIIV_API_KEY         — API key from Beehiiv → Settings → Integrations
//   BEEHIIV_PUBLICATION_ID  — publication ID (starts with `pub_`)

// Rough email shape check — Beehiiv validates properly on their end,
// this is just a first-pass filter to reject obvious garbage. Requires
// a TLD of 2+ chars.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_EMAIL_LENGTH = 254;

// User-agent signatures we treat as automated. Real browsers always
// send a non-empty UA that starts with "Mozilla/…".
const BOT_UA_RE =
  /^$|curl|wget|python-requests|scrapy|httpclient|bot|spider|crawler/i;

// Best-effort per-IP rate limit. Runs in the serverless function's
// process memory — sufficient to swat obvious flooding within one hot
// instance. For serious abuse, plug in an external store like Upstash
// Redis or Vercel KV and swap `hits` for a durable counter.
const RATE_WINDOW_MS = 60_000; // 1 minute
const RATE_MAX_HITS = 3;
const hits = new Map<string, number[]>();

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX_HITS) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  // Prune stale entries occasionally so the map doesn't grow forever.
  if (hits.size > 1000) {
    for (const [key, arr] of hits) {
      const kept = arr.filter((t) => now - t < RATE_WINDOW_MS);
      if (kept.length === 0) hits.delete(key);
      else hits.set(key, kept);
    }
  }
  return true;
}

function clientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  return (
    request.headers.get('x-real-ip')?.trim() ||
    request.headers.get('cf-connecting-ip')?.trim() ||
    'unknown'
  );
}

function isAllowedOrigin(request: Request): boolean {
  const originHeader =
    request.headers.get('origin') ?? request.headers.get('referer') ?? '';
  if (!originHeader) return false;
  let host: string;
  try {
    host = new URL(originHeader).host;
  } catch {
    return false;
  }
  const allowed = [
    'hardproblems.com',
    'www.hardproblems.com',
    'localhost:3000',
    'localhost:3001'
  ];
  // Allow only OUR project's Vercel preview URLs, not any `*.vercel.app`
  // (which would let anyone stand up a phishing / CSRF page there).
  if (host.endsWith('-hard-problems.vercel.app')) return true;
  return allowed.includes(host);
}

// Campaign labels a signup form may send (see NewsletterForm's
// `campaign`). Add one here before using it on a page.
//   survey-2026  the annual survey's thank-you page — lets Beehiiv list
//                who signed up after taking the survey. Says nothing
//                about what they answered; the answers carry no email.
const ALLOWED_CAMPAIGNS = new Set(['survey-2026']);

export async function POST(request: Request) {
  const apiKey = process.env.BEEHIIV_API_KEY;
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID;

  if (!apiKey || !publicationId) {
    return NextResponse.json(
      { ok: false, error: 'Newsletter is not configured yet.' },
      { status: 500 }
    );
  }

  // 1. Reject requests that clearly aren't from a real browser on the site.
  if (!isAllowedOrigin(request)) {
    return NextResponse.json(
      { ok: false, error: 'Invalid request.' },
      { status: 403 }
    );
  }

  const ua = request.headers.get('user-agent') ?? '';
  if (BOT_UA_RE.test(ua)) {
    console.log('[subscribe] blocked by bot UA filter', { ua });
    // Silent 200 — no signal that the bot filter caught them.
    return NextResponse.json({ ok: true });
  }

  // 2. Per-IP rate limit. Durable Upstash-backed check first so we
  // survive Vercel's horizontal fan-out; per-instance in-memory
  // limiter is kept as a fallback for local dev.
  const ip = clientIp(request);
  const upstashOk = await isAllowedByRateLimit(ip);
  if (!upstashOk || !rateLimit(ip)) {
    return NextResponse.json(
      { ok: false, error: 'Too many attempts. Please try again shortly.' },
      { status: 429 }
    );
  }

  // 3. Parse + validate the body.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid request.' },
      { status: 400 }
    );
  }

  const email =
    body && typeof body === 'object' && 'email' in body
      ? String((body as { email?: unknown }).email ?? '').trim()
      : '';

  // Honeypot: real users leave `hp` blank; bots fill every field. A
  // non-empty value silently 200s so bots don't retry — we just don't
  // forward to Beehiiv.
  const honeypot =
    body && typeof body === 'object' && 'hp' in body
      ? String((body as { hp?: unknown }).hp ?? '').trim()
      : '';
  if (honeypot) {
    console.log('[subscribe] blocked by honeypot');
    return NextResponse.json({ ok: true });
  }

  // Where on the site the signup came from, passed on to Beehiiv as the
  // UTM campaign. Only known values: anything else is dropped rather
  // than stored, so the field cannot be filled with arbitrary text.
  const requestedCampaign =
    body && typeof body === 'object' && 'campaign' in body
      ? String((body as { campaign?: unknown }).campaign ?? '')
      : '';
  const campaign = ALLOWED_CAMPAIGNS.has(requestedCampaign)
    ? requestedCampaign
    : undefined;

  if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { ok: false, error: 'Please enter a valid email address.' },
      { status: 400 }
    );
  }

  // 4. Forward to Beehiiv.
  try {
    const res = await fetch(
      `https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          reactivate_existing: true,
          send_welcome_email: true,
          utm_source: 'hardproblems.com',
          utm_medium: 'custom_form',
          ...(campaign ? { utm_campaign: campaign } : {})
        })
      }
    );

    const responseText = await res.text().catch(() => '');
    if (!res.ok) {
      logError(
        '[subscribe] Beehiiv error',
        new Error(responseText || 'Beehiiv non-2xx'),
        {
          status: res.status
        }
      );
      return NextResponse.json(
        {
          ok: false,
          error:
            'Something went wrong subscribing you. Please try again shortly.'
        },
        { status: 502 }
      );
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[subscribe] Beehiiv success', {
        email,
        status: res.status,
        body: responseText
      });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError('[subscribe] Beehiiv request failed', err);
    return NextResponse.json(
      {
        ok: false,
        error: "We couldn't reach the newsletter service. Please try again."
      },
      { status: 502 }
    );
  }
}

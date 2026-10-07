// Shared HTTP helpers for the /api/alerts/* routes. Mirrors the
// patterns from /api/subscribe so the newsletter and the job-alert
// signup flows behave consistently.

import { SITE_URL } from '../siteUrl';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const MAX_EMAIL_LENGTH = 254;

const BOT_UA_RE =
  /^$|curl|wget|python-requests|scrapy|httpclient|bot|spider|crawler/i;

export function looksLikeBot(request: Request): boolean {
  const ua = request.headers.get('user-agent') ?? '';
  return BOT_UA_RE.test(ua);
}

export function clientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  return (
    request.headers.get('x-real-ip')?.trim() ||
    request.headers.get('cf-connecting-ip')?.trim() ||
    'unknown'
  );
}

// Return a coarse-grained IP suitable for storage as anti-abuse signal
// without keeping personally-identifying detail. Zeros out the final
// octet for IPv4 and collapses IPv6 to its first /48 block. GDPR-safer
// pattern that still lets us group repeat abusive signups. Returns null
// for unknown / malformed inputs.
export function truncateIp(ip: string | null | undefined): string | null {
  if (!ip || ip === 'unknown') return null;
  const trimmed = ip.trim();
  const ipv4 = trimmed.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}$/);
  if (ipv4) return `${ipv4[1]}.0`;
  const ipv6 = trimmed.match(
    /^([0-9a-f]{1,4}:[0-9a-f]{1,4}:[0-9a-f]{1,4}):/i
  );
  if (ipv6) return `${ipv6[1]}::`;
  return null;
}

export function isAllowedOrigin(request: Request): boolean {
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
  // deployment (which would let anyone host a CSRF page there).
  // Preview hosts look like `hardproblems-<slug>-hard-problems.vercel.app`.
  if (host.endsWith('-hard-problems.vercel.app')) return true;
  return allowed.includes(host);
}

// Per-IP rate limit — in-memory, best-effort, same shape as the
// newsletter route. Sufficient for casual abuse; move to Upstash if we
// ever get seriously targeted.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_HITS = 3;
const hits = new Map<string, number[]>();

export function rateLimit(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter(
    (t) => now - t < RATE_WINDOW_MS
  );
  if (recent.length >= RATE_MAX_HITS) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 1000) {
    for (const [key, arr] of hits) {
      const kept = arr.filter((t) => now - t < RATE_WINDOW_MS);
      if (kept.length === 0) hits.delete(key);
      else hits.set(key, kept);
    }
  }
  return true;
}

// Canonical base URL for tokenized email links. Prefers the runtime env
// (NEXT_PUBLIC_SITE_URL) so preview deployments can point at
// themselves; falls back to production.
export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || SITE_URL
  );
}

// Append UTM parameters to a URL so PostHog can attribute the landing
// pageview to the email campaign. Safe to call with a URL that already
// carries query params — appends onto the existing search string.
export function withUtm(url: string, campaign: string): string {
  try {
    const u = new URL(url);
    if (!u.searchParams.has('utm_source')) {
      u.searchParams.set('utm_source', 'hardproblems_jobs_alert');
    }
    if (!u.searchParams.has('utm_medium')) {
      u.searchParams.set('utm_medium', 'email');
    }
    if (!u.searchParams.has('utm_campaign')) {
      u.searchParams.set('utm_campaign', campaign);
    }
    return u.toString();
  } catch {
    return url;
  }
}

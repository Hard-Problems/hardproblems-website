import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Durable rate limiter backed by Upstash Redis. Solves the fatal flaw
// of the in-memory limiter (which resets per serverless instance and
// therefore doesn't actually limit anything at Vercel's fan-out).
//
// Requires two env vars:
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN
//
// If either is unset (local dev without Upstash) the helper returns
// true unconditionally — same behavior as "no limit". The in-memory
// fallback is still available via the legacy `rateLimit()` in http.ts
// for callers that want any protection during development.

// One limiter per bucket, cached by prefix.
//
// Buckets are separate on purpose. Everything used to share
// `hp:signup`, which meant unrelated endpoints spent each other's
// budget: someone who had just subscribed to the newsletter arrived at
// another form with attempts already used up, and a burst against one
// endpoint weakened the protection on all of them.
const limiters = new Map<string, Ratelimit | null>();

function getLimiter(prefix: string): Ratelimit | null {
  const existing = limiters.get(prefix);
  if (existing !== undefined) return existing;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    limiters.set(prefix, null);
    return null;
  }
  const limiter = new Ratelimit({
    redis: new Redis({ url, token }),
    // Sliding window feels smoother than a fixed-bucket for bursty
    // human traffic. 5 requests per minute per key is generous for
    // real signups and tight for bots.
    limiter: Ratelimit.slidingWindow(5, '60 s'),
    prefix,
    analytics: false
  });
  limiters.set(prefix, limiter);
  return limiter;
}

// Returns true if the request should be allowed. Never throws — on
// any Upstash failure we fail open (allow) so a Redis outage doesn't
// take down signups.
export async function isAllowedByRateLimit(
  key: string,
  prefix = 'hp:signup'
): Promise<boolean> {
  if (!key) return true;
  const rl = getLimiter(prefix);
  if (!rl) return true;
  try {
    const { success } = await rl.limit(key);
    return success;
  } catch (err) {
    console.warn('[rate-limit] upstash call failed, failing open', err);
    return true;
  }
}

/**
 * The survey's own bucket.
 *
 * Separate from the signup forms because the two have nothing to do
 * with each other: a respondent makes at most two calls (the answers,
 * then optionally an email address) and should not arrive to find their
 * budget spent by an unrelated newsletter signup from the same IP —
 * nor should survey traffic erode the protection on those forms.
 */
export const SURVEY_RATE_LIMIT_PREFIX = 'hp:survey';

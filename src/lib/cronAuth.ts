import { timingSafeEqual } from 'crypto';

// Shared auth for Vercel Cron endpoints. Vercel sends
// `Authorization: Bearer $CRON_SECRET` automatically when the env var
// is set on the project.
//
// Returns false when CRON_SECRET is unset, so a misconfigured
// environment fails closed rather than exposing an open endpoint.
//
// NOTE: /api/cron/send-alerts still carries its own identical copy of
// this check. Worth switching that over, but left alone here to keep
// this change focused on the jobs sync.
export function isCronAuthorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = request.headers.get('authorization') ?? '';
  const expectedHeader = `Bearer ${expected}`;
  // Length pre-check — timingSafeEqual requires equal-length buffers.
  // The length itself is not sensitive (`Bearer ` + fixed-length
  // secret), so bailing early on a length mismatch leaks nothing.
  if (header.length !== expectedHeader.length) return false;
  try {
    return timingSafeEqual(Buffer.from(header), Buffer.from(expectedHeader));
  } catch {
    return false;
  }
}

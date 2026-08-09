// Shared URL format validation for the site's public-facing forms
// (coworking desk application, podcast guest suggestion, job
// submission). Kept intentionally permissive — bare hostnames get an
// https:// prefix so users don't have to remember the protocol, e.g.
// "linkedin.com/in/foo" is accepted and stored as
// "https://linkedin.com/in/foo".
//
// Rejects: empty strings, non-http(s) schemes, hosts with no dot,
// hosts whose TLD isn't 2+ letters (blocks bare words like
// "localhost", bare IPs like "192.168.1.1", and typos like
// "example.c").

export type UrlValidationResult =
  | { ok: true; url: string }
  | { ok: false; url: null };

export function validateAndNormalizeUrl(
  input: string
): UrlValidationResult {
  const trimmed = String(input ?? '').trim();
  if (!trimmed) return { ok: false, url: null };
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    return { ok: false, url: null };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, url: null };
  }
  if (!/\.[a-z]{2,}$/i.test(parsed.hostname)) {
    return { ok: false, url: null };
  }
  return { ok: true, url: parsed.toString() };
}

export function isValidUrl(input: string): boolean {
  return validateAndNormalizeUrl(input).ok;
}

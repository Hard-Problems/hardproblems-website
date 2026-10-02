// Shared helper for pointing an <img> at a company's favicon.
//
// Previously copied byte-for-byte into JobsList, JobsTeaser and
// LocationJobList; the per-job pages would have made a fourth copy.
//
// Normalises a sheet-provided company URL into a hostname and hands it
// to the server-side favicon proxy. Returns null when the URL is empty
// or malformed so callers can fall back to a globe icon, or to nothing.

export function buildFaviconUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  const withProto = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
  try {
    const { hostname } = new URL(withProto);
    if (!hostname) return null;
    return `/api/favicon?host=${encodeURIComponent(hostname)}`;
  } catch {
    return null;
  }
}

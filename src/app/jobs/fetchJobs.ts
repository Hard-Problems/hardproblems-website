import { validateAndNormalizeUrl } from '../../lib/validateUrl';
import { readJobsSnapshot } from './jobsSnapshot';

// Sanitize a raw URL string from the sheet into either a valid,
// normalized URL or an empty string. Empty is safe for every consumer
// (every render site treats `!job.url` / `!job.companyUrl` as
// "render plain text instead of a Link"), which prevents malformed
// entries like a bare "https://" from reaching Next.js's `<Link>`
// prefetch — that throws
// `Cannot prefetch 'X' because it cannot be converted to a URL.`
function sanitizeSheetUrl(raw: string): string {
  const result = validateAndNormalizeUrl(raw);
  return result.ok ? result.url : '';
}

export type SerializedJob = {
  date: string | null;
  url: string;
  title: string;
  company: string;
  typeOfOrg: string;
  goodForWorld: string;
  companyUrl: string;
  country: string;
  city: string;
  remote: string;
  salary: string;
  sector: string;
  description: string;
  goodForWorldExplanation: string;
  role: string;
  dateCreated: string | null;
  seniority: string;
  // Optional per-job expiry from Column T. When present, hides the
  // job from the board on-or-after this date and feeds the
  // JobPosting schema's `validThrough` field so Google removes it
  // from search at the same time. Blank for older jobs listed
  // before the column was added.
  expiresAt: string | null;
};

const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1Vpvb3T_wVAdtvhxuYfg4YBYysE7_hE1qmP1qyiZWfk8/export?format=csv&gid=0';

// Hide jobs once this many days have passed since their listed date.
const MAX_AGE_DAYS = 45;

// Last CSV body that parsed successfully, guarding the DIRECT-FETCH
// fallback only — the normal path reads the Redis snapshot and never
// touches this. When that fallback's sheet fetch fails we re-parse this
// instead of returning [], because a stale board beats an empty one.
//
// Per-instance memory, not a durable cache: a cold lambda has nothing
// to fall back on and still returns []. The durable equivalent is the
// snapshot in jobsSnapshot.ts.
let lastGoodCsv: string | null = null;

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// Parses Column P ("Date created") values formatted as "YYYY-MM-DD HH:MM:SS".
// We treat the time as UTC since the sheet doesn't carry a timezone — this
// only matters as a tiebreaker for the sort order, so being consistent
// matters more than the exact wall-clock interpretation.
function parseDateTime(s: string): Date | null {
  const m = s.trim().match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})$/
  );
  if (!m) return null;
  const d = new Date(
    Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])
  );
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseDate(s: string): Date | null {
  const trimmed = s.trim();
  if (!trimmed) return null;

  // ISO format: YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    const d = new Date(Date.UTC(year, month - 1, day));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // DD/MM/YYYY format
  const parts = trimmed.split('/').map((p) => parseInt(p, 10));
  if (parts.length === 3 && !parts.some((n) => Number.isNaN(n))) {
    const [day, month, year] = parts;
    const d = new Date(Date.UTC(year, month - 1, day));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
}

// Fetch the raw Sheet CSV. Returns null on a non-ok response or a
// thrown network error; callers decide what to fall back to.
//
// Only the cron and the fallback path call this. It is deliberately NOT
// on the normal render path any more — see jobsSnapshot.ts for why.
export async function fetchSheetCsv(): Promise<string | null> {
  try {
    const res = await fetch(SHEET_CSV_URL, { next: { revalidate: 60 } });
    if (res.ok) return await res.text();
    console.warn(`[fetchJobs] sheet fetch not ok: ${res.status}`);
  } catch (err) {
    console.warn('[fetchJobs] sheet fetch threw:', err);
  }
  return null;
}

// Parse a Sheet CSV body into sorted jobs.
//
// Deliberately does NOT apply the date window — that has to be
// evaluated against the CURRENT time at read, not at sync time, so a
// snapshot written 15 minutes ago still hides a job that expired since.
// Returns [] for a body that isn't a usable sheet, which callers treat
// as "don't persist this".
export function parseJobsCsv(text: string): SerializedJob[] {
  const rows = parseCSV(text).filter((r) => r.some((c) => c.trim().length > 0));
  if (rows.length < 2) return [];

  // Column Q (index 16) is the "Job Deleted" flag. Any row with "1" there
  // is excluded from the board entirely.
  const dataRows = rows
    .slice(1)
    .filter((r) => (r[16] ?? '').trim() !== '1');
  const jobs = dataRows.map((r) => {
    const date = parseDate(r[0] ?? '');
    const dateCreated = parseDateTime(r[15] ?? '');
    // Column T (index 19) — optional per-job expiry date. Blank on
    // older rows added before the column existed; parseDate returns
    // null for empty strings and any unparseable value, so we treat
    // missing-or-malformed as "no expiry set".
    const expiresAt = parseDate(r[19] ?? '');
    return {
      date: date ? date.toISOString() : null,
      url: sanitizeSheetUrl(r[1] ?? ''),
      title: (r[2] ?? '').trim(),
      company: (r[3] ?? '').trim(),
      typeOfOrg: (r[4] ?? '').trim(),
      goodForWorld: (r[5] ?? '').trim(),
      companyUrl: sanitizeSheetUrl(r[6] ?? ''),
      country: (r[7] ?? '').trim(),
      city: (r[8] ?? '').trim(),
      remote: (r[9] ?? '').trim(),
      salary: (r[10] ?? '').trim(),
      sector: (r[11] ?? '').trim(),
      description: (r[12] ?? '').trim(),
      goodForWorldExplanation: (r[13] ?? '').trim(),
      role: (r[14] ?? '').trim(),
      dateCreated: dateCreated ? dateCreated.toISOString() : null,
      // Column R (index 17) — "Seniority". Free-form text from the
      // sheet; matchesSeniority() classifies it into the filter
      // buckets at render time.
      seniority: (r[17] ?? '').trim(),
      expiresAt: expiresAt ? expiresAt.toISOString() : null
    } satisfies SerializedJob;
  });

  // Primary sort: Job listed date (Column A), newest first.
  // Tiebreaker: Date created (Column P) — most recently added to the sheet
  // first — so two jobs with the same listed date are ordered by when they
  // were added.
  jobs.sort((a, b) => {
    const at = a.date ? new Date(a.date).getTime() : -Infinity;
    const bt = b.date ? new Date(b.date).getTime() : -Infinity;
    if (bt !== at) return bt - at;
    const ac = a.dateCreated
      ? new Date(a.dateCreated).getTime()
      : -Infinity;
    const bc = b.dateCreated
      ? new Date(b.dateCreated).getTime()
      : -Infinity;
    return bc - ac;
  });

  return jobs;
}

// Hide jobs whose listed date is either OLDER than MAX_AGE_DAYS or
// in the FUTURE — the latter gives us proper scheduling (a job with
// a future date stays hidden until that day arrives, at which point
// it appears on the board and in the next digest).
//
// Comparison is done in UTC days so it matches the relative date
// labels ("Today", "Yesterday", "N days ago"). Jobs without a
// parseable date are kept so a missing value doesn't silently drop
// a listing.
//
// Runs on every read, never at sync time — that is what lets a cached
// snapshot stay correct as the clock moves.
export function applyDateWindow(jobs: SerializedJob[]): SerializedJob[] {
  const now = new Date();
  const todayUTC = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );
  return jobs.filter((j) => {
    // Column T expiry — hide the job the day AFTER its expiry date.
    // The one-day grace absorbs timezone drift: parseDate treats the
    // sheet's YYYY-MM-DD as UTC midnight, which is already
    // yesterday's evening in the Americas. Comparing strictly less
    // than (not less-than-or-equal) means a job dated 2026-08-15
    // stays visible ALL of Aug 15 UTC and disappears at midnight
    // UTC on Aug 16 — safe across every timezone the sheet's editors
    // might be in.
    if (j.expiresAt) {
      const e = new Date(j.expiresAt);
      const expiryUTC = Date.UTC(
        e.getUTCFullYear(),
        e.getUTCMonth(),
        e.getUTCDate()
      );
      if (expiryUTC < todayUTC) return false;
    }
    if (!j.date) return true;
    const d = new Date(j.date);
    const jobUTC = Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate()
    );
    const days = Math.round((todayUTC - jobUTC) / 86400000);
    return days >= 0 && days < MAX_AGE_DAYS;
  });
}

export async function fetchJobs(): Promise<SerializedJob[]> {
  // Primary path: the snapshot written by /api/cron/sync-jobs. This is
  // a single indexed row read, which keeps the 1.6MB Google fetch off
  // the request path — that fetch running inside a force-dynamic render
  // is what blew Vercel's 15s function limit and left the Data Cache
  // permanently stale.
  const snapshot = await readJobsSnapshot();
  if (snapshot) return applyDateWindow(snapshot.jobs);

  // Fallback: no usable snapshot (first deploy before the cron has run,
  // `next build`, local dev without Supabase, or a database problem).
  // Pull the sheet directly — the pre-existing behaviour, kept so none
  // of those cases produce an empty board.
  const fresh = await fetchSheetCsv();
  if (fresh === null && lastGoodCsv !== null) {
    console.warn('[fetchJobs] serving last known good CSV');
  }
  const text = fresh ?? lastGoodCsv;
  if (text === null) return [];
  const jobs = parseJobsCsv(text);
  if (jobs.length === 0) return [];
  // Only promote a body that actually parsed, so a 200 carrying a
  // truncated response or an HTML error page can't poison the fallback.
  if (fresh !== null) lastGoodCsv = fresh;
  return applyDateWindow(jobs);
}

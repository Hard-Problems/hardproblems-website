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

export async function fetchJobs(): Promise<SerializedJob[]> {
  // 60s Data Cache TTL. Balances two things: the jobs board
  // (`force-dynamic` — re-renders on every request) sees a Sheet at
  // most 1 minute stale, AND Google Sheets is hit at most once a
  // minute regardless of traffic. The homepage teaser sits inside a
  // 1-hour ISR page, so it's fine with an hour of staleness in
  // practice — it just uses whichever cached CSV is fresh at render.
  const res = await fetch(SHEET_CSV_URL, { next: { revalidate: 60 } });
  if (!res.ok) return [];
  const text = await res.text();
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
      url: (r[1] ?? '').trim(),
      title: (r[2] ?? '').trim(),
      company: (r[3] ?? '').trim(),
      typeOfOrg: (r[4] ?? '').trim(),
      goodForWorld: (r[5] ?? '').trim(),
      companyUrl: (r[6] ?? '').trim(),
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

  // Hide jobs whose listed date is either OLDER than MAX_AGE_DAYS or
  // in the FUTURE — the latter gives us proper scheduling (a job with
  // a future date stays hidden until that day arrives, at which point
  // it appears on the board and in the next digest).
  //
  // Comparison is done in UTC days so it matches the relative date
  // labels ("Today", "Yesterday", "N days ago"). Jobs without a
  // parseable date are kept so a missing value doesn't silently drop
  // a listing.
  const now = new Date();
  const todayUTC = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );
  const recentJobs = jobs.filter((j) => {
    // Column T expiry — if the sheet has an expiration date and it's
    // already passed (or matches today), hide the job. Comparison is
    // in UTC days so "expired today" means the whole day is over from
    // the sheet's point of view.
    if (j.expiresAt) {
      const e = new Date(j.expiresAt);
      const expiryUTC = Date.UTC(
        e.getUTCFullYear(),
        e.getUTCMonth(),
        e.getUTCDate()
      );
      if (expiryUTC <= todayUTC) return false;
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

  return recentJobs;
}

// Participant screening form for the job-board user research, served at
// /research/job-board. A hidden page: not linked, not in the sitemap and
// marked noindex — the link is shared with participants directly.
//
// The option lists live here so the form (client) and the API route
// (server) offer and accept exactly the same answers. The values stored
// are the labels themselves, so rows read naturally in Supabase.

export const YES_NO = ['Yes', 'No'] as const;

export const ROLES = [
  'UX Designer',
  'UI Designer',
  'Product Designer',
  'Service Designer',
  'Design Researcher',
  'Design Strategist',
  'Product Manager',
  'Project Manager',
  'Other'
] as const;

export const EXPERIENCE = [
  'Less than 1 year',
  '1–2 years',
  '3–5 years',
  '6–10 years',
  '11–15 years',
  'More than 15 years'
] as const;

export const LAST_JOB_SEARCH = [
  "I'm currently actively looking for a job",
  'Within the last month',
  'Within the last 3 months',
  'Within the last 6 months',
  'More than 6 months ago',
  "I'm not actively looking, but open to opportunities"
] as const;

export const TOOK_ACTION = ['Yes', 'No', "Not sure / Can't remember"] as const;

export const ACTIONS = [
  'Clicked through to view the full job listing',
  'Saved or bookmarked the opportunity',
  'Shared the opportunity with someone',
  "Visited the organisation's website",
  'Started or submitted an application',
  'Other'
] as const;

export const INTEREST = [
  "Yes, I'd be happy to participate.",
  "Maybe, I'd like to know more first.",
  'No, not at the moment.'
] as const;

// Start times offered for the 60-minute session, every 30 minutes from
// 8:00 AM to 7:00 PM in the participant's own time zone.
export const SESSION_TIMES: string[] = Array.from({ length: 23 }, (_, i) => {
  const mins = 8 * 60 + i * 30;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m === 0 ? '00' : '30'} ${h < 12 ? 'AM' : 'PM'}`;
});

// Thank-you books offered to participants who take part in a session.
// Covers are the publishers' front covers, saved in public/images/content.
export const BOOKS = [
  {
    title: 'Sprint',
    author: 'Jake Knapp, John Zeratsky & Braden Kowitz',
    cover: '/images/content/book-cover-sprint.jpg'
  },
  {
    title: 'Factfulness',
    author: 'Hans Rosling',
    cover: '/images/content/book-cover-factfulness.jpg'
  },
  {
    title: 'Incorruptible',
    author: 'Eric Ries',
    cover: '/images/content/book-cover-incorruptible.jpg'
  },
  {
    title: 'Why Design Is Hard',
    author: 'Scott Berkun & Bryan Zug',
    cover: '/images/content/book-cover-why-design-is-hard.jpg'
  }
] as const;

// Last day participants can pick for a session (inclusive, UTC). Move
// this to open the form up to more dates.
export const LAST_SESSION_DATE = '2026-11-30';

/** Yes or Maybe on the interest question: the follow-up fields apply. */
export function isInterested(interest: string): boolean {
  return interest === INTEREST[0] || interest === INTEREST[1];
}

export type SessionDate = {
  /** What is shown and stored, e.g. "Tuesday 10 November". */
  label: string;
};

/**
 * Every weekday from tomorrow up to LAST_SESSION_DATE. Starts tomorrow
 * so nobody offers a slot that is already under way. Computed in UTC on
 * the server, so the labels the page renders and the labels the API
 * accepts always agree. Empty once the last date has passed.
 */
export function sessionDates(now: Date = new Date()): SessionDate[] {
  const end = Date.parse(`${LAST_SESSION_DATE}T00:00:00Z`);
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  );
  const out: SessionDate[] = [];
  for (; d.getTime() <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const dow = d.getUTCDay(); // 0 = Sunday … 6 = Saturday
    if (dow === 0 || dow === 6) continue;
    out.push({
      label: d.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: 'UTC'
      })
    });
  }
  return out;
}

/** The stored slot, e.g. "Tuesday 10 November · 2:00 PM". */
export function slotLabel(date: string, time: string): string {
  return `${date} · ${time}`;
}

/** True when `tz` is an IANA time zone this runtime understands. */
export function isValidTimeZone(tz: string): boolean {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export type TimeZoneOption = { value: string; label: string };

function gmtOffset(tz: string, at: Date): string {
  const part = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    timeZoneName: 'longOffset'
  })
    .formatToParts(at)
    .find((p) => p.type === 'timeZoneName');
  return part?.value === 'GMT' ? 'GMT+00:00' : (part?.value ?? 'GMT+00:00');
}

function offsetMinutes(offset: string): number {
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(offset);
  if (!m) return 0;
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
}

/**
 * Every IANA time zone, labelled with its current GMT offset, e.g.
 * "(GMT+01:00) Europe/Paris", sorted west to east.
 */
export function timeZoneOptions(at: Date = new Date()): TimeZoneOption[] {
  return Intl.supportedValuesOf('timeZone')
    .map((tz) => {
      const offset = gmtOffset(tz, at);
      return {
        value: tz,
        label: `(${offset}) ${tz.replace(/_/g, ' ')}`,
        minutes: offsetMinutes(offset)
      };
    })
    .sort((a, b) => a.minutes - b.minutes || a.value.localeCompare(b.value))
    .map(({ value, label }) => ({ value, label }));
}

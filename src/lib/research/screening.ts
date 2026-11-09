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

export const TIMES = [
  'Morning (9:00 AM–12:00 PM)',
  'Afternoon (12:00 PM–3:00 PM)',
  'Late afternoon (3:00 PM–6:00 PM)',
  'Evening (6:00 PM–9:00 PM)'
] as const;

export const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday'
] as const;

/** Yes or Maybe on the interest question: the follow-up fields apply. */
export function isInterested(interest: string): boolean {
  return interest === INTEREST[0] || interest === INTEREST[1];
}

/**
 * Monday–Friday of the week the form is filled in, labelled with their
 * dates ("Monday 9 November"). On a Saturday or Sunday this week's
 * weekdays are already past, so it offers next week's instead.
 * Computed in UTC on the server, so the labels the page renders and the
 * labels the API accepts always agree.
 */
export function sessionDays(now: Date = new Date()): string[] {
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const dow = d.getUTCDay(); // 0 = Sunday … 6 = Saturday
  const offset = dow === 0 ? 1 : dow === 6 ? 2 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + offset);
  return WEEKDAYS.map((name, i) => {
    const day = new Date(d);
    day.setUTCDate(d.getUTCDate() + i);
    const date = day.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC'
    });
    return `${name} ${date}`;
  });
}

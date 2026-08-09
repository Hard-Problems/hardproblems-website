// Renders a single <script type="application/ld+json"> block containing
// schema.org JobPosting entries for each job. Google reads this and
// surfaces matching listings in the Jobs Card at the top of search
// results for queries like "designer job [location]".
//
// One <script> per page with all jobs inside a JSON array is fine
// (Google recommends but doesn't require one JSON-LD block per job).
// We concatenate them into a single block to minimise render overhead.
//
// Docs: https://developers.google.com/search/docs/appearance/structured-data/job-posting

import type { SerializedJob } from './fetchJobs';

const SITE_URL = 'https://hardproblems.com';

// How long a listing stays valid for search purposes when the sheet
// doesn't give us an explicit expiry (Column T). Mirrors fetchJobs's
// MAX_AGE_DAYS so `validThrough` in the schema aligns with when the
// job actually disappears from our board.
const VALID_DAYS = 45;

// Detect whether the sheet's free-text remote field marks the job as
// a remote/telecommute role. When true we emit `jobLocationType:
// TELECOMMUTE` + `applicantLocationRequirements` (and omit
// `jobLocation`, per Google's docs for 100%-remote roles).
function isRemote(remote: string): boolean {
  const r = remote.toLowerCase();
  return r.includes('remote') || r.includes('anywhere');
}

// ISO-8601 date/time for `validThrough`. Prefer the sheet's Column T
// (per-job expiry, passed in as `expiresAt`) when present; otherwise
// fall back to `datePosted + 45 days` so we match the default board
// lifetime. Returns undefined if we can't produce either.
//
// For explicit `expiresAt`, we add 1 day so Google removes the
// listing at the same moment the board does — see the matching
// one-day grace in fetchJobs.ts's expiry filter.
function validThrough(
  datePosted: string | null,
  expiresAt: string | null
): string | undefined {
  if (expiresAt) {
    const e = new Date(expiresAt);
    if (!Number.isNaN(e.getTime())) {
      return new Date(e.getTime() + 24 * 3600 * 1000).toISOString();
    }
  }
  if (!datePosted) return undefined;
  const posted = new Date(datePosted);
  if (Number.isNaN(posted.getTime())) return undefined;
  return new Date(
    posted.getTime() + VALID_DAYS * 24 * 3600 * 1000
  ).toISOString();
}

// Build one schema.org JobPosting object for a single job row. Fields
// omitted when the sheet value is missing (Google is fine with sparse
// data; required-for-Jobs-Card fields are title, description, and
// datePosted, all of which we always have).
function buildJobPosting(job: SerializedJob) {
  const remote = isRemote(job.remote);

  const posting: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description || job.title,
    datePosted: job.date || undefined,
    // Search Console flagged this as missing. Almost every design
    // role we list is full-time; default when the sheet doesn't say
    // otherwise. Values: FULL_TIME | PART_TIME | CONTRACTOR |
    // TEMPORARY | INTERN | VOLUNTEER | PER_DIEM | OTHER
    employmentType: 'FULL_TIME',
    validThrough: validThrough(job.date, job.expiresAt),
    hiringOrganization: job.company
      ? {
          '@type': 'Organization',
          name: job.company,
          sameAs: job.companyUrl || undefined
        }
      : undefined,
    directApply: false,
    // Direct link to the external listing so Google's Jobs Card sends
    // clicks straight to the employer.
    url: job.url || undefined
  };

  // Location handling — mutually-exclusive branches per Google's
  // guidance:
  //   - 100% remote → jobLocationType: TELECOMMUTE +
  //     applicantLocationRequirements. `jobLocation` is deliberately
  //     omitted (Google's docs: "For 100% telecommute jobs, do not
  //     include jobLocation").
  //   - Onsite/hybrid → jobLocation with the physical address.
  if (remote) {
    posting.jobLocationType = 'TELECOMMUTE';
    posting.applicantLocationRequirements = {
      '@type': 'Country',
      name: job.country || 'Anywhere'
    };
  } else if (job.city || job.country) {
    posting.jobLocation = {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: job.city || undefined,
        addressCountry: job.country || undefined
        // addressRegion / postalCode / streetAddress: not in the
        // source sheet. Google flags these as missing non-critical
        // warnings, which is unavoidable without richer input data.
      }
    };
  }

  // Salary is free-text in the sheet ("$80k-120k", "£45,000",
  // "Competitive", etc). Google prefers structured MonetaryAmount but
  // will accept a plain description field. We use the latter to avoid
  // over-parsing.
  if (job.salary && job.salary.toLowerCase() !== 'n/a') {
    posting.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: 'USD', // best-guess default; sheet doesn't tag currency
      value: {
        '@type': 'QuantitativeValue',
        unitText: 'YEAR',
        value: job.salary
      }
    };
  }

  return posting;
}

export default function JobPostingSchema({
  jobs
}: {
  jobs: SerializedJob[];
}) {
  if (jobs.length === 0) return null;
  const postings = jobs.map(buildJobPosting);
  // Concatenate into a single script tag; Google's crawler processes
  // arrays of JobPosting entries at the same URL.
  const json = JSON.stringify(postings);
  return (
    <script
      type="application/ld+json"
      // The JSON is built server-side from vetted sheet data — no
      // untrusted user input reaches this string.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}

export { SITE_URL };

// Server-rendered job list for the /jobs/[location] SEO pages.
//
// The row itself comes from the shared <JobRow>, so a card here is the
// same DOM as one on /jobs by construction rather than by careful
// copying — which is how this file previously ended up underlining every
// link and dropping the salary class.
//
// What this surface does differently, and why:
//   - no client interactivity (the page is already location-filtered), so
//     the sector / type / Our-Pick chips link to a pre-filtered board
//     rather than toggling a filter in place as the board's do;
//   - the description is printed inline in the card instead of appearing
//     in a hover tooltip, which is what gives these pages crawlable,
//     location-specific text;
//   - `.locationJob` top-aligns the row and shrinks the chips, because
//     each card already carries more than a board row does.

import Link from 'next/link';
import type { ListedJob } from '../fetchJobs';
import { hoverDescription } from '../filters';
import JobChipLinks from '../JobChipLinks';
import JobRow from '../JobRow';
import styles from '../page.module.scss';
import locationStyles from './page.module.scss';

// City and country, without the remote mode the board appends — these
// pages are already scoped to a place, so the extra token is noise.
function formatLocation(job: ListedJob): string {
  return [job.city, job.country].filter(Boolean).join(', ');
}

export default function LocationJobList({ jobs }: { jobs: ListedJob[] }) {
  if (jobs.length === 0) {
    return (
      <p>
        No active design jobs here right now.{' '}
        <Link href="/jobs">Browse the full board</Link> — new roles appear
        daily.
      </p>
    );
  }

  return (
    <ul className={styles.jobs}>
      {jobs.map((job, i) => {
        const hasSalary = job.salary && job.salary.toLowerCase() !== 'n/a';
        const description = hoverDescription(job);

        const chips = (
          <JobChipLinks
            sector={job.sector}
            typeOfOrg={job.typeOfOrg}
            goodForWorld={job.goodForWorld}
          />
        );

        return (
          <JobRow
            key={`${job.url}-${i}`}
            job={job}
            liClassName={styles.locationJob}
            location={formatLocation(job)}
            salary={hasSalary ? job.salary : null}
            chips={chips}
            belowChips={
              description ? (
                <p className={locationStyles.inlineDescription}>
                  {description}
                </p>
              ) : null
            }
            // The title goes to the job's own page here too, which is
            // also what gives these hubs an internal route to the ~583
            // job pages whose breadcrumbs point back up at them.
            titleHref={job.slug ? `/jobs/role/${job.slug}` : job.url}
            titleIsExternal={!job.slug}
            applyHref={job.url}
          />
        );
      })}
    </ul>
  );
}

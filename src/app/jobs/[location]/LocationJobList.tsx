// Server-rendered job list for the /jobs/[location] SEO pages.
//
// The row itself comes from the shared <JobRow>, so a card here is the
// same DOM as one on /jobs by construction rather than by careful
// copying — which is how this file previously ended up underlining every
// link and dropping the salary class.
//
// What this surface does differently, and why:
//   - no client interactivity (the page is already location-filtered), so
//     the sector / type / Our-Pick tags are inert <span>s rather than
//     filter <button>s;
//   - the description is printed inline in the card instead of appearing
//     in a hover tooltip, which is what gives these pages crawlable,
//     location-specific text;
//   - `.locationJob` top-aligns the row and shrinks the chips, because
//     each card already carries more than a board row does.

import Link from 'next/link';
import { Gem } from 'lucide-react';
import type { ListedJob } from '../fetchJobs';
import { displaySector, isHardProblemsPick, hoverDescription } from '../filters';
import { orgTypeDisplay } from '../orgType';
import { getSectorIcon } from '../sectorIcons';
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
        const isStaffPick = isHardProblemsPick(job.goodForWorld);
        const sector = displaySector(job.sector);
        const SectorIcon = sector ? getSectorIcon(sector) : null;
        const typeLabel = orgTypeDisplay(job.typeOfOrg);
        const hasSalary = job.salary && job.salary.toLowerCase() !== 'n/a';
        const description = hoverDescription(job);

        const chips =
          sector || typeLabel || isStaffPick ? (
            <>
              {sector && (
                <span className={`tag ${styles.jobSector}`}>
                  {SectorIcon && (
                    <SectorIcon
                      className={styles.jobSectorIcon}
                      aria-hidden="true"
                    />
                  )}
                  {sector}
                </span>
              )}
              {typeLabel && (
                <span className={`tag ${styles.jobType}`}>{typeLabel}</span>
              )}
              {isStaffPick && (
                <span className={`tag ${styles.jobStaffPick}`}>
                  <Gem className={styles.jobStaffPickStar} aria-hidden="true" />
                  Our Pick
                </span>
              )}
            </>
          ) : null;

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
            // Without this these hubs linked only outwards, so /jobs was
            // the sole internal route to ~583 job pages while those pages'
            // breadcrumbs pointed back up here — a one-way link. The TITLE
            // still goes straight to the employer.
            detailsHref={job.slug ? `/jobs/role/${job.slug}` : null}
          />
        );
      })}
    </ul>
  );
}

// Server-rendered job list for the /jobs/[location] SEO pages. Mirrors
// the DOM + CSS classes used by JobsList so a job card here looks
// identical to one on the main /jobs board — same fonts, sizes,
// colors, hover behaviour.
//
// Differences vs JobsList: no client interactivity (this page is
// already location-filtered), so sector/type/Our-Pick tags are plain
// <span>s instead of filter <button>s. The description tooltip still
// appears on hover via the existing CSS.

import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';
import { Earth, Gem, Sparkle } from 'lucide-react';
import type { ListedJob } from '../fetchJobs';
import { displaySector, isHardProblemsPick,
  hoverDescription
} from '../filters';
import { orgTypeDisplay } from '../orgType';
import { getSectorIcon } from '../sectorIcons';
import CompanyFavicon from '../CompanyFavicon';
import { buildFaviconUrl } from '../faviconUrl';
import { formatRelativeDate } from '../relativeDate';
import styles from '../page.module.scss';
import locationStyles from './page.module.scss';

const BULLET_SEPARATOR = '  •  ';


// "Today" / "Yesterday" / "N days ago" — same wording JobsList uses.
// Country-only location — matches JobsList's teaser-style meta.
function formatLocation(job: ListedJob): string {
  const parts = [job.city, job.country].filter(Boolean);
  return parts.join(', ');
}

export default function LocationJobList({
  jobs
}: {
  jobs: ListedJob[];
}) {
  if (jobs.length === 0) {
    return (
      <p>
        No active design jobs here right now.{' '}
        <Link href="/jobs">Browse the full board</Link> — new roles
        appear daily.
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
        const location = formatLocation(job);
        const relativeLabel = formatRelativeDate(job.date);
        const isNewToday = relativeLabel === 'Today';
        const faviconUrl = buildFaviconUrl(job.companyUrl);
        // `job.companyUrl` is pre-sanitized by fetchJobs — it's
        // either a valid `https://…` URL or an empty string. No
        // protocol-prefixing needed here.
        const companyHref = job.companyUrl || null;
        const globe = (
          <Earth
            className={styles.companyFavicon}
            strokeWidth={1.5}
            aria-hidden="true"
          />
        );
        const iconContents = faviconUrl ? (
          <CompanyFavicon
            src={faviconUrl}
            alt={
              companyHref
                ? job.company
                  ? `Icon of ${job.company}`
                  : 'Company icon'
                : ''
            }
            className={styles.companyFavicon}
            fallback={globe}
          />
        ) : (
          globe
        );

        // Build the meta row (company · location · salary) the same
        // way JobsList does — pieces joined by the shared bullet.
        const metaItems: ReactNode[] = [];
        if (job.company) {
          metaItems.push(
            companyHref ? (
              <Link
                href={companyHref}
                target="_blank"
                rel="noreferrer"
                className={styles.jobCompany}
              >
                {job.company}
              </Link>
            ) : (
              <span className={styles.jobCompany}>{job.company}</span>
            )
          );
        }
        if (location) {
          metaItems.push(
            <span className={styles.jobLocation}>{location}</span>
          );
        }
        if (job.salary && job.salary.toLowerCase() !== 'n/a') {
          metaItems.push(
            <span className={styles.jobSalary}>{job.salary}</span>
          );
        }

        return (
          <li
            key={`${job.url}-${i}`}
            className={`${styles.job} ${styles.locationJob}`}
          >
            {companyHref ? (
              <Link
                href={companyHref}
                target="_blank"
                rel="noreferrer"
                aria-label={
                  job.company ? `Visit ${job.company}` : 'Visit company'
                }
                className={styles.jobIcon}
              >
                {iconContents}
              </Link>
            ) : (
              <div className={styles.jobIcon}>{iconContents}</div>
            )}
            <div className={styles.jobMain}>
              <h4 className={styles.jobTitle}>
                {job.url ? (
                  <Link href={job.url} target="_blank" rel="noreferrer">
                    {job.title}
                  </Link>
                ) : (
                  job.title
                )}
              </h4>
              <div className={styles.jobMeta}>
                {metaItems.map((item, idx) => (
                  <Fragment key={idx}>
                    {idx > 0 && (
                      <span className={styles.jobBullet}>
                        {BULLET_SEPARATOR}
                      </span>
                    )}
                    {item}
                  </Fragment>
                ))}
              </div>
              {(sector || typeLabel || isStaffPick) && (
                <div className={styles.jobSectorRow}>
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
                    <span className={`tag ${styles.jobType}`}>
                      {typeLabel}
                    </span>
                  )}
                  {isStaffPick && (
                    <span className={`tag ${styles.jobStaffPick}`}>
                      <Gem
                        className={styles.jobStaffPickStar}
                        aria-hidden="true"
                      />
                      Our Pick
                    </span>
                  )}
                </div>
              )}
              {hoverDescription(job) && (
                <p className={locationStyles.inlineDescription}>
                  {hoverDescription(job)}
                </p>
              )}
              {/* Internal link to this job's own page, below the
                  description — the same place the board puts it, at the
                  end of the card. Without it these location hubs linked
                  only outwards, so /jobs was the sole internal route to
                  ~583 job pages while the job pages' breadcrumbs pointed
                  back up here — a one-way link. The TITLE above still
                  goes straight to the employer. */}
              {job.slug && (
                <Link
                  href={`/jobs/role/${job.slug}`}
                  className={styles.jobDetailsLink}
                >
                  Read full job description…
                </Link>
              )}
            </div>
            <div className={styles.jobAside}>
              {relativeLabel && (
                <small
                  className={`${styles.jobDate} ${
                    isNewToday ? styles.jobDateToday : ''
                  }`}
                >
                  {isNewToday && (
                    <Sparkle
                      className={styles.jobDateIcon}
                      aria-hidden="true"
                    />
                  )}
                  {relativeLabel}
                </small>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

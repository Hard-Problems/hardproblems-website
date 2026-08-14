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
import type { SerializedJob } from '../fetchJobs';
import { displaySector, isHardProblemsPick } from '../filters';
import { orgTypeDisplay } from '../orgType';
import { getSectorIcon } from '../sectorIcons';
import CompanyFavicon from '../CompanyFavicon';
import styles from '../page.module.scss';
import locationStyles from './page.module.scss';

const BULLET_SEPARATOR = '  •  ';

// Same helper JobsList and JobsTeaser use — normalises a
// sheet-provided company URL into a hostname and hands it to the
// server-side favicon proxy. Returns null when the URL is empty or
// malformed so callers can fall back to the globe icon.
function buildFaviconUrl(rawUrl: string): string | null {
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

// "Today" / "Yesterday" / "N days ago" — same wording JobsList uses.
function formatRelativeDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const todayUTC = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );
  const jobUTC = Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate()
  );
  const diffDays = Math.round((todayUTC - jobUTC) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1) return `${diffDays} days ago`;
  if (diffDays === -1) return 'Tomorrow';
  return `in ${-diffDays} days`;
}

// Country-only location — matches JobsList's teaser-style meta.
function formatLocation(job: SerializedJob): string {
  const parts = [job.city, job.country].filter(Boolean);
  return parts.join(', ');
}

export default function LocationJobList({
  jobs
}: {
  jobs: SerializedJob[];
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
          metaItems.push(<span>{job.salary}</span>);
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
              {job.description && (
                <p className={locationStyles.inlineDescription}>
                  {job.description}
                </p>
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

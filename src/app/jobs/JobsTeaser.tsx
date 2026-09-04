'use client';

import { Fragment, type ReactNode } from 'react';
import Link from 'next/link';
import { usePostHog } from 'posthog-js/react';
import { Earth, Gem } from 'lucide-react';
import type { SerializedJob } from './fetchJobs';
import { displaySector,
  hoverDescription
} from './filters';
import { getSectorIcon } from './sectorIcons';
import CompanyFavicon from './CompanyFavicon';
import jobStyles from './page.module.scss';
import teaserStyles from './jobsTeaser.module.scss';

type ClickSource = 'title' | 'company' | 'favicon';

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

// Country-only — the teaser omits city and remote/work-style tags.
function formatLocation(job: SerializedJob): string {
  return job.country.trim();
}

const BULLET_SEPARATOR = '  •  ';

export default function JobsTeaser({
  jobs,
  totalCount
}: {
  jobs: SerializedJob[];
  // Total number of visible jobs across the whole board. When provided,
  // the "See all jobs" button reads "See all N jobs" instead. Optional so
  // existing callers that don't pass it keep their current button text.
  totalCount?: number;
}) {
  const posthog = usePostHog();

  const trackJobClick = (job: SerializedJob, source: ClickSource) => {
    if (!posthog) return;
    posthog.capture('job_click', {
      job_title: job.title,
      company: job.company,
      sector: job.sector,
      type_of_org: job.typeOfOrg,
      country: job.country,
      city: job.city,
      salary: job.salary,
      remote: job.remote,
      listing_url: job.url,
      click_source: source
    });
  };

  return (
    <div className={teaserStyles.teaser}>
      <ul className={jobStyles.jobs}>
        {jobs.map((job, i) => {
          const location = formatLocation(job);
          const faviconUrl = buildFaviconUrl(job.companyUrl);
          // `job.companyUrl` is pre-sanitized by fetchJobs — it's
          // either a valid `https://…` URL or an empty string. No
          // protocol-prefixing needed here.
          const companyHref = job.companyUrl || null;
          const goodForWorldScore = parseFloat(job.goodForWorld);
          const isStaffPick =
            !Number.isNaN(goodForWorldScore) && goodForWorldScore > 8;

          const metaItems: ReactNode[] = [];
          if (job.company) {
            metaItems.push(
              companyHref ? (
                <Link
                  href={companyHref}
                  target="_blank"
                  rel="noreferrer"
                  className={jobStyles.jobCompany}
                  onClick={() => trackJobClick(job, 'company')}
                >
                  {job.company}
                </Link>
              ) : (
                <span className={jobStyles.jobCompany}>{job.company}</span>
              )
            );
          }
          if (location) {
            metaItems.push(
              <span className={jobStyles.jobLocation}>{location}</span>
            );
          }

          const globe = (
            <Earth
              className={jobStyles.companyFavicon}
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
              className={jobStyles.companyFavicon}
              fallback={globe}
            />
          ) : (
            globe
          );

          return (
            <li
              key={`${job.url}-${i}`}
              className={`${jobStyles.job} ${teaserStyles.teaserJob}`}
            >
              {companyHref ? (
                <Link
                  href={companyHref}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={
                    job.company ? `Visit ${job.company}` : 'Visit company'
                  }
                  className={jobStyles.jobIcon}
                  onClick={() => trackJobClick(job, 'favicon')}
                >
                  {iconContents}
                </Link>
              ) : (
                <div className={jobStyles.jobIcon}>{iconContents}</div>
              )}
              <div className={jobStyles.jobMain}>
                <h4
                  className={`${jobStyles.jobTitle} ${teaserStyles.teaserTitle}`}
                >
                  {job.url ? (
                    <Link
                      href={job.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => trackJobClick(job, 'title')}
                    >
                      {job.title}
                    </Link>
                  ) : (
                    job.title
                  )}
                </h4>
                <div
                  className={`${jobStyles.jobMeta} ${teaserStyles.teaserMeta}`}
                >
                  {metaItems.map((item, idx) => (
                    <Fragment key={idx}>
                      {idx > 0 && (
                        <span className={jobStyles.jobBullet}>
                          {BULLET_SEPARATOR}
                        </span>
                      )}
                      {item}
                    </Fragment>
                  ))}
                </div>
                {(job.sector || isStaffPick) && (
                  <div className={jobStyles.jobSectorRow}>
                    {job.sector &&
                      (() => {
                        const displayed = displaySector(job.sector);
                        const SectorIcon = getSectorIcon(displayed);
                        return (
                          <Link
                            href={`/jobs?sectorPick=${encodeURIComponent(
                              displayed.toLowerCase()
                            )}`}
                            className={`tag ${jobStyles.jobSector} ${jobStyles.jobTagButton}`}
                            aria-label={`See all ${displayed} jobs on the job board`}
                          >
                            {SectorIcon && (
                              <SectorIcon
                                className={jobStyles.jobSectorIcon}
                                aria-hidden="true"
                              />
                            )}
                            {displayed}
                          </Link>
                        );
                      })()}
                    {isStaffPick && (
                      <Link
                        href="/jobs?pick=1"
                        className={`tag ${jobStyles.jobStaffPick} ${jobStyles.jobTagButton} ${teaserStyles.teaserPick}`}
                        aria-label="See only Our Picks on the job board"
                      >
                        <Gem
                          className={jobStyles.jobStaffPickStar}
                          aria-hidden="true"
                        />
                        Our Pick
                      </Link>
                    )}
                  </div>
                )}
              </div>
              {(hoverDescription(job) || isStaffPick) && (
                <div
                  className={jobStyles.jobDescription}
                  role="tooltip"
                >
                  {hoverDescription(job) && (
                    <>
                      {job.company && (
                        <>
                          <strong
                            className={jobStyles.jobDescriptionCompany}
                          >
                            {job.company}
                          </strong>
                          <br />
                        </>
                      )}
                      {hoverDescription(job)}
                    </>
                  )}
                  {isStaffPick && (
                    <div className={jobStyles.jobDescriptionPick}>
                      <strong
                        className={jobStyles.jobDescriptionPickHeading}
                      >
                        <Gem
                          className={jobStyles.jobDescriptionPickIcon}
                          aria-hidden="true"
                        />
                        Our Pick
                      </strong>
                      <p>
                        We hand-select great jobs at orgs whose primary
                        mission is to make the world better.
                      </p>
                    </div>
                  )}
                </div>
              )}
              {/* No .jobAside — the preview omits the relative date. */}
            </li>
          );
        })}
      </ul>
      <div className={teaserStyles.seeAll}>
        <p className={teaserStyles.seeAllText}>
          We find roles from across the web for designers, PMs, and others to
          work on hard problems.
        </p>
        <Link href="/jobs">
          {typeof totalCount === 'number'
            ? `All ${totalCount} ${totalCount === 1 ? 'job' : 'jobs'}`
            : 'All jobs'}{' '}
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>
    </div>
  );
}

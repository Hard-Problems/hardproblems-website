'use client';

import Link from 'next/link';
import { usePostHog } from 'posthog-js/react';
import type { ListedJob } from './fetchJobs';
import { hoverDescription, isHardProblemsPick } from './filters';
import JobChipLinks from './JobChipLinks';
import JobRow from './JobRow';
import JobTooltip from './JobTooltip';
import jobStyles from './page.module.scss';
import teaserStyles from './jobsTeaser.module.scss';

type ClickSource = 'title' | 'company' | 'favicon';

// Country-only — the teaser omits city and remote/work-style tags.
function formatLocation(job: ListedJob): string {
  return job.country.trim();
}

export default function JobsTeaser({
  jobs,
  totalCount
}: {
  jobs: ListedJob[];
  // Total number of visible jobs across the whole board. When provided,
  // the "See all jobs" button reads "See all N jobs" instead. Optional so
  // existing callers that don't pass it keep their current button text.
  totalCount?: number;
}) {
  const posthog = usePostHog();

  const trackJobClick = (job: ListedJob, source: ClickSource) => {
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
          const isStaffPick = isHardProblemsPick(job.goodForWorld);
          const hoverText = hoverDescription(job);
          // Links to a pre-filtered board rather than toggling a filter
          // in place: this is a preview, with no filter UI of its own for
          // a toggle to act on. No org-type chip — the column is narrow.
          const chips = (
            <JobChipLinks
              sector={job.sector}
              typeOfOrg={job.typeOfOrg}
              goodForWorld={job.goodForWorld}
              showOrgType={false}
              pickClassName={teaserStyles.teaserPick}
            />
          );

          return (
            <JobRow
              key={`${job.url}-${i}`}
              job={job}
              liClassName={teaserStyles.teaserJob}
              titleClassName={teaserStyles.teaserTitle}
              metaClassName={teaserStyles.teaserMeta}
              // Country only, and no salary: the preview column is narrow
              // and the board beside it carries the detail.
              location={formatLocation(job)}
              chips={chips}
              // As on the board: the title opens the job's own page, and
              // the tooltip's button is the outbound route.
              titleHref={job.slug ? `/jobs/role/${job.slug}` : job.url}
              titleIsExternal={!job.slug}
              afterMain={
                hoverText || isStaffPick ? (
                  <JobTooltip
                    company={job.company}
                    text={hoverText}
                    applyHref={job.url}
                    isStaffPick={isStaffPick}
                  />
                ) : null
              }
              // The preview omits the relative date.
              showDate={false}
              onLinkClick={(target: ClickSource) => trackJobClick(job, target)}
            />
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

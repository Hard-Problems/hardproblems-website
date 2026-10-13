// One job row, shared by every surface that renders one.
//
// Four places used to carry their own copy of this markup:
//
//   JobsList.tsx                     the board at /jobs
//   JobsTeaser.tsx                   the homepage preview and /jobs sidebar
//   [location]/LocationJobList.tsx   /jobs/<location>
//   role/[slug]/page.tsx             the related-role lists on a job page
//
// They drifted, and the drift was only ever caught by eye: /jobs/<location>
// underlining every row link because it sits outside the `.board` wrapper,
// a salary <span> that had lost its `jobSalary` class directly under a
// comment claiming it was built "the same way JobsList does", the tooltip's
// paragraph fix landing on the board but not the teaser.
//
// What is shared here is the skeleton — the <li>, the favicon with its
// globe fallback, the title, the bullet-separated meta line, and the date
// in the aside — because that is where the drift happened.
//
// What is NOT shared, and is passed in instead:
//
//   location   The four surfaces format it four different ways on purpose:
//              the board appends the remote mode, the teaser shows only the
//              country because the column is narrow, and the hub and
//              related lists show "city, country". Computing it here would
//              have to re-introduce all four as a flag.
//   salary     The teaser omits it for the same width reason.
//   chips      Functionally different per surface, not just styled
//              differently: the board's are <button> filter toggles, the
//              teaser's and the job page's are <a>s pointing at a filtered
//              board, and the hub's are inert <span>s.
//   belowChips / afterMain
//              The hub prints the description inline inside the card; the
//              board and teaser put it in a hover tooltip that is a SIBLING
//              of .jobMain rather than a child. Two different slots because
//              they genuinely sit in two different places.
//
// Everything else is identical by construction and can no longer drift.

import { Fragment, type ReactNode } from 'react';
import Link from 'next/link';
import { Earth, Sparkle } from 'lucide-react';
import CompanyFavicon from './CompanyFavicon';
import { buildFaviconUrl } from './faviconUrl';
import { formatRelativeDate } from './relativeDate';
import styles from './page.module.scss';

// NON-BREAKING spaces, not ordinary ones. HTML collapses a run of normal
// spaces to one, so ASCII padding would render as a cramped " \u2022 "; the
// NBSPs keep the gap wide and stop a line breaking between a meta item and
// its separator.
//
// The three boards already did this. The related lists on a job page used
// ordinary spaces and so had visibly tighter bullets than everything else;
// they now match.
export const BULLET_SEPARATOR = '\u00a0\u00a0\u2022\u00a0\u00a0';

// The fields a row actually reads. Deliberately a Pick rather than
// SerializedJob or ListedJob, so both can be passed — the job page holds
// full SerializedJobs while the boards hold trimmed ListedJobs.
export type JobRowJob = {
  url: string;
  title: string;
  company: string;
  companyUrl: string;
  date: string | null;
};

export type JobRowProps = {
  job: JobRowJob;

  /** Pre-formatted place string — see the note above on why. */
  location?: string;
  /** Pre-filtered salary; pass null or omit to leave it out. */
  salary?: string | null;

  /**
   * The board and the hubs use <h4>; the related lists on a job page use
   * <h3> so the heading order stays intact under that page's <h2>. The
   * global h3 rule would otherwise render them in Instrument Serif, which
   * `.relatedList h3` resets.
   */
  headingLevel?: 'h3' | 'h4';
  /** Defaults to the employer's listing (job.url). */
  titleHref?: string | null;
  /**
   * Whether the title opens in a new tab. True for the employer's listing,
   * false for the related lists, which link to our own job pages.
   */
  titleIsExternal?: boolean;

  liClassName?: string;
  titleClassName?: string;
  metaClassName?: string;

  /**
   * The related lists pass false: those rows are already labelled by the
   * title beside them, so naming the icon repeats it for screen readers.
   */
  describeIcon?: boolean;

  /** Contents of `.jobSectorRow`. The row is omitted entirely when absent. */
  chips?: ReactNode;
  /** Inside `.jobMain`, under the chips — the hubs' inline description. */
  belowChips?: ReactNode;
  /** Sibling of `.jobMain` — the hover tooltip on the board and teaser. */
  afterMain?: ReactNode;
  /** "Read full job description…" link to the job's own page. */
  detailsHref?: string | null;

  /**
   * The homepage preview omits the relative date — its column is narrow
   * and the date is the least useful thing in it — so it drops the whole
   * `.jobAside` rather than rendering an empty one.
   */
  showDate?: boolean;

  /** Analytics hook. Only the client surfaces pass one. */
  onLinkClick?: (target: 'company' | 'favicon' | 'title') => void;
};

export default function JobRow({
  job,
  location,
  salary,
  headingLevel = 'h4',
  titleHref,
  titleIsExternal = true,
  liClassName,
  titleClassName,
  metaClassName,
  describeIcon = true,
  chips,
  belowChips,
  afterMain,
  detailsHref,
  showDate = true,
  onLinkClick
}: JobRowProps) {
  // `companyUrl` is pre-sanitised by fetchJobs — either a valid https URL
  // or an empty string — so it needs no protocol-prefixing here.
  const companyHref = job.companyUrl || null;
  const faviconUrl = buildFaviconUrl(job.companyUrl);
  const Heading = headingLevel;
  const href = titleHref === undefined ? job.url : titleHref;
  const externalProps = titleIsExternal
    ? { target: '_blank', rel: 'noreferrer' }
    : {};

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
        describeIcon && companyHref
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

  const metaItems: ReactNode[] = [];
  if (job.company) {
    metaItems.push(
      companyHref ? (
        <Link
          href={companyHref}
          target="_blank"
          rel="noreferrer"
          className={styles.jobCompany}
          onClick={onLinkClick ? () => onLinkClick('company') : undefined}
        >
          {job.company}
        </Link>
      ) : (
        <span className={styles.jobCompany}>{job.company}</span>
      )
    );
  }
  if (location) {
    metaItems.push(<span className={styles.jobLocation}>{location}</span>);
  }
  if (salary) {
    metaItems.push(<span className={styles.jobSalary}>{salary}</span>);
  }

  const relativeLabel = formatRelativeDate(job.date);
  const isNewToday = relativeLabel === 'Today';

  return (
    <li className={[styles.job, liClassName].filter(Boolean).join(' ')}>
      {companyHref ? (
        <Link
          href={companyHref}
          target="_blank"
          rel="noreferrer"
          aria-label={job.company ? `Visit ${job.company}` : 'Visit company'}
          className={styles.jobIcon}
          onClick={onLinkClick ? () => onLinkClick('favicon') : undefined}
        >
          {iconContents}
        </Link>
      ) : (
        <div className={styles.jobIcon}>{iconContents}</div>
      )}

      <div className={styles.jobMain}>
        <Heading
          className={[styles.jobTitle, titleClassName]
            .filter(Boolean)
            .join(' ')}
        >
          {href ? (
            <Link
              href={href}
              {...externalProps}
              onClick={onLinkClick ? () => onLinkClick('title') : undefined}
            >
              {job.title}
            </Link>
          ) : (
            job.title
          )}
        </Heading>

        <div
          className={[styles.jobMeta, metaClassName].filter(Boolean).join(' ')}
        >
          {metaItems.map((item, idx) => (
            <Fragment key={idx}>
              {idx > 0 && (
                <span className={styles.jobBullet}>{BULLET_SEPARATOR}</span>
              )}
              {item}
            </Fragment>
          ))}
        </div>

        {chips && <div className={styles.jobSectorRow}>{chips}</div>}
        {belowChips}

        {detailsHref && (
          <Link href={detailsHref} className={styles.jobDetailsLink}>
            Read full job description…
          </Link>
        )}
      </div>

      {afterMain}

      {showDate && (
        <div className={styles.jobAside}>
          {relativeLabel && (
            <small
              className={`${styles.jobDate} ${isNewToday ? styles.jobDateToday : ''}`}
            >
              {isNewToday && (
                <Sparkle className={styles.jobDateIcon} aria-hidden="true" />
              )}
              {relativeLabel}
            </small>
          )}
        </div>
      )}
    </li>
  );
}

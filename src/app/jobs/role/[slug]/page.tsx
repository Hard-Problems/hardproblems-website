// A page per job, at /jobs/role/<company>-<title>.
//
// Why these exist: Google requires JobPosting structured data to
// describe the page it sits on. The board previously emitted ~585
// postings in one block on /jobs, which is not eligible for job rich
// results. One page per job gives that markup somewhere valid to live,
// and gives each role a URL that can rank for its own long-tail query.
//
// The job TITLE on these pages still links out to the employer's real
// listing — we are not trying to intercept applications, and
// `directApply: false` in the schema says so explicitly.
//
// Lifecycle: the sync cron prunes expired jobs from the snapshot (see
// pruneExpiredJobs), so a closed role disappears from the data and this
// route 404s on its next render. That matches Google's guidance to
// remove expired postings rather than leave them indexed.

import { Fragment } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { fetchJobs, type SerializedJob } from '../../fetchJobs';
import { buildJobSlugs, findJobBySlug, jobKey } from '../../jobSlug';
import { countryQualifies, locationSlug } from '../../locations';
import {
  Banknote,
  Briefcase,
  Building2,
  Earth,
  ChevronRight,
  Gem,
  Laptop,
  MapPin,
  Sparkle,
  SquareMousePointer,
  UsersRound,
  type LucideIcon
} from 'lucide-react';
import {
  displaySector,
  isHardProblemsPick,
  paragraphs,
  splitCountries
} from '../../filters';
import { orgCategory, orgTypeDisplay } from '../../orgType';
import { getSectorIcon } from '../../sectorIcons';
import CompanyFavicon from '../../CompanyFavicon';
import { buildFaviconUrl } from '../../faviconUrl';
import { formatRelativeDate } from '../../relativeDate';
import JobPostingSchema from './JobPostingSchema';
import BreadcrumbSchema from './BreadcrumbSchema';
// The chips below reuse the board's own tag classes rather than
// restyling them here, so the two stay in step.
import boardStyles from '../../page.module.scss';
import styles from './page.module.scss';

// Hourly, matching the location pages. The underlying snapshot only
// changes every 15 minutes and a job's own details rarely change at
// all, so this is mostly about picking up removals.
export const revalidate = 3600;

// Only matters on the degraded path. Normally this route reads the
// Supabase snapshot, which is a single fast row read. When the snapshot
// is unavailable, fetchJobs() falls back to downloading the sheet CSV
// inside the render — now ~2.8MB, and heading for ~5MB as Column X
// ("Full job description") is filled in. That is the same shape as the
// failure that once left the board serving stale data: a large fetch
// inside a render, killed by the default function ceiling before it
// could finish. /jobs, /jobs/feed.xml and both crons already raise the
// limit for exactly this reason; this route was the one that did not.
export const maxDuration = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const jobs = await fetchJobs();
  const slugs = buildJobSlugs(jobs);
  // Deduped: the sheet carries a few genuinely duplicate rows (same
  // apply URL listed twice), which share a slug and so describe one
  // page. Emitting the same param twice would have Next pre-render it
  // twice for no benefit.
  const unique = new Set(
    jobs.map((job) => slugs.get(jobKey(job))).filter((s): s is string => !!s)
  );
  return [...unique].map((slug) => ({ slug }));
}

// Fixed three-letter month names rather than toLocaleDateString's
// `month: 'short'`. en-GB renders September as "Sept", and which
// abbreviations you get depends on the ICU data compiled into whichever
// Node the page renders on — a build machine and a serverless runtime
// can disagree. A literal table is always three characters and always
// the same everywhere.
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
];

// One related-role row, built from the board's own classes so it reads
// identically to a row on /jobs. Deliberately not the board's full row:
// no hover description (that text is the duplication these pages are
// trying to avoid repeating) and no date column.
//
// The title links INTERNALLY here, unlike on the board where it goes to
// the employer. These lists exist to put a role's own title in the
// anchor text of a link to its page — pointing them outward would
// remove the only reason to have them.
const BULLET_SEPARATOR = '  \u2022  ';

function RelatedJobRow({ job, href }: { job: SerializedJob; href: string }) {
  const faviconUrl = buildFaviconUrl(job.companyUrl);
  const sector = job.sector ? displaySector(job.sector) : '';
  const SectorIcon = sector ? getSectorIcon(sector) : null;
  const typeLabel = orgTypeDisplay(job.typeOfOrg);
  const pick = isHardProblemsPick(job.goodForWorld);
  const hasSalary = job.salary && job.salary.toLowerCase() !== 'n/a';

  const meta: { key: string; className: string; value: string }[] = [
    { key: 'company', className: boardStyles.jobCompany, value: job.company },
    { key: 'place', className: boardStyles.jobLocation, value: placeOf(job) },
    {
      key: 'salary',
      className: boardStyles.jobSalary,
      value: hasSalary ? job.salary : ''
    }
  ].filter((m) => m.value);

  const relativeLabel = formatRelativeDate(job.date);
  const isNewToday = relativeLabel === 'Today';

  const globe = (
    <Earth
      className={boardStyles.companyFavicon}
      strokeWidth={1.5}
      aria-hidden="true"
    />
  );
  const icon = faviconUrl ? (
    <CompanyFavicon
      src={faviconUrl}
      alt=""
      className={boardStyles.companyFavicon}
      fallback={globe}
    />
  ) : (
    globe
  );

  return (
    <li className={boardStyles.job}>
      {/* The board wraps the icon in a link to the company; matching it
          keeps the inherited colour and weight identical too. */}
      {job.companyUrl ? (
        <a
          href={job.companyUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={job.company ? `Visit ${job.company}` : 'Visit company'}
          className={boardStyles.jobIcon}
        >
          {icon}
        </a>
      ) : (
        <div className={boardStyles.jobIcon}>{icon}</div>
      )}
      <div className={boardStyles.jobMain}>
        <h3 className={boardStyles.jobTitle}>
          <Link href={href}>{job.title}</Link>
        </h3>
        <div className={boardStyles.jobMeta}>
          {meta.map((m, i) => (
            <Fragment key={m.key}>
              {i > 0 && (
                <span className={boardStyles.jobBullet}>
                  {BULLET_SEPARATOR}
                </span>
              )}
              {m.key === 'company' && job.companyUrl ? (
                <a
                  href={job.companyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={m.className}
                >
                  {m.value}
                </a>
              ) : (
                <span className={m.className}>{m.value}</span>
              )}
            </Fragment>
          ))}
        </div>
        {(sector || typeLabel || pick) && (
          <div className={boardStyles.jobSectorRow}>
            {sector && (
              <span className={`tag ${boardStyles.jobSector}`}>
                {SectorIcon && (
                  <SectorIcon
                    className={boardStyles.jobSectorIcon}
                    aria-hidden="true"
                  />
                )}
                {sector}
              </span>
            )}
            {typeLabel && (
              <span className={`tag ${boardStyles.jobType}`}>{typeLabel}</span>
            )}
            {pick && (
              <span className={`tag ${boardStyles.jobStaffPick}`}>
                <Gem
                  className={boardStyles.jobStaffPickStar}
                  aria-hidden="true"
                />
                Our Pick
              </span>
            )}
          </div>
        )}
      </div>
      <div className={boardStyles.jobAside}>
        {relativeLabel && (
          <small
            className={`${boardStyles.jobDate} ${
              isNewToday ? boardStyles.jobDateToday : ''
            }`}
          >
            {isNewToday && (
              <Sparkle className={boardStyles.jobDateIcon} aria-hidden="true" />
            )}
            {relativeLabel}
          </small>
        )}
      </div>
    </li>
  );
}

// A "## Subheading" line in one of the sheet's long-text fields.
//
// Column X ("Full job description") is hand-written with markdown ATX
// subheadings — "## The role", "## Pay and benefits" and so on. Nothing
// else markdown-ish appears in that data: across all 420 populated
// values there are no bullets, numbered lists, bold or italic markers,
// links or blockquotes, and no level-1 headings. So this is one
// deliberate rule rather than a markdown parser — running the text
// through one would pull a parse-and-sanitise pipeline in to serve a
// single construct, and would start interpreting stray asterisks and
// underscores in prose that was never written as markdown.
const SUBHEADING = /^#{1,6}\s+(\S.*)$/;

// Renders one of the sheet's prose fields: paragraphs, plus any
// subheadings. Used for all three prose sections so that a heading added
// to another column later renders as one rather than showing its hashes.
function RichText({ text }: { text: string }) {
  return (
    <>
      {paragraphs(text).map((para, i) => {
        const heading = para.match(SUBHEADING);
        return heading ? (
          <h3 key={i} className={styles.contentHeading}>
            {heading[1]}
          </h3>
        ) : (
          <p key={i}>{para}</p>
        );
      })}
    </>
  );
}

// Sheet dates are stored as UTC midnight ISO strings, so read the UTC
// parts: a western timezone would otherwise shift a midnight date back
// a day. Produces "2 Oct 2026".
function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// Readable form of a company URL for display: drop the scheme and any
// trailing slash, keep the rest. `companyUrl` is already sanitised by
// fetchJobs — it is either a valid https:// URL or an empty string.
function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/+$/, '');
}

// Just the physical place. The remote/hybrid field is shown as its own
// row in the Details table rather than being folded in here, so the two
// facts don't run together in the subheading under the title.
function placeOf(job: { city: string; country: string }): string {
  return [job.city, job.country].filter(Boolean).join(', ');
}

// Place plus remote, for the page title and meta description where a
// single readable phrase is more useful than two separate fields.
function summarise(job: {
  city: string;
  country: string;
  remote: string;
}): string {
  const place = placeOf(job);
  if (place && job.remote) return `${place} · ${job.remote}`;
  return place || job.remote || '';
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const found = findJobBySlug(await fetchJobs(), slug);
  if (!found) return { title: 'Job — Hard Problems' };
  const { job } = found;
  const where = summarise(job);

  // Card headline. No "— Hard Problems" suffix: a share card already
  // carries og:site_name, so repeating it just eats the width that
  // should be showing the role and the employer.
  const shareTitle = job.company ? `${job.title} at ${job.company}` : job.title;

  const description =
    `${job.title} at ${job.company}${where ? `, ${where}` : ''}. ` +
    (job.impactSummary || job.goodForWorldExplanation || job.description || '')
      .slice(0, 140)
      .trim();

  return {
    title: `${shareTitle} — Hard Problems`,
    description,
    alternates: { canonical: `/jobs/role/${slug}` },
    // Without an explicit block here every job page inherits the
    // layout's site-wide defaults, so all ~583 of them previewed as the
    // same generic "Hard Problems" card — and with og:url pointing at
    // the homepage rather than the job, which some scrapers follow.
    //
    // The board's own card image, named explicitly. Declaring an
    // `openGraph` block replaces the parent segment's wholesale rather
    // than merging into it, so leaving `images` out drops the image the
    // page used to inherit from /jobs/opengraph-image — and a
    // summary_large_image card with no image is worse than a generic
    // one. A per-job generated image would look better still, but this
    // route pre-renders every job, so it would mean rendering one
    // 1200x630 image per job at build time.
    openGraph: {
      title: shareTitle,
      description,
      url: `/jobs/role/${slug}`,
      siteName: 'Hard Problems',
      type: 'website',
      images: [{ url: '/jobs/opengraph-image', width: 1200, height: 630 }]
    },
    twitter: {
      card: 'summary_large_image',
      title: shareTitle,
      description,
      images: ['/jobs/opengraph-image']
    }
  };
}

export default async function JobPage({ params }: Props) {
  const { slug } = await params;
  const jobs = await fetchJobs();
  // buildJobSlugs rather than findJobBySlug: the related-job lists below
  // need the whole map, and findJobBySlug would build a second copy of it
  // for every render.
  const slugs = buildJobSlugs(jobs);
  const job = jobs.find((j) => slugs.get(jobKey(j)) === slug);
  if (!job) notFound();

  // Only link a country that actually has a location page. /jobs/<country>
  // exists only for countries over the active-job threshold, so linking
  // every country sent most of these breadcrumbs to a 404. The sheet's
  // country field can also list several ("USA, Canada"), which is not a
  // slug at all — take the first listed country that qualifies.
  const countryCrumb =
    splitCountries(job.country).find((c) => countryQualifies(jobs, c)) ?? null;
  const where = placeOf(job);
  const sector = job.sector ? displaySector(job.sector) : '';

  // Icons label the FIELD, not the value — the row is read as
  // "location: Boston", so the marker belongs to "Location". (The
  // value-specific sector icon already appears on the chip above.)
  const facts: { label: string; value: string; Icon: LucideIcon }[] = [
    { label: 'Location', value: where, Icon: MapPin },
    { label: 'On-site or remote', value: job.remote, Icon: Laptop },
    { label: 'Salary', value: job.salary, Icon: Banknote },
    { label: 'Sector', value: sector, Icon: SquareMousePointer },
    { label: 'Role', value: job.role, Icon: Briefcase },
    { label: 'Seniority', value: job.seniority, Icon: UsersRound },
    { label: 'Organisation', value: job.typeOfOrg, Icon: Building2 }
  ];
  const visibleFacts = facts.filter((f) => f.value && f.value.trim());

  // Same three chips the board puts on each row, with the same
  // thresholds, linking to the board pre-filtered the way clicking the
  // chip there would filter it.
  const sectorLabel = job.sector ? displaySector(job.sector) : '';
  const SectorIcon = sectorLabel ? getSectorIcon(sectorLabel) : null;
  const typeLabel = orgTypeDisplay(job.typeOfOrg);
  const orgCat = orgCategory(job.typeOfOrg);
  const isStaffPick = isHardProblemsPick(job.goodForWorld);

  // Related roles. Two jobs: they give the page content that exists
  // nowhere else on the site, and they link job pages to each other —
  // until now the only way in was from /jobs and the location pages, and
  // every one of those links reads "Details", which tells a search engine
  // nothing. These links use the role's own title as the anchor text.
  //
  // 83 companies currently have more than one opening, so the company
  // list applies to about 39% of jobs; the sector list covers the rest.
  const currentKey = jobKey(job);
  const hrefFor = (j: SerializedJob) => {
    const s = slugs.get(jobKey(j));
    return s ? `/jobs/role/${s}` : null;
  };
  const linkable = (j: SerializedJob) => hrefFor(j) !== null;

  const sameCompany = job.company
    ? jobs
        .filter(
          (j) =>
            j.company === job.company && jobKey(j) !== currentKey && linkable(j)
        )
        .slice(0, 5)
    : [];

  // Don't repeat a role that the company list already showed.
  const shown = new Set([currentKey, ...sameCompany.map(jobKey)]);
  const sameSector = sectorLabel
    ? jobs
        .filter(
          (j) =>
            j.sector &&
            displaySector(j.sector) === sectorLabel &&
            !shown.has(jobKey(j)) &&
            linkable(j)
        )
        .slice(0, 5)
    : [];

  // Same proxy URL the board uses, so this shares its CDN cache entry.
  // The source is 64px and renders here at 20, which stays sharp even on
  // a 3x display.
  const faviconUrl = buildFaviconUrl(job.companyUrl);

  // Posting dates, shown under the apply button rather than in the
  // Details table: when a role closes is something you want in front of
  // you at the moment you decide to apply, not filed among the facts
  // about it. The deadline is Column T, set on about one job in six.
  const listed = formatDate(job.date);
  const deadline = formatDate(job.expiresAt);

  // Rendered when there is anything to show, so the dates survive a job
  // that somehow arrives without an apply URL (none do today).
  const applyBlock =
    job.url || listed || deadline ? (
      <p className={styles.applyRow}>
        {job.url && (
          <a href={job.url} className="black-button">
            View the full listing and apply →
          </a>
        )}
        {(listed || deadline) && (
          <span className={styles.applyDates}>
            {listed && `Listed ${listed}`}
            {listed && deadline && <span aria-hidden="true"> · </span>}
            {deadline && (
              <strong className={styles.deadline}>Apply by {deadline}</strong>
            )}
          </span>
        )}
        {job.url && (
          <span className={styles.applyNote}>
            Applications are handled by {job.company || 'the employer'}, not by
            Hard Problems.
          </span>
        )}
      </p>
    ) : null;

  // The apply block sits at the end of the first prose section, between
  // that section's copy and the next heading. Which section that is
  // depends on which fields the sheet filled in, hence the fallback
  // chain; `null` means there is no prose at all and the block stands on
  // its own under the chips.
  const impact = job.impactSummary || job.goodForWorldExplanation;

  // Column X when the long-form write-up exists, Column U otherwise.
  // Both are newline-separated prose, so `paragraphs` handles either.
  const aboutRole = job.fullJobDescription || job.jobDescription;

  // The apply block closes the first prose section on the page, so this
  // chain follows the section order below: impact, then the role
  // write-up, then the company blurb.
  const applyAfter = impact
    ? 'why'
    : aboutRole
      ? 'role'
      : job.description
        ? 'about'
        : null;

  return (
    <main className={styles.job}>
      <JobPostingSchema job={job} />
      <BreadcrumbSchema job={job} slug={slug} country={countryCrumb} />

      <p className={styles.breadcrumb}>
        <Link href="/jobs">All jobs</Link>
        {countryCrumb && (
          <>
            <ChevronRight className={styles.crumbSep} aria-hidden="true" />
            <Link href={`/jobs/${locationSlug(countryCrumb)}`}>
              {countryCrumb}
            </Link>
          </>
        )}
      </p>

      <div className={styles.header}>
        <h1 className="page-title">{job.title}</h1>
        <p className={styles.company}>
          {faviconUrl && (
            <CompanyFavicon
              src={faviconUrl}
              alt=""
              size={20}
              className={styles.companyFavicon}
              // No globe stand-in: a company with no favicon simply
              // shows none, and the name closes the gap.
              fallback={null}
            />
          )}
          {job.companyUrl ? (
            <a href={job.companyUrl}>{job.company}</a>
          ) : (
            job.company
          )}
          {where && <span className={styles.where}>, {where}</span>}
        </p>

        {(sectorLabel || typeLabel || isStaffPick) && (
          <div className={styles.chipRow}>
            {sectorLabel && (
              <Link
                href={`/jobs?sectorPick=${encodeURIComponent(
                  sectorLabel.toLowerCase()
                )}`}
                className={`tag ${boardStyles.jobSector} ${boardStyles.jobTagButton}`}
              >
                {SectorIcon && (
                  <SectorIcon
                    className={boardStyles.jobSectorIcon}
                    aria-hidden="true"
                  />
                )}
                {sectorLabel}
              </Link>
            )}

            {typeLabel &&
              (orgCat ? (
                <Link
                  href={`/jobs?org=${encodeURIComponent(orgCat)}`}
                  className={`tag ${boardStyles.jobType} ${boardStyles.jobTagButton}`}
                >
                  {typeLabel}
                </Link>
              ) : (
                <span className={`tag ${boardStyles.jobType}`}>
                  {typeLabel}
                </span>
              ))}

            {isStaffPick && (
              <Link
                href="/jobs?pick=1"
                className={`tag ${boardStyles.jobStaffPick} ${boardStyles.jobTagButton}`}
              >
                <Gem
                  className={boardStyles.jobStaffPickStar}
                  aria-hidden="true"
                />
                Our Pick
              </Link>
            )}
          </div>
        )}

        {applyAfter === null && applyBlock}
      </div>

      {(impact || isStaffPick) && (
        <section className={styles.block}>
          <h2 className="section-label">Why this work matters</h2>
          {impact && <RichText text={impact} />}
          {/* Says what the "Our Pick" chip at the top of the page means,
              here rather than beside the chip because the reason a job is
              a pick is the same thing this section is about. */}
          {isStaffPick && (
            <p>
              This job was selected as &ldquo;Our Pick&rdquo; because the hiring
              organization is particularly good for the world.
            </p>
          )}
          {applyAfter === 'why' && applyBlock}
        </section>
      )}

      {aboutRole && (
        <section className={styles.block}>
          <h2 className="section-label">About the role</h2>
          <RichText text={aboutRole} />
          {applyAfter === 'role' && applyBlock}
        </section>
      )}

      {visibleFacts.length > 0 && (
        <section className={styles.block}>
          <h2 className="section-label">Details</h2>
          <dl className={styles.facts}>
            {visibleFacts.map(({ label, value, Icon }) => (
              <div key={label}>
                <dt>
                  <Icon className={styles.factIcon} aria-hidden="true" />
                  {label}
                </dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {(job.description || job.companyUrl) && (
        <section className={styles.block}>
          <h2 className="section-label">
            About {job.company || 'the organisation'}
          </h2>
          {job.description && <RichText text={job.description} />}
          {job.companyUrl && (
            <p className={styles.companySite}>
              <a href={job.companyUrl}>{displayUrl(job.companyUrl)}</a>
            </p>
          )}
          {applyAfter === 'about' && applyBlock}
        </section>
      )}

      {(sameCompany.length > 0 || sameSector.length > 0) && (
        <section className={styles.block}>
          {sameCompany.length > 0 && (
            <>
              <h2 className={`section-label ${styles.relatedHeading}`}>
                Other roles at {job.company}
              </h2>
              <ul className={styles.relatedList}>
                {sameCompany.map((j) => (
                  <RelatedJobRow key={jobKey(j)} job={j} href={hrefFor(j)!} />
                ))}
              </ul>
            </>
          )}

          {sameSector.length > 0 && (
            <>
              <h2
                className={`section-label ${
                  sameCompany.length > 0
                    ? styles.relatedSecondHeading
                    : styles.relatedHeading
                }`}
              >
                More {sectorLabel.toLowerCase()} jobs
              </h2>
              <ul className={styles.relatedList}>
                {sameSector.map((j) => (
                  <RelatedJobRow key={jobKey(j)} job={j} href={hrefFor(j)!} />
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      <p className={styles.footerNote}>
        This job is listed on the{' '}
        <Link href="/jobs">Hard Problems job board</Link>, but details come from
        the employer&rsquo;s own listing and may have changed — always check the
        original posting.
      </p>
    </main>
  );
}

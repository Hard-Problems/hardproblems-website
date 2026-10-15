// The sector / org-type / Our-Pick chips, as LINKS to a pre-filtered
// board.
//
// Every surface except /jobs itself wants this version. The board's own
// chips are <button>s that toggle a filter in place, which only makes
// sense there because that page has the filter UI for them to act on;
// everywhere else the equivalent affordance is "take me to the board,
// filtered".
//
// Written once because it had already been copied twice and skipped
// twice: the homepage teaser and a job page's own chip row linked, while
// the location hubs and the related-role lists rendered inert <span>s —
// so on a single job page the chips under the title were clickable and
// the ones in "More … jobs" below were not. The inert version came from
// LocationJobList, whose comment correctly said these can't be filter
// BUTTONS and then quietly treated that as meaning they can't be links.
//
// Returns null when a job has nothing to show, so callers can use that
// to decide whether to render the row wrapper at all.

import Link from 'next/link';
import { Gem } from 'lucide-react';
import { displaySector, isHardProblemsPick } from './filters';
import { orgCategory, orgTypeDisplay } from './orgType';
import { getSectorIcon } from './sectorIcons';
import styles from './page.module.scss';

export default function JobChipLinks({
  sector,
  typeOfOrg,
  goodForWorld,
  showOrgType = true,
  pickClassName
}: {
  sector: string;
  typeOfOrg: string;
  goodForWorld: string;
  /** The teaser omits the org-type chip — its column is too narrow. */
  showOrgType?: boolean;
  /** Extra class on the pick chip, for the teaser's own treatment. */
  pickClassName?: string;
}) {
  const label = sector ? displaySector(sector) : '';
  const SectorIcon = label ? getSectorIcon(label) : null;
  const typeLabel = showOrgType ? orgTypeDisplay(typeOfOrg) : null;
  const orgCat = orgCategory(typeOfOrg);
  const isStaffPick = isHardProblemsPick(goodForWorld);

  if (!label && !typeLabel && !isStaffPick) return null;

  return (
    <>
      {label && (
        <Link
          href={`/jobs?sectorPick=${encodeURIComponent(label.toLowerCase())}`}
          className={`tag ${styles.jobSector} ${styles.jobTagButton}`}
          aria-label={`See all ${label} jobs on the job board`}
        >
          {SectorIcon && (
            <SectorIcon className={styles.jobSectorIcon} aria-hidden="true" />
          )}
          {label}
        </Link>
      )}

      {/* An org type the filters don't model — the sheet's free text
          outside the three known categories — has nothing to link to, so
          it stays a plain chip. */}
      {typeLabel &&
        (orgCat ? (
          <Link
            href={`/jobs?org=${encodeURIComponent(orgCat)}`}
            className={`tag ${styles.jobType} ${styles.jobTagButton}`}
            aria-label={`See all ${typeLabel} jobs on the job board`}
          >
            {typeLabel}
          </Link>
        ) : (
          <span className={`tag ${styles.jobType}`}>{typeLabel}</span>
        ))}

      {isStaffPick && (
        <Link
          href="/jobs?pick=1"
          className={`tag ${styles.jobStaffPick} ${styles.jobTagButton}${
            pickClassName ? ` ${pickClassName}` : ''
          }`}
          aria-label="See only Our Picks on the job board"
        >
          <Gem className={styles.jobStaffPickStar} aria-hidden="true" />
          Our Pick
        </Link>
      )}
    </>
  );
}

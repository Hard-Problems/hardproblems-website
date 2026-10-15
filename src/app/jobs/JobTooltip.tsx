// The yellow hover card shown beside a job row on the board and on the
// homepage preview.
//
// It lived in two copies — JobsList and JobsTeaser — and they drifted:
// the fix that renders the sheet's text as separate paragraphs landed on
// the board but not the teaser, so the preview ran two paragraphs
// together for weeks before anyone noticed by eye.
//
// It sits as a SIBLING of `.jobMain` rather than inside it, because the
// CSS positions it against the row and lets it overlay the filter column
// to the left. See `.jobDescription` in page.module.scss.
//
// Not rendered on /jobs/<location>: those pages have no filter column for
// it to overlay, so they print the description inline in the card instead.

import Link from 'next/link';
import { ArrowRight, Gem } from 'lucide-react';
import { paragraphs, OUR_PICK_EXPLAINER } from './filters';
import styles from './page.module.scss';

export default function JobTooltip({
  company,
  text,
  applyHref,
  isStaffPick
}: {
  company: string;
  /** The sheet's description — Column U, or Column M as a fallback. */
  text: string;
  /**
   * The employer's own listing (Column B), for the button at the bottom.
   * The row's title now goes to the job's page on this site, so this is
   * the outbound route — which is why the button carries the apply
   * wording rather than pointing deeper into our own pages.
   */
  applyHref?: string;
  isStaffPick: boolean;
}) {
  return (
    <div className={styles.jobDescription} role="tooltip">
      {/* Spans the gap to the row so the tooltip survives the pointer
          travelling into it. */}
      <span className={styles.jobDescriptionBridge} aria-hidden="true" />
      {text && (
        <>
          {company && (
            <strong className={styles.jobDescriptionCompany}>{company}</strong>
          )}
          {/* One block per paragraph so blank lines in the sheet's text
              read as paragraph breaks. */}
          {paragraphs(text).map((para, idx) => (
            <span key={idx} className={styles.jobDescriptionText}>
              {para}
            </span>
          ))}
        </>
      )}
      {applyHref && (
        <Link
          href={applyHref}
          target="_blank"
          rel="noreferrer"
          className={styles.jobDescriptionDetails}
        >
          View listing and apply
          <ArrowRight
            className={styles.jobDescriptionDetailsIcon}
            aria-hidden="true"
          />
        </Link>
      )}
      {isStaffPick && (
        <div className={styles.jobDescriptionPick}>
          <strong className={styles.jobDescriptionPickHeading}>
            <Gem className={styles.jobDescriptionPickIcon} aria-hidden="true" />
            Our Pick
          </strong>
          <p>{OUR_PICK_EXPLAINER}</p>
        </div>
      )}
    </div>
  );
}

import type { Metadata } from 'next';
import { COUNTRY_NAMES } from '../../../lib/countries';
import { sessionDates, timeZoneOptions } from '../../../lib/research/screening';
import ScreeningForm from './ScreeningForm';

// Hidden participant-screening page for the job-board user research.
// Not linked anywhere, left out of the sitemap, and noindex so search
// engines drop it even if the link leaks — share the URL directly.

export const metadata: Metadata = {
  title: 'Take part in our user research — Hard Problems',
  description:
    'A short screening form for people interested in taking part in Hard Problems user research sessions.',
  robots: { index: false, follow: false }
};

// The session dates start from tomorrow, so render per request rather
// than freezing them at build time.
export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    // `ph-no-capture` keeps PostHog autocapture from recording answers.
    <section className="page-narrow ph-no-capture">
      <ScreeningForm
        countries={[...COUNTRY_NAMES]}
        dates={sessionDates()}
        timeZones={timeZoneOptions()}
      />
    </section>
  );
}

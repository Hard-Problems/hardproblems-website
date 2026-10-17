// The annual survey, at /survey/<year>.
//
// One route serves every year: the questionnaire comes from
// src/lib/survey, so running this again means adding a definition file
// and nothing here changes.
//
// Three states, all on the same permalink:
//   - before it opens   the questionnaire is described, no form
//   - while it is open  the form runs
//   - after it closes   the permalink survives and still describes the
//                       survey, but the form is gone. The brief asks
//                       for exactly this, and it is also what keeps the
//                       URL worth linking to after the fact.

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { allSurveys, getSurvey, isOpen } from '../../../lib/survey';
import { COUNTRY_NAMES } from '../../../lib/countries';
import SurveyForm from './SurveyForm';
import styles from './page.module.scss';

type Props = {
  params: Promise<{ year: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Each year is a known, fixed path — there is no reason to render these
// on demand.
export function generateStaticParams() {
  return allSurveys().map((s) => ({ year: String(s.year) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year } = await params;
  const survey = getSurvey(year);
  if (!survey) return { title: 'Survey — Hard Problems' };
  return {
    title: `${survey.title} — Hard Problems`,
    description: survey.intro,
    alternates: {
      // The ?source= parameter is for attribution, not for indexing —
      // without this every shared variant would be a separate URL in
      // Google's eyes, all with identical content.
      canonical: `/survey/${survey.year}`
    },
    openGraph: {
      title: survey.title,
      description: survey.intro,
      url: `/survey/${survey.year}`,
      type: 'website',
      // Relative is fine — the root layout's metadataBase resolves it.
      // Setting it here replaces the site-wide /opengraph-image, which is
      // the point: a shared survey link should show the survey.
      images: survey.image ? [survey.image] : undefined
    },
    twitter: {
      card: 'summary_large_image',
      title: survey.title,
      description: survey.intro,
      images: survey.image ? [survey.image] : undefined
    }
  };
}

export default async function SurveyPage({ params, searchParams }: Props) {
  const { year } = await params;
  const survey = getSurvey(year);
  if (!survey) notFound();

  // Captured blindly from the link, as the brief asks. It is normalised
  // on the way into storage, not here — see normalizeSource().
  const sp = await searchParams;
  const rawSource = typeof sp.source === 'string' ? sp.source : '';

  const open = isOpen(survey);

  return (
    <main className={styles.survey}>
      {/* No class: the column width and padding come from `.survey` on
          the <main>, and this element only groups the content. It used
          to reference a `styles.intro` rule that was never written. */}
      <article>
        <p className={styles.kicker}>Survey</p>
        {/* The site-wide page-title treatment: Instrument Serif at the
            article-title size, left aligned. Same class /conduct,
            /privacy, /events and the job permalinks use, so the survey
            leads the same way every other page does. */}
        <h1 className="page-title">{survey.title}</h1>

        {/* The intro belongs to the landing state, not to every step —
            left here it sat above all 25 questions, repeating what the
            survey is while someone is in the middle of answering it. The
            form renders it on its own start screen, so it is still in
            the server-rendered HTML for anyone arriving cold; only the
            closed state needs its own copy. */}
        {open ? (
          <SurveyForm
            survey={survey}
            countries={COUNTRY_NAMES}
            source={rawSource}
          />
        ) : (
          <>
            <p className="intro">{survey.intro}</p>
            <ClosedNotice survey={survey} />
          </>
        )}
      </article>
    </main>
  );
}

function ClosedNotice({
  survey
}: {
  survey: { year: number; opensAt: string; closesAt: string };
}) {
  const notYet = Date.now() < Date.parse(survey.opensAt);
  const closed = new Date(survey.closesAt);
  // closesAt is exclusive — the last day people could answer was the day
  // before it.
  closed.setUTCDate(closed.getUTCDate() - 1);
  const closedLabel = closed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  });

  return (
    <div className={styles.closed}>
      <p>
        {notYet ? (
          <>This year&rsquo;s survey isn&rsquo;t open yet. Check back soon.</>
        ) : (
          <>
            This survey closed on {closedLabel} and is no longer accepting
            responses. Thank you to everyone who took part.
          </>
        )}
      </p>
      <p>
        <Link href="/newsletter">Join the newsletter</Link> to hear when the
        results are published.
      </p>
    </div>
  );
}

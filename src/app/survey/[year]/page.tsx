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
//
// In any of the survey's languages, picked with ?lang= (see
// lib/survey/i18n). The translation is chosen here, on the server, and
// the form gets only that one — never the whole set.

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { allSurveys, getSurvey, isOpen } from '../../../lib/survey';
import { COUNTRY_ISO_CODES, COUNTRY_NAMES } from '../../../lib/countries';
import { hasEarlyAccess, opensLater } from '../../../lib/survey/preview';
import { languagesFor, translate } from '../../../lib/survey/i18n';
import { splitTemplate } from '../../../lib/survey/i18n/format';
import type { SurveyLanguage } from '../../../lib/survey/i18n/languages';
import type { SurveyUi } from '../../../lib/survey/i18n/types';
import SurveyForm, { LanguageLinks, type LanguageLink } from './SurveyForm';
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

export async function generateMetadata({
  params,
  searchParams
}: Props): Promise<Metadata> {
  const { year } = await params;
  const base = getSurvey(year);
  if (!base) return { title: 'Survey — Hard Problems' };
  const sp = await searchParams;
  const { survey } = translate(base, sp.lang);
  return {
    title: `${survey.title} — Hard Problems`,
    description: survey.intro,
    // Kept out of search results until it opens: before then the page
    // is only an "opens on…" notice, plus the early-access form for
    // the team (see preview.ts).
    robots: opensLater(base) ? { index: false, follow: false } : undefined,
    alternates: {
      // The ?source= parameter is for attribution, not for indexing —
      // without this every shared variant would be a separate URL in
      // Google's eyes, all with identical content.
      canonical: `/survey/${base.year}`
    },
    openGraph: {
      title: survey.title,
      description: survey.intro,
      url: `/survey/${base.year}`,
      type: 'website',
      // Relative is fine — the root layout's metadataBase resolves it.
      // Setting it here replaces the site-wide /opengraph-image, which is
      // the point: a shared survey link should show the survey.
      images: base.image ? [base.image] : undefined
    },
    twitter: {
      card: 'summary_large_image',
      title: survey.title,
      description: survey.intro,
      images: base.image ? [base.image] : undefined
    }
  };
}

/**
 * A date in the respondent's language, formatted here on the server so
 * the browser's own date data cannot render it differently and trip a
 * hydration mismatch.
 */
function formatDate(iso: string, locale: string, month: 'long' | 'short') {
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month,
    year: 'numeric',
    timeZone: 'UTC'
  };
  try {
    return new Date(iso).toLocaleDateString(locale, options);
  } catch {
    return new Date(iso).toLocaleDateString('en-GB', options);
  }
}

/** closesAt is exclusive: the last day anyone could answer is the day before. */
function lastDay(closesAt: string): string {
  const d = new Date(closesAt);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString();
}

/**
 * Country names in the respondent's language, from the browser-standard
 * region names (Intl.DisplayNames). The VALUES stay the English names
 * the validator and the analysis use; only what is shown changes.
 * Sorted by the translated name, as someone reading that language
 * would look for it.
 */
function localizedCountries(locale: string): {
  names: string[];
  labels: Record<string, string>;
} {
  const labels: Record<string, string> = {};
  let display: Intl.DisplayNames | null = null;
  try {
    display = new Intl.DisplayNames([locale], {
      type: 'region',
      fallback: 'none'
    });
  } catch {
    display = null;
  }
  for (const name of COUNTRY_NAMES) {
    let label: string | undefined;
    try {
      label = display?.of(COUNTRY_ISO_CODES[name]);
    } catch {
      label = undefined;
    }
    labels[name] = label || name;
  }
  let collator: Intl.Collator;
  try {
    collator = new Intl.Collator(locale);
  } catch {
    collator = new Intl.Collator('en');
  }
  const names = [...COUNTRY_NAMES].sort((a, b) =>
    collator.compare(labels[a], labels[b])
  );
  return { names, labels };
}

/** This page in another language, keeping the link's other parameters. */
function languageHref(
  year: number,
  code: string,
  sp: Record<string, string | string[] | undefined>
): string {
  const q = new URLSearchParams();
  for (const key of ['source', 'access'] as const) {
    const v = sp[key];
    if (typeof v === 'string' && v) q.set(key, v);
  }
  if (code !== 'en') q.set('lang', code);
  const s = q.toString();
  return `/survey/${year}${s ? `?${s}` : ''}`;
}

export default async function SurveyPage({ params, searchParams }: Props) {
  const { year } = await params;
  const base = getSurvey(year);
  if (!base) notFound();

  // Captured blindly from the link, as the brief asks. It is normalised
  // on the way into storage, not here — see normalizeSource().
  const sp = await searchParams;
  const rawSource = typeof sp.source === 'string' ? sp.source : '';

  const { language, survey, ui } = translate(base, sp.lang);
  const locale = language.htmlLang;

  const open = isOpen(base);
  // Early access for the team before opening — see preview.ts.
  const accessCode = typeof sp.access === 'string' ? sp.access : '';
  const earlyAccess = !open && hasEarlyAccess(base, accessCode);

  const languages: LanguageLink[] = languagesFor(base).map(
    (l: SurveyLanguage) => ({
      code: l.code,
      nativeName: l.nativeName,
      htmlLang: l.htmlLang,
      dir: l.dir,
      href: languageHref(base.year, l.code, sp)
    })
  );
  const countries = localizedCountries(locale);

  return (
    // `ph-no-capture` turns PostHog's autocapture off for everything in
    // here. Autocapture records the text of what is clicked, which on
    // this page is someone's answers. Progress is sent instead as
    // explicit events (see SurveyForm), carrying no answers.
    <>
      {/* The same pale-green band the article pages carry under the
          menu, here saying who is asking. Start screen only: it is
          hidden once someone is answering or has finished (the
          `survey-past-start` class SurveyForm sets on <body>). Reuses
          the newsletter band's classes for an identical look. */}
      <div
        className="newsletter-module newsletter-module--under-nav survey-band"
        lang={locale}
        dir={language.dir}
      >
        <div className="newsletter-module-inner">
          <p className="newsletter-form-label">{ui.band}</p>
        </div>
      </div>
      <main
        className={`${styles.survey} ph-no-capture`}
        lang={locale}
        dir={language.dir}
      >
        {/* No class: the column width and padding come from `.survey` on
          the <main>, and this element only groups the content. It used
          to reference a `styles.intro` rule that was never written. */}
        <article>
          {/* The intro belongs to the landing state, not to every step —
            left here it sat above all 25 questions, repeating what the
            survey is while someone is in the middle of answering it. The
            form renders it on its own start screen, so it is still in
            the server-rendered HTML for anyone arriving cold; only the
            closed state needs its own copy. */}
          {earlyAccess && (
            // English on purpose: it is for the team, whatever language
            // they are testing.
            <p
              className={styles.previewBanner}
              role="status"
              lang="en"
              dir="ltr"
            >
              <strong>Internal test.</strong> This survey isn&rsquo;t open to
              the public yet. Responses sent from here are saved as test data.
            </p>
          )}
          {open || earlyAccess ? (
            <SurveyForm
              survey={survey}
              ui={ui}
              language={{
                code: language.code,
                htmlLang: language.htmlLang,
                dir: language.dir
              }}
              languages={languages}
              countries={countries.names}
              countryLabels={countries.labels}
              dates={{
                closesLong: formatDate(lastDay(base.closesAt), locale, 'long'),
                closesShort: formatDate(lastDay(base.closesAt), locale, 'short')
              }}
              source={rawSource}
              accessCode={earlyAccess ? accessCode : undefined}
            />
          ) : (
            <>
              {/* While open, SurveyForm renders the title itself so the
                thank-you screen can change it. */}
              <LanguageLinks
                languages={languages}
                current={language.code}
                ui={ui}
              />
              <p className={styles.kicker}>{ui.kicker}</p>
              <h1 className="page-title">
                {survey.shortTitle ?? survey.title}
              </h1>
              <p className="intro">{survey.intro}</p>
              <ClosedNotice
                notYet={Date.now() < Date.parse(base.opensAt)}
                opens={formatDate(base.opensAt, locale, 'long')}
                closed={formatDate(lastDay(base.closesAt), locale, 'long')}
                ui={ui}
              />
            </>
          )}
        </article>
      </main>
    </>
  );
}

function ClosedNotice({
  notYet,
  opens,
  closed,
  ui
}: {
  notYet: boolean;
  opens: string;
  closed: string;
  ui: SurveyUi;
}) {
  const link = <Link href="/newsletter">{ui.closed.newsletterLinkText}</Link>;
  const hear = notYet ? ui.closed.hearWhenOpens : ui.closed.hearResults;
  return (
    <div className={styles.closed}>
      <p>
        {(notYet ? ui.closed.opensOn : ui.closed.closedOn).replace(
          '{date}',
          notYet ? opens : closed
        )}
      </p>
      <p>
        {splitTemplate(hear).map((part, i) =>
          'key' in part ? (
            <span key={i}>{part.key === 'link' ? link : `{${part.key}}`}</span>
          ) : (
            <span key={i}>{part.text}</span>
          )
        )}
      </p>
    </div>
  );
}

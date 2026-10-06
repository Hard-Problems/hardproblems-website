// Dedicated SEO pages for designer jobs by region or country. URLs:
//   /jobs/europe               (region)
//   /jobs/vietnam              (country)
//
// Handles both regions and countries in a single dynamic route — the
// resolver walks the known region list first, then the active-country
// set. Slugs that don't resolve are 404s.
//
// Hybrid architecture:
//   - generateStaticParams pre-renders the 6 regions + every country
//     with ≥10 active jobs (fast first-hit for common queries).
//   - dynamicParams: true (default) lets new qualifying countries
//     render on-demand between deploys.
//   - revalidate: 3600 refreshes content hourly.
//   - Pages that drop below the index-threshold ship a `noindex` meta
//     so Google eventually drops them from search results.

import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { fetchJobs, toListedJobs } from '../fetchJobs';
import LocationJobList from './LocationJobList';
import {
  countryQualifies,
  displayNameWithArticle,
  distinctCountries,
  jobsAtLocation,
  locationSlug,
  qualifyingCountries,
  resolveLocationSlug
} from '../locations';
import { META_REGIONS } from '../filters';
import styles from './page.module.scss';

export const revalidate = 3600;

// Degraded path only, as on /jobs/role/[slug]: normally this reads the
// Supabase snapshot, but if that is unavailable fetchJobs() falls back
// to downloading the sheet CSV inside the render — ~2.8MB today and
// growing as Column X is filled in. Without this the default ceiling
// could kill that fetch mid-render, which is how the board ended up
// serving stale data once before.
export const maxDuration = 60;

type Props = { params: Promise<{ location: string }> };

// Build the list of paths to pre-render at build time: every region
// (always) + every country that currently has ≥10 active jobs.
// dynamicParams stays on (Next default), but the page component below
// 404s any country slug that doesn't qualify at render time, so
// under-10 countries never actually serve a page.
export async function generateStaticParams() {
  const jobs = await fetchJobs();
  const regions = META_REGIONS.map((r) => ({
    location: locationSlug(r.name)
  }));
  const countries = qualifyingCountries(jobs).map((c) => ({
    location: locationSlug(c)
  }));
  return [...regions, ...countries];
}

export async function generateMetadata({
  params
}: Props): Promise<Metadata> {
  const { location } = await params;
  const jobs = await fetchJobs();
  const active = distinctCountries(jobs);
  const resolved = resolveLocationSlug(location, active);
  if (!resolved) return { title: 'Design jobs — Hard Problems' };
  // Same qualification gate the page component uses — no metadata
  // for locations that will 404 below.
  if (resolved.kind === 'country' && !countryQualifies(jobs, resolved.name)) {
    return { title: 'Design jobs — Hard Problems' };
  }

  const forLocation = jobsAtLocation(jobs, resolved);
  const displayName = displayNameWithArticle(resolved.name);
  const label =
    resolved.kind === 'region'
      ? `across ${displayName}`
      : `in ${displayName}`;
  const count = forLocation.length;
  const noun = count === 1 ? 'design role' : 'design roles';
  return {
    title: `Design jobs ${label} — Hard Problems`,
    description: `${count} ${noun} ${label} working on hard problems — public health, climate, education, and more. Updated daily from the Hard Problems job board.`,
    openGraph: {
      title: `Design jobs ${label}`,
      type: 'website'
    }
  };
}

export default async function JobsByLocationPage({ params }: Props) {
  const { location } = await params;
  const jobs = await fetchJobs();
  const active = distinctCountries(jobs);
  const resolved = resolveLocationSlug(location, active);
  if (!resolved) notFound();
  // Countries below the ≥10-job threshold 404 — regions never do
  // (the 6 regions always exist regardless of aggregate count).
  if (resolved.kind === 'country' && !countryQualifies(jobs, resolved.name)) {
    notFound();
  }

  const forLocation = jobsAtLocation(jobs, resolved);

  // Every other page this route serves: the six regions, plus every
  // country over the threshold. Built from the same two sources as
  // generateStaticParams, so a hub can never be linked before it exists
  // or missed once it appears.
  //
  // Sorted on the place name, so "the USA" files under U and regions
  // interleave with countries instead of forming a separate block. The
  // two are worded the same way in the list, so nothing downstream needs
  // to know which is which.
  const otherHubs: string[] = [
    ...META_REGIONS.map((r) => r.name),
    ...qualifyingCountries(jobs)
  ]
    .filter((name) => name !== resolved.name)
    .sort((a, b) => a.localeCompare(b));
  const displayName = displayNameWithArticle(resolved.name);
  const label =
    resolved.kind === 'region'
      ? `across ${displayName}`
      : `in ${displayName}`;

  return (
    <main className={styles.main}>
      <p className={styles.backLink}>
        <Link href="/jobs">← All design jobs</Link>
      </p>
      <h1 className={styles.heading}>Design jobs {label}</h1>
      <p className={styles.intro}>
        {forLocation.length} design{' '}
        {forLocation.length === 1 ? 'role' : 'roles'} {label} working on
        hard problems: public health, climate change, education,
        government, and more. Updated daily.
      </p>

      <LocationJobList jobs={toListedJobs(forLocation)} />

      {forLocation.length > 0 && (
        <p style={{ marginTop: '2rem' }}>
          <Link
            href={`/jobs?country=${encodeURIComponent(resolved.name)}`}
            className="black-button"
          >
            Open in the full job board →
          </Link>
        </p>
      )}

      {/* Cross-links to the sibling hubs. Until now these pages linked
          only back to /jobs and out to employers, so each was a dead end
          for anyone browsing by place and the hubs passed no authority
          between themselves. Regions first, then the countries that
          clear the job threshold, alphabetically. */}
      {otherHubs.length > 0 && (
        <section className={styles.otherHubs}>
          <h2 className="section-label">Design jobs elsewhere</h2>
          <ul>
            {otherHubs.map((name) => (
              <li key={name}>
                <Link href={`/jobs/${locationSlug(name)}`}>
                  Design jobs in {displayNameWithArticle(name)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

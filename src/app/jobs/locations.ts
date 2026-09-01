// Helpers for the SEO jobs-by-location pages (regions + top countries).
// Kept adjacent to the rest of the jobs code so filter constants stay
// in one place.

import type { SerializedJob } from './fetchJobs';
import {
  META_REGIONS,
  isMetaRegionName,
  matchesCountry,
  splitCountries
} from './filters';
import { canonicalCountryName } from './countryAliases';

// Any country with at least this many active jobs (past 45 days, per
// fetchJobs's own filter) gets a page. Countries below the threshold
// 404 — same behaviour whether hit via a direct URL, an internal
// link, or a Google crawl. Single threshold on purpose: the earlier
// tiered "pre-render at 10, noindex at 3" version quietly served
// under-10 pages via dynamicParams, which surprised readers.
const COUNTRY_MIN_ACTIVE_JOBS = 10;

// Country + region names that read naturally with a preceding "the"
// in English prose ("jobs in the USA", "across the Middle East").
// Covers both regions and the countries most likely to appear in
// the jobs sheet. Add new entries as new spellings show up in the
// sheet — matching is exact, so "United States" and "US" and "USA"
// each need their own entry if they can all appear.
const NAMES_TAKING_ARTICLE = new Set<string>([
  // Regions
  'Middle East',
  // Countries — common English name + acronyms
  'USA',
  'US',
  'United States',
  'United States of America',
  'UK',
  'United Kingdom',
  'UAE',
  'United Arab Emirates',
  'Netherlands',
  'Philippines',
  'Bahamas',
  'Gambia',
  'Maldives',
  'Comoros',
  'Marshall Islands',
  'Solomon Islands',
  'Dominican Republic',
  'Central African Republic',
  'Republic of the Congo',
  'Democratic Republic of the Congo'
]);

// "USA" → "the USA", "Africa" → "Africa". Case-sensitive exact match
// against NAMES_TAKING_ARTICLE — callers hand the display name from
// META_REGIONS or the sheet's country column as-is.
export function displayNameWithArticle(name: string): string {
  return NAMES_TAKING_ARTICLE.has(name) ? `the ${name}` : name;
}

// URL-safe slug: "Middle East" → "middle-east", "Côte d'Ivoire" →
// "cote-d-ivoire". Only ASCII lowercase + hyphens.
export function locationSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Reverse the slug back to a display name by scanning the known
// region + country lists. Returns null for unknown slugs (which the
// caller treats as 404).
export type ResolvedLocation =
  | { kind: 'region'; name: string; countries: string[] }
  | { kind: 'country'; name: string };

export function resolveLocationSlug(
  slug: string,
  activeCountries: Set<string>
): ResolvedLocation | null {
  const target = slug.toLowerCase();
  for (const region of META_REGIONS) {
    if (locationSlug(region.name) === target) {
      return {
        kind: 'region',
        name: region.name,
        countries: region.countries.slice()
      };
    }
  }
  for (const country of activeCountries) {
    if (locationSlug(country) === target) {
      return { kind: 'country', name: country };
    }
  }
  return null;
}

// Extract the set of DISTINCT country strings appearing in the active
// jobs list, split on the compound-country separators (comma, slash,
// "or", "and") so a single "UK, USA" row contributes to both. Each
// name is canonicalized through the alias table so alternate spellings
// ("USA" / "United States") collapse to a single entry — this stops
// duplicate location pages being generated for the same underlying
// country.
export function distinctCountries(jobs: SerializedJob[]): Set<string> {
  const set = new Set<string>();
  for (const j of jobs) {
    for (const c of splitCountries(j.country)) {
      // Region tags ("Africa") get their own region page — skip them
      // here so they don't also emit a duplicate country page/slug.
      if (isMetaRegionName(c)) continue;
      // "Global" is a flag meaning location-agnostic, not a place.
      // Without this it would earn a /jobs/global page, which is both
      // meaningless as a location and duplicative — those jobs already
      // appear on every other country and region page.
      if (c.trim().toLowerCase() === 'global') continue;
      set.add(canonicalCountryName(c));
    }
  }
  return set;
}

// Countries with enough active jobs to have a page at all. Also used
// as the source of truth for the sitemap. Sorted alphabetically for
// stable output.
export function qualifyingCountries(jobs: SerializedJob[]): string[] {
  const qualifying: string[] = [];
  for (const country of distinctCountries(jobs)) {
    // includeGlobal=false: a country earns a page on its own jobs, not
    // on the shared pool of Global listings.
    const n = jobs.filter((j) =>
      matchesCountry(j.country, country, false)
    ).length;
    if (n >= COUNTRY_MIN_ACTIVE_JOBS) qualifying.push(country);
  }
  return qualifying.sort();
}

// Whether a given country currently has enough jobs to warrant a page.
// Called at render time to 404 countries that dropped below the
// threshold since the last deploy (dynamicParams is default-on, so
// stray country URLs still hit this route).
export function countryQualifies(
  jobs: SerializedJob[],
  country: string
): boolean {
  // Must use the same strict count as qualifyingCountries(), or a page
  // could be pre-rendered and then 404 on its own render (or vice
  // versa) purely because the two disagreed about Global jobs.
  return (
    jobs.filter((j) => matchesCountry(j.country, country, false)).length >=
    COUNTRY_MIN_ACTIVE_JOBS
  );
}

// Jobs at a resolved location. Handles both region (any country in
// the region's list) and country (via the shared matchesCountry
// helper which respects "Global" jobs and comma-split fields).
export function jobsAtLocation(
  jobs: SerializedJob[],
  location: ResolvedLocation
): SerializedJob[] {
  return jobs.filter((j) => matchesCountry(j.country, location.name));
}

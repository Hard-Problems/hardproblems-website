// Shared filter logic used by both the client UI (JobsList.tsx) and the
// server-side RSS feed handler (feed.xml/route.ts). Centralising it here
// guarantees the RSS output stays in lockstep with what the page shows for
// the same query string.

import type { SerializedJob } from './fetchJobs';
import { OrgCategory, orgCategory } from './orgType';
import { aliasesFor, canonicalCountryName } from './countryAliases';

export type WorkStyle = 'remote' | 'hybrid' | 'onsite';

export const WORK_STYLE_OPTIONS: { value: WorkStyle; label: string }[] = [
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
  { value: 'remote', label: 'Remote' }
];

export type SeniorityCategory =
  | 'junior'
  | 'general'
  | 'senior'
  | 'director';

// Order matters — the dropdown / checkbox rendering follows this
// array, not an alphabetical sort.
export const SENIORITY_OPTIONS: {
  value: SeniorityCategory;
  label: string;
  keywords: string[];
}[] = [
  { value: 'junior', label: 'Junior', keywords: ['junior', 'entry'] },
  {
    value: 'general',
    label: 'General',
    keywords: ['general', 'mid', 'intermediate']
  },
  {
    value: 'senior',
    label: 'Senior, staff, or lead',
    keywords: ['senior', 'staff', 'principal', 'lead']
  },
  {
    value: 'director',
    label: 'Director and above',
    keywords: [
      'director',
      'vp',
      'vice president',
      'chief',
      'head of',
      'c-level',
      'cto',
      'cpo',
      'ceo',
      'executive'
    ]
  }
];

export type SectorCategory =
  | 'climate'
  | 'health'
  | 'public-services'
  | 'education';

export const SECTOR_OPTIONS: {
  value: SectorCategory;
  label: string;
  keywords: string[];
}[] = [
  {
    value: 'climate',
    label: 'Climate change',
    keywords: ['climate', 'clean energy']
  },
  { value: 'education', label: 'Education', keywords: ['education'] },
  { value: 'health', label: 'Health', keywords: ['health'] },
  {
    value: 'public-services',
    label: 'Public services',
    keywords: ['public service', 'government']
  }
];

// Meta-regions shown at the top of the country dropdown. Selecting a
// region matches every job whose country string mentions any country
// in the region's list — plus any job tagged with the region name
// itself ("Europe", "Africa", etc.) or a common alias (e.g. "EU",
// "MENA"). The region name itself is included in each list so those
// cross-region tags resolve correctly.
export type MetaRegion = {
  name: string;
  // List of country names + aliases that should resolve when this
  // region is selected. Matched as word-boundary case-insensitive
  // substrings against the job's country field.
  countries: string[];
};

export const EUROPEAN_COUNTRIES = [
  'Europe',
  'EU',
  'UK',
  'United Kingdom',
  'England',
  'Scotland',
  'Wales',
  'Northern Ireland',
  'Ireland',
  'France',
  'Germany',
  'Spain',
  'Italy',
  'Portugal',
  'Netherlands',
  'Belgium',
  'Luxembourg',
  'Denmark',
  'Sweden',
  'Norway',
  'Finland',
  'Iceland',
  'Austria',
  'Switzerland',
  'Poland',
  'Czech Republic',
  'Czechia',
  'Slovakia',
  'Hungary',
  'Romania',
  'Bulgaria',
  'Greece',
  'Slovenia',
  'Croatia',
  'Serbia',
  'Bosnia',
  'Herzegovina',
  'Montenegro',
  'North Macedonia',
  'Albania',
  'Estonia',
  'Latvia',
  'Lithuania',
  'Ukraine',
  'Moldova',
  'Malta',
  'Cyprus'
];

const SOUTH_AMERICAN_COUNTRIES = [
  'South America',
  'LatAm',
  'Latin America',
  'Argentina',
  'Bolivia',
  'Brazil',
  'Chile',
  'Colombia',
  'Ecuador',
  'Guyana',
  'Paraguay',
  'Peru',
  'Suriname',
  'Uruguay',
  'Venezuela'
];

const AFRICAN_COUNTRIES = [
  'Africa',
  'Algeria',
  'Angola',
  'Benin',
  'Botswana',
  'Burkina Faso',
  'Burundi',
  'Cabo Verde',
  'Cameroon',
  'Central African Republic',
  'Chad',
  'Comoros',
  'Congo',
  'DR Congo',
  "Côte d'Ivoire",
  'Ivory Coast',
  'Djibouti',
  'Egypt',
  'Equatorial Guinea',
  'Eritrea',
  'Eswatini',
  'Ethiopia',
  'Gabon',
  'Gambia',
  'Ghana',
  'Guinea',
  'Guinea-Bissau',
  'Kenya',
  'Lesotho',
  'Liberia',
  'Libya',
  'Madagascar',
  'Malawi',
  'Mali',
  'Mauritania',
  'Mauritius',
  'Morocco',
  'Mozambique',
  'Namibia',
  'Niger',
  'Nigeria',
  'Rwanda',
  'Sao Tome and Principe',
  'Senegal',
  'Seychelles',
  'Sierra Leone',
  'Somalia',
  'South Africa',
  'South Sudan',
  'Sudan',
  'Tanzania',
  'Togo',
  'Tunisia',
  'Uganda',
  'Zambia',
  'Zimbabwe'
];

const MIDDLE_EAST_COUNTRIES = [
  'Middle East',
  'MENA',
  'Bahrain',
  'Egypt',
  'Iran',
  'Iraq',
  'Israel',
  'Jordan',
  'Kuwait',
  'Lebanon',
  'Oman',
  'Palestine',
  'Qatar',
  'Saudi Arabia',
  'Syria',
  'Turkey',
  'UAE',
  'United Arab Emirates',
  'Yemen'
];

const ASIAN_COUNTRIES = [
  'Asia',
  'APAC',
  'Afghanistan',
  'Bangladesh',
  'Bhutan',
  'Brunei',
  'Cambodia',
  'China',
  'Hong Kong',
  'India',
  'Indonesia',
  'Japan',
  'Kazakhstan',
  'Kyrgyzstan',
  'Laos',
  'Macau',
  'Malaysia',
  'Maldives',
  'Mongolia',
  'Myanmar',
  'Nepal',
  'North Korea',
  'Pakistan',
  'Philippines',
  'Singapore',
  'South Korea',
  'Sri Lanka',
  'Taiwan',
  'Tajikistan',
  'Thailand',
  'Timor-Leste',
  'Turkmenistan',
  'Uzbekistan',
  'Vietnam'
];

const NORTH_AMERICAN_COUNTRIES = [
  'North America',
  'USA',
  'US',
  'United States',
  'United States of America',
  'America',
  'Canada',
  'Mexico',
  'Bahamas',
  'Barbados',
  'Belize',
  'Costa Rica',
  'Cuba',
  'Dominican Republic',
  'El Salvador',
  'Greenland',
  'Guatemala',
  'Haiti',
  'Honduras',
  'Jamaica',
  'Nicaragua',
  'Panama',
  'Trinidad and Tobago'
];

export const META_REGIONS: MetaRegion[] = [
  { name: 'Africa', countries: AFRICAN_COUNTRIES },
  { name: 'Asia', countries: ASIAN_COUNTRIES },
  { name: 'Europe', countries: EUROPEAN_COUNTRIES },
  { name: 'Middle East', countries: MIDDLE_EAST_COUNTRIES },
  { name: 'North America', countries: NORTH_AMERICAN_COUNTRIES },
  { name: 'South America', countries: SOUTH_AMERICAN_COUNTRIES }
];

export const META_REGION_NAMES = new Set(META_REGIONS.map((r) => r.name));

// Lower-cased region-name lookup. The sheet's country column isn't
// case-normalized, so region tags are compared case-insensitively —
// otherwise an "africa" row would leak into the country dropdown and
// miss the region fan-out below.
const REGION_BY_LOWER_NAME = new Map(
  META_REGIONS.map((r) => [r.name.toLowerCase(), r] as const)
);

// True when a country-column token is a meta-region tag ("Africa",
// "middle east") rather than an actual country. The dropdown uses this
// to keep regions in the "Region" optgroup only.
export function isMetaRegionName(value: string): boolean {
  return REGION_BY_LOWER_NAME.has(value.trim().toLowerCase());
}

// Whether `country` is one of the region's member countries, compared
// through the alias table so "USA" and "United States" both resolve.
function regionIncludes(region: MetaRegion, country: string): boolean {
  const target = canonicalCountryName(country).toLowerCase();
  return region.countries.some(
    (c) => canonicalCountryName(c).toLowerCase() === target
  );
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function splitCountries(s: string): string[] {
  return s
    .split(/\s+(?:or|and)\s+|\s*[,&/]\s*/i)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

// Build a case-insensitive regex that matches any alias of `name` as
// a whole word. Extracted so both the direct country filter and the
// meta-region loop below can benefit from alias support (a job listed
// as "United States" matches a "USA" filter, a "North America" region
// filter, or vice versa).
function aliasRegex(name: string): RegExp {
  const pattern = aliasesFor(name)
    .map((alias) => `\\b${escapeRegex(alias)}\\b`)
    .join('|');
  return new RegExp(pattern, 'i');
}

export function matchesCountry(
  jobCountry: string,
  selected: string,
  // Set false to count only GENUINE matches, ignoring the
  // location-agnostic pass-through below. Used when deciding whether a
  // country has earned its own page: counting Global jobs there meant
  // every country's total was inflated by the same shared pool, so a
  // country with one real job could clear the threshold and get a page
  // populated almost entirely by jobs repeated on every other country
  // page. Display still includes Global jobs — see jobsAtLocation().
  includeGlobal = true
): boolean {
  if (selected === 'all') return true;
  // "Global" roles are location-agnostic — they should appear in every
  // country filter so a user looking at e.g. Germany still sees them.
  if (includeGlobal && /\bGlobal\b/i.test(jobCountry)) return true;
  // Meta region (Europe, South America, Africa, Middle East, Asia) —
  // matches if the job's country field mentions any country in the
  // region's list, OR any known alias of those countries.
  const region = META_REGIONS.find((r) => r.name === selected);
  if (region) {
    return region.countries.some((name) => aliasRegex(name).test(jobCountry));
  }
  if (aliasRegex(selected).test(jobCountry)) return true;
  // A job tagged with a bare region name ("Africa") is open across that
  // whole region, so it also belongs under each member country the
  // dropdown happens to offer — the dropdown is built from the jobs
  // data, so this never invents countries nobody is hiring in.
  // Compared token-by-token rather than as a substring so a job in
  // "South Africa" isn't mistaken for a continent-wide listing.
  return splitCountries(jobCountry).some((tag) => {
    const tagged = REGION_BY_LOWER_NAME.get(tag.trim().toLowerCase());
    return tagged ? regionIncludes(tagged, selected) : false;
  });
}

export function matchesWorkStyle(remote: string, filter: WorkStyle): boolean {
  const r = remote.toLowerCase();
  if (filter === 'remote') return r.includes('remote');
  if (filter === 'hybrid') return r.includes('hybrid');
  if (filter === 'onsite') return r.length === 0;
  return false;
}

export function matchesSector(
  jobSector: string,
  category: SectorCategory
): boolean {
  const opt = SECTOR_OPTIONS.find((o) => o.value === category);
  if (!opt) return false;
  const lower = jobSector.toLowerCase();
  return opt.keywords.some((k) => lower.includes(k));
}

// Pretty-print a raw sector value into the label the UI shows on tags.
// Exported so `matchesSectorPick` can normalize both sides to the same
// space (URL params always carry the displayed form).
//   - "Health (Healthcare)"    → "Healthcare"
//   - "Good Government"        → "Good gov"
//   - "Clean Energy"           → "Climate Tech"
export function displaySector(sector: string): string {
  const trimmed = sector.trim().replace(/\bnon-profit\b/gi, 'Nonprofit');
  const healthMatch = trimmed.match(/^Health\s*\(([^)]+)\)\s*$/i);
  if (healthMatch) {
    const inner = healthMatch[1].trim();
    return inner.charAt(0).toUpperCase() + inner.slice(1).toLowerCase();
  }
  if (trimmed.toLowerCase() === 'good government') return 'Good gov';
  if (trimmed.toLowerCase() === 'clean energy') return 'Climate Tech';
  return trimmed;
}

// Matches a job's raw sector against a specific displayed sector picked
// from a job-card tag click. Both sides go through `displaySector` so
// e.g. the URL param `good gov` correctly matches a job whose sheet
// sector is "Good Government".
export function matchesSectorPick(jobSector: string, pick: string): boolean {
  const a = displaySector(jobSector).toLowerCase();
  const b = pick.trim().toLowerCase();
  if (!a || !b) return false;
  return a === b;
}

// A job is one of Our Picks when its "good for world" score (sheet
// column F) parses to a number greater than 8. Mirrors the inline check
// in JobsList that drives the pill rendering.
export function isHardProblemsPick(goodForWorld: string): boolean {
  const score = parseFloat(goodForWorld);
  return !Number.isNaN(score) && score > 8;
}

export function matchesSeniority(
  jobSeniority: string,
  category: SeniorityCategory
): boolean {
  const opt = SENIORITY_OPTIONS.find((o) => o.value === category);
  if (!opt) return false;
  const lower = jobSeniority.toLowerCase();
  return opt.keywords.some((k) => lower.includes(k));
}

export function parseWorkStyleParam(value: string | null): WorkStyle[] {
  if (!value) return [];
  return value
    .split(',')
    .filter(
      (v): v is WorkStyle =>
        v === 'remote' || v === 'hybrid' || v === 'onsite'
    );
}

export function parseOrgParam(value: string | null): OrgCategory[] {
  if (!value) return [];
  return value
    .split(',')
    .filter(
      (v): v is OrgCategory =>
        v === 'for-profit' ||
        v === 'nonprofit' ||
        v === 'public-sector'
    );
}

export function parseSectorParam(value: string | null): SectorCategory[] {
  if (!value) return [];
  return value
    .split(',')
    .filter(
      (v): v is SectorCategory =>
        v === 'climate' ||
        v === 'health' ||
        v === 'public-services' ||
        v === 'education'
    );
}

export function parseSeniorityParam(value: string | null): SeniorityCategory[] {
  if (!value) return [];
  return value
    .split(',')
    .filter(
      (v): v is SeniorityCategory =>
        v === 'junior' ||
        v === 'general' ||
        v === 'senior' ||
        v === 'director'
    );
}

export function parseRoleParam(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

// The known set of filter query-string keys. Used by the RSS link in the UI
// to forward exactly the same filters into the feed URL.
export const FILTER_PARAM_KEYS = [
  'country',
  'work',
  'org',
  'sector',
  'sectorPick',
  'role',
  'seniority',
  'pick'
] as const;

export type JobFilters = {
  country: string;
  workStyles: WorkStyle[];
  orgs: OrgCategory[];
  sectors: SectorCategory[];
  sectorPicks: string[];
  roles: string[];
  seniorities: SeniorityCategory[];
  picksOnly: boolean;
};

export function parseSectorPickParam(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

export function parseFiltersFromParams(
  params: URLSearchParams
): JobFilters {
  return {
    country: params.get('country') ?? 'all',
    workStyles: parseWorkStyleParam(params.get('work')),
    orgs: parseOrgParam(params.get('org')),
    sectors: parseSectorParam(params.get('sector')),
    sectorPicks: parseSectorPickParam(params.get('sectorPick')),
    roles: parseRoleParam(params.get('role')),
    seniorities: parseSeniorityParam(params.get('seniority')),
    picksOnly: params.get('pick') === '1'
  };
}

// Filters jobs identically to the JobsList UI. Keep this in sync with the
// `filtered` useMemo block over there — or better, only call from this
// module so there's one implementation.
export function filterJobs(
  jobs: SerializedJob[],
  filters: JobFilters
): SerializedJob[] {
  return jobs.filter((j) => {
    if (!matchesCountry(j.country, filters.country)) return false;
    if (
      filters.workStyles.length > 0 &&
      !filters.workStyles.some((w) => matchesWorkStyle(j.remote, w))
    ) {
      return false;
    }
    if (filters.orgs.length > 0) {
      const cat = orgCategory(j.typeOfOrg);
      if (!cat || !filters.orgs.includes(cat)) return false;
    }
    if (
      filters.sectors.length > 0 &&
      !filters.sectors.some((s) => matchesSector(j.sector, s))
    ) {
      return false;
    }
    if (
      filters.sectorPicks.length > 0 &&
      !filters.sectorPicks.some((p) => matchesSectorPick(j.sector, p))
    ) {
      return false;
    }
    if (filters.picksOnly && !isHardProblemsPick(j.goodForWorld)) {
      return false;
    }
    if (filters.roles.length > 0 && !filters.roles.includes(j.role)) {
      return false;
    }
    if (
      filters.seniorities.length > 0 &&
      !filters.seniorities.some((s) => matchesSeniority(j.seniority, s))
    ) {
      return false;
    }
    return true;
  });
}

'use client';

import { Fragment, ReactNode, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { usePostHog } from 'posthog-js/react';
import { Earth, Gem, Sparkle } from 'lucide-react';
import { getSectorIcon } from './sectorIcons';
import type { SerializedJob } from './fetchJobs';
import CompanyFavicon from './CompanyFavicon';
import JobAlertsForm from './JobAlertsForm';
import JobSubmitForm from './JobSubmitForm';
import {
  ORG_TYPE_OPTIONS,
  OrgCategory,
  orgCategory,
  orgTypeDisplay
} from './orgType';
import {
  FILTER_PARAM_KEYS,
  META_REGIONS,
  isMetaRegionName,
  SECTOR_OPTIONS,
  SENIORITY_OPTIONS,
  SectorCategory,
  SeniorityCategory,
  WORK_STYLE_OPTIONS,
  WorkStyle,
  displaySector,
  filterJobs,
  parseOrgParam,
  parseRoleParam,
  parseSectorParam,
  parseSectorPickParam,
  parseSeniorityParam,
  parseWorkStyleParam,
  splitCountries,
  hoverDescription
} from './filters';
import { canonicalCountryName } from './countryAliases';
import styles from './page.module.scss';

export type { SerializedJob } from './fetchJobs';

type ClickSource = 'title' | 'company' | 'favicon';

// Pretty-print a role name for the UI. The internal value (used for filter
// matching and URL params) stays as the raw sheet value so data lookups
// still work.
function displayRole(role: string): string {
  if (role.toLowerCase() === 'copywriter') return 'Copywriting';
  return role;
}

const BULLET_SEPARATOR = '  •  ';

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const todayUTC = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );
  const jobUTC = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  );
  const diffDays = Math.round((todayUTC - jobUTC) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1) return `${diffDays} days ago`;
  if (diffDays === -1) return 'Tomorrow';
  return `in ${-diffDays} days`;
}

function buildFaviconUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  const withProto = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
  try {
    const { hostname } = new URL(withProto);
    if (!hostname) return null;
    return `/api/favicon?host=${encodeURIComponent(hostname)}`;
  } catch {
    return null;
  }
}

function formatLocation(job: SerializedJob): string {
  const bits = [job.city, job.country].filter((s) => s.length > 0);
  const place = bits.join(', ');
  if (job.remote && place) return `${place} · ${job.remote}`;
  return place || job.remote;
}

// Country-name → ISO 3166-1 alpha-2 code, used to derive a flag emoji from
// regional indicator letters. Covers every UN-recognised country plus widely
// used aliases (e.g. UK / Britain / England → GB, Türkiye → TR) so any value
// the sheet might add resolves to a flag. Lookup is case-insensitive via
// countryFlag(), so casing variations in the sheet still work.
const COUNTRY_ISO_CODES: Record<string, string> = {
  Afghanistan: 'AF',
  Albania: 'AL',
  Algeria: 'DZ',
  Andorra: 'AD',
  Angola: 'AO',
  'Antigua and Barbuda': 'AG',
  Argentina: 'AR',
  Armenia: 'AM',
  Australia: 'AU',
  Austria: 'AT',
  Azerbaijan: 'AZ',
  Bahamas: 'BS',
  'The Bahamas': 'BS',
  Bahrain: 'BH',
  Bangladesh: 'BD',
  Barbados: 'BB',
  Belarus: 'BY',
  Belgium: 'BE',
  Belize: 'BZ',
  Benin: 'BJ',
  Bhutan: 'BT',
  Bolivia: 'BO',
  'Bosnia and Herzegovina': 'BA',
  Botswana: 'BW',
  Brazil: 'BR',
  Brunei: 'BN',
  'Brunei Darussalam': 'BN',
  Bulgaria: 'BG',
  'Burkina Faso': 'BF',
  Burundi: 'BI',
  'Cabo Verde': 'CV',
  'Cape Verde': 'CV',
  Cambodia: 'KH',
  Cameroon: 'CM',
  Canada: 'CA',
  'Central African Republic': 'CF',
  Chad: 'TD',
  Chile: 'CL',
  China: 'CN',
  Colombia: 'CO',
  Comoros: 'KM',
  Congo: 'CG',
  'Republic of the Congo': 'CG',
  'Democratic Republic of the Congo': 'CD',
  'DR Congo': 'CD',
  DRC: 'CD',
  'Costa Rica': 'CR',
  "Cote d'Ivoire": 'CI',
  "Côte d'Ivoire": 'CI',
  'Ivory Coast': 'CI',
  Croatia: 'HR',
  Cuba: 'CU',
  Cyprus: 'CY',
  Czechia: 'CZ',
  'Czech Republic': 'CZ',
  Denmark: 'DK',
  Djibouti: 'DJ',
  Dominica: 'DM',
  'Dominican Republic': 'DO',
  Ecuador: 'EC',
  Egypt: 'EG',
  'El Salvador': 'SV',
  England: 'GB',
  'Equatorial Guinea': 'GQ',
  Eritrea: 'ER',
  Estonia: 'EE',
  Eswatini: 'SZ',
  Swaziland: 'SZ',
  Ethiopia: 'ET',
  Fiji: 'FJ',
  Finland: 'FI',
  France: 'FR',
  Gabon: 'GA',
  Gambia: 'GM',
  'The Gambia': 'GM',
  Georgia: 'GE',
  Germany: 'DE',
  Ghana: 'GH',
  Greece: 'GR',
  Grenada: 'GD',
  Guatemala: 'GT',
  Guinea: 'GN',
  'Guinea-Bissau': 'GW',
  Guyana: 'GY',
  Haiti: 'HT',
  'Holy See': 'VA',
  'Vatican City': 'VA',
  Honduras: 'HN',
  'Hong Kong': 'HK',
  Hungary: 'HU',
  Iceland: 'IS',
  India: 'IN',
  Indonesia: 'ID',
  Iran: 'IR',
  Iraq: 'IQ',
  Ireland: 'IE',
  Israel: 'IL',
  Italy: 'IT',
  Jamaica: 'JM',
  Japan: 'JP',
  Jordan: 'JO',
  Kazakhstan: 'KZ',
  Kenya: 'KE',
  Kiribati: 'KI',
  Kuwait: 'KW',
  Kyrgyzstan: 'KG',
  Laos: 'LA',
  Latvia: 'LV',
  Lebanon: 'LB',
  Lesotho: 'LS',
  Liberia: 'LR',
  Libya: 'LY',
  Liechtenstein: 'LI',
  Lithuania: 'LT',
  Luxembourg: 'LU',
  Macao: 'MO',
  Macau: 'MO',
  Madagascar: 'MG',
  Malawi: 'MW',
  Malaysia: 'MY',
  Maldives: 'MV',
  Mali: 'ML',
  Malta: 'MT',
  'Marshall Islands': 'MH',
  Mauritania: 'MR',
  Mauritius: 'MU',
  Mexico: 'MX',
  Micronesia: 'FM',
  Moldova: 'MD',
  Monaco: 'MC',
  Mongolia: 'MN',
  Montenegro: 'ME',
  Morocco: 'MA',
  Mozambique: 'MZ',
  Myanmar: 'MM',
  Burma: 'MM',
  Namibia: 'NA',
  Nauru: 'NR',
  Nepal: 'NP',
  Netherlands: 'NL',
  'The Netherlands': 'NL',
  Holland: 'NL',
  'New Zealand': 'NZ',
  Nicaragua: 'NI',
  Niger: 'NE',
  Nigeria: 'NG',
  'North Korea': 'KP',
  'North Macedonia': 'MK',
  Macedonia: 'MK',
  'Northern Ireland': 'GB',
  Norway: 'NO',
  Oman: 'OM',
  Pakistan: 'PK',
  Palau: 'PW',
  Palestine: 'PS',
  'State of Palestine': 'PS',
  Panama: 'PA',
  'Papua New Guinea': 'PG',
  Paraguay: 'PY',
  Peru: 'PE',
  Philippines: 'PH',
  Poland: 'PL',
  Portugal: 'PT',
  'Puerto Rico': 'PR',
  Qatar: 'QA',
  Romania: 'RO',
  Russia: 'RU',
  'Russian Federation': 'RU',
  Rwanda: 'RW',
  'Saint Kitts and Nevis': 'KN',
  'Saint Lucia': 'LC',
  'Saint Vincent and the Grenadines': 'VC',
  Samoa: 'WS',
  'San Marino': 'SM',
  'Sao Tome and Principe': 'ST',
  'São Tomé and Príncipe': 'ST',
  'Saudi Arabia': 'SA',
  Scotland: 'GB',
  Senegal: 'SN',
  Serbia: 'RS',
  Seychelles: 'SC',
  'Sierra Leone': 'SL',
  Singapore: 'SG',
  Slovakia: 'SK',
  Slovenia: 'SI',
  'Solomon Islands': 'SB',
  Somalia: 'SO',
  'South Africa': 'ZA',
  'South Korea': 'KR',
  Korea: 'KR',
  'Republic of Korea': 'KR',
  'South Sudan': 'SS',
  Spain: 'ES',
  'Sri Lanka': 'LK',
  Sudan: 'SD',
  Suriname: 'SR',
  Sweden: 'SE',
  Switzerland: 'CH',
  Syria: 'SY',
  'Syrian Arab Republic': 'SY',
  Taiwan: 'TW',
  Tajikistan: 'TJ',
  Tanzania: 'TZ',
  Thailand: 'TH',
  'Timor-Leste': 'TL',
  'East Timor': 'TL',
  Togo: 'TG',
  Tonga: 'TO',
  'Trinidad and Tobago': 'TT',
  Tunisia: 'TN',
  Turkey: 'TR',
  Türkiye: 'TR',
  Turkmenistan: 'TM',
  Tuvalu: 'TV',
  Uganda: 'UG',
  UAE: 'AE',
  UK: 'GB',
  'Great Britain': 'GB',
  Britain: 'GB',
  Ukraine: 'UA',
  'United Arab Emirates': 'AE',
  'United Kingdom': 'GB',
  'United States': 'US',
  'United States of America': 'US',
  America: 'US',
  USA: 'US',
  US: 'US',
  Uruguay: 'UY',
  Uzbekistan: 'UZ',
  Vanuatu: 'VU',
  Venezuela: 'VE',
  Vietnam: 'VN',
  'Viet Nam': 'VN',
  Wales: 'GB',
  Yemen: 'YE',
  Zambia: 'ZM',
  Zimbabwe: 'ZW'
};

// Case-insensitive index built once at module load, so "germany", "GERMANY",
// and "Germany" all resolve. Whitespace is collapsed so "United  States"
// matches "United States".
const COUNTRY_ISO_INDEX: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_ISO_CODES).map(([name, iso]) => [
    name.toLowerCase().replace(/\s+/g, ' ').trim(),
    iso
  ])
);

// Special-case override for the "All countries" sentinel. Regions
// render with no emoji prefix.
const SPECIAL_COUNTRY_FLAGS: Record<string, string> = {
  all: '🌍'
};

function isoToFlagEmoji(iso: string): string {
  if (iso.length !== 2) return '';
  const REGIONAL_A = 0x1f1e6;
  const c1 = iso.toUpperCase().charCodeAt(0) - 0x41;
  const c2 = iso.toUpperCase().charCodeAt(1) - 0x41;
  if (c1 < 0 || c1 > 25 || c2 < 0 || c2 > 25) return '';
  return String.fromCodePoint(REGIONAL_A + c1, REGIONAL_A + c2);
}

function countryFlag(name: string): string {
  if (SPECIAL_COUNTRY_FLAGS[name]) return SPECIAL_COUNTRY_FLAGS[name];
  const key = name.toLowerCase().replace(/\s+/g, ' ').trim();
  const iso = COUNTRY_ISO_INDEX[key];
  return iso ? isoToFlagEmoji(iso) : '';
}

export default function JobsList({
  jobs,
  filterHeader,
  filterFooter
}: {
  jobs: SerializedJob[];
  // Optional content rendered at the top of the filters column on
  // desktop (and above the filters on mobile). Used by /jobs to pull
  // the page heading and intro into the filters rail.
  filterHeader?: ReactNode;
  // Optional content rendered at the bottom of the filters column,
  // below the RSS link. Desktop-only (hidden on mobile).
  filterFooter?: ReactNode;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const posthog = usePostHog();

  // Fires a GA-style `job_click` event in PostHog with rich job attributes
  // for slicing. No-ops cleanly when PostHog isn't initialised (e.g. env
  // vars missing).
  const trackJobClick = (job: SerializedJob, source: ClickSource) => {
    if (!posthog) return;
    posthog.capture('job_click', {
      job_title: job.title,
      company: job.company,
      sector: job.sector,
      type_of_org: job.typeOfOrg,
      country: job.country,
      city: job.city,
      salary: job.salary,
      remote: job.remote,
      listing_url: job.url,
      click_source: source
    });
  };

  // Mobile-only UI state for the "More filters" toggle. The Work style and
  // Role filters are hidden until this is true. Ignored at desktop — CSS
  // unconditionally shows everything in the column layout.
  const [showMore, setShowMore] = useState(false);

  // Filter state is derived from the URL so it's shareable and bookmarkable.
  // Visiting /jobs?country=Germany&work=remote,hybrid&org=non-profit will
  // restore those filters on load. All filter changes go through
  // updateParams() below, which uses router.replace so each checkbox toggle
  // doesn't push a separate history entry.
  const country = searchParams.get('country') ?? 'all';
  const workStyleFilters = useMemo(
    () => parseWorkStyleParam(searchParams.get('work')),
    [searchParams]
  );
  const orgFilters = useMemo(
    () => parseOrgParam(searchParams.get('org')),
    [searchParams]
  );
  const sectorFilters = useMemo(
    () => parseSectorParam(searchParams.get('sector')),
    [searchParams]
  );
  const sectorPickFilters = useMemo(
    () => parseSectorPickParam(searchParams.get('sectorPick')),
    [searchParams]
  );
  const picksOnly = searchParams.get('pick') === '1';
  const roleFilters = useMemo(
    () => parseRoleParam(searchParams.get('role')),
    [searchParams]
  );
  const seniorityFilters = useMemo(
    () => parseSeniorityParam(searchParams.get('seniority')),
    [searchParams]
  );

  const updateParams = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const setCountry = (value: string) => {
    updateParams((params) => {
      if (value === 'all') params.delete('country');
      else params.set('country', value);
    });
  };

  const countries = useMemo(() => {
    const set = new Set<string>();
    for (const j of jobs) {
      for (const c of splitCountries(j.country)) {
        // "Global" isn't a country — it's a flag on the job meaning
        // location-agnostic. matchesCountry() makes those jobs appear in
        // every filter, so we hide the value from the dropdown itself.
        if (c.toLowerCase() === 'global') continue;
        // Meta-region tags (Europe, Africa, etc.) are already shown in
        // the "Region" optgroup above — hide them from the country
        // list so the dropdown doesn't list them twice. Jobs tagged
        // this way still surface under each member country via
        // matchesCountry().
        if (isMetaRegionName(c)) continue;
        // Canonicalize so alternate spellings ("USA" vs
        // "United States") collapse into one dropdown option.
        set.add(canonicalCountryName(c));
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [jobs]);

  // Distinct role-type values from the data, excluding "Other" and blanks.
  const roles = useMemo(() => {
    const set = new Set<string>();
    for (const j of jobs) {
      const r = j.role.trim();
      if (r && r.toLowerCase() !== 'other') set.add(r);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [jobs]);

  const filtered = useMemo(
    () =>
      filterJobs(jobs, {
        country,
        workStyles: workStyleFilters,
        orgs: orgFilters,
        sectors: sectorFilters,
        sectorPicks: sectorPickFilters,
        roles: roleFilters,
        seniorities: seniorityFilters,
        picksOnly
      }),
    [
      jobs,
      country,
      workStyleFilters,
      orgFilters,
      sectorFilters,
      sectorPickFilters,
      roleFilters,
      seniorityFilters,
      picksOnly
    ]
  );

  const toggleWorkStyle = (value: WorkStyle) => {
    const next = workStyleFilters.includes(value)
      ? workStyleFilters.filter((v) => v !== value)
      : [...workStyleFilters, value];
    updateParams((params) => {
      if (next.length === 0) params.delete('work');
      else params.set('work', next.join(','));
    });
  };

  const toggleOrgFilter = (value: OrgCategory) => {
    const next = orgFilters.includes(value)
      ? orgFilters.filter((v) => v !== value)
      : [...orgFilters, value];
    updateParams((params) => {
      if (next.length === 0) params.delete('org');
      else params.set('org', next.join(','));
    });
  };

  const toggleSectorFilter = (value: SectorCategory) => {
    const next = sectorFilters.includes(value)
      ? sectorFilters.filter((v) => v !== value)
      : [...sectorFilters, value];
    updateParams((params) => {
      if (next.length === 0) params.delete('sector');
      else params.set('sector', next.join(','));
    });
  };

  // Toggles the Our Pick filter — driven by clicking the
  // "Our Pick" pill on a job card. Only the `pick` URL param
  // changes; every other filter is preserved.
  const togglePicksOnly = () => {
    updateParams((params) => {
      if (picksOnly) params.delete('pick');
      else params.set('pick', '1');
    });
  };

  // Toggles a "specific sector pick" filter — driven by clicking a
  // sector tag on a job card. Comparison happens against the raw sector
  // string in matchesSectorPick(); other filters are preserved.
  const toggleSectorPick = (pick: string) => {
    const key = pick.trim().toLowerCase();
    if (!key) return;
    const next = sectorPickFilters.includes(key)
      ? sectorPickFilters.filter((v) => v !== key)
      : [...sectorPickFilters, key];
    updateParams((params) => {
      if (next.length === 0) params.delete('sectorPick');
      else params.set('sectorPick', next.join(','));
    });
  };

  const toggleRoleFilter = (value: string) => {
    const next = roleFilters.includes(value)
      ? roleFilters.filter((v) => v !== value)
      : [...roleFilters, value];
    updateParams((params) => {
      if (next.length === 0) params.delete('role');
      else params.set('role', next.join(','));
    });
  };

  const toggleSeniorityFilter = (value: SeniorityCategory) => {
    const next = seniorityFilters.includes(value)
      ? seniorityFilters.filter((v) => v !== value)
      : [...seniorityFilters, value];
    updateParams((params) => {
      if (next.length === 0) params.delete('seniority');
      else params.set('seniority', next.join(','));
    });
  };

  const clearFilters = () => {
    updateParams((params) => {
      params.delete('country');
      params.delete('work');
      params.delete('org');
      params.delete('sector');
      params.delete('role');
      params.delete('seniority');
      params.delete('sectorPick');
      params.delete('pick');
    });
  };

  const hasActiveFilters =
    country !== 'all' ||
    workStyleFilters.length > 0 ||
    orgFilters.length > 0 ||
    sectorFilters.length > 0 ||
    sectorPickFilters.length > 0 ||
    roleFilters.length > 0 ||
    seniorityFilters.length > 0 ||
    picksOnly;

  // Compact "filter chip" list shown under the job count. Each chip
  // describes one applied filter and removes it on click.
  type ActiveChip = { key: string; label: string; remove: () => void };
  const activeChips: ActiveChip[] = [];
  if (country !== 'all') {
    activeChips.push({
      key: `country:${country}`,
      label: country,
      remove: () => setCountry('all')
    });
  }
  orgFilters.forEach((cat) => {
    const opt = ORG_TYPE_OPTIONS.find((o) => o.value === cat);
    if (opt)
      activeChips.push({
        key: `org:${cat}`,
        label: opt.label,
        remove: () => toggleOrgFilter(cat)
      });
  });
  sectorFilters.forEach((cat) => {
    const opt = SECTOR_OPTIONS.find((o) => o.value === cat);
    if (opt)
      activeChips.push({
        key: `sector:${cat}`,
        label: opt.label,
        remove: () => toggleSectorFilter(cat)
      });
  });
  sectorPickFilters.forEach((pick) => {
    activeChips.push({
      key: `pick:${pick}`,
      label: pick,
      remove: () => toggleSectorPick(pick)
    });
  });
  roleFilters.forEach((role) => {
    activeChips.push({
      key: `role:${role}`,
      label: displayRole(role),
      remove: () => toggleRoleFilter(role)
    });
  });
  seniorityFilters.forEach((cat) => {
    const opt = SENIORITY_OPTIONS.find((o) => o.value === cat);
    if (opt)
      activeChips.push({
        key: `sen:${cat}`,
        label: opt.label,
        remove: () => toggleSeniorityFilter(cat)
      });
  });
  workStyleFilters.forEach((style) => {
    const opt = WORK_STYLE_OPTIONS.find((o) => o.value === style);
    if (opt)
      activeChips.push({
        key: `work:${style}`,
        label: opt.label,
        remove: () => toggleWorkStyle(style)
      });
  });
  if (picksOnly) {
    activeChips.push({
      key: 'picksOnly',
      label: 'Our Pick',
      remove: togglePicksOnly
    });
  }

  // RSS feed URL mirrors the current filter state so subscribing while
  // looking at e.g. "Climate + Remote" lands you on the equivalent feed.
  // Only forward known filter keys (FILTER_PARAM_KEYS) — arbitrary params
  // would otherwise leak into the feed URL.
  const feedHref = useMemo(() => {
    const out = new URLSearchParams();
    for (const key of FILTER_PARAM_KEYS) {
      const value = searchParams.get(key);
      if (value) out.set(key, value);
    }
    const qs = out.toString();
    return qs ? `/jobs/feed.xml?${qs}` : '/jobs/feed.xml';
  }, [searchParams]);

  return (
    <div className={styles.layout}>
      <div className={styles.filters}>
        {filterHeader && (
          <div className={styles.filterHeader}>{filterHeader}</div>
        )}
        <label className={styles.filterField}>
          <span className={`${styles.filterLabel} small-header`}>Country</span>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">
              {countryFlag('all')}
              {'  '}All countries
            </option>
            <optgroup label="Region">
              {META_REGIONS.map((r) => {
                const flag = countryFlag(r.name);
                return (
                  <option key={r.name} value={r.name}>
                    {flag ? `${flag}  ${r.name}` : r.name}
                  </option>
                );
              })}
            </optgroup>
            <optgroup label="Countries">
              {countries.map((c) => {
                const flag = countryFlag(c);
                return (
                  <option key={c} value={c}>
                    {flag ? `${flag}  ${c}` : c}
                  </option>
                );
              })}
            </optgroup>
          </select>
        </label>

        <button
          type="button"
          className={styles.moreFiltersToggle}
          aria-expanded={showMore}
          onClick={() => setShowMore((v) => !v)}
        >
          {showMore ? 'Fewer filters' : 'More filters…'}
        </button>

        <div
          className={`${styles.moreFilters} ${
            showMore ? styles.moreFiltersOpen : ''
          }`}
        >
          <div className={styles.filterField}>
            <span className={`${styles.filterLabel} small-header`}>Our Pick</span>
            <div className={styles.checkboxes}>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={picksOnly}
                  onChange={togglePicksOnly}
                />
                <span className={styles.checkboxBox} aria-hidden="true" />
                &lsquo;Our pick&rsquo;
              </label>
            </div>
          </div>

          {roles.length > 0 && (
            <div className={styles.filterField}>
              <span className={`${styles.filterLabel} small-header`}>Role</span>
              <div className={styles.checkboxes}>
                {roles.map((role) => (
                  <label key={role} className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={roleFilters.includes(role)}
                      onChange={() => toggleRoleFilter(role)}
                    />
                    <span className={styles.checkboxBox} aria-hidden="true" />
                    {displayRole(role)}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className={styles.filterField}>
            <span className={`${styles.filterLabel} small-header`}>Seniority</span>
            <div className={styles.checkboxes}>
              {SENIORITY_OPTIONS.map((opt) => (
                <label key={opt.value} className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={seniorityFilters.includes(opt.value)}
                    onChange={() => toggleSeniorityFilter(opt.value)}
                  />
                  <span className={styles.checkboxBox} aria-hidden="true" />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div className={styles.filterField}>
            <span className={`${styles.filterLabel} small-header`}>Sector</span>
            <div className={styles.checkboxes}>
              {SECTOR_OPTIONS.map((opt) => (
                <label key={opt.value} className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={sectorFilters.includes(opt.value)}
                    onChange={() => toggleSectorFilter(opt.value)}
                  />
                  <span className={styles.checkboxBox} aria-hidden="true" />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div className={styles.filterField}>
            <span className={`${styles.filterLabel} small-header`}>Org type</span>
            <div className={styles.checkboxes}>
              {ORG_TYPE_OPTIONS.map((opt) => (
                <label key={opt.value} className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={orgFilters.includes(opt.value)}
                    onChange={() => toggleOrgFilter(opt.value)}
                  />
                  <span className={styles.checkboxBox} aria-hidden="true" />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div className={styles.filterField}>
            <span className={`${styles.filterLabel} small-header`}>Work style</span>
            <div className={styles.checkboxes}>
              {WORK_STYLE_OPTIONS.map((opt) => (
                <label key={opt.value} className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={workStyleFilters.includes(opt.value)}
                    onChange={() => toggleWorkStyle(opt.value)}
                  />
                  <span className={styles.checkboxBox} aria-hidden="true" />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <a
          href={feedHref}
          className={styles.rssLink}
          aria-label={
            hasActiveFilters
              ? 'Subscribe to RSS feed for these filters'
              : 'Subscribe to RSS feed'
          }
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
            className={styles.rssIcon}
          >
            <path d="M6.18 17.82a2.18 2.18 0 1 1-4.36 0 2.18 2.18 0 0 1 4.36 0zM4 4.44v3.04A12.52 12.52 0 0 1 16.52 20h3.04A15.56 15.56 0 0 0 4 4.44zM4 10.36v3.05A6.6 6.6 0 0 1 10.59 20h3.05A9.64 9.64 0 0 0 4 10.36z" />
          </svg>
          RSS feed{hasActiveFilters ? ' for these filters' : ''}
        </a>

        {filterFooter && (
          <div className={styles.filterFooter}>{filterFooter}</div>
        )}
      </div>

      <div className={styles.results}>
        <div className={`${styles.filterCount} small-header`}>
          {filtered.length} {filtered.length === 1 ? 'job' : 'jobs'}
        </div>
        {activeChips.length > 0 && (
          <div className={styles.activeFilters}>
            {activeChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.remove}
                className={`tag ${styles.activeFilterChip}`}
                aria-label={`Remove filter ${chip.label}`}
              >
                {chip.label}
                <span aria-hidden="true" className={styles.activeFilterChipX}>
                  ×
                </span>
              </button>
            ))}
          </div>
        )}
        {filtered.length === 0 && (
          <div className={styles.noResults}>
            <svg
              className={styles.noResultsIcon}
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.5" y2="16.5" />
            </svg>
            <h3 className={styles.noResultsTitle}>No jobs found</h3>
            <p className={styles.noResultsText}>
              No jobs match your current filters. Try removing a filter or
              widening your search.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                className={styles.noResultsButton}
                onClick={clearFilters}
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        <div className={styles.jobActionRow}>
          <JobAlertsForm />
          <JobSubmitForm />
        </div>
        <ul className={styles.jobs}>
          {filtered.map((job, i) => {
            const date = job.date ? new Date(job.date) : null;
            const location = formatLocation(job);
            const hasSalary = job.salary && job.salary.toLowerCase() !== 'n/a';

            const faviconUrl = buildFaviconUrl(job.companyUrl);
            // `job.companyUrl` is pre-sanitized by fetchJobs — it's
            // either a valid `https://…` URL or an empty string. No
            // protocol-prefixing needed here.
            const companyHref = job.companyUrl || null;
            const typeLabel = orgTypeDisplay(job.typeOfOrg);
            const goodForWorldScore = parseFloat(job.goodForWorld);
            const isStaffPick =
              !Number.isNaN(goodForWorldScore) && goodForWorldScore > 8;
            const metaItems: ReactNode[] = [];
            if (job.company) {
              metaItems.push(
                companyHref ? (
                  <Link
                    href={companyHref}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.jobCompany}
                    onClick={() => trackJobClick(job, 'company')}
                  >
                    {job.company}
                  </Link>
                ) : (
                  <span className={styles.jobCompany}>{job.company}</span>
                )
              );
            }
            if (location) {
              metaItems.push(
                <span className={styles.jobLocation}>{location}</span>
              );
            }
            if (hasSalary) {
              metaItems.push(
                <span className={styles.jobSalary}>{job.salary}</span>
              );
            }

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
                  companyHref
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

            return (
              <li key={`${job.url}-${i}`} className={styles.job}>
                {companyHref ? (
                  <Link
                    href={companyHref}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={
                      job.company ? `Visit ${job.company}` : 'Visit company'
                    }
                    className={styles.jobIcon}
                    onClick={() => trackJobClick(job, 'favicon')}
                  >
                    {iconContents}
                  </Link>
                ) : (
                  <div className={styles.jobIcon}>{iconContents}</div>
                )}
                <div className={styles.jobMain}>
                  <h4 className={styles.jobTitle}>
                    {job.url ? (
                      <Link
                        href={job.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => trackJobClick(job, 'title')}
                      >
                        {job.title}
                      </Link>
                    ) : (
                      job.title
                    )}
                  </h4>
                  <div className={styles.jobMeta}>
                    {metaItems.map((item, idx) => (
                      <Fragment key={idx}>
                        {idx > 0 && (
                          <span className={styles.jobBullet}>
                            {BULLET_SEPARATOR}
                          </span>
                        )}
                        {item}
                      </Fragment>
                    ))}
                  </div>
                  {(job.sector || typeLabel || isStaffPick) && (
                    <div className={styles.jobSectorRow}>
                      {job.sector &&
                        (() => {
                          const displayed = displaySector(job.sector);
                          const SectorIcon = getSectorIcon(displayed);
                          const isActive = sectorPickFilters.includes(
                            displayed.toLowerCase()
                          );
                          return (
                            <button
                              type="button"
                              onClick={() => {
                                if (!isActive) toggleSectorPick(displayed);
                              }}
                              className={`tag ${styles.jobSector} ${styles.jobTagButton} ${
                                isActive ? styles.jobTagButtonActive : ''
                              }`}
                              aria-pressed={isActive}
                              aria-label={`Filter by sector ${displayed}`}
                            >
                              {SectorIcon && (
                                <SectorIcon
                                  className={styles.jobSectorIcon}
                                  aria-hidden="true"
                                />
                              )}
                              {displayed}
                            </button>
                          );
                        })()}
                      {typeLabel &&
                        (() => {
                          const cat = orgCategory(job.typeOfOrg);
                          if (!cat) {
                            return (
                              <span className={`tag ${styles.jobType}`}>
                                {typeLabel}
                              </span>
                            );
                          }
                          const isActive = orgFilters.includes(cat);
                          return (
                            <button
                              type="button"
                              onClick={() => {
                                if (!isActive) toggleOrgFilter(cat);
                              }}
                              className={`tag ${styles.jobType} ${styles.jobTagButton} ${
                                isActive ? styles.jobTagButtonActive : ''
                              }`}
                              aria-pressed={isActive}
                              aria-label={`Filter by org type ${typeLabel}`}
                            >
                              {typeLabel}
                            </button>
                          );
                        })()}
                      {isStaffPick && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!picksOnly) togglePicksOnly();
                          }}
                          className={`tag ${styles.jobStaffPick} ${styles.jobTagButton} ${
                            picksOnly ? styles.jobTagButtonActive : ''
                          }`}
                          aria-pressed={picksOnly}
                          aria-label="Filter to Our Picks only"
                        >
                          <Gem
                            className={styles.jobStaffPickStar}
                            aria-hidden="true"
                          />
                          Our Pick
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {(hoverDescription(job) || isStaffPick) && (
                  <div className={styles.jobDescription} role="tooltip">
                    {hoverDescription(job) && (
                      <>
                        {job.company && (
                          <>
                            <strong className={styles.jobDescriptionCompany}>
                              {job.company}
                            </strong>
                            <br />
                          </>
                        )}
                        {hoverDescription(job)}
                      </>
                    )}
                    {isStaffPick && (
                      <div className={styles.jobDescriptionPick}>
                        <strong className={styles.jobDescriptionPickHeading}>
                          <Gem
                            className={styles.jobDescriptionPickIcon}
                            aria-hidden="true"
                          />
                          Our Pick
                        </strong>
                        <p>
                          We hand-select great jobs at orgs whose primary
                          mission is to make the world better.
                        </p>
                      </div>
                    )}
                  </div>
                )}
                <div className={styles.jobAside}>
                  {date &&
                    (() => {
                      const relativeLabel = formatRelativeDate(date);
                      const isNewToday = relativeLabel === 'Today';
                      return (
                        <small
                          className={`${styles.jobDate} ${
                            isNewToday ? styles.jobDateToday : ''
                          }`}
                        >
                          {isNewToday && (
                            <Sparkle
                              className={styles.jobDateIcon}
                              aria-hidden="true"
                            />
                          )}
                          {relativeLabel}
                        </small>
                      );
                    })()}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

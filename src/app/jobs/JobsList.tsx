'use client';

import { Fragment, ReactNode, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { usePostHog } from 'posthog-js/react';
import { Gem } from 'lucide-react';
import { getSectorIcon } from './sectorIcons';
import { countryFlag } from '../../lib/countries';
import type { ListedJob } from './fetchJobs';
import JobRow from './JobRow';
import JobTooltip from './JobTooltip';
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

export type { ListedJob } from './fetchJobs';

type ClickSource = 'title' | 'company' | 'favicon';

// Pretty-print a role name for the UI. The internal value (used for filter
// matching and URL params) stays as the raw sheet value so data lookups
// still work.
function displayRole(role: string): string {
  if (role.toLowerCase() === 'copywriter') return 'Copywriting';
  return role;
}



function formatLocation(job: ListedJob): string {
  const bits = [job.city, job.country].filter((s) => s.length > 0);
  const place = bits.join(', ');
  if (job.remote && place) return `${place} · ${job.remote}`;
  return place || job.remote;
}

export default function JobsList({
  jobs,
  filterHeader,
  filterFooter
}: {
  jobs: ListedJob[];
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
  const trackJobClick = (job: ListedJob, source: ClickSource) => {
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
            const hasSalary = job.salary && job.salary.toLowerCase() !== 'n/a';
            const typeLabel = orgTypeDisplay(job.typeOfOrg);
            const hoverText = hoverDescription(job);
            const goodForWorldScore = parseFloat(job.goodForWorld);
            const isStaffPick =
              !Number.isNaN(goodForWorldScore) && goodForWorldScore > 8;
            const displayed = job.sector ? displaySector(job.sector) : '';
            const SectorIcon = displayed ? getSectorIcon(displayed) : null;
            const orgCat = orgCategory(job.typeOfOrg);

            // The board's chips are the one interactive set: each toggles
            // a filter on this page rather than navigating. The other
            // surfaces render links or inert spans instead, which is why
            // chips are passed in rather than built inside JobRow.
            const sectorActive = sectorPickFilters.includes(
              displayed.toLowerCase()
            );
            const orgActive = orgCat ? orgFilters.includes(orgCat) : false;

            const chips =
              displayed || typeLabel || isStaffPick ? (
                <>
                  {displayed && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!sectorActive) toggleSectorPick(displayed);
                      }}
                      className={`tag ${styles.jobSector} ${styles.jobTagButton} ${
                        sectorActive ? styles.jobTagButtonActive : ''
                      }`}
                      aria-pressed={sectorActive}
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
                  )}
                  {typeLabel &&
                    (orgCat ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (!orgActive) toggleOrgFilter(orgCat);
                        }}
                        className={`tag ${styles.jobType} ${styles.jobTagButton} ${
                          orgActive ? styles.jobTagButtonActive : ''
                        }`}
                        aria-pressed={orgActive}
                        aria-label={`Filter by org type ${typeLabel}`}
                      >
                        {typeLabel}
                      </button>
                    ) : (
                      <span className={`tag ${styles.jobType}`}>
                        {typeLabel}
                      </span>
                    ))}
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
                </>
              ) : null;

            return (
              <JobRow
                key={`${job.url}-${i}`}
                job={job}
                location={formatLocation(job)}
                salary={hasSalary ? job.salary : null}
                chips={chips}
                // The title goes to the job's own page on this site; the
                // employer's listing is reached from the apply link below
                // and from the tooltip's button. Jobs with no slug (none
                // in practice) keep the outbound title as a fallback.
                titleHref={job.slug ? `/jobs/role/${job.slug}` : job.url}
                titleIsExternal={!job.slug}
                afterMain={
                  hoverText || isStaffPick ? (
                    <JobTooltip
                      company={job.company}
                      text={hoverText}
                      applyHref={job.url}
                      isStaffPick={isStaffPick}
                    />
                  ) : null
                }
                // Only ever seen on mobile — at desktop the tooltip's
                // button goes to the same place and `.board
                // .jobDetailsLink` hides this one.
                applyHref={job.url}
                onLinkClick={(target: ClickSource) => trackJobClick(job, target)}
              />
            );
          })}
        </ul>
      </div>
    </div>
  );
}

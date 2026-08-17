// Country alias groups. The Google Sheet doesn't standardize country
// spelling — a job can be posted as "USA", "United States", "US", or
// "United States of America" and mean the same place. Without alias
// support, each spelling only matches its own filter option and each
// produces its own dropdown entry / SEO location page.
//
// Each inner array is an equivalence class of interchangeable country
// names. Selecting any of them in the filter matches jobs listed under
// any of the others. The FIRST entry in a group is the canonical name
// — the one that appears in the dropdown and the /jobs/[location]
// URL slug.
//
// Add entries as you notice more spellings appearing in the sheet.
// Aliases only make sense when the names truly refer to the same
// place — don't group political variants that carry semantic weight
// (e.g. "Congo" is ambiguous between DRC and Republic of Congo, so
// neither gets a bare-word alias).

export const COUNTRY_ALIASES: readonly (readonly string[])[] = [
  ['USA', 'US', 'U.S.', 'U.S.A.', 'United States', 'United States of America'],
  ['UK', 'United Kingdom', 'Great Britain', 'Britain'],
  ['UAE', 'United Arab Emirates'],
  ['South Korea', 'Korea', 'Republic of Korea', 'ROK'],
  ['North Korea', "Democratic People's Republic of Korea", 'DPRK'],
  ['Czech Republic', 'Czechia'],
  ["Côte d'Ivoire", "Cote d'Ivoire", 'Ivory Coast'],
  ['Democratic Republic of the Congo', 'DRC', 'DR Congo', 'Congo-Kinshasa'],
  ['Republic of the Congo', 'Congo-Brazzaville'],
  ['Myanmar', 'Burma'],
  ['Cape Verde', 'Cabo Verde'],
  ['Timor-Leste', 'East Timor'],
  ['Vietnam', 'Viet Nam'],
  ['Russia', 'Russian Federation'],
  ['Iran', 'Islamic Republic of Iran'],
  ['Syria', 'Syrian Arab Republic'],
  ['Tanzania', 'United Republic of Tanzania'],
  ['Moldova', 'Republic of Moldova'],
  ['Bolivia', 'Plurinational State of Bolivia'],
  ['Venezuela', 'Bolivarian Republic of Venezuela'],
  ['Taiwan', 'Chinese Taipei', 'Republic of China']
];

// Fast-path lookup: lower-cased alias → its group. Built once at
// module load so `aliasesFor` doesn't scan the whole table on every
// call (relevant during filter rebuilds over hundreds of jobs).
const GROUP_BY_LOWER: Map<string, readonly string[]> = (() => {
  const map = new Map<string, readonly string[]>();
  for (const group of COUNTRY_ALIASES) {
    for (const alias of group) {
      map.set(alias.trim().toLowerCase(), group);
    }
  }
  return map;
})();

// Return the alias group for a given country name (including the name
// itself). If no group contains it, returns a single-element array with
// just the name — so callers can treat every name as "has ≥1 alias".
export function aliasesFor(name: string): readonly string[] {
  const group = GROUP_BY_LOWER.get(name.trim().toLowerCase());
  return group ?? [name];
}

// Canonical form of a country name — the first alias in its group, or
// the name itself if it isn't in any group. Used to dedupe the country
// dropdown and the SEO location URL slugs so a single country never
// appears twice under different spellings.
export function canonicalCountryName(name: string): string {
  const group = GROUP_BY_LOWER.get(name.trim().toLowerCase());
  return group ? group[0] : name;
}

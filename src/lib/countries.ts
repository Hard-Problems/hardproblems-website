// Country names, their ISO 3166-1 alpha-2 codes, and the flag emoji
// derived from them.
//
// Extracted from JobsList.tsx, which built this table for the job
// board's country filter. The annual survey asks "Where are you in the
// world?" and needs the same list — inventing a second one would mean
// two lists drifting apart, and would make a survey answer impossible
// to line up against a job's country.
//
// Covers every UN-recognised country plus widely used aliases (UK /
// Britain / England → GB, Türkiye → TR), so any value the jobs sheet
// might contain resolves to a flag. Lookup is case-insensitive.

// Country-name → ISO 3166-1 alpha-2 code, used to derive a flag emoji from
// regional indicator letters. Covers every UN-recognised country plus widely
// used aliases (e.g. UK / Britain / England → GB, Türkiye → TR) so any value
// the sheet might add resolves to a flag. Lookup is case-insensitive via
// countryFlag(), so casing variations in the sheet still work.
export const COUNTRY_ISO_CODES: Record<string, string> = {
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

export function countryFlag(name: string): string {
  if (SPECIAL_COUNTRY_FLAGS[name]) return SPECIAL_COUNTRY_FLAGS[name];
  const key = name.toLowerCase().replace(/\s+/g, ' ').trim();
  const iso = COUNTRY_ISO_INDEX[key];
  return iso ? isoToFlagEmoji(iso) : '';
}

// The canonical name to show when several map to one ISO code.
//
// 25 codes have aliases, because the jobs sheet might say any of them.
// Picking the first listed name gets the right answer for most
// (Bahamas, Czechia, Netherlands, Vietnam…) because the table happens to
// list the common form first — but it is alphabetical, not canonical, so
// GB resolves to "England" and AE to "UAE". These are the cases where
// that heuristic is wrong or where the accented spelling is the correct
// one.
const CANONICAL_COUNTRY_NAMES: Record<string, string> = {
  GB: 'United Kingdom',
  AE: 'United Arab Emirates',
  CI: "Côte d'Ivoire",
  ST: 'São Tomé and Príncipe'
};

// Every country, once each, alphabetical — the list behind the survey's
// "Where are you in the world?" dropdown and the allowlist its answers
// are validated against.
//
// Note this offers "United Kingdom" rather than England / Scotland /
// Wales / Northern Ireland separately. Those are aliases onto GB in the
// table above and all still resolve for the jobs board; a picker just
// has to offer each country exactly once.
export const COUNTRY_NAMES: readonly string[] = (() => {
  const chosen = new Map<string, string>();
  for (const [name, iso] of Object.entries(COUNTRY_ISO_CODES)) {
    if (!chosen.has(iso)) chosen.set(iso, name);
  }
  for (const [iso, name] of Object.entries(CANONICAL_COUNTRY_NAMES)) {
    if (chosen.has(iso)) chosen.set(iso, name);
  }
  const names = [...chosen.values()].sort((a, b) => a.localeCompare(b));
  // Every chosen name must still be a key of the table above, or it
  // loses its flag and — more importantly — the survey would offer a
  // country whose answer its own validator rejects. An override with a
  // curly apostrophe instead of a straight one did exactly that once.
  for (const name of names) {
    if (!(name in COUNTRY_ISO_CODES)) {
      throw new Error(`Country "${name}" is not a key of COUNTRY_ISO_CODES`);
    }
  }
  return names;
})();

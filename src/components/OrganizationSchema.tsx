import { SITE_URL } from '../lib/siteUrl';

// schema.org Organization for Hard Problems itself — the one thing the
// site never said in machine-readable form. Every other JSON-LD block
// here describes something the site *holds* (an Article, a Person, a
// JobPosting); none of them said who is publishing it, so a crawler
// could read 580 job postings without ever learning what Hard Problems
// is or that the same organization published all of them.
//
// `@id` is the point of this block as much as the fields are: it gives
// the organization one stable name that other markup can point at,
// rather than repeating `{ name: 'Hard Problems' }` as a fresh,
// unconnected node each time (which is what `worksFor` on the author
// pages and `publisher` on the article pages do today — both could be
// collapsed to `{ "@id": "<SITE_URL>/#org" }` once this exists).
//
// Every value here is also stated in the footer, which renders on the
// page this block sits on: the address, the email, the LinkedIn and
// Bluesky links, the Companies House registration. That is deliberate —
// structured data that a reader cannot verify on the page is the thing
// hideandseek.bot's "structured data says what the page says" check
// fails you for. For the same reason there is no `description`: the
// home page has no prose description of the organization for one to
// agree with, and the meta description is not visible to a reader.
const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}/#org`,
  name: 'Hard Problems',
  url: `${SITE_URL}/`,
  email: 'contact@hardproblems.com',
  foundingDate: '2024',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '1 Rivington Place',
    addressLocality: 'London',
    postalCode: 'EC2A 3BA',
    addressCountry: 'GB'
  },
  // Wikidata first, because it is the entity hub the others hang off:
  // answer engines resolve a name to a Q-item and then trust what that
  // item links to, so pointing at Q142202758 — which points back at
  // https://www.hardproblems.com/ via P856 — closes the loop in both
  // directions. The UK register entry is the strongest of the rest: an
  // authoritative third party naming the same organization, which is
  // what `sameAs` is for. LinkedIn and Bluesky are the two profiles the
  // footer links. The GitHub org is deliberately left out — it is not
  // linked from the site, and whether those repositories stay public is
  // still an open question.
  sameAs: [
    'https://www.wikidata.org/wiki/Q142202758',
    'https://www.linkedin.com/company/hardproblems/',
    'https://bsky.app/profile/hardproblems.com',
    'https://find-and-update.company-information.service.gov.uk/company/16028166'
  ],
  identifier: {
    '@type': 'PropertyValue',
    name: 'Companies House company number',
    value: '16028166'
  }
};

export default function OrganizationSchema() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
    />
  );
}

// Central profile registry for every contributor whose byline can
// appear on an article. Adding a new author means: add an entry here,
// drop their photo at /public/images/team/<slug>.jpg (or .png), and
// the byline + author page + sitemap pick them up automatically.
//
// Bios are used on the /authors/<slug> profile page and, via Person
// JSON-LD, feed Google's E-E-A-T signals for the articles they wrote.
// Multi-paragraph bios use `\n\n` as the paragraph separator.

export type AuthorLink = { label: string; url: string };

export type Author = {
  slug: string;              // URL slug: /authors/<slug>
  name: string;              // display name; matches article `author` frontmatter
  bio: string;               // multi-paragraph bio (paragraphs split on \n\n)
  links?: AuthorLink[];      // labeled off-site links (Website, LinkedIn, Bluesky, …)
  // Phrase → URL mapping. Any exact-case occurrence of a key inside
  // the bio prose gets wrapped in an anchor pointing at the value.
  // Complements the automatic hostname linkifier on the profile
  // page — use this for named things ("Google Ventures", "Sprint")
  // that aren't URLs themselves.
  phraseLinks?: Record<string, string>;
};

// Order here is stable — used if we ever render a list of contributors.
export const AUTHORS: Author[] = [
  {
    slug: 'daniel-burka',
    name: 'Daniel Burka',
    bio: `Daniel Burka is a product manager and designer who focuses on solving complex global health problems in simple ways. He is the co-founder of Hard Problems — a not-for-profit that helps technologists to apply their skills to real problems like climate change and public health.

Daniel is also the founder of the open source project, Simple (simple.org). Simple is used by thousands of hospitals in India, Bangladesh, Sri Lanka, and Ethiopia to manage over 6 million patients with hypertension and diabetes.

In 2021, Daniel founded the open source project Healthicons.org to provide free icons to healthcare projects around the world.

Previously, Daniel worked in Silicon Valley. He was a design partner at Google Ventures for 5 years and helped write the book Sprint. He was early at several startups including Digg, Pownce, Milk (sold to Google), and Tiny Speck (became Slack). He co-founded the Canadian design agency silverorange, which is now over 25 years old.`,
    links: [
      { label: 'Website', url: 'https://danielburka.com' },
      { label: 'LinkedIn', url: 'https://www.linkedin.com/in/dburka/' },
      { label: 'Bluesky', url: 'https://bsky.app/profile/dburka.bsky.social' }
    ],
    phraseLinks: {
      'Google Ventures': 'https://gv.com',
      Sprint: 'https://www.gv.com/sprint/',
      Slack: 'https://slack.com',
      silverorange: 'https://silverorange.com',
      Digg: 'https://digg.com'
    }
  },
  {
    slug: 'elyce-cole',
    name: 'Elyce Cole',
    bio: `Elyce is co-founder of Hard Problems. She is an organisational psychologist and social researcher who supports multidisciplinary teams working on complex challenges in public health, technology, and health and social care.

Previously, Elyce worked as a senior researcher-consultant designing and evaluating large-scale organisational change programmes. This included leading the largest global study on neurodiversity in the tech industry from a social model perspective; supporting regional and national boards—bringing together healthcare, social care, public health, and grassroots organisations—to develop more integrated, place-based systems to address gambling-related harms; and supporting the scaling of an innovative community health service pilot for people living with chronic pain in South London.

Earlier in her career, she worked in leadership development and organisational culture change for Fortune 500 healthcare, biopharmaceutical, technology, and finance companies.

Her work is driven by a commitment to understanding how organisational design and power dynamics shape—and often undermine—the creation of more effective, equitable, and humane organisations.`,
    links: [
      { label: 'Website', url: 'https://elycecole.com/' },
      {
        label: 'LinkedIn',
        url: 'https://www.linkedin.com/in/elyce-cole-1380903a/'
      }
    ]
  },
  {
    slug: 'mahima-chandak',
    name: 'Mahima Chandak',
    bio: `Mahima is the co-founder of Hard Problems. She has spent her career working on large scale healthcare challenges, and through Hard Problems, is creating space for other designers & technologists to take on complex public interest work.

She also leads the effort for an oral cancer screening program at ARTPARK, Indian Institute of Science, which enables frontline healthcare workers in early detection and treatment of oral cancer.

Previously, Mahima worked on Simple.org, a hypertension and diabetes management system adopted by governments in India, Sri Lanka, Bangladesh, and Ethiopia. She was also a design partner to founders at Loop Health, where she helped discover and launch a preventive healthcare service.

Her work is driven by a strong commitment to advancing more equitable health outcomes through thoughtful, practical technology and design.`,
    links: [
      { label: 'Website', url: 'https://www.mahimachandak.com/' },
      {
        label: 'LinkedIn',
        url: 'https://www.linkedin.com/in/mahima-chandak/'
      }
    ],
    phraseLinks: {
      'Loop Health': 'https://www.loophealth.com/',
      ARTPARK: 'https://www.artpark.in/'
    }
  },
  {
    slug: 'kane-lincoln',
    name: 'Kane Lincoln',
    bio: `Over a seven-year period, I worked for a range of start- and scale-ups operating at the intersection of technology and social good. As the first or second hire at each organisation, I learned how to code, lead teams, and deal with complexity.

Two of the start-ups I joined eventually died, but one was acquired for an eight-figure sum by a SoftBank-backed unicorn (valued at $3.5bn). In 2023, I co-founded a business that used complex technology to connect global talent with high-growth opportunities in the UK.

I also participated in flagship company-building programmes managed by Entrepreneurs First (c. 1.5% acceptance rate) in 2023 and Antler in 2026 (c. 3% acceptance rate).`,
    links: [
      {
        label: 'LinkedIn',
        url: 'https://www.linkedin.com/in/kanelincoln/'
      }
    ]
  },
  {
    slug: 'tony-joy',
    name: 'Tony Joy',
    bio: `Tony is a senior product designer at Resolve to Save Lives. He likes trying food he can’t pronounce, traveling to unheard-of places, reading old books, and seeing good design.`,
    links: [
      {
        label: 'LinkedIn',
        url: 'https://www.linkedin.com/in/tony-joy/'
      }
    ],
    phraseLinks: {
      'Resolve to Save Lives': 'https://rtsl.org'
    }
  }
];

// Fast lookups. Both share the same underlying array — one indexed by
// slug (used by /authors/[slug] page + sitemap), one by name (used
// by ArticleByline which only has the frontmatter `author` string).
const BY_SLUG = new Map(AUTHORS.map((a) => [a.slug, a]));
const BY_NAME = new Map(AUTHORS.map((a) => [a.name, a]));

export function getAuthorBySlug(slug: string): Author | null {
  return BY_SLUG.get(slug) ?? null;
}

export function getAuthorByName(name: string | undefined | null): Author | null {
  if (!name) return null;
  return BY_NAME.get(name.trim()) ?? null;
}

// URL for the internal author profile page.
export function authorInternalUrl(slug: string): string {
  return `/authors/${slug}`;
}

// All off-site URLs for a profile, used as the schema.org `sameAs`
// array on the author's Person JSON-LD and on any article they wrote.
export function authorSameAs(author: Author): string[] {
  return author.links?.map((l) => l.url) ?? [];
}

// Legacy helper — some callers still expect a raw off-site URL from
// the frontmatter name. Kept so existing imports don't break; new
// code should use `getAuthorByName(name)?.links` directly. Returns the
// first LinkedIn URL if present, else the first link, else null.
export function getAuthorUrl(name: string | undefined | null): string | null {
  const profile = getAuthorByName(name);
  if (!profile?.links?.length) return null;
  const linkedin = profile.links.find((l) => /linkedin\.com/i.test(l.url));
  return linkedin?.url ?? profile.links[0].url;
}

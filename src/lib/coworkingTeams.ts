// Companies / teams currently using the Hard Problems coworking space
// in Shoreditch, London. Shared between the /coworking page (full
// grid + descriptions) and the homepage masonry aside (simple linked
// bullet list).

export type CoworkingTeam = {
  name: string;
  href: string;
  description: string;
  // Optional thumbnail path under /public, e.g. "/images/coworking/wellvrse.jpg"
  image?: string;
};

export const coworkingTeams: CoworkingTeam[] = [
  {
    name: 'Abuela',
    href: 'https://tryabuela.com/',
    description: 'Turning senior living facilities into clinical trial sites.',
    image: '/images/coworking/abuela.jpg'
  },
  {
    name: 'Access Now',
    href: 'https://www.accessnow.org/',
    description:
      'Defending the digital rights of people and communities at risk.',
    image: '/images/coworking/access-now.jpg'
  },
  {
    name: 'Blute',
    href: 'https://www.blute.co.uk/',
    description: 'Giving healthcare students a voice on clinical placements.',
    image: '/images/coworking/blute.jpg'
  },
  {
    name: 'Branch',
    href: 'https://joinbranch.co/',
    description: 'Keep your career on track while you have a baby.',
    image: '/images/coworking/branch.jpg'
  },
  {
    name: 'Coolit Labs',
    href: 'https://www.coolitlabs.com/',
    description:
      'Transforming medical devices into beautiful lifestyle objects.',
    image: '/images/coworking/coolit.jpg'
  },
  {
    name: 'Elyfia',
    href: 'https://www.elyfia.com/how-it-works',
    description:
      'Personalized coaching to Fibromyalgia patients through an app.',
    image: '/images/coworking/elyfia.jpg'
  },
  {
    name: 'Forest',
    href: 'https://exploreforest.ai/',
    description:
      'Polling and socioeconomic data modelled to every constituency.',
    image: '/images/coworking/forest.jpg'
  },
  {
    name: 'Grene',
    href: 'https://grene.co.uk/',
    description:
      'A new operating layer for domiciliary and supported living services.',
    image: '/images/coworking/grene.jpg'
  },
  {
    name: 'Health Data Avatar',
    href: 'https://www.healthdataavatar.com/',
    description: 'All your health data in one platform.',
    image: '/images/coworking/health-data-avatar.jpg'
  },
  {
    name: 'Joey',
    href: 'https://www.askjoeynow.com/',
    description: "Your child's GP on Whatsapp.",
    image: '/images/coworking/joey.jpg'
  },
  {
    name: 'Kestrix',
    href: 'https://www.kestrix.io/',
    description: 'Mapping heat loss from buildings with drones.',
    image: '/images/coworking/kestrix.jpg'
  },
  {
    name: 'Latte Labs',
    href: 'https://www.lattehealth.co.uk/',
    description: 'AI tools for clinicians, starting with clinician notes.',
    image: '/images/coworking/latte-labs.jpg'
  },
  {
    name: 'Minimum Viable Narrative',
    href: 'https://find-and-update.company-information.service.gov.uk/company/17106346',
    description: 'Storytelling for a better future.',
    image: '/images/coworking/minimum-viable-narrative.jpg'
  },
  {
    name: 'Prime Radiant Studio',
    href: 'https://primeradiantstudio.webflow.io/',
    description:
      'Using quantitative data to understand the trajectory of society.',
    image: '/images/coworking/cortex.jpg'
  },
  {
    name: 'Relay',
    href: 'https://www.linkedin.com/company/readytorelay/about/',
    description:
      'Safety through community-powered infrastructure for women runners.',
    image: '/images/coworking/relay.jpg'
  },
  {
    name: 'Resolve to Save Lives',
    href: 'https://rtsl.org/',
    description:
      "A global public health nonprofit working on the world's largest threats.",
    image: '/images/coworking/resolve-to-save-lives.jpg'
  },
  {
    name: 'Scrub the Stigma',
    href: 'https://www.scrubthestigma.com/',
    description:
      'Dismantling barriers and challenging the stigma impacting women’s health.',
    image: '/images/coworking/scrub-the-stigma.jpg'
  },
  {
    name: 'Vayla Health',
    href: 'https://vaylahealth.ai/',
    description:
      'Augments discharge teams with follow-up for patients at risk of readmission.',
    image: '/images/coworking/vayla.jpg'
  },
  {
    name: 'Wellvrse',
    href: 'https://www.wellvrse.com/',
    description:
      'A new paradigm for health, centering creativity, community and technology.',
    image: '/images/coworking/wellvrse.jpg'
  }
];

import Image from 'next/image';
import Link from 'next/link';
import styles from './team.module.scss';

// The team shown on /about.
//
// `href` rather than a bare slug, because not everyone has a profile
// page yet. Where one exists it is an internal /authors/<slug> link,
// which is preferred: that page carries the full bio, their articles
// and Person JSON-LD, and it lists LinkedIn among their links, so
// nothing is lost by stopping there first. Those slugs must match an
// entry in src/lib/authors.ts, which is what gives the pages their
// content.
//
// Anyone without an entry there points at an external profile instead
// and renders as an external link. Swap the href for /authors/<slug>
// once their page exists — nothing else here needs to change.
const TEAM = [
  {
    name: 'Elyce Cole',
    image: '/images/team/elyce.svg',
    href: '/authors/elyce-cole'
  },
  {
    name: 'Daniel Burka',
    image: '/images/team/daniel.svg',
    href: '/authors/daniel-burka'
  },
  {
    name: 'Mahima Chandak',
    image: '/images/team/mahima.svg',
    href: '/authors/mahima-chandak'
  },
  {
    name: 'Arfita Vania Dewi',
    image: '/images/team/vania.svg',
    href: 'https://www.linkedin.com/in/arfitavania/'
  }
];

export function Team() {
  return (
    <div className={styles.team}>
      {TEAM.map((person) => {
        const external = person.href.startsWith('http');
        return (
          <div key={person.href}>
            <Link
              className="hover-saturate"
              href={person.href}
              // Same treatment every other outbound link on the site
              // gets — see the author pages and the /about pull quote.
              {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
            >
              {/* alt="" because the name is right underneath: a screen
                  reader announcing both would read it twice. */}
              <Image src={person.image} width="80" height="80" alt="" />
              {person.name}
            </Link>
          </div>
        );
      })}
    </div>
  );
}

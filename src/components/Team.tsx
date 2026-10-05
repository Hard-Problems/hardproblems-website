import Image from 'next/image';
import Link from 'next/link';
import styles from './team.module.scss';

// Founders shown on /about. These link to each person's own
// /authors/<slug> page rather than straight out to LinkedIn: the profile
// page carries the full bio, their articles and Person JSON-LD, and it
// lists LinkedIn among their links, so nothing is lost by stopping here
// first.
//
// Slugs must match an entry in src/lib/authors.ts, which is what gives
// those pages their content.
const TEAM = [
  { slug: 'elyce-cole', name: 'Elyce Cole', image: '/images/team/elyce.svg' },
  {
    slug: 'daniel-burka',
    name: 'Daniel Burka',
    image: '/images/team/daniel.svg'
  },
  {
    slug: 'mahima-chandak',
    name: 'Mahima Chandak',
    image: '/images/team/mahima.svg'
  }
];

export function Team() {
  return (
    <div className={styles.team}>
      {TEAM.map((person) => (
        <div key={person.slug}>
          <Link className="hover-saturate" href={`/authors/${person.slug}`}>
            <Image src={person.image} width="80" height="80" alt="" />
            {person.name}
          </Link>
        </div>
      ))}
    </div>
  );
}

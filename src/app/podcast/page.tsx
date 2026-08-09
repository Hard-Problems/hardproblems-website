import Image from 'next/image';
import Link from 'next/link';
import PodcastGuestForm from './PodcastGuestForm';
import styles from './page.module.scss';

const EPISODE_TITLES = [
  'Can design reduce fashion waste?',
  'Can design improve power efficiency?',
  'Can design affect climate policy?',
  'Can design save people from cancer?',
  'Can design impact chronic disease?',
  'Can design education prepare designers for hard problems?',
  'Can design make better cities?',
  'Can design advance climate action?',
  'Can design improve genomics?',
  'Can design help democracy?'
];

const EPISODES = EPISODE_TITLES.map((title, i) => {
  const num = i + 1;
  const n = String(num).padStart(3, '0');
  return {
    src: `/images/content/podcast-episode-${n}.jpg`,
    alt: title
  };
}).reverse();

export default function Page() {
  return (
    <>
      <section className="page-narrow">
        <div className="illustration-home">
          <Image
            src="/images/illustration-podcast.svg"
            width="80"
            height="80"
            alt="Illustration of a person talking at a mic."
          />
        </div>
        <p className="page-lede">
          The podcast for designers &amp; technologists who want to work on
          urgent problems like public health and climate change.
          <br />
          <span className="notice-pill">Coming soon…</span>
        </p>

        <h3 className="space-top-large">What will the podcast be about?</h3>
        <p>
          We want to find out what works and what doesn&#8216;t work for
          designers who are working on the world&#8216;s most urgent challenges.
          We will share the best ideas from experts in the field with you, so
          you&apos;re better prepared to work in these spaces. And, we want to
          inspire people (you?) to make the jump to work on hard problems.
        </p>

        <h3 className="space-top-large">Episodes</h3>
        <p>
          Join our <Link href="/newsletter/">email newsletter</Link> so you
          don&#8216;t miss when we start the podcast.
        </p>

        <ul className={styles.episodeGrid}>
          {EPISODES.map((ep) => (
            <li key={ep.src}>
              <Image src={ep.src} alt={ep.alt} width={300} height={300} />
            </li>
          ))}
        </ul>

        <h3 className="space-top-large">We need your help</h3>
        <p>
          Know someone who we should interview? Tell us about them and
          why they&rsquo;d make a great guest.
        </p>
        <p>
          <PodcastGuestForm />
        </p>

        <h3 className="divider">Who makes a good guest?</h3>
        <ul className="hand-drawn-checklist">
          <li>Not the usual suspects who do the podcast circuit.</li>
          <li>
            Not just a &#8216;thought leader.&#8217; Someone who actually works
            on real-world technologies.
          </li>
          <li>
            Has been working on &#8216;hard problems&#8217; for more than a year
            &#8212; ideally 5+ years. Hard problems are long-term problems.
          </li>
          <li>Takes a thoughtful and ethical approach to their work.</li>
          <li>
            Likely works on tech related to climate change, public health,
            healthcare, government, education, or income inequality.
          </li>
        </ul>
      </section>
    </>
  );
}

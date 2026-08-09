import Image from 'next/image';
import Link from 'next/link';
import { coworkingTeams as teams } from '../../lib/coworkingTeams';
import DeskApplicationForm from './DeskApplicationForm';
import styles from './page.module.scss';

export default function Page() {
  return (
    <>
      <section className="page-narrow">
        <div className="illustration-home">
          <Image
            src="/images/illustration-cowork-2.svg"
            width="80"
            height="80"
            alt="Illustration of two people working."
          />
        </div>
        <p className="page-lede">
          Hard Problems has a small coworking space in London. This space is
          intended to foster community for people working on hard problems.
        </p>
        <h3 className="space-top-small">Can I work here?</h3>
        <p>
          If you work on a design or tech project related to climate change,
          public health, healthcare, education, poverty, etc, the answer could
          be &#8216;Yes!&#8217;
        </p>
        <div className={styles.twoCol}>
          <div>
            <h4 style={{ color: 'var(--color-mid-green)' }}>
              Just for a few days
            </h4>
            <p>
              Need a desk for just a few days? If you work on a hard problem,
              apply and we could offer you a free place to work.
            </p>
          </div>
          <div>
            <h4 style={{ color: 'var(--color-mid-green)' }}>Long-term desks</h4>
            <p>
              If you can pay, a fixed desk is £450/month and a drop-in desk is
              £200/month. If that is too much, get in touch and we might be able
              to work something out.
            </p>
          </div>
        </div>

        <h3 className="space-top-small">How to apply for a desk?</h3>
        <p>Tell us a bit about you and the hard problem you work on:</p>
        <p>
          <DeskApplicationForm />
        </p>

        <h3 className="space-top-large">Photos</h3>
        <div className={styles.photoBricks}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Link key={n} href={`/images/office-photo-${n}.jpg`}>
              <Image
                src={`/images/office-photo-${n}.jpg`}
                width={1500}
                height={1500}
                alt="Photo of the office"
              />
            </Link>
          ))}
        </div>

        <h3 className="space-top-large">Location</h3>
        <p>
          <Link href="https://maps.app.goo.gl/8SYY1vdDDcwwqGJy7">
            1 Rivington Pl, London EC2A 3BA
          </Link>
        </p>
        <p>
          We are located in the Autograph Gallery building at 1 Rivington Place
          in the Shoreditch neighborhood.
        </p>
        <h3 className="space-top-small">Getting here</h3>
        <p>
          Liverpool Street Station and Old Street Station are closest
          Underground stops. There is secure bicycle parking at the office by
          request. Visiting? Come into Autograph Gallery and ask for Hard
          Problems at the front desk.
        </p>

        <h3 className="space-top-large">Teams</h3>
        <p>People from these organizations use the coworking space:</p>
        <ul className={styles.teamsGrid}>
          {teams.map((team) => (
            <li key={team.name} className={styles.teamTile}>
              {team.image ? (
                <Link
                  href={team.href}
                  aria-label={`Visit ${team.name}`}
                  className="hover-saturate"
                >
                  <Image
                    src={team.image}
                    width={512}
                    height={410}
                    alt={`${team.name} logo`}
                    className={styles.teamTileImage}
                  />
                </Link>
              ) : (
                <div
                  className={styles.teamTilePlaceholder}
                  aria-hidden="true"
                />
              )}
              {team.description && (
                <p className={styles.teamTileDescription}>{team.description}</p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

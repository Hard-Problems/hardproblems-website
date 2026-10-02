import Link from 'next/link';
import Image from 'next/image';

export default function Page() {
  return (
    <>
      <section className="left">
        <h1 className="page-title">Events</h1>
        <p className="intro">
          We host global events online and in-person events in London, featuring
          great speakers to build community.
        </p>

        <p>
          The best way to stay informed about upcoming events is to join our{' '}
          <Link href="/newsletter">email newsletter</Link>. All in-person events
          follow our <Link href="/conduct">code of conduct</Link>. We hope to
          see you at an event soon.
        </p>

        <h3 className="space-top-large">Upcoming events</h3>
        <p>
          We’re busy working on the next event. Join our{' '}
          <Link href="/newsletter">email newsletter</Link> to make sure you
          don’t miss it.
        </p>

        <h3 className="space-top-large">Past events</h3>

        <div className="event">
          <div className="event-image">
            <Image
              src="/images/events/ganesh-event.svg"
              width="80"
              height="80"
              alt="Illustration of Epidemiologists."
            />
            <div className="event-image-date">May 29, 2025</div>
          </div>
          <h4>
            <Link href="https://lu.ma/nqd3pagz">
              Why are public health experts looking for technologists?
            </Link>
          </h4>
          <p>
            Join us for a behind-the-scenes conversation with Dr. Prabhdeep Kaur
            and Dr. Ganeshkumar, senior epidemiologists at the Indian Council of
            Medical Research (ICMR) and two of India&lsquo;s leading public
            health minds. With decades of experience running large-scale health
            programs, they’ll share candid insights into the software, systems,
            and design choices that drive (or derail) real-world outcomes.
            We&lsquo;ll also dive into a question more technologists are
            starting to ask: Is there an exciting career in public health for
            people like us?
          </p>
          <p>
            Whether you&lsquo;re curious about impact, looking beyond big tech,
            or already working at the intersection of design and health, this
            conversation will spark new ideas about where your skills can truly
            make a difference.
          </p>
          <dl className="event-details">
            <dt>When?</dt>
            <dd>2:30-4pm BST on Thur, May 29, 2025</dd>
            <dt>Where?</dt>
            <dd>Online</dd>
            <dt>RSVP</dt>
            <dd>
              <Link href="https://lu.ma/nqd3pagz">Please RSVP</Link>
            </dd>
          </dl>
        </div>

        <div className="event">
          <div className="event-image">
            <Image
              src="/images/events/asquared-event.svg"
              width="80"
              height="80"
              alt="Illustration of ASquared."
            />
            <div className="event-image-date">Apr 10, 2025</div>
          </div>
          <h4>
            <Link href="https://lu.ma/kme2kbaa">
              Fireside chat with ASquared: Can a design agency do good in the
              world and run a viable business?
            </Link>
          </h4>
          <p>
            We will discuss with three of the leaders of ASquared about their
            agency&rsquo;s transition to a B-Corp that does half their work with
            organizations working on &ldquo;Sustainable Development
            Goals.&rdquo; Is it possible to run a successful digital agency with
            an explicit aim to make the world better?
          </p>
          <dl className="event-details">
            <dt>When?</dt>
            <dd>6-9 pm on Thur, April 10, 2025</dd>
            <dt>Where?</dt>
            <dd>1 Rivington Place, London, EC2A 3BA</dd>
            <dt>RSVP</dt>
            <dd>
              <Link href="https://lu.ma/kme2kbaa">Please RSVP</Link>
            </dd>
          </dl>
        </div>

        <div className="event">
          <div className="event-image">
            <Image
              src="/images/events/brian-event.svg"
              width="80"
              height="80"
              alt="Illustration of Brian O'Donnell."
            />
            <div className="event-image-date">Mar 13, 2025</div>
          </div>
          <h4>
            <Link href="https://lu.ma/bengeegp">
              Fireside chat with Brian O&#39;Donnell from DHIS2.org
            </Link>
          </h4>
          <p>
            We are hosting tech architect, Brian O D&rsquo;onnell (Linkedin),
            for a fireside chat where we will discuss what he does, how he ended
            up working on DHIS2.org, and the highs and lows of working at the
            intersection of academia, government, global public health, and
            tech. This will be an open discussion where you can ask Brian
            questions.
          </p>
          <dl className="event-details">
            <dt>When?</dt>
            <dd>6-9 pm on Thur, March 13, 2025</dd>
            <dt>Where?</dt>
            <dd>1 Rivington Place, London, EC2A 3BA</dd>
            <dt>RSVP</dt>
            <dd>
              <Link href="https://lu.ma/bengeegp">Please RSVP</Link>
            </dd>
          </dl>
        </div>

        <div className="event">
          <div className="event-image">
            <Image
              src="/images/events/wine-event.svg"
              width="80"
              height="80"
              alt="Illustration of a person sipping wine."
            />
            <div className="event-image-date">Dec 11, 2024</div>
          </div>
          <h4>
            <Link href="https://lu.ma/3n56utd7">
              Wine &amp; chat at our new office
            </Link>
          </h4>
          <p>
            Come to our new office in London for casual wine, beverages, and
            snacks or just to say hello!
          </p>
          <dl className="event-details">
            <dt>When?</dt>
            <dd>5-7 pm on Wed, December 11, 2024</dd>
            <dt>Where?</dt>
            <dd>1 Rivington Place, London, EC2A 3BA</dd>
            <dt>RSVP</dt>
            <dd>
              <Link href="https://lu.ma/3n56utd7">Please RSVP</Link>
            </dd>
          </dl>
        </div>
      </section>
      <section className="right"></section>
    </>
  );
}

import Link from 'next/link';

export default function Page() {
  return (
    <>
      <section className="left">
        <h2>Privacy notice</h2>
        <p>This is the Hard Problems customer privacy notice. This privacy notice tells you what to expect us to do with your personal information.</p>
        <ul>
          <li><Link href="#contact">Contact details</Link></li>
          <li><Link href="#info">What information we collect, use, and why</Link></li>
          <li><Link href="#lawful">Lawful bases and data protection rights</Link></li>
          <li><Link href="#cookies">Analytics</Link></li>
          <li><Link href="#processors">Service providers and international transfers</Link></li>
          <li><Link href="#where">Where we get personal information from</Link></li>
          <li><Link href="#keep">How long we keep information</Link></li>
          <li><Link href="#complain">How to complain</Link></li>
        </ul>

        <h3 className="space-top-large" id="contact">Contact details</h3>
        <dl>
          <dt>Post</dt>
          <dd>Hard Problems, 1 Rivington Place, LONDON, EC2A 3BA, GB</dd>
          <dt>Email</dt>
          <dd>contact@hardproblems.com</dd>
        </dl>

        <h3 className="space-top-large" id="info">What information we collect, use, and why</h3>
        <p>
          We collect or use the following information to receive donations or funding and organize fundraising activities:
          <br /><span className="tag">Names and contact details</span>
        </p>
        <p>
          We collect or use the following personal information for service updates or marketing purposes:
          <br /><span className="tag">Names and contact details</span>
        </p>
        <p>
          We collect or use the following personal information to deliver personalized job alerts you have signed up for:
          <br /><span className="tag">Email addresses</span>
          <br /><span className="tag">Saved job-filter preferences</span>
        </p>
        <p>
          We collect or use the following personal information from people applying to use the Hard Problems coworking space:
          <br /><span className="tag">Names and contact details</span>
          <br /><span className="tag">Professional profile URLs (LinkedIn or website)</span>
          <br /><span className="tag">A description of the &lsquo;hard problem&rsquo; you work on</span>
          <br /><span className="tag">Your organisation and free-form scheduling notes</span>
        </p>
        <p>
          We collect or use the following personal information from people suggesting a podcast guest:
          <br /><span className="tag">Your name and (optionally) your email</span>
          <br /><span className="tag">The suggested guest&rsquo;s name and profile URL</span>
          <br /><span className="tag">A short recommendation you provide</span>
        </p>
        <p>We collect or use the following personal information for dealing with queries, complaints or claims:
          <br /><span className="tag">Names and contact details</span>
        </p>
        <p>We also collect or use the following information for dealing with queries, complaints or claims:
          <br /><span className="tag">Names and contact details</span>
        </p>

        <h3 className="space-top-large" id="lawful">Lawful bases and data protection rights</h3>
        <p>Under UK data protection law, we must have a “lawful basis” for collecting and using your personal information. There is a list of possible lawful bases in the UK GDPR. You can find out more about lawful bases on the ICO’s website.</p>
        <p>Which lawful basis we rely on may affect your data protection rights which are in brief set out below. You can find out more about your data protection rights and the exemptions which may apply on the ICO’s website:</p>
        <ul>
          <li><b>Your right of access</b> - You have the right to ask us for copies of your personal information. You can request other information such as details about where we get personal information from and who we share personal information with. There are some exemptions which means you may not receive all the information you ask for. You can read more about this right here.</li>
          <li><b>Your right to rectification</b> - You have the right to ask us to correct or delete personal information you think is inaccurate or incomplete. You can read more about this right here.</li>
          <li><b>Your right to erasure</b> - You have the right to ask us to delete your personal information. You can read more about this right here.</li>
          <li><b>Your right to restriction of processing</b> - You have the right to ask us to limit how we can use your personal information. You can read more about this right here.</li>
          <li><b>Your right to object to processing</b> - You have the right to object to the processing of your personal data. You can read more about this right here.</li>
          <li><b>Your right to data portability</b> - You have the right to ask that we transfer the personal information you gave us to another organization, or to you. You can read more about this right here.</li>
          <li><b>Your right to withdraw consent</b> – When we use consent as our lawful basis you have the right to withdraw your consent at any time. You can read more about this right here.</li>
        </ul>
        <p>If you make a request, we must respond to you without undue delay and in any event within one month.</p>
        <p>To make a data protection rights request, please contact us using the contact details at the top of this privacy notice.</p>

        <div className="feature">
          <h3>Our lawful bases for the collection and use of your data</h3>

          <p>Our lawful bases for collecting or using personal information to <b>receive funding and organize fundraising activities</b> are:</p>
          <p className="indent">Consent - we have permission from you after we gave you all the relevant information. All of your data protection rights may apply, except the right to object. To be clear, you do have the right to withdraw your consent at any time.</p>
          <p>Our lawful bases for collecting or using personal information for <b>service updates or marketing purposes</b> are:</p>
          <p className="indent">Consent - we have permission from you after we gave you all the relevant information. All of your data protection rights may apply, except the right to object. To be clear, you do have the right to withdraw your consent at any time.</p>
          <p>Our lawful bases for collecting or using personal information for <b>dealing with queries, complaints or claims</b> are:</p>
          <p className="indent">Consent - we have permission from you after we gave you all the relevant information. All of your data protection rights may apply, except the right to object. To be clear, you do have the right to withdraw your consent at any time.</p>
          <p>Our lawful bases for collecting or using personal information to <b>deliver personalized job alerts you have signed up for</b> are:</p>
          <p className="indent">Consent - you confirm your email address by clicking a link we send you (double opt-in) after we gave you all the relevant information about what we will send and how often. All of your data protection rights may apply, except the right to object. You can withdraw your consent at any time by clicking the unsubscribe link in any job-alert email, or by contacting us using the details at the top of this privacy notice.</p>
        </div>

        <h3 className="space-top-large" id="cookies">Analytics</h3>
        <p>
          We use <b>PostHog</b> to understand how visitors use the site. When
          you visit hardproblems.com, PostHog runs in your browser and captures
          an anonymized view of your activity, including the pages you visit,
          interactions such as clicking on a job listing, an approximate
          location derived from your IP address, the device and browser you
          use, and how you arrived at the site.
        </p>
        <p>
          <b>We run PostHog in cookieless mode.</b> PostHog does not set
          cookies on hardproblems.com and does not write to your browser&rsquo;s
          local storage. Sessions are reconstructed in memory for the duration
          of a page load and discarded; nothing about your browser is
          persisted between visits. Because we do not identify individual
          users, most visitors remain anonymous.
        </p>
        <p>
          Analytics data is processed by PostHog Inc. in the United States. We
          use the US cloud region of PostHog.
        </p>

        <h3 className="space-top-large" id="processors">Service providers and international transfers</h3>
        <p>
          We use the following third-party processors to operate the website
          and our services. Some of them process data outside the UK and EEA;
          where they do, we rely on the UK/EU&ndash;US Data Privacy Framework
          where the provider is certified, and on Standard Contractual Clauses
          as additional safeguards.
        </p>
        <dl>
          <dt>Vercel</dt>
          <dd>
            Website hosting. Vercel processes server logs which include IP
            addresses for the purpose of operating and securing the site.
            Vercel Inc. is based in the United States.
          </dd>
          <dt>Cloudflare</dt>
          <dd>
            DNS and content delivery. Cloudflare processes IP addresses to
            deliver the site and protect against abuse. Cloudflare, Inc. is
            based in the United States.
          </dd>
          <dt>PostHog</dt>
          <dd>
            Product analytics — captures anonymized page views and
            interactions on the site (see the{' '}
            <Link href="#cookies">Analytics</Link> section above). PostHog Inc.
            is based in the United States.
          </dd>
          <dt>Beehiiv</dt>
          <dd>
            Email newsletter delivery. If you subscribe to our newsletter your
            email address is stored by Beehiiv on our behalf. Beehiiv Inc. is
            based in the United States.
          </dd>
          <dt>Resend</dt>
          <dd>
            Transactional email delivery for job alerts. If you sign up for
            job alerts, we send confirmation and daily-digest emails through
            Resend on our behalf; Resend receives your email address and the
            content of each message it delivers. Resend, Inc. is based in the
            United States.
          </dd>
          <dt>Supabase</dt>
          <dd>
            Managed database used to store job-alert subscribers, their
            saved filter preferences, and a log of which listings have
            already been sent to each subscriber. Supabase Inc. is based in
            the United States.
          </dd>
          <dt>Luma</dt>
          <dd>
            Event RSVPs and attendee management. When you RSVP to one of our
            events you do so on Luma&rsquo;s platform, where Luma processes
            your name, email address, and other information you provide for
            that event on our behalf. Luma also sets its own cookies and may
            track usage of its platform. Luma AI, Inc. is based in the United
            States.
          </dd>
        </dl>

        <h3 className="space-top-large" id="where">Where we get personal information from</h3>
        <p>Directly from you</p>

        <h3 className="space-top-large" id="keep">How long we keep information</h3>
        <p>Newsletter email addresses are kept until you unsubscribe from the newsletter.</p>
        <p>Job-alert email addresses and saved filter preferences are kept until you unsubscribe, at which point the record is permanently deleted within 30 days.</p>
        <p>When you sign up for a job alert we record a truncated version of your IP address (the last octet is zeroed for IPv4, or the address is reduced to its /48 prefix for IPv6) as an anti-abuse signal. We do not keep the full address.</p>
        <p>Contact information provided for the purpose of attending an event or applying for a service are removed after 3 months.</p>

        <h3 className="space-top-large">Last updated</h3>
        <p>8 July 2026</p>
      </section>
      <section className="right">
        <h3 id="complain">How to complain</h3>
        <p>If you have any concerns about our use of your personal data, you can make a complaint to us using the contact details at the top of this privacy notice.</p>
        <p>If you remain unhappy with how we’ve used your data after raising a complaint with us, you can also complain to the ICO (Information Commissioner’s Office).</p>
        <p>The ICO’s address:</p>
        <p className="indent">
          Information Commissioner’s Office.<br />
          Wycliffe House<br />
          Water Lane<br />
          Wilmslow<br />
          Cheshire<br />
          SK9 5AF
        </p>
        <p>Helpline number: 0303 123 1113</p>
        <p>Website: <Link href="https://www.ico.org.uk/make-a-complaint">ico.org.uk/make-a-complaint</Link></p>
      </section>
    </>
  );
}

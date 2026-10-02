'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CalendarDays } from 'lucide-react';
import Parser from 'rss-parser';
import NewsletterSkeleton from './newsletterSkeleton';
import NewsletterModule from '../../components/NewsletterModule';
import styles from './page.module.scss';

type Newsletter = {
  id: string;
  title: string;
  content: string;
  image: string;
  url: string;
  pubDate: Date;
};

export default function Page() {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [newslettersLoaded, setNewslettersLoaded] = useState<boolean>(false);
  const parser = new Parser();
  useEffect(() => {
    if (!newslettersLoaded) {
      parser.parseURL('/api/newsletters').then((feed) => {
        setNewsletters(
          feed.items.map((item) => {
            return {
              id: item.guid || '',
              title: item.title || '',
              content: item.content || '',
              image: item.enclosure?.url || '',
              url: item.link || '',
              pubDate: new Date(item.pubDate || '')
            };
          })
        );
        setNewslettersLoaded(true);
      });
    }
  });

  const dateFormat: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };

  return (
    <>
      <section className="page-narrow">
        <div className="illustration-home">
          <Image
            src="/images/illustration-newsletter.svg"
            width="80"
            height="80"
            alt="Illustration of a person holding a sign that says NEWS, JOBS, STORIES."
          />
        </div>
        <h1 className="page-lede">
          The email newsletter for designers and technologists who want to work
          on hard problems.
        </h1>

        <ul className={styles.checklist}>
          <li>4-5 emails each month</li>
          <li>No spam</li>
          <li>We will never share emails</li>
          <li>Easy unsubscribe</li>
        </ul>

        <NewsletterModule />

        <h3 className="space-top-large">Recent newsletters</h3>
        <div className={styles.newsletters}>
          {!newslettersLoaded && (
            <>
              <NewsletterSkeleton />
              <NewsletterSkeleton />
              <NewsletterSkeleton />
            </>
          )}

          {newslettersLoaded &&
            newsletters &&
            newsletters.map((newsletter) => {
              return (
                <div key={newsletter.id} className={styles.newsletter}>
                  <Link
                    href={newsletter.url}
                    target="_blank"
                    className={`${styles.newsletterLink} hover-saturate`}
                  >
                    <div className={styles.newsletterImageWrap}>
                      <Image
                        src={newsletter.image}
                        width="512"
                        height="236"
                        alt={newsletter.title}
                        className={styles.newsletterImage}
                      />
                    </div>
                    <div className={styles.newsletterBody}>
                      <h4 className={styles.newsletterTitle}>
                        {newsletter.title}
                      </h4>
                      <p className={styles.newsletterExcerpt}>
                        {newsletter.content}
                      </p>
                      <span className={styles.newsletterDate}>
                        <CalendarDays
                          className={styles.newsletterDateIcon}
                          aria-hidden="true"
                        />
                        {newsletter.pubDate.toLocaleDateString(
                          'en-GB',
                          dateFormat
                        )}
                      </span>
                    </div>
                  </Link>
                </div>
              );
            })}
        </div>
      </section>
    </>
  );
}

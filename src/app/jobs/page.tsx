import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import JobsList from './JobsList';
import { fetchJobs } from './fetchJobs';
import JobPostingSchema from './JobPostingSchema';
import ArticleCard from '../../components/ArticleCard';
import NewsletterModule from '../../components/NewsletterModule';
import { getAllArticles } from '../../lib/articles';
import articleStyles from '../articles/page.module.scss';
import styles from './page.module.scss';

// Render on every request instead of serving an ISR-cached HTML
// snapshot. The jobs board is the canonical "here's what's open right
// now" view — visitors expect it to reflect a sheet update within
// seconds, not up to 10 minutes stale. The underlying Sheet CSV is
// still Data-Cached per fetchJobs's `next.revalidate` (currently 60s
// — see fetchJobs.ts), so Google Sheets is hit at most once a minute
// regardless of how many users land on the page.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Job board for designers who want to work on hard problems',
  // Auto-discovery for RSS readers. The "raw" feed has every job; users can
  // also subscribe to filtered feeds by appending filter query params to
  // /jobs/feed.xml (e.g. /jobs/feed.xml?sector=climate&work=remote).
  alternates: {
    types: {
      'application/rss+xml': '/jobs/feed.xml'
    }
  }
};

export default async function Page() {
  const jobs = await fetchJobs();
  const careersArticles = getAllArticles()
    .filter((a) => a.topics.includes('careers'))
    .slice(0, 6);

  const filterHeader = (
    <>
      <h2>Job board</h2>
      <p>
        Jobs for designers, researchers, PMs, and copywriters who want to work
        on urgent problems like healthcare, public health, good government, and
        climate change.
      </p>
    </>
  );

  const filterFooter = (
    <p>
      Our favorite job sources are{' '}
      <Link href="https://linkedin.com">LinkedIn</Link>,{' '}
      <Link href="https://designgigsforgood.org">Design Gigs for Good</Link>,{' '}
      <Link href="https://techjobsforgood.com">Tech Jobs for Good</Link>,{' '}
      <Link href="https://climatebase.org">Climate Base</Link>,{' '}
      <Link href="https://jobs.womenintech.co.uk/jobs/">Women in Tech</Link>, and{' '}
      <Link href="https://www.escapethecity.org/">Escape the City</Link>.
    </p>
  );

  return (
    <>
      {/* schema.org JobPosting entries for Google's Jobs Card.
          Rendered up front so it's in the SSR HTML before the
          client-side JobsList hydrates. */}
      <JobPostingSchema jobs={jobs} />
      <NewsletterModule variant="under-nav" />
      <section className={styles.board}>
        {jobs.length === 0 ? (
          <p>
            We&rsquo;re having trouble loading the job board right now. Please
            check back soon.
          </p>
        ) : (
          // Suspense is required because JobsList reads useSearchParams.
          // Without it Next.js would deopt the route from static rendering.
          <Suspense fallback={null}>
            <JobsList
              jobs={jobs}
              filterHeader={filterHeader}
              filterFooter={filterFooter}
            />
          </Suspense>
        )}
      </section>
      {careersArticles.length > 0 && (
        <section className={styles.careersArticles}>
          <h2>Careers</h2>
          <ul className={articleStyles.articleList}>
            {careersArticles.map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

import { Fragment } from 'react';
import Link from 'next/link';
import ArticleCard from '../components/ArticleCard';
import CoworkingRotator from '../components/CoworkingRotator';
import NewsletterModule from '../components/NewsletterModule';
import { getAllArticles } from '../lib/articles';
import { fetchJobs } from './jobs/fetchJobs';
import JobsTeaser from './jobs/JobsTeaser';
import styles from './articles/page.module.scss';

// Regenerate at most every hour so scheduled articles (status:
// published + a future `publishedAt`) surface automatically once
// their date arrives — no redeploy required.
export const revalidate = 3600;

// Homepage doubles as the articles index. At desktop, the newest article
// renders as a large hero on the left with a compact job-board teaser to
// its right; below, the remaining articles fall into a regular 3-up grid.
// On mobile the right-of-hero teaser is hidden — a second teaser is
// inserted into the article list after the 3rd article instead.
// Slug pinned to the secondary-hero slot (i === 3 in the remaining list)
// so it always sits on the same row as the Coworking London aside.
const COWORKING_HERO_SLUG = 'hard-problems-coworking-space';

export default async function Home() {
  const articles = getAllArticles();
  const heroArticle = articles[0];
  let remainingArticles = articles.slice(1);

  // Pin the coworking article into the secondary-hero slot.
  const coworkingIdx = remainingArticles.findIndex(
    (a) => a.slug === COWORKING_HERO_SLUG
  );
  if (coworkingIdx !== -1 && coworkingIdx !== 3) {
    const [coworkingArticle] = remainingArticles.splice(coworkingIdx, 1);
    const insertAt = Math.min(3, remainingArticles.length);
    remainingArticles = [
      ...remainingArticles.slice(0, insertAt),
      coworkingArticle,
      ...remainingArticles.slice(insertAt)
    ];
  }

  const jobs = await fetchJobs();
  const recentJobs = jobs.slice(0, 5);

  return (
    <>
      <section className={styles.articles}>
        {heroArticle && (
          <div className={styles.heroRow}>
            <ul className={styles.heroList}>
              <ArticleCard article={heroArticle} />
            </ul>
            <aside className={styles.heroJobs}>
              <h3>New on the job board</h3>
              <JobsTeaser jobs={recentJobs} totalCount={jobs.length} />
            </aside>
          </div>
        )}

        {remainingArticles.length > 0 && (
          <ul className={styles.articleList}>
            {remainingArticles.map((article, i) => (
              <Fragment key={article.slug}>
                {/* Mobile-only newsletter module inserted just above the
                    "More content" heading. Hidden on desktop — a
                    desktop-only copy is slotted before the coworking
                    aside further down. */}
                {i === 2 && (
                  <li className={styles.newsletterModuleRowMobile}>
                    <NewsletterModule variant="inline" />
                  </li>
                )}
                {/* Mobile-only "More content" heading right before the
                    first compact card. Hidden on desktop. */}
                {i === 2 && (
                  <li className={styles.moreContentHeading}>
                    <h3>More content</h3>
                  </li>
                )}
                {/* hero = 1st article, list = 2nd onward. Indices 0,1
                    are the 2nd and 3rd articles → standard card.
                    Indices 2+ are the 4th onward → compact card on
                    mobile (image left + text right with top rule).
                    Desktop falls back to the normal card layout via
                    the @media rules in page.module.scss. */}
                {/* Desktop only — slot the Coworking aside into the
                    left grid column right before the secondary hero
                    so the row reads as: [aside | hero spanning 2/3].
                    Hidden on mobile via CSS. */}
                {i === 3 && (
                  <li className={styles.newsletterModuleRow}>
                    <NewsletterModule variant="inline" />
                  </li>
                )}
                {i === 3 && (
                  <li className={styles.coworkingAside}>
                    <h3>Coworking in London</h3>
                    <p className={styles.coworkingAsideIntro}>
                      These health and climate organizations use our{' '}
                      <Link href="/coworking">coworking space</Link> in London,
                      UK. You can use our space if you are visiting the city.
                    </p>
                    <CoworkingRotator />
                    <p className={styles.coworkingAsideCta}>
                      <Link
                        href="/coworking"
                        className="black-button black-button--small"
                      >
                        Learn more…
                      </Link>
                    </p>
                  </li>
                )}
                <ArticleCard
                  article={article}
                  compact={i >= 0}
                  hero={i === 3}
                  hideDate={article.slug === COWORKING_HERO_SLUG}
                />
                {/* Mobile-only jobs teaser slotted between the 3rd
                    and 4th articles. Hidden on desktop where the
                    .heroJobs teaser to the right of the hero already
                    serves the same purpose. */}
                {i === 1 && (
                  <li className={styles.mobileJobsTeaser}>
                    <h3>New on the job board</h3>
                    <JobsTeaser jobs={recentJobs} totalCount={jobs.length} />
                  </li>
                )}
              </Fragment>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Team } from '../../components/Team';
import ArticleCard from '../../components/ArticleCard';
import { getArticleBySlug } from '../../lib/articles';
import articlesStyles from '../articles/page.module.scss';

// Without this the page inherits the layout's site-wide title and
// description, which nine pages were sharing verbatim. openGraph and
// twitter are set too: Next does not derive them from `title`, and each
// replaces the layout's wholesale rather than merging, so `card` is
// repeated here. The segment's own opengraph-image.tsx still supplies
// the image.
export const metadata: Metadata = {
  title: 'About us: a nonprofit for designers — Hard Problems',
  description:
    'Hard Problems is a UK nonprofit that helps designers, researchers and technologists shift into full-time work on urgent problems like climate change and public health.',
  openGraph: {
    title: 'About us — Hard Problems',
    description:
      'Hard Problems is a UK nonprofit that helps designers, researchers and technologists shift into full-time work on urgent problems like climate change and public health.'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About us — Hard Problems',
    description:
      'Hard Problems is a UK nonprofit that helps designers, researchers and technologists shift into full-time work on urgent problems like climate change and public health.'
  }
};

export default function Page() {
  const featuredArticle = getArticleBySlug('explain-hard-problems');
  return (
    <>
      <section className="page-narrow">
        <div className="illustration-home">
          <Image
            src="/images/illustration-directions.svg"
            width="80"
            height="80"
            alt="Illustration of a person considering which way their career might take."
          />
        </div>
        <h1 className="page-lede">
          Hard Problems is a nonprofit that helps designers to make the shift to
          working full-time on the world’s urgent problems &#8212; problems like
          climate change and public health.
        </h1>

        <h3>Our mission</h3>
        <p>
          While the loudest part of the tech world is focused on AI, crypto,
          fin-tech, and advertising, other people are trying to tackle the
          hardest, thorniest problems. Problems like climate change, public
          health, healthcare, and good government.
        </p>
        <p>
          Designers, product managers, user researchers, copywriters, and others
          know that these hard problems matter but they often wring their hands
          and stand by, unsure how to have any positive impact.
        </p>

        <blockquote>
          <p>
            “The best minds of my generation are thinking about how to make
            people click ads. That sucks.”
          </p>
          <p>
            <Link href="https://www.fastcompany.com/3008436/why-data-god-jeffrey-hammerbacher-left-facebook-found-cloudera">
              Jeff Hammerbacher, 2011
            </Link>
          </p>
        </blockquote>

        <p>
          It’s time to refocus the tech world on what matters most. It’s time to
          build new relationships between doctors, environmentalists,
          scientists, nonprofit leaders, public servants, and others tackling
          the world’s hardest problems with designers who can help make
          practical tools to help them succeed.
        </p>
        <p>
          We are a multi-skilled team of very experienced tech veterans and
          other subject-matter experts. We aim to push this effort &#8212;
          whether it’s by building teams to work on issues, creating bridges
          between ambitious experts and designers, finding ways to fund tech
          initiatives, or inspiring a generation of designers to work on these
          fundamentally important problems.
        </p>

        <h3 className="space-top-large">What success looks like</h3>
        <p>
          Thinking of this in terms of KPIs, we’d first think of measuring: the
          number of people we help make the leap from the traditional tech world
          to organizations that work on the world’s hard problems. In the
          broader sense, our goals are to change the culture of tech to value
          people who work on hard problems.
        </p>

        <h3 className="space-top-large">Our team</h3>
        <p>We are an all-volunteer team from around the world.</p>
        <Team />

        <h3 className="space-top-large">Hard Problems explained...</h3>
        {featuredArticle && (
          <div className={articlesStyles.aboutFeaturedArticle}>
            <ul className={articlesStyles.articleList}>
              <ArticleCard article={featuredArticle} />
            </ul>
          </div>
        )}
      </section>
    </>
  );
}

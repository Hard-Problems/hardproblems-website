import type { Metadata } from 'next';
import Link from 'next/link';
import { Instrument_Serif } from 'next/font/google';
import TopBar from '../components/TopBar';
import CodeBlockCopyButtons from '../components/CodeBlockCopyButtons';
import PostHogProvider from '../components/PostHogProvider';
import { Footer } from '../components/Footer';
import FooterIntro from '../components/FooterIntro';
import RotatingTagline from '../components/RotatingTagline';
import SiteHeaderNav from '../components/SiteHeaderNav';
import './globals.css';

// Used for article titles (listing cards and the article H1) and every
// h2 / h3 heading site-wide. Exposed as a CSS variable so SCSS modules
// can reference it via var(...).
//
// `display: 'optional'` deliberately trades brand-fidelity for CLS:
//   - font already cached or loads within ~100ms → use Instrument Serif.
//   - otherwise stick with Georgia for this session.
// Either way headings render in a single font from first paint to last
// paint, so nothing shifts. `display: 'swap'` was the previous setting;
// it caused every page to score "Poor" on Core Web Vitals because the
// large h2/h3 headings visibly resized when the swap fired.
const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument-serif',
  display: 'optional'
});

export const metadata: Metadata = {
  metadataBase: new URL('https://hardproblems.com'),
  title: 'Hard Problems',
  description:
    'Helping designers to work on the hard problems that matter in the world: problems like public health, climate change, poverty, and good government.',
  openGraph: {
    title: 'Hard Problems',
    description:
      'A nonprofit helping designers to work on the hard problems that matter in the world.',
    url: 'https://hardproblems.com',
    siteName: 'Hard Problems',
    type: 'website'
    // og:image is supplied per-route via each opengraph-image.tsx;
    // routes without one fall back automatically.
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hard Problems',
    description:
      'A nonprofit helping designers to work on the hard problems that matter in the world.'
    // twitter:image is auto-populated by Next.js from each route's
    // opengraph-image.tsx, so no need to specify it here.
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={instrumentSerif.variable}>
      {/* `suppressHydrationWarning` on <body> only — browser
          extensions (Grammarly, ColorZilla, password managers) inject
          `data-*` attributes on the body element before React can
          hydrate, which triggers React #418. This suppresses ONLY the
          body-level attribute check; every child still hydrates
          normally, so real hydration bugs inside our tree still
          surface. */}
      <body suppressHydrationWarning>
        <PostHogProvider>
          <div className="main">
            <RotatingTagline />
            <header className="site-header">
              <SiteHeaderNav side="left" />
              {/* The site name is identity and navigation, not a
                  heading for the page's content — so it is a plain
                  link. Each page supplies its own <h1>. */}
              <Link href="/" className="site-logo">
                Hard Problems<span className="hp-period">.</span>
              </Link>
              <SiteHeaderNav side="right" />
            </header>
            <TopBar />
            <div className="container">{children}</div>
          </div>
          <FooterIntro />
          <footer className="site-footer">
            <div className="main">
              <Footer />
            </div>
          </footer>
          <CodeBlockCopyButtons />
        </PostHogProvider>
      </body>
    </html>
  );
}

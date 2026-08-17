import NewsletterForm from './NewsletterForm';

// Full-width newsletter call-to-action, styled as a light-green band.
// Wraps the shared NewsletterForm and locks in the marketing label used
// on the homepage / anywhere else it's dropped in.
//
// Variants:
//   `default`   — light-green top+bottom borders on a transparent
//                 background. Used at page ends and anywhere the
//                 module needs to sit quietly inside body flow.
//   `under-nav` — pale-green fill, no borders, -2rem pull that
//                 cancels the site nav's 2rem bottom margin so the
//                 banner sits flush against the nav. Used at the top
//                 of article pages and /jobs.
//   `inline`    — light-green fill, no borders. Used mid-article-grid
//                 on the homepage so the banner reads as a distinct
//                 filled card rather than a dividing rule.
// Styles for each variant live in globals.css alongside the base
// .newsletter-module rules.
export default function NewsletterModule({
  variant = 'default'
}: {
  variant?: 'default' | 'under-nav' | 'inline';
} = {}) {
  const modifier =
    variant === 'under-nav'
      ? ' newsletter-module--under-nav'
      : variant === 'inline'
        ? ' newsletter-module--inline'
        : '';
  return (
    <div className={`newsletter-module${modifier}`}>
      <div className="newsletter-module-inner">
        <NewsletterForm labelSuffix=" for weekly news and meaningful jobs." />
      </div>
    </div>
  );
}

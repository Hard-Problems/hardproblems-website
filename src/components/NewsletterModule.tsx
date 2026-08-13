import NewsletterForm from './NewsletterForm';

// Full-width newsletter call-to-action, styled as a light-green band.
// Wraps the shared NewsletterForm and locks in the marketing label used
// on the homepage / anywhere else it's dropped in.
//
// `variant="under-nav"` swaps the default light-green-with-borders band
// for the flush-under-nav treatment used on article pages and /jobs:
// pale-green fill, no borders/radius, and a -2rem pull that cancels
// the site nav's 2rem bottom margin so the banner sits flush against
// the nav. Styles live in globals.css alongside the base .newsletter-module
// rules.
export default function NewsletterModule({
  variant = 'default'
}: {
  variant?: 'default' | 'under-nav';
} = {}) {
  const className =
    variant === 'under-nav'
      ? 'newsletter-module newsletter-module--under-nav'
      : 'newsletter-module';
  return (
    <div className={className}>
      <div className="newsletter-module-inner">
        <NewsletterForm labelSuffix=" for weekly news and meaningful jobs." />
      </div>
    </div>
  );
}

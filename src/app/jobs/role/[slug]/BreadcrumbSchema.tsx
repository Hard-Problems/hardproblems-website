// schema.org BreadcrumbList for a job's own page.
//
// Mirrors the visible trail at the top of the page exactly — Google
// requires the markup to match what the reader sees, so the first item
// is labelled "All jobs" because that is the link text, not "Job board".
// The country step is present only when the sheet gives us a country,
// again matching the visible breadcrumb.
//
// Worth having because these pages sit three levels deep. Without it a
// result for one role shows a bare URL; with it, Google can render
// "hardproblems.com › All jobs › USA" and attribute the page to the
// board above it.
//
// Docs: https://developers.google.com/search/docs/appearance/structured-data/breadcrumb

import type { SerializedJob } from '../../fetchJobs';
import { locationSlug } from '../../locations';
import { SITE_URL } from '../../../../lib/siteUrl';

// `</script>` inside a JSON string would otherwise close this block
// early — the sheet's titles are team-authored, but escaping the
// opening angle bracket costs nothing and removes the question.
function toJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

// `country` is the country step of the visible breadcrumb, already
// resolved by the page to one that has a location page — or null when
// none does, in which case the trail skips straight to the job. Passing
// it in rather than deriving it here is what keeps the markup and the
// rendered trail identical, which is what Google asks for.
export default function BreadcrumbSchema({
  job,
  slug,
  country
}: {
  job: SerializedJob;
  slug: string;
  country: string | null;
}) {
  const trail: { name: string; url: string }[] = [
    { name: 'All jobs', url: `${SITE_URL}/jobs` }
  ];

  if (country) {
    trail.push({
      name: country,
      url: `${SITE_URL}/jobs/${locationSlug(country)}`
    });
  }

  // The page itself closes the trail. Google allows the last item's URL
  // to be omitted; including it keeps the list unambiguous for other
  // consumers.
  trail.push({ name: job.title, url: `${SITE_URL}/jobs/role/${slug}` });

  const json = toJsonLd({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((step, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: step.name,
      item: step.url
    }))
  });

  return (
    <script
      type="application/ld+json"
      // Built server-side from vetted sheet data, with `<` escaped
      // above — no untrusted input reaches this string.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}

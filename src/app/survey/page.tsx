// /survey has no page of its own — it forwards to the current survey.
//
// There was nothing here at all, so /survey and /survey/ both 404'd.
// That is the address people type, shorten to and remember, and the one
// a stale link or a talk slide is most likely to carry, so it should
// land somewhere rather than nowhere.
//
// Derived from the registry rather than hardcoded in next.config.ts:
// the target changes every time a survey is added, and a redirect that
// has to be remembered in a second place is a redirect that will
// eventually point at the wrong year.
//
// Temporary (307), not permanent (308), for the same reason. /survey is
// not another name for /survey/2026 — it is "whichever is current", and
// a 308 would be cached by browsers and search engines long after that
// stopped being 2026.

import { notFound, redirect } from 'next/navigation';
import { allSurveys } from '../../lib/survey';
import { opensLater } from '../../lib/survey/preview';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SurveyIndexPage({ searchParams }: Props) {
  // Newest first, but skipping any survey that has not opened yet: an
  // unopened page shows only an "opens on…" notice, so forwarding to it
  // would strand someone who could still be reading last year's. Same
  // filter, and the same reasoning, as sitemap.ts.
  //
  // The fallback keeps the route honest if every survey in the registry
  // is still in the future: better to show the one that is coming than
  // to 404 the address again.
  const surveys = allSurveys();
  const current = surveys.find((survey) => !opensLater(survey)) ?? surveys[0];
  // Only reachable if the registry is empty, i.e. the feature is gone —
  // in which case 404 is the right answer, and better than the 500 that
  // reading `.year` off nothing would produce.
  if (!current) notFound();

  // Carry the query string across. /survey is the address that ends up
  // in a newsletter, a slide or a QR code, which is precisely where
  // `?source=` is attached — and the survey reads it to record where a
  // response came from (see normalizeSource). Dropping it here would
  // silently file every one of those responses as having no source.
  // Only the query is forwarded; the destination path comes from the
  // registry above and is never taken from the request.
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (Array.isArray(value)) for (const v of value) query.append(key, v);
    else if (value !== undefined) query.append(key, value);
  }
  const suffix = query.size > 0 ? `?${query}` : '';

  redirect(`/survey/${current.year}${suffix}`);
}

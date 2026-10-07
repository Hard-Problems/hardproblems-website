// The site's canonical origin, in one place.
//
// It is `www`, not the apex, because that is the host Vercel actually
// serves: `hardproblems.com` 308-redirects to `www.hardproblems.com`.
// Vercel recommends that direction — the DNS spec forbids CNAME records
// on an apex domain, so a www-primary setup gives their CDN more control
// over incoming traffic than an apex pinned to a fixed A record.
//
// Why this file exists: the origin used to be written out in seven
// places, all of them the apex. The result was that every canonical tag,
// every JSON-LD @id and all 629 sitemap URLs pointed at a host that
// immediately redirected — Google would crawl the apex, follow the
// redirect, index the www URL, and find a canonical pointing back at the
// redirecting one. Search Console reported it as "Page with redirect"
// (15 pages), "Duplicate without user-selected canonical" (3) and
// "Alternate page with proper canonical tag" (1).
//
// Keep it as a bare origin: no trailing slash, so `${SITE_URL}/jobs`
// composes cleanly.
export const SITE_URL = 'https://www.hardproblems.com';

-- Allow a second snapshot row, so the jobs board stops reading data it
-- never shows.
--
-- The original table pinned `id = 1` because there was only ever one
-- payload. That held until Column X ("Full job description") was added
-- for the per-job pages: the blob grew from ~0.5MB to 2.78MB, of which
-- Column X alone is 1.85MB — 67%.
--
-- Only /jobs/role/<slug> renders that text. The board, the location
-- hubs, the homepage teaser, the RSS feed and the sitemap all read the
-- same blob and discard it. With `/jobs` rendering per request, that
-- was a multi-second Supabase read on the critical path of every
-- uncached hit, and under cold starts the page began timing out
-- outright — reported by the uptime monitor as "no headers received".
--
-- So: row 1 keeps everything, row 2 is the same jobs with Column X
-- blanked. 2.78MB -> 0.93MB for every surface except a job's own page.
--
-- Safe to run before or after the matching deploy: readJobsSnapshot()
-- falls back to row 1 when row 2 is missing, so the board keeps working
-- in the window between this migration and the next sync.

alter table jobs_snapshot
  drop constraint if exists jobs_snapshot_id_check;

alter table jobs_snapshot
  add constraint jobs_snapshot_id_check check (id in (1, 2));

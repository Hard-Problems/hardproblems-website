-- Durable snapshot of the parsed jobs sheet, written by
-- /api/cron/sync-jobs and read by fetchJobs() on every render.
--
-- Why this exists: the jobs board is `force-dynamic`, so it re-renders
-- per request. Pulling the ~1.6MB Sheet CSV inside that render meant
-- Next's stale-while-revalidate refresh ran on the request's function
-- invocation and repeatedly hit Vercel's 15s ceiling. The task was
-- killed before the refreshed CSV reached the Data Cache, so the stale
-- entry survived indefinitely and the board silently stopped showing
-- new jobs. Moving the fetch to a cron takes it off the request path.
--
-- Single row by design — `id` is pinned to 1 so the sync is a plain
-- upsert and there's no history to prune. The whole payload is one
-- jsonb blob (~0.5MB) rather than a row per job: the board loads every
-- job anyway to filter client-side, so per-job rows would add schema
-- and upsert/delete complexity for no read benefit.
--
-- Same Supabase project as the other tables; the server-side Secret Key
-- bypasses RLS. Nothing here is personal data, but RLS stays on with no
-- policies so the anon key can't read or write it either.

create table if not exists jobs_snapshot (
  id         smallint primary key default 1 check (id = 1),
  synced_at  timestamptz not null default now(),
  -- Jobs as parsed from the sheet, sorted, but WITHOUT the date window
  -- applied — see applyDateWindow() in src/app/jobs/fetchJobs.ts.
  -- Storing them unfiltered means expiry and the 45-day cutoff are
  -- evaluated against the current time on read, so a snapshot written
  -- 15 minutes ago still hides a job that expired 5 minutes ago.
  jobs       jsonb not null
);

alter table jobs_snapshot enable row level security;

-- Tables for the annual survey. Run once in the Supabase SQL editor.
--
-- Two tables on purpose. `survey_responses` holds anonymous answers and
-- nothing that identifies a person; `survey_report_signups` holds the
-- email address of anyone who asked for the report. They share a token,
-- so they CAN be joined, but only deliberately — and an address can be
-- erased without touching the answers it was attached to, which is what
-- makes a GDPR erasure request answerable.
--
-- Note there is no IP address column anywhere. The client IP is used for
-- rate limiting in Upstash and then discarded.

create table if not exists public.survey_responses (
  -- Returned to the respondent, and to nobody else. It is how they can
  -- attach an email afterwards, and how they can ask us to delete this
  -- row without us ever having known who they are.
  token uuid primary key,
  survey_year integer not null,
  -- The whole questionnaire as JSON rather than a column per question:
  -- next year's survey has different questions, and a schema migration
  -- per annual survey is exactly the coupling this design avoids. Every
  -- key and value in here has already been validated against that
  -- year's definition before insert.
  answers jsonb not null,
  -- Normalised ?source= slug, e.g. 'smashing-magazine'. Null when the
  -- link carried no source.
  source text,
  submitted_at timestamptz not null default now()
);

create index if not exists survey_responses_year_idx
  on public.survey_responses (survey_year);

-- Reporting almost always starts "all responses for year X, newest
-- first", and the source breakdown is the other question we know we
-- will ask.
create index if not exists survey_responses_year_submitted_idx
  on public.survey_responses (survey_year, submitted_at desc);

create index if not exists survey_responses_source_idx
  on public.survey_responses (survey_year, source)
  where source is not null;

create table if not exists public.survey_report_signups (
  -- Same token as the response it came from. Unique, so a respondent
  -- can correct their address by submitting again rather than creating
  -- a second row.
  token uuid primary key,
  survey_year integer not null,
  email text not null,
  -- Whether they also opted into the newsletter. Stored as given: the
  -- form ships this unticked, because UK GDPR requires consent to be an
  -- affirmative action and a pre-ticked box is not one.
  newsletter_consent boolean not null default false,
  -- Being able to demonstrate consent means being able to say when it
  -- was given.
  consented_at timestamptz not null default now()
);

create index if not exists survey_report_signups_year_idx
  on public.survey_report_signups (survey_year);

-- Both tables are written only by the server using the Secret Key,
-- which bypasses RLS. Enabling RLS with no policies means that if the
-- anon key is ever used against them by mistake, it reads nothing
-- rather than everything.
alter table public.survey_responses enable row level security;
alter table public.survey_report_signups enable row level security;

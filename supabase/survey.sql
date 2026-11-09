-- Table for the annual survey. Run once in the Supabase SQL editor.
--
-- `survey_responses` holds anonymous answers and nothing that identifies
-- a person. No email address is collected with a response.
--
-- Note there is no IP address column anywhere. The client IP is used for
-- rate limiting in Upstash and then discarded.

create table if not exists public.survey_responses (
  -- A random key for the row. Nothing else.
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
  -- The language the respondent was reading: 'en', 'fr', 'zh'… (see
  -- src/lib/survey/i18n/languages.ts). The answers themselves are ids,
  -- the same in every language.
  language text not null default 'en',
  submitted_at timestamptz not null default now()
);

-- For a table created before translations existed:
alter table public.survey_responses
  add column if not exists language text not null default 'en';

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

-- Written only by the server using the Secret Key, which bypasses RLS.
-- Enabling RLS with no policies means that if the anon key is ever used
-- against it by mistake, it reads nothing rather than everything.
alter table public.survey_responses enable row level security;

-- `survey_report_signups` used to hold emails for the results report.
-- It is no longer written to. To remove it from a database that has it:
--   drop table if exists public.survey_report_signups;

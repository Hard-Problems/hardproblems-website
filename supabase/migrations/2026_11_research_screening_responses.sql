-- Responses to the hidden participant screening form for the job-board
-- user research (/research/job-board).
--
-- Same Supabase project as the other form tables; the server-side
-- Secret Key bypasses RLS. Anon key must never touch this table — rows
-- can hold contact details.
--
-- Answers are stored as the option labels shown on the form, so rows
-- read naturally in the Supabase table editor.

create table if not exists research_screening_responses (
  id                 uuid primary key default gen_random_uuid(),
  submitted_at       timestamptz not null default now(),

  -- Section 1: About you
  visited_job_board  text not null,     -- Yes | No
  role               text not null,
  role_other         text,              -- when role = 'Other'
  experience         text not null,
  country            text not null,

  -- Section 2: Job-search experience
  last_job_search    text not null,
  took_action        text not null,     -- Yes | No | Not sure / Can't remember
  actions            text[] not null default '{}',
  action_other       text,              -- when actions includes 'Other'

  -- Section 3: Research participation
  research_interest  text not null,
  email              text,              -- only when interest is Yes / Maybe
  contact_consent    boolean not null default false,
  -- The chosen session slot (one entry), in the participant's time zone:
  available_days     text[] not null default '{}',  -- e.g. 'Tuesday 10 November'
  available_times    text[] not null default '{}',  -- e.g. 'Tuesday 10 November · 2:00 PM'
  time_zone          text,                          -- IANA, e.g. 'Europe/London'
  comments           text
);

alter table research_screening_responses enable row level security;

create index if not exists research_screening_responses_submitted_at_idx
  on research_screening_responses (submitted_at desc);

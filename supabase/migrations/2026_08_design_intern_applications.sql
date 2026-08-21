-- Storage for the one-off "Design intern" job application form
-- (content/articles/design-intern.md). The article auto-removes on
-- 2026-09-16 UTC but this table persists so hiring can be reviewed
-- afterwards.
--
-- Same Supabase project as the other form tables; the server-side
-- Secret Key bypasses RLS. Anon key must never touch this table —
-- every row holds contact details + long-form answers.

create table if not exists design_intern_applications (
  id                    uuid primary key default gen_random_uuid(),
  submitted_at          timestamptz not null default now(),

  -- Contact / identity
  full_name             text not null,
  email                 text not null,
  location              text not null,

  -- Portfolio + writing samples
  portfolio_url         text not null,
  writing_example_url   text,               -- optional
  linkedin_or_cv_url    text not null,

  -- Essay answers (each is a moderate-length paragraph)
  why_role              text not null,
  proudest_project      text not null,
  dream_job             text not null,

  -- Eligibility gates. Booleans render as yes/no radios in the form;
  -- `available_schedule` is a 3-option radio (yes / no / other) —
  -- kept as text with a check constraint. When the answer is
  -- "other", `available_schedule_other` holds the applicant's
  -- free-text explanation.
  right_to_work_uk         boolean not null,
  available_schedule       text not null
    check (available_schedule in ('yes', 'no', 'other')),
  available_schedule_other text,
  available_full_term      boolean not null
);

alter table design_intern_applications enable row level security;

create index if not exists design_intern_applications_submitted_at_idx
  on design_intern_applications (submitted_at desc);

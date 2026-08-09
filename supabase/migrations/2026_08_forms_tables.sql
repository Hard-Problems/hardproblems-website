-- New tables to replace the two remaining Google Forms:
--   * coworking desk applications
--   * podcast guest suggestions
--
-- Same Supabase project as the alerts tables; the server-side Secret
-- Key bypasses RLS. Anon key must never touch these tables (both
-- capture PII the public isn't meant to read back).

create table if not exists desk_applications (
  id           uuid primary key default gen_random_uuid(),
  submitted_at timestamptz not null default now(),
  -- Direct-form fields (present as columns rather than jsonb so
  -- Supabase's browser UI can filter/sort them directly). Names
  -- mirror the Google Form question wording so historical imports
  -- map 1:1.
  email        text not null,
  full_name    text not null,
  profile_url  text not null,
  desk_type    text not null,        -- "Free long-term desk" | "Drop-in desk for 1-5 days" | …
  hard_problem text not null,        -- "What 'hard problem' do you work on?"
  organization text,                 -- optional
  note         text,                 -- free-form notes / timing / details
  -- Provenance so we can distinguish historical imports from
  -- live submissions if we ever need to reconcile.
  source       text not null default 'website'
    check (source in ('website', 'google_form_import'))
);

create table if not exists podcast_guest_suggestions (
  id                   uuid primary key default gen_random_uuid(),
  submitted_at         timestamptz not null default now(),
  suggester_name       text not null,
  suggester_email      text,                 -- optional
  guest_name           text not null,
  guest_profile_url    text not null,
  recommendation_reason text not null,
  source               text not null default 'website'
    check (source in ('website', 'google_form_import'))
);

-- Both tables are lock-down-by-default. Only server routes using the
-- Secret Key can read/write; the anon key has zero access.
alter table desk_applications          enable row level security;
alter table podcast_guest_suggestions  enable row level security;

-- Speed up the "most recent submissions" queries the admins run in
-- the Supabase browser UI.
create index if not exists desk_applications_submitted_at_idx
  on desk_applications (submitted_at desc);
create index if not exists podcast_guest_suggestions_submitted_at_idx
  on podcast_guest_suggestions (submitted_at desc);

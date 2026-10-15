-- Digger-Argon Live Tuning & Telemetry Database Schema
-- Supabase Migration for real-time live parameter tuning, cloud preset sharing, and performance telemetry.
-- Apply in Supabase SQL editor: https://hutjfgbjjagqdjjeszqj.supabase.co
-- Safe to re-run.

-- 1. Active tuning configurations and community/architect presets
create table if not exists public.digger_tuning_sessions (
  id          text primary key default gen_random_uuid()::text,
  name        text not null check (char_length(name) between 1 and 64),
  author      text not null default 'anon' check (char_length(author) <= 64),
  description text default '',
  tuning      jsonb not null default '{}'::jsonb,
  is_preset   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2. Performance snapshots and telemetry (DPS, par times, hits-to-break, level progress)
create table if not exists public.digger_tuning_telemetry (
  id            bigint generated always as identity primary key,
  session_id    text references public.digger_tuning_sessions(id) on delete set null,
  pid           uuid,
  ver           text not null check (char_length(ver) between 1 and 16),
  level         smallint not null default 0,
  dps           double precision default 0,
  hits_to_break double precision default 0,
  par_time      real default 0,
  overrides     jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

-- Indexes for rapid retrieval and indexing
create index if not exists digger_tuning_sessions_created_at on public.digger_tuning_sessions (created_at desc);
create index if not exists digger_tuning_sessions_name on public.digger_tuning_sessions (name);
create index if not exists digger_tuning_sessions_preset on public.digger_tuning_sessions (is_preset);
create index if not exists digger_tuning_telemetry_created_at on public.digger_tuning_telemetry (created_at desc);
create index if not exists digger_tuning_telemetry_level on public.digger_tuning_telemetry (level);

-- Row Level Security (RLS)
alter table public.digger_tuning_sessions enable row level security;
alter table public.digger_tuning_telemetry enable row level security;

-- Policies: digger_tuning_sessions
drop policy if exists "Allow public select on digger_tuning_sessions" on public.digger_tuning_sessions;
create policy "Allow public select on digger_tuning_sessions"
  on public.digger_tuning_sessions for select
  using (true);

drop policy if exists "Allow public insert on digger_tuning_sessions" on public.digger_tuning_sessions;
create policy "Allow public insert on digger_tuning_sessions"
  on public.digger_tuning_sessions for insert
  with check (true);

drop policy if exists "Allow public update on digger_tuning_sessions" on public.digger_tuning_sessions;
create policy "Allow public update on digger_tuning_sessions"
  on public.digger_tuning_sessions for update
  using (true);

-- Policies: digger_tuning_telemetry
drop policy if exists "Allow public select on digger_tuning_telemetry" on public.digger_tuning_telemetry;
create policy "Allow public select on digger_tuning_telemetry"
  on public.digger_tuning_telemetry for select
  using (true);

drop policy if exists "Allow public insert on digger_tuning_telemetry" on public.digger_tuning_telemetry;
create policy "Allow public insert on digger_tuning_telemetry"
  on public.digger_tuning_telemetry for insert
  with check (true);

-- Seed initial default reference presets
insert into public.digger_tuning_sessions (id, name, author, description, tuning, is_preset)
values
  ('preset-balanced-vanilla', 'Canonical Baseline (Year 1)', 'Architect', 'Authored default curves matching the 365-day Monte Carlo pacing invariants.', '{}'::jsonb, true),
  ('preset-fast-paced-turbo', 'Turbo Playtest (2x Pace)', 'Architect', 'Accelerated pacing with 2x pick damage, 2x coins, and 1.5x Rafeeq power.', '{"pickMult":2.0,"coinDropMult":2.0,"rafeeqShare":0.9}'::jsonb, true),
  ('preset-rhythmic-focus', 'Harmonic Rhythms Mastery', 'Architect', 'High reward for musical active play: 4.0x Good Hit, 3.0x Fever Mode, and 5-row Shockwaves.', '{"goodHitMult":4.0,"feverDmgMult":3.0,"shockwaveRows":5}'::jsonb, true)
on conflict (id) do nothing;

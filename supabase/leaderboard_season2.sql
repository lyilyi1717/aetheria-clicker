-- Aetheria Clicker leaderboard, Season 2 (roadmap R19).
-- Run AFTER supabase/leaderboard.sql, which created Season 1 (public.leaderboard).
-- Paste into Supabase Dashboard -> SQL Editor -> New query -> Run. Safe to re-run.
--
-- What it does:
--   1. Creates public.leaderboard_season: one row per (season, player), starting at season 2.
--      Later seasons reuse this table; only leaderboard_current_season() changes.
--   2. Lets anyone read it and each signed-in player write only their own row, and only in
--      the current season (earlier seasons become read-only by themselves).
--   3. Adds the same server-side guard as Season 1 (server clock for last_seen/updated_at,
--      per-account-age stat ceilings), with a floor ceiling fitted to the R8 Tower curves.
--   4. Freezes Season 1 as a read-only Hall of Fame: its rows stay, writes stop.
-- It never deletes or rewrites Season 1 rows. Re-running supabase/leaderboard.sql would
-- re-open Season 1 for writes; run this file again afterwards to freeze it again.

begin;

-- 1. Table ------------------------------------------------------------------------------
create table if not exists public.leaderboard_season (
  season         smallint not null check (season >= 2),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  display_name   text not null
                 check (char_length(display_name) between 3 and 20
                        and display_name ~ '^[A-Za-z0-9 _-]+$'),
  aether_log10   double precision not null default 0,  -- log10(best single-run Aether)
  aether_text    text not null default '0',            -- formatted value for display
  max_floor      integer not null default 1 check (max_floor >= 1),   -- post-R8 floor (hero.indexFloor)
  ascensions     integer not null default 0 check (ascensions >= 0),
  transcends     integer not null default 0 check (transcends >= 0),
  max_depth      integer not null default 1 check (max_depth >= 1),
  game_version   text,
  updated_at     timestamptz not null default now(),
  last_seen      timestamptz not null default now(),   -- heartbeat for "playing now"
  primary key (season, user_id)
);

create index if not exists leaderboard_season_floor_idx     on public.leaderboard_season (season, max_floor desc, updated_at);
create index if not exists leaderboard_season_aether_idx    on public.leaderboard_season (season, aether_log10 desc, updated_at);
create index if not exists leaderboard_season_ascend_idx    on public.leaderboard_season (season, ascensions desc, updated_at);
create index if not exists leaderboard_season_transc_idx    on public.leaderboard_season (season, transcends desc, updated_at);
create index if not exists leaderboard_season_depth_idx     on public.leaderboard_season (season, max_depth desc, updated_at);
create index if not exists leaderboard_season_last_seen_idx on public.leaderboard_season (season, last_seen desc);

-- The season players write to. To start Season 3, replace the 2 below and re-run this
-- function alone; Season 2 rows then become read-only through the policies below.
create or replace function public.leaderboard_current_season()
returns smallint
language sql
stable
as $$ select 2::smallint $$;

grant execute on function public.leaderboard_current_season() to anon, authenticated;

-- 2. Row level security ------------------------------------------------------------------
alter table public.leaderboard_season enable row level security;

drop policy if exists "seasons are public"                      on public.leaderboard_season;
drop policy if exists "players insert their own current row"    on public.leaderboard_season;
drop policy if exists "players update their own current row"    on public.leaderboard_season;

create policy "seasons are public"
  on public.leaderboard_season for select
  to anon, authenticated
  using (true);

create policy "players insert their own current row"
  on public.leaderboard_season for insert
  to authenticated
  with check (auth.uid() = user_id and season = public.leaderboard_current_season());

create policy "players update their own current row"
  on public.leaderboard_season for update
  to authenticated
  using (auth.uid() = user_id and season = public.leaderboard_current_season())
  with check (auth.uid() = user_id and season = public.leaderboard_current_season());

revoke all on public.leaderboard_season from anon, authenticated;
grant select on public.leaderboard_season to anon, authenticated;
grant insert, update on public.leaderboard_season to authenticated;

-- 3. Server-side guard -------------------------------------------------------------------
-- Same idea as leaderboard_guard() in leaderboard.sql: every column is client-sent, so the
-- trigger takes last_seen from the server clock, keeps updated_at (the tie-break: first to
-- reach a score ranks higher) unless a ranked stat changed, and clamps each stat to a
-- generous ceiling for the account's age (clamped, not rejected, so an honest client never
-- loops on errors).
-- Floor ceiling 1,000 + 1,000/h: after R8 a new save climbs at most ~350 floors/h early and
-- walls at ~650-750 after a week (npm run sim:tower); legacy saves were rebased to ~5,500.
-- An account at least ~5 h old is never clamped; a brand-new account carrying a rebased
-- legacy save is held back for its first hours, then reaches its real floor on later pushes.
-- Transcends 10 + 10/h. Aether, Ascensions and Depth keep the Season 1 ceilings.
create or replace function public.leaderboard_season_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  hours double precision;
begin
  select greatest(0, extract(epoch from (now() - u.created_at)) / 3600.0)
    into hours
    from auth.users u
   where u.id = new.user_id;
  hours := coalesce(hours, 0);

  if new.aether_log10 is null or new.aether_log10 = 'NaN'::double precision then
    new.aether_log10 := 0;
  end if;
  new.aether_log10 := greatest(0, least(new.aether_log10, 300 + 100 * hours, 9e15));
  new.max_floor    := greatest(1, least(new.max_floor::double precision, 1000 + 1000 * hours, 2147483647))::integer;
  new.ascensions   := greatest(0, least(new.ascensions::double precision, 100 + 100 * hours, 2147483647))::integer;
  new.transcends   := greatest(0, least(new.transcends::double precision, 10 + 10 * hours, 2147483647))::integer;
  new.max_depth    := greatest(1, least(new.max_depth::double precision, 10000 + 10000 * hours, 2147483647))::integer;
  new.aether_text  := left(new.aether_text, 32);
  new.game_version := left(new.game_version, 16);

  new.last_seen := now();
  if tg_op = 'UPDATE'
     and new.aether_log10 = old.aether_log10 and new.max_floor = old.max_floor
     and new.ascensions = old.ascensions and new.transcends = old.transcends
     and new.max_depth = old.max_depth then
    new.updated_at := old.updated_at;
  else
    new.updated_at := now();
  end if;
  return new;
end;
$$;

revoke all on function public.leaderboard_season_guard() from public, anon, authenticated;

drop trigger if exists leaderboard_season_guard on public.leaderboard_season;
create trigger leaderboard_season_guard
  before insert or update on public.leaderboard_season
  for each row execute function public.leaderboard_season_guard();

-- 4. Freeze Season 1 (read-only Hall of Fame) --------------------------------------------
-- Rows, the read policy and the Season 1 guard stay; only the write paths close.
drop policy if exists "players insert their own row" on public.leaderboard;
drop policy if exists "players update their own row" on public.leaderboard;
revoke insert, update, delete on public.leaderboard from anon, authenticated;

commit;

-- Make the new table visible to the REST API right away.
notify pgrst, 'reload schema';

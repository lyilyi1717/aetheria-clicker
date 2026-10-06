-- Aetheria Clicker leaderboard schema.
-- Paste into Supabase Dashboard -> SQL Editor -> New query -> Run. Safe to re-run.
-- Players sign in anonymously; each player can only insert/update their own row.

create table if not exists public.leaderboard (
  user_id        uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  display_name   text not null
                 check (char_length(display_name) between 3 and 20
                        and display_name ~ '^[A-Za-z0-9 _-]+$'),
  aether_log10   double precision not null default 0,  -- log10(lifetime Aether); sortable at any magnitude
  aether_text    text not null default '0',            -- formatted value for display
  max_floor      integer not null default 1 check (max_floor >= 1),
  ascensions     integer not null default 0 check (ascensions >= 0),
  max_depth      integer not null default 1 check (max_depth >= 1),
  game_version   text,
  updated_at     timestamptz not null default now(),
  last_seen      timestamptz not null default now()    -- heartbeat for "playing now"
);

create index if not exists leaderboard_aether_idx    on public.leaderboard (aether_log10 desc);
create index if not exists leaderboard_floor_idx     on public.leaderboard (max_floor desc);
create index if not exists leaderboard_ascend_idx    on public.leaderboard (ascensions desc);
create index if not exists leaderboard_depth_idx     on public.leaderboard (max_depth desc);
create index if not exists leaderboard_last_seen_idx on public.leaderboard (last_seen desc);

alter table public.leaderboard enable row level security;

drop policy if exists "leaderboard is public"       on public.leaderboard;
drop policy if exists "players insert their own row" on public.leaderboard;
drop policy if exists "players update their own row" on public.leaderboard;

create policy "leaderboard is public"
  on public.leaderboard for select
  to anon, authenticated
  using (true);

create policy "players insert their own row"
  on public.leaderboard for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "players update their own row"
  on public.leaderboard for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select on public.leaderboard to anon, authenticated;
grant insert, update on public.leaderboard to authenticated;

-- ---------------------------------------------------------------------------------------
-- Server-side guard. Every column above is sent by the client, so without this anyone can
-- post max_floor = 999999 or a far-future last_seen. The trigger:
--   * sets last_seen to the server clock, and keeps updated_at (the tie-break: first to
--     reach a score ranks higher) unless a ranked stat actually changed;
--   * clamps each stat to a generous ceiling for the account's age. Measured play is far
--     below these (an optimal bot: ~31 ascensions/h, depth ~3,750 in its first hour), so
--     honest players never hit them; a forged row gets clamped instead of rejected, so a
--     legitimate client never gets stuck in an error loop.
-- Anonymous accounts are free to create, so this bounds fake scores rather than ruling
-- them out; per-account ceilings mean a fresh account cannot top the board on day one.
create or replace function public.leaderboard_guard()
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
  new.max_floor    := greatest(1, least(new.max_floor::double precision, 10000 + 10000 * hours, 2147483647))::integer;
  new.ascensions   := greatest(0, least(new.ascensions::double precision, 100 + 100 * hours, 2147483647))::integer;
  new.max_depth    := greatest(1, least(new.max_depth::double precision, 10000 + 10000 * hours, 2147483647))::integer;
  new.aether_text  := left(new.aether_text, 32);
  new.game_version := left(new.game_version, 16);

  new.last_seen := now();
  if tg_op = 'UPDATE'
     and new.aether_log10 = old.aether_log10 and new.max_floor = old.max_floor
     and new.ascensions = old.ascensions and new.max_depth = old.max_depth then
    new.updated_at := old.updated_at;
  else
    new.updated_at := now();
  end if;
  return new;
end;
$$;

revoke all on function public.leaderboard_guard() from public, anon, authenticated;

drop trigger if exists leaderboard_guard on public.leaderboard;
create trigger leaderboard_guard
  before insert or update on public.leaderboard
  for each row execute function public.leaderboard_guard();

-- Aetheria cloud saves (player accounts).
-- Paste into Supabase Dashboard -> SQL Editor -> New query -> Run. Safe to re-run.
--
-- One row per signed-in account. Row Level Security lets a player read, write and delete
-- only their own row; nobody can list or read anyone else's save. Anonymous sessions (the
-- leaderboard's guest sign-in) cannot use this table: only real accounts (email or Google).
--
-- The client (js/engine/CloudSave.js) uploads the same JSON the game keeps in localStorage
-- (GameState.serialize()), so loading a cloud save goes through deserialize + migrations
-- exactly like a local one.

create table if not exists public.saves (
  user_id     uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data        jsonb not null,
  version     integer not null default 0,                -- save format version (migrations.js)
  saved_at    timestamptz,                               -- client clock when the save was made
  updated_at  timestamptz not null default now(),        -- server clock of the last upload
  constraint saves_data_is_object check (jsonb_typeof(data) = 'object'),
  constraint saves_data_size check (pg_column_size(data) <= 2 * 1024 * 1024)
);

alter table public.saves enable row level security;

drop policy if exists "players read their own save"   on public.saves;
drop policy if exists "players insert their own save" on public.saves;
drop policy if exists "players update their own save" on public.saves;
drop policy if exists "players delete their own save" on public.saves;

-- auth.uid() is wrapped in a select so Postgres evaluates it once per query, not per row.
-- Guest (anonymous) sessions carry is_anonymous = true in their token and are refused.
create policy "players read their own save"
  on public.saves for select
  to authenticated
  using ((select auth.uid()) = user_id
         and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);

create policy "players insert their own save"
  on public.saves for insert
  to authenticated
  with check ((select auth.uid()) = user_id
              and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);

create policy "players update their own save"
  on public.saves for update
  to authenticated
  using ((select auth.uid()) = user_id
         and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false)
  with check ((select auth.uid()) = user_id);

create policy "players delete their own save"
  on public.saves for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.saves from anon;
grant select, insert, update, delete on public.saves to authenticated;

-- updated_at always comes from the server clock.
create or replace function public.saves_touch()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists saves_touch on public.saves;
create trigger saves_touch
  before insert or update on public.saves
  for each row execute function public.saves_touch();

-- RLS check (optional, run as two different signed-in users from the browser console or the
-- SQL editor with "set role authenticated; set request.jwt.claims = '{"sub":"<uuid>"}'"):
--   select * from public.saves;   -- returns only the caller's row, never another player's

-- ---------------------------------------------------------------------------------------
-- Leaderboard link. A signed-in player's leaderboard row is their account's row. The guest
-- (anonymous) row this browser posted before signing in is deleted by the client so nobody
-- is listed twice; this lets a player delete only their own current-season row. Skipped if
-- supabase/leaderboard_season2.sql has not been run yet.
do $$
begin
  if to_regclass('public.leaderboard_season') is not null then
    drop policy if exists "players delete their own current row" on public.leaderboard_season;
    create policy "players delete their own current row"
      on public.leaderboard_season for delete
      to authenticated
      using ((select auth.uid()) = user_id);
    grant delete on public.leaderboard_season to authenticated;
  end if;
end;
$$;

-- Aetheria leaderboard: registered players only.
-- Paste into Supabase Dashboard -> SQL Editor -> New query -> Run. Safe to re-run, before or
-- after supabase/leaderboard_season2.sql (run this again after that one: it re-creates the
-- Season 2 write policies without the guest check).
--
-- The client (js/leaderboard.js) posts only with an account session (email or Google), under the
-- account's nickname. These rules make the database enforce it: guest (anonymous) sessions carry
-- is_anonymous = true in their token and can no longer write a row, and the guest rows already
-- there are deleted, so the board lists registered players only.
-- auth.jwt() is wrapped in a select so Postgres evaluates it once per query, not per row.

-- Season 1 (public.leaderboard): only while it is still the live board. Once
-- leaderboard_season2.sql has run it is frozen (no write policies) and stays that way.
do $$
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'leaderboard'
             and policyname = 'players insert their own row') then
    drop policy "players insert their own row" on public.leaderboard;
    create policy "players insert their own row"
      on public.leaderboard for insert
      to authenticated
      with check (auth.uid() = user_id
                  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'leaderboard'
             and policyname = 'players update their own row') then
    drop policy "players update their own row" on public.leaderboard;
    create policy "players update their own row"
      on public.leaderboard for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id
                  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);
  end if;
end $$;

delete from public.leaderboard l
  using auth.users u
  where u.id = l.user_id and u.is_anonymous;

-- Season 2 and later (public.leaderboard_season), if leaderboard_season2.sql has run
do $$
begin
  if to_regclass('public.leaderboard_season') is not null then
    drop policy if exists "players insert their own current row" on public.leaderboard_season;
    drop policy if exists "players update their own current row" on public.leaderboard_season;
    create policy "players insert their own current row"
      on public.leaderboard_season for insert
      to authenticated
      with check (auth.uid() = user_id and season = public.leaderboard_current_season()
                  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);
    create policy "players update their own current row"
      on public.leaderboard_season for update
      to authenticated
      using (auth.uid() = user_id and season = public.leaderboard_current_season())
      with check (auth.uid() = user_id and season = public.leaderboard_current_season()
                  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);
    delete from public.leaderboard_season l
      using auth.users u
      where u.id = l.user_id and u.is_anonymous;
  end if;
end $$;

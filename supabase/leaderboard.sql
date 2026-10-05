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

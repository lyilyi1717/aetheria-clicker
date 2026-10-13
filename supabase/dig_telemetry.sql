-- Dig: anonymous play data from real players, so the sims can be checked against them.
-- Apply: Supabase Dashboard -> SQL Editor -> New query -> paste this whole file -> Run. Safe to re-run.
--
-- What is stored: a random id made on the player's device (no account, no email, no IP is read or kept), the game
-- version, and numbers about play: how long a road level took, what was bought or picked, pace samples, session lengths.
-- Who can do what: the public (anon) key may INSERT rows and nothing else. Nobody but the service role can read raw rows.
-- Statistics come out only through the security definer functions at the bottom (dig_overview, dig_level_stats,
-- dig_choice_stats, dig_pace_stats); they return aggregates, never rows.
-- Client: proto/features/telemetry/. Reader: sim/proto/player-stats.mjs.

-- ---------------------------------------------------------------------------------------------------------
-- One row per road/side try that ends.
create table if not exists public.dig_tries (
  id          bigint generated always as identity primary key,
  pid         uuid not null,
  ver         text not null check (char_length(ver) between 1 and 16),
  site        text not null check (char_length(site) between 1 and 24),
  floor       integer not null check (floor between 0 and 2000),
  twist       text not null default '' check (char_length(twist) <= 16),
  level       smallint not null check (level between 0 and 60),           -- road level 1..20, 0 = off the road
  try_n       integer not null check (try_n between 0 and 100000),
  outcome     text not null check (outcome in ('finished', 'left', 'newsite')),
  att_s       real not null check (att_s between 0 and 3.0e7),            -- attended seconds (the stopwatch)
  tot_s       real check (tot_s between 0 and 3.0e7),                     -- seconds on the clock since the site began
  par_s       integer check (par_s between 0 and 3.0e7),
  depth       integer check (depth between 0 and 1000000),
  gate_left   real check (gate_left between 0 and 1),                     -- fraction of the Gate's health left
  rocks       integer check (rocks between 0 and 10000),                  -- Big Rocks broken
  stars       integer check (stars between 0 and 1000000000),
  coins       double precision check (coins >= 0 and coins < 1e300),
  pick        double precision check (pick >= 0 and pick < 1e300),       -- pick power
  rafeeqs     smallint check (rafeeqs between 0 and 1000),
  drill       smallint check (drill between 0 and 1000),
  dynamite    smallint check (dynamite between 0 and 1000),
  magnet      smallint check (magnet between 0 and 1000),
  days        real check (days between 0 and 20000),                      -- days since this device started playing
  created_at  timestamptz not null default now()
);

-- One row per purchase or pick.
create table if not exists public.dig_choices (
  id          bigint generated always as identity primary key,
  pid         uuid not null,
  ver         text not null check (char_length(ver) between 1 and 16),
  kind        text not null check (kind in ('buy', 'relic', 'card', 'kit')),
  item        text not null check (char_length(item) between 1 and 40),   -- upgrade id, relic id or card key
  lv          integer check (lv between 0 and 100000),                    -- level after the purchase
  shop        text check (char_length(shop) <= 16),
  offered     text[] check (cardinality(offered) <= 6),                   -- what was on the cards (relic, card)
  level       smallint not null check (level between 0 and 60),
  att_s       real check (att_s between 0 and 3.0e7),                     -- attended seconds into the site
  coins       double precision check (coins >= 0 and coins < 1e300),      -- before the purchase
  stars       double precision check (stars >= 0 and stars < 1e300),
  price       double precision check (price >= 0 and price < 1e300),
  days        real check (days between 0 and 20000),
  created_at  timestamptz not null default now()
);

-- A few pace samples per site (about one per attended minute).
create table if not exists public.dig_pace (
  id          bigint generated always as identity primary key,
  pid         uuid not null,
  ver         text not null check (char_length(ver) between 1 and 16),
  level       smallint not null check (level between 0 and 60),
  site        text not null check (char_length(site) between 1 and 24),
  n           integer not null check (n between 1 and 1000),
  att_s       real not null check (att_s between 0 and 3.0e7),
  depth       integer check (depth between 0 and 1000000),
  gain        integer check (gain between 0 and 1000000),                 -- depth gained since the last sample
  coins_s     double precision check (coins_s >= 0 and coins_s < 1e300),
  blocks_s    real check (blocks_s between 0 and 10000),
  hits_s      real check (hits_s between 0 and 10000),
  idle        real check (idle between 0 and 1),                          -- share of the minute the player was not digging
  days        real check (days between 0 and 20000),
  created_at  timestamptz not null default now()
);

-- One row each time the page hides.
create table if not exists public.dig_sessions (
  id             bigint generated always as identity primary key,
  pid            uuid not null,
  ver            text not null check (char_length(ver) between 1 and 16),
  len_s          real not null check (len_s between 0 and 1.0e6),
  att_s          real check (att_s between 0 and 1.0e6),
  away_before_s  real check (away_before_s between 0 and 3.2e8),          -- time since the last session ended
  away_s         real check (away_s between 0 and 3.2e8),                -- offline time settled in this session
  away_coins     double precision check (away_coins >= 0 and away_coins < 1e300),
  days           real check (days between 0 and 20000),
  created_at     timestamptz not null default now()
);

create index if not exists dig_tries_pid_idx    on public.dig_tries    (pid, created_at);
create index if not exists dig_tries_level_idx  on public.dig_tries    (level, outcome);
create index if not exists dig_choices_pid_idx  on public.dig_choices  (pid, created_at);
create index if not exists dig_pace_pid_idx     on public.dig_pace     (pid, created_at);
create index if not exists dig_sessions_pid_idx on public.dig_sessions (pid, created_at);

-- ---------------------------------------------------------------------------------------------------------
-- Guard: runs before every insert. The server clock sets created_at; a row bigger than the cap, or one past the
-- player's per-minute limit, is quietly skipped (the request still succeeds, so a client never loops on it).
-- Limits per player id per minute: tries 12, choices 60, pace 12, sessions 6 (the arguments).
-- Security definer: the guard counts the player's recent rows, which the anon role itself may not read.
create or replace function public.dig_guard() returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  n integer;
begin
  new.created_at := now();
  if octet_length(new::text) > 1500 then return null; end if;
  execute format('select count(*) from public.%I where pid = $1 and created_at > now() - interval ''1 minute''', tg_table_name)
    into n using new.pid;
  if n >= tg_argv[0]::integer then return null; end if;
  return new;
end;
$$;

drop trigger if exists dig_guard on public.dig_tries;
drop trigger if exists dig_guard on public.dig_choices;
drop trigger if exists dig_guard on public.dig_pace;
drop trigger if exists dig_guard on public.dig_sessions;
create trigger dig_guard before insert on public.dig_tries    for each row execute function public.dig_guard(12);
create trigger dig_guard before insert on public.dig_choices  for each row execute function public.dig_guard(60);
create trigger dig_guard before insert on public.dig_pace     for each row execute function public.dig_guard(12);
create trigger dig_guard before insert on public.dig_sessions for each row execute function public.dig_guard(6);

-- ---------------------------------------------------------------------------------------------------------
-- Rules: insert only. No select, update or delete policy exists for anyone but the service role.
alter table public.dig_tries    enable row level security;
alter table public.dig_choices  enable row level security;
alter table public.dig_pace     enable row level security;
alter table public.dig_sessions enable row level security;

drop policy if exists "anyone may add a try"     on public.dig_tries;
drop policy if exists "anyone may add a choice"  on public.dig_choices;
drop policy if exists "anyone may add a sample"  on public.dig_pace;
drop policy if exists "anyone may add a session" on public.dig_sessions;
create policy "anyone may add a try"     on public.dig_tries    for insert to anon, authenticated with check (true);
create policy "anyone may add a choice"  on public.dig_choices  for insert to anon, authenticated with check (true);
create policy "anyone may add a sample"  on public.dig_pace     for insert to anon, authenticated with check (true);
create policy "anyone may add a session" on public.dig_sessions for insert to anon, authenticated with check (true);

-- Revoke the defaults explicitly, then give back only INSERT.
revoke all on public.dig_tries, public.dig_choices, public.dig_pace, public.dig_sessions from public, anon, authenticated;
grant insert on public.dig_tries, public.dig_choices, public.dig_pace, public.dig_sessions to anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------
-- Statistics. Security definer: they read the tables as their owner and return aggregates only.
-- A median needs at least 3 players behind it, else it is null (nobody can be picked out of a small group).

-- Totals.
create or replace function public.dig_overview()
returns table (players bigint, sessions bigint, tries bigint, choices bigint, pace_rows bigint,
               session_min_median numeric, att_min_median numeric, away_h_median numeric, first_seen timestamptz, last_seen timestamptz)
language sql stable security definer set search_path = public
as $$
  select
    (select count(distinct pid) from (select pid from public.dig_tries union select pid from public.dig_sessions) x),
    (select count(*) from public.dig_sessions),
    (select count(*) from public.dig_tries),
    (select count(*) from public.dig_choices),
    (select count(*) from public.dig_pace),
    (select round((percentile_cont(0.5) within group (order by len_s) / 60)::numeric, 1) from public.dig_sessions where (select count(distinct pid) from public.dig_sessions) >= 3),
    (select round((percentile_cont(0.5) within group (order by att_s) / 60)::numeric, 1) from public.dig_sessions where (select count(distinct pid) from public.dig_sessions) >= 3),
    (select round((percentile_cont(0.5) within group (order by away_before_s) / 3600)::numeric, 1) from public.dig_sessions where away_before_s is not null and (select count(distinct pid) from public.dig_sessions) >= 3),
    (select min(created_at) from public.dig_tries),
    (select max(created_at) from public.dig_tries);
$$;

-- Per road level (1 to 20): who got there, how many tries and attended minutes to the first finish, on which day, and who stopped.
create or replace function public.dig_level_stats()
returns table (level integer, players bigint, finished bigint, tries_median numeric, tries_p75 numeric,
               att_min_median numeric, att_min_p75 numeric, days_median numeric, quit_share numeric)
language sql stable security definer set search_path = public
as $$
  with t as (select pid, level, outcome, att_s, days, created_at, try_n from public.dig_tries where level between 1 and 60 and outcome in ('finished', 'left')),
  fin as (select pid, level, min(created_at) as at from t where outcome = 'finished' group by pid, level),
  per as (            -- per player and level: tries and attended seconds up to the first finish
    select f.pid, f.level,
           count(*) as tries,
           sum(t.att_s) as att_s,
           (select min(days) from t t2 where t2.pid = f.pid and t2.level = f.level and t2.created_at = f.at) as days
    from fin f join t on t.pid = f.pid and t.level = f.level and t.created_at <= f.at
    group by f.pid, f.level, f.at
  ),
  seen as (select level, count(distinct pid) as players from t group by level),
  top as (select pid, max(level) as top from t group by pid),
  quit as (select s.level, count(*) filter (where p.top = s.level) as quitters
           from (select distinct pid, level from t) s join top p on p.pid = s.pid group by s.level)
  select s.level::integer, s.players,
         (select count(*) from per where per.level = s.level),
         case when (select count(*) from per where per.level = s.level) >= 3 then (select round((percentile_cont(0.5) within group (order by tries))::numeric, 1) from per where per.level = s.level) end,
         case when (select count(*) from per where per.level = s.level) >= 3 then (select round((percentile_cont(0.75) within group (order by tries))::numeric, 1) from per where per.level = s.level) end,
         case when (select count(*) from per where per.level = s.level) >= 3 then (select round((percentile_cont(0.5) within group (order by att_s) / 60)::numeric, 1) from per where per.level = s.level) end,
         case when (select count(*) from per where per.level = s.level) >= 3 then (select round((percentile_cont(0.75) within group (order by att_s) / 60)::numeric, 1) from per where per.level = s.level) end,
         case when (select count(*) from per where per.level = s.level) >= 3 then (select round((percentile_cont(0.5) within group (order by days))::numeric, 1) from per where per.level = s.level) end,
         round(coalesce(q.quitters, 0)::numeric / s.players, 2)
  from seen s left join quit q on q.level = s.level
  order by s.level;
$$;

-- Per road level: what was bought most, how often a relic or card was taken when offered, and the median level of each
-- upgrade among the players who finished the level (best level reached before their first finish).
create or replace function public.dig_choice_stats()
returns table (level integer, kind text, item text, picked bigint, players bigint, offered bigint, pick_rate numeric, median_lv_at_finish numeric)
language sql stable security definer set search_path = public
as $$
  with fin as (select pid, level, min(created_at) as at from public.dig_tries where outcome = 'finished' and level between 1 and 60 group by pid, level),
  held as (   -- highest level of each upgrade a finisher had bought by their first finish of this level
    select f.level, c.item, c.pid, max(c.lv) as lv
    from fin f join public.dig_choices c on c.pid = f.pid and c.kind = 'buy' and c.created_at <= f.at
    group by f.level, c.item, c.pid
  ),
  heldm as (select level, item, count(*) as n, percentile_cont(0.5) within group (order by lv) as med from held group by level, item),
  bought as (select level, kind, item, count(*) as picked, count(distinct pid) as players from public.dig_choices where kind in ('buy', 'kit') group by level, kind, item),
  offers as (select c.level, c.kind, o.item, count(*) as offered from public.dig_choices c, unnest(c.offered) as o(item) where c.kind in ('relic', 'card') group by c.level, c.kind, o.item),
  taken as (select level, kind, item, count(*) as picked, count(distinct pid) as players from public.dig_choices where kind in ('relic', 'card') group by level, kind, item)
  select b.level::integer, b.kind, b.item, b.picked, b.players, null::bigint, null::numeric,
         case when h.n >= 3 then round(h.med::numeric, 1) end
  from bought b left join heldm h on h.level = b.level and h.item = b.item
  union all
  select o.level::integer, o.kind, o.item, coalesce(t.picked, 0), coalesce(t.players, 0), o.offered, round(coalesce(t.picked, 0)::numeric / o.offered, 2), null::numeric
  from offers o left join taken t on t.level = o.level and t.kind = o.kind and t.item = o.item
  order by 1, 2, 4 desc;
$$;

-- Per road level: how fast people really dig. Medians over pace samples (each about one attended minute, so the depth
-- gained in a sample is metres per attended minute).
create or replace function public.dig_pace_stats()
returns table (level integer, players bigint, samples bigint, depth_per_min_median numeric, coins_s_median numeric,
               blocks_s_median numeric, hits_s_median numeric, idle_share_median numeric)
language sql stable security definer set search_path = public
as $$
  select p.level::integer, count(distinct p.pid), count(*),
         case when count(distinct p.pid) >= 3 then round((percentile_cont(0.5) within group (order by p.gain))::numeric, 1) end,
         case when count(distinct p.pid) >= 3 then round((percentile_cont(0.5) within group (order by p.coins_s))::numeric, 2) end,
         case when count(distinct p.pid) >= 3 then round((percentile_cont(0.5) within group (order by p.blocks_s))::numeric, 2) end,
         case when count(distinct p.pid) >= 3 then round((percentile_cont(0.5) within group (order by p.hits_s))::numeric, 2) end,
         case when count(distinct p.pid) >= 3 then round((percentile_cont(0.5) within group (order by p.idle))::numeric, 2) end
  from public.dig_pace p where p.level between 1 and 60
  group by p.level order by p.level;
$$;

revoke all on function public.dig_overview(), public.dig_level_stats(), public.dig_choice_stats(), public.dig_pace_stats() from public, anon, authenticated;
grant execute on function public.dig_overview(), public.dig_level_stats(), public.dig_choice_stats(), public.dig_pace_stats() to anon, authenticated;
-- the guard is a trigger function: nobody calls it directly
revoke all on function public.dig_guard() from public, anon, authenticated;

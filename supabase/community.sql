-- Aetheria community requests without GitHub (R40 follow-up).
-- Paste into Supabase Dashboard -> SQL Editor -> New query -> Run. Safe to re-run.
-- Needs nothing else from this folder.
--
-- Signed-in players (email or Google, not guest sessions) post a bug or an idea from the in-game
-- Community tab without a GitHub account. It is public at once in the tab's "Vote" list, where
-- other signed-in players like it. When a request has 2 or more likes, the GitHub Action
-- .github/workflows/community-promote.yml (every 6 hours, service key) turns it into a GitHub
-- issue labelled `community` and keeps the issue's in-game like count up to date.
-- The client is js/ui/communityVotes.js.
--
-- Rules the server enforces (the client checks the same, but only the server counts):
--   * Title 4-120 characters, text up to 2000, one kind: bug or feature. A basic word filter.
--   * 3 requests per account per 24 hours. Deleting one does not give the slot back.
--   * One like per account per request, never on your own request. Likes can be taken back.
--   * Players can delete their own request while it is still open (not yet on GitHub), and
--     report anyone else's, once per request. 3 reports from different accounts hide it.
--   * Hidden requests are never sent to players and never go to GitHub. Only the owner hides:
--       update public.community_requests set hidden = true  where id = 123;   -- hide
--       update public.community_requests set hidden = false where id = 123;   -- unhide
--     Reported requests to review:
--       select id, kind, title, body, report_count, hidden, created_at
--       from public.community_requests where report_count > 0 order by report_count desc;
--
-- Free tier: the game reads this list only while the Community tab is open, at most every
-- 30 minutes per player (cached in the browser), and only the columns it shows (no text body).

begin;

-- 1. Tables -------------------------------------------------------------------------------
create table if not exists public.community_requests (
  id            bigint generated always as identity primary key,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind          text not null check (kind in ('bug', 'feature')),
  title         text not null
                check (char_length(title) between 4 and 120
                       and title = btrim(title)
                       and title !~ '[\x01-\x1F\x7F]'),
  body          text not null default ''
                check (char_length(body) <= 2000 and body !~ '[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]'),
  game_version  text not null default '' check (char_length(game_version) <= 20),
  browser       text not null default '' check (char_length(browser) <= 80),
  likes         integer not null default 0,
  report_count  integer not null default 0,
  hidden        boolean not null default false,
  status        text not null default 'open' check (status in ('open', 'posted')),
  github_issue  integer,
  synced_likes  integer not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists community_requests_feed_idx on public.community_requests (likes desc, created_at) where not hidden;
create index if not exists community_requests_user_idx on public.community_requests (user_id, created_at desc);

-- Every request ever made, kept when the request is deleted, so deleting does not reset the
-- daily limit. No grants: only the trigger below reads and writes it.
create table if not exists public.community_request_log (
  user_id     uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index if not exists community_request_log_idx on public.community_request_log (user_id, created_at desc);

create table if not exists public.community_likes (
  request_id  bigint not null references public.community_requests (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (request_id, user_id)
);

create table if not exists public.community_reports (
  request_id  bigint not null references public.community_requests (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (request_id, user_id)
);

-- 2. Row level security -------------------------------------------------------------------
alter table public.community_requests    enable row level security;
alter table public.community_request_log enable row level security;
alter table public.community_likes       enable row level security;
alter table public.community_reports     enable row level security;

drop policy if exists community_public_read   on public.community_requests;
drop policy if exists community_insert_own    on public.community_requests;
drop policy if exists community_delete_own    on public.community_requests;
drop policy if exists community_like_insert   on public.community_likes;
drop policy if exists community_like_delete   on public.community_likes;
drop policy if exists community_like_read_own on public.community_likes;
drop policy if exists community_report_insert on public.community_reports;
drop policy if exists community_report_read   on public.community_reports;

create policy community_public_read
  on public.community_requests for select
  to anon, authenticated
  using (not hidden);

-- Guest (anonymous) sessions carry is_anonymous = true in their token and are refused.
create policy community_insert_own
  on public.community_requests for insert
  to authenticated
  with check ((select auth.uid()) = user_id
              and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);

create policy community_delete_own
  on public.community_requests for delete
  to authenticated
  using ((select auth.uid()) = user_id and status = 'open');

create policy community_like_insert
  on public.community_likes for insert
  to authenticated
  with check ((select auth.uid()) = user_id
              and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);

create policy community_like_delete
  on public.community_likes for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy community_like_read_own
  on public.community_likes for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy community_report_insert
  on public.community_reports for insert
  to authenticated
  with check ((select auth.uid()) = user_id
              and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);

create policy community_report_read
  on public.community_reports for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Column grants: players can only ever write kind, title, body, version and browser. Likes,
-- reports, hidden, status and the GitHub columns come from defaults, triggers and the Action
-- (service key). Nobody but the service key can update a request.
revoke all on public.community_requests    from anon, authenticated;
revoke all on public.community_request_log from anon, authenticated;
revoke all on public.community_likes       from anon, authenticated;
revoke all on public.community_reports     from anon, authenticated;
grant select (id, user_id, kind, title, likes, status, github_issue, created_at)
  on public.community_requests to anon, authenticated;
grant insert (kind, title, body, game_version, browser) on public.community_requests to authenticated;
grant delete on public.community_requests to authenticated;
grant select (request_id) on public.community_likes to authenticated;
grant insert (request_id) on public.community_likes to authenticated;
grant delete on public.community_likes to authenticated;
grant select (request_id) on public.community_reports to authenticated;
grant insert (request_id) on public.community_reports to authenticated;

-- 3. Server-side checks -------------------------------------------------------------------
-- Same list as js/leaderboard.js BLOCKED_WORDS; a word is refused when it starts with one.
create or replace function public.community_has_blocked_word(txt text)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from regexp_split_to_table(lower(coalesce(txt, '')), '[^a-z]+') as w(word),
         unnest(array['fuck', 'shit', 'cunt', 'nigg', 'fag', 'bitch', 'rape', 'nazi', 'hitler',
                      'whore', 'slut', 'retard']) as b(stem)
    where w.word like b.stem || '%'
  );
$$;

create or replace function public.community_requests_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  recent integer;
begin
  new.user_id      := auth.uid();
  new.likes        := 0;
  new.report_count := 0;
  new.hidden       := false;
  new.status       := 'open';
  new.github_issue := null;
  new.synced_likes := 0;
  new.created_at   := now();
  if new.user_id is null then
    raise exception 'community: sign in to post' using errcode = '42501';
  end if;
  if public.community_has_blocked_word(new.title) or public.community_has_blocked_word(new.body) then
    raise exception 'community: blocked word' using errcode = '22023', hint = 'community_blocked';
  end if;
  -- One poster at a time, so two quick posts cannot both slip under the limit.
  perform pg_advisory_xact_lock(hashtext('community_post:' || new.user_id::text));
  select count(*) into recent from public.community_request_log
   where user_id = new.user_id and created_at > now() - interval '24 hours';
  if recent >= 3 then
    raise exception 'community: daily limit reached' using errcode = '22023', hint = 'community_rate_limit';
  end if;
  insert into public.community_request_log (user_id) values (new.user_id);
  return new;
end;
$$;

drop trigger if exists community_requests_guard on public.community_requests;
create trigger community_requests_guard
  before insert on public.community_requests
  for each row execute function public.community_requests_guard();

-- Likes and reports: never on your own request, never on a hidden one.
create or replace function public.community_vote_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  owner uuid;
  is_hidden boolean;
begin
  new.user_id    := auth.uid();
  new.created_at := now();
  select r.user_id, r.hidden into owner, is_hidden from public.community_requests r where r.id = new.request_id;
  if owner is null or is_hidden then
    raise exception 'community: request not found' using errcode = '22023', hint = 'community_missing';
  end if;
  if owner = new.user_id then
    raise exception 'community: not on your own request' using errcode = '22023', hint = 'community_own';
  end if;
  return new;
end;
$$;

create or replace function public.community_likes_count()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  rid bigint := coalesce(new.request_id, old.request_id);
begin
  update public.community_requests
     set likes = (select count(*) from public.community_likes l where l.request_id = rid)
   where id = rid;
  return null;
end;
$$;

create or replace function public.community_reports_count()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  n integer;
begin
  select count(*) into n from public.community_reports r where r.request_id = new.request_id;
  update public.community_requests
     set report_count = n, hidden = hidden or n >= 3
   where id = new.request_id;
  return null;
end;
$$;

drop trigger if exists community_likes_guard on public.community_likes;
create trigger community_likes_guard
  before insert on public.community_likes
  for each row execute function public.community_vote_guard();

drop trigger if exists community_likes_count on public.community_likes;
create trigger community_likes_count
  after insert or delete on public.community_likes
  for each row execute function public.community_likes_count();

drop trigger if exists community_reports_guard on public.community_reports;
create trigger community_reports_guard
  before insert on public.community_reports
  for each row execute function public.community_vote_guard();

drop trigger if exists community_reports_count on public.community_reports;
create trigger community_reports_count
  after insert on public.community_reports
  for each row execute function public.community_reports_count();

revoke all on function public.community_requests_guard() from public, anon, authenticated;
revoke all on function public.community_vote_guard()     from public, anon, authenticated;
revoke all on function public.community_likes_count()    from public, anon, authenticated;
revoke all on function public.community_reports_count()  from public, anon, authenticated;

commit;

-- Aetheria shared news (roadmap R39, shared part).
-- Paste into Supabase Dashboard -> SQL Editor -> New query -> Run. Safe to re-run.
-- Needs nothing else from this folder: works whether or not the other files have been run.
--
-- Signed-in players (email or Google, not guest sessions) can share a headline from
-- Settings -> News; everyone, signed in or not, sees the latest shared headlines in the news
-- strip. The client is js/ui/sharedNews.js.
--
-- Rules the server enforces (the client checks the same, but only the server counts):
--   * 1 to 120 characters, one line, and a leaderboard-style display name (3-20 of A-Z 0-9 _ - space).
--   * 3 posts per account per 24 hours. Deleting a post does not give the slot back.
--   * A basic word filter (the leaderboard's list, matched at the start of each word).
--   * Players can delete their own posts and report anyone else's, once per post.
--     3 reports from different accounts hide a post until the owner looks at it.
--   * Hidden posts are never sent to players. Only the owner can hide or unhide:
--       update public.news_posts set hidden = true  where id = 123;   -- hide
--       update public.news_posts set hidden = false where id = 123;   -- unhide (keeps the reports)
--     Reported posts to review:
--       select id, display_name, body, report_count, hidden, created_at
--       from public.news_posts where report_count > 0 order by report_count desc, created_at desc;

begin;

-- 1. Tables -------------------------------------------------------------------------------
create table if not exists public.news_posts (
  id            bigint generated always as identity primary key,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  display_name  text not null
                check (char_length(display_name) between 3 and 20
                       and display_name ~ '^[A-Za-z0-9 _-]+$'),
  body          text not null
                check (char_length(body) between 1 and 120
                       and body = btrim(body)
                       and body !~ '[\x01-\x1F\x7F]'),
  hidden        boolean not null default false,
  report_count  integer not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists news_posts_feed_idx on public.news_posts (created_at desc) where not hidden;
create index if not exists news_posts_user_idx on public.news_posts (user_id, created_at desc);

-- Every post ever made, kept when the post is deleted, so deleting does not reset the daily limit.
-- No grants: only the trigger below reads and writes it.
create table if not exists public.news_post_log (
  user_id     uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index if not exists news_post_log_idx on public.news_post_log (user_id, created_at desc);

create table if not exists public.news_reports (
  post_id     bigint not null references public.news_posts (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- 2. Row level security -------------------------------------------------------------------
alter table public.news_posts    enable row level security;
alter table public.news_post_log enable row level security;
alter table public.news_reports  enable row level security;

drop policy if exists "shown news is public"          on public.news_posts;
drop policy if exists "players post their own news"   on public.news_posts;
drop policy if exists "players delete their own news" on public.news_posts;
drop policy if exists "players report news"           on public.news_reports;
drop policy if exists "players see their own reports" on public.news_reports;

create policy "shown news is public"
  on public.news_posts for select
  to anon, authenticated
  using (not hidden);

-- Guest (anonymous) sessions carry is_anonymous = true in their token and are refused.
create policy "players post their own news"
  on public.news_posts for insert
  to authenticated
  with check ((select auth.uid()) = user_id
              and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);

create policy "players delete their own news"
  on public.news_posts for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "players report news"
  on public.news_reports for insert
  to authenticated
  with check ((select auth.uid()) = user_id
              and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);

create policy "players see their own reports"
  on public.news_reports for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Column grants: players can only ever write the name and the text. id, user_id, hidden,
-- report_count and created_at come from defaults and the trigger. Nobody can update.
revoke all on public.news_posts    from anon, authenticated;
revoke all on public.news_post_log from anon, authenticated;
revoke all on public.news_reports  from anon, authenticated;
grant select (id, user_id, display_name, body, created_at) on public.news_posts to anon, authenticated;
grant insert (display_name, body) on public.news_posts to authenticated;
grant delete on public.news_posts to authenticated;
grant select (post_id) on public.news_reports to authenticated;
grant insert (post_id) on public.news_reports to authenticated;

-- 3. Server-side checks -------------------------------------------------------------------
-- The leaderboard's list (js/leaderboard.js BLOCKED_WORDS); a word is refused when it starts
-- with one of these, so "fucking" is caught and "grapes" is not.
create or replace function public.news_has_blocked_word(txt text)
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

-- Security definer so it can count the poster's posts (including hidden and deleted ones).
create or replace function public.news_posts_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  recent integer;
begin
  new.user_id      := auth.uid();
  new.hidden       := false;
  new.report_count := 0;
  new.created_at   := now();
  if new.user_id is null then
    raise exception 'news: sign in to share' using errcode = '42501';
  end if;
  if public.news_has_blocked_word(new.body) or public.news_has_blocked_word(new.display_name) then
    raise exception 'news: blocked word' using errcode = '22023', hint = 'news_blocked';
  end if;
  -- One poster at a time, so two quick posts cannot both slip under the limit.
  perform pg_advisory_xact_lock(hashtext('news_post:' || new.user_id::text));
  select count(*) into recent from public.news_post_log
   where user_id = new.user_id and created_at > now() - interval '24 hours';
  if recent >= 3 then
    raise exception 'news: daily limit reached' using errcode = '22023', hint = 'news_rate_limit';
  end if;
  insert into public.news_post_log (user_id) values (new.user_id);
  return new;
end;
$$;

drop trigger if exists news_posts_guard on public.news_posts;
create trigger news_posts_guard
  before insert on public.news_posts
  for each row execute function public.news_posts_guard();

-- Reports: refuse reporting your own post, count reports, hide at 3.
create or replace function public.news_reports_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.user_id    := auth.uid();
  new.created_at := now();
  if exists (select 1 from public.news_posts p where p.id = new.post_id and p.user_id = new.user_id) then
    raise exception 'news: cannot report your own post' using errcode = '22023', hint = 'news_own_post';
  end if;
  return new;
end;
$$;

create or replace function public.news_reports_count()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.news_posts p
     set report_count = (select count(*) from public.news_reports r where r.post_id = new.post_id),
         hidden = p.hidden or (select count(*) from public.news_reports r where r.post_id = new.post_id) >= 3
   where p.id = new.post_id;
  return null;
end;
$$;

drop trigger if exists news_reports_guard on public.news_reports;
create trigger news_reports_guard
  before insert on public.news_reports
  for each row execute function public.news_reports_guard();

drop trigger if exists news_reports_count on public.news_reports;
create trigger news_reports_count
  after insert on public.news_reports
  for each row execute function public.news_reports_count();

revoke all on function public.news_posts_guard()   from public, anon, authenticated;
revoke all on function public.news_reports_guard() from public, anon, authenticated;
revoke all on function public.news_reports_count() from public, anon, authenticated;

commit;

-- Check (optional): as a guest or signed out, `select * from public.news_posts` shows only
-- id, user_id, display_name, body and created_at of posts that are not hidden; a fourth post
-- within 24 hours fails with "news: daily limit reached".

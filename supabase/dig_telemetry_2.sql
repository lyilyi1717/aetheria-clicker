-- Dig telemetry, part 2: a global ceiling per table per minute. Run once in the Supabase SQL editor, AFTER dig_telemetry.sql.
-- (dig_telemetry.sql is already applied and is not edited.)
--
-- Why: dig_guard limits one player id per minute, but an id costs nothing to make, so a script could still fill a table.
-- This adds a second limit: no matter who sends, one table takes at most 3000 rows a minute; later rows in that minute are
-- skipped quietly (the request still answers 200, like the per-player limit). Real players send a few rows a minute each.
-- Safe to run again.

-- The count below reads the last minute of a table by time, so each table needs an index on created_at.
create index if not exists dig_tries_created_at    on public.dig_tries (created_at);
create index if not exists dig_choices_created_at  on public.dig_choices (created_at);
create index if not exists dig_pace_created_at     on public.dig_pace (created_at);
create index if not exists dig_sessions_created_at on public.dig_sessions (created_at);

-- Trigger arguments: (per player per minute, all players per minute).
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
  if tg_argv[1] is not null then
    execute format('select count(*) from public.%I where created_at > now() - interval ''1 minute''', tg_table_name) into n;
    if n >= tg_argv[1]::integer then return null; end if;
  end if;
  return new;
end;
$$;

drop trigger if exists dig_guard on public.dig_tries;
drop trigger if exists dig_guard on public.dig_choices;
drop trigger if exists dig_guard on public.dig_pace;
drop trigger if exists dig_guard on public.dig_sessions;
create trigger dig_guard before insert on public.dig_tries    for each row execute function public.dig_guard(12, 3000);
create trigger dig_guard before insert on public.dig_choices  for each row execute function public.dig_guard(60, 3000);
create trigger dig_guard before insert on public.dig_pace     for each row execute function public.dig_guard(12, 3000);
create trigger dig_guard before insert on public.dig_sessions for each row execute function public.dig_guard(6, 3000);

revoke all on function public.dig_guard() from public, anon, authenticated;

-- ============================================================================
-- 012 — Day-batched leaderboard finalization (tournament-style ranking)
-- ----------------------------------------------------------------------------
-- Ranking is DECOUPLED from points. Points are written immediately per match
-- (013), but leaderboard ranks are recalculated only ONCE PER MATCH-DAY, when
-- the day's final match completes. On finalization we: refresh the matview,
-- diff ranks, emit rank-change notifications, and bump a realtime tick.
--
-- This file defines the infrastructure + functions. The trigger that calls
-- them lives in 013 (must load after this).
--
-- Risk:     medium (new tables + matview refresh logic). All refreshes are
--           guarded so they run at most once per day-completion event.
-- Rollback: drop function maybe_finalize_day(date); drop function
--           finalize_leaderboard(date); drop table user_rank_snapshot;
--           drop table leaderboard_state; drop function match_day(timestamptz);
--           drop function tournament_tz();
-- ============================================================================
begin;

-- Tournament calendar boundary. WC2026 spans many timezones; pick ONE so a
-- "match-day" is well defined. Change the returned value to your tournament TZ
-- (e.g. 'America/New_York'). Default keeps behaviour explicit and stable.
create or replace function public.tournament_tz() returns text
  language sql immutable as $$ select 'UTC'::text $$;

create or replace function public.match_day(p_kickoff timestamptz) returns date
  language sql immutable as $$ select (p_kickoff at time zone public.tournament_tz())::date $$;

-- Single-row realtime signal: clients subscribe here and refetch the view when
-- `version` changes. Decouples leaderboard realtime from per-match points churn.
create table if not exists public.leaderboard_state (
  id                boolean primary key default true check (id),
  refreshed_at      timestamptz,
  refreshed_for_day date,
  version           bigint not null default 0
);
insert into public.leaderboard_state (id) values (true) on conflict (id) do nothing;

alter table public.leaderboard_state enable row level security;
drop policy if exists leaderboard_state_read on public.leaderboard_state;
create policy leaderboard_state_read on public.leaderboard_state
  for select to authenticated using (true);
-- No client write policy: only the SECURITY DEFINER finalize function writes it.

-- Last-known rank per user, to compute rank deltas across refreshes.
create table if not exists public.user_rank_snapshot (
  user_id      uuid primary key references public.users(id) on delete cascade,
  rank         int,
  total_points int,
  updated_at   timestamptz not null default now()
);
alter table public.user_rank_snapshot enable row level security;
-- Internal only; no policies (definer code touches it).

-- Refresh ranks, emit rank-change notifications, bump the realtime tick.
create or replace function public.finalize_leaderboard(p_day date default null)
returns void language plpgsql security definer set search_path = public as $$
declare had_snapshot boolean;
begin
  select exists(select 1 from public.user_rank_snapshot) into had_snapshot;

  -- 1. Recompute ranks (concurrent; non-concurrent fallback).
  begin
    refresh materialized view concurrently public.leaderboard;
  exception when others then
    refresh materialized view public.leaderboard;
  end;

  -- 2. Rank-change notifications — only with a prior snapshot, only for users
  --    with points, only when the rank actually moved.
  if had_snapshot then
    insert into public.notifications (user_id, type, title, body, data)
    select lb.user_id, 'rank_change',
           case when lb.rank < s.rank then 'You climbed the leaderboard 🔼'
                when lb.rank > s.rank then 'Your leaderboard position dropped 🔽'
                else 'Your leaderboard position changed' end,
           'You are now #' || lb.rank || ' (was #' || s.rank || ').',
           jsonb_build_object('old_rank', s.rank, 'new_rank', lb.rank,
                              'total_points', lb.total_points)
    from public.leaderboard lb
    join public.user_rank_snapshot s on s.user_id = lb.user_id
    where lb.total_points > 0 and lb.rank is distinct from s.rank;
  end if;

  -- 3. Persist the new ranks as the next baseline.
  insert into public.user_rank_snapshot (user_id, rank, total_points, updated_at)
  select user_id, rank, total_points, now() from public.leaderboard
  on conflict (user_id) do update
    set rank = excluded.rank, total_points = excluded.total_points, updated_at = now();

  -- 4. Realtime tick.
  update public.leaderboard_state
     set refreshed_at = now(),
         refreshed_for_day = coalesce(p_day, refreshed_for_day),
         version = version + 1
   where id = true;
end $$;
revoke execute on function public.finalize_leaderboard(date) from anon, authenticated;

-- Finalize a match-day iff it is over AND has new points since the last refresh.
create or replace function public.maybe_finalize_day(p_day date)
returns void language plpgsql security definer set search_path = public as $$
declare pending int; new_points int; last_refresh timestamptz;
begin
  if p_day is null then return; end if;

  -- Serialize concurrent finishes so a day can't double-refresh/double-notify.
  perform pg_advisory_xact_lock(hashtext('leaderboard_finalize'));

  -- (a) Day still has matches to be played?  (POSTPONED/CANCELLED don't count.)
  select count(*) into pending
  from public.matches
  where public.match_day(kickoff_time) = p_day
    and status in ('SCHEDULED','IN_PLAY');
  if pending > 0 then return; end if;

  -- (b) Any new scoring for that day since the last refresh? (first completion
  --     OR a later admin correction → yes; redundant re-fires → no.)
  select refreshed_at into last_refresh from public.leaderboard_state where id = true;
  select count(*) into new_points
  from public.points pt
  join public.matches m on m.id = pt.match_id
  where public.match_day(m.kickoff_time) = p_day
    and pt.calculated_at > coalesce(last_refresh, 'epoch'::timestamptz);
  if new_points = 0 then return; end if;

  perform public.finalize_leaderboard(p_day);
end $$;
revoke execute on function public.maybe_finalize_day(date) from anon, authenticated;

commit;

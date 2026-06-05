-- ============================================================================
-- 002 — Leaderboard tie-breaker + keep-warm refresh
-- ============================================================================
-- • Adds an EXACT-score tie-breaker to the leaderboard ranking.
-- • Adds `exact_predictions` so the UI can surface it.
-- • Schedules a light periodic refresh so newly-registered users appear without
--   waiting for a match to finish (calculate-points still refreshes instantly).
--
-- NOTE: the two HTTP-based cron jobs (poll-results every 5 min, sync-fixtures
-- daily) are environment-specific (they embed the project URL + public anon
-- key) and are created in the SQL editor — see README "Scheduling". This file
-- only contains portable, secret-free SQL.
-- ============================================================================

drop materialized view if exists public.leaderboard;

create materialized view public.leaderboard as
select
  u.id            as user_id,
  u.display_name,
  u.avatar_url,
  coalesce(sum(p.total_points), 0)                       as total_points,
  count(p.id)                                            as predictions_made,
  count(p.id) filter (where p.total_points > 0)          as predictions_scored,
  count(p.id) filter (where p.exact_bonus > 0)           as exact_predictions,
  -- Equal points → whoever nailed more EXACT scorelines ranks higher.
  rank() over (
    order by
      coalesce(sum(p.total_points), 0) desc,
      count(p.id) filter (where p.exact_bonus > 0) desc
  )                                                       as rank
from public.users u
left join public.points p on p.user_id = u.id
group by u.id, u.display_name, u.avatar_url;

create unique index if not exists leaderboard_user_id_idx
  on public.leaderboard(user_id);

grant select on public.leaderboard to authenticated;
revoke select on public.leaderboard from anon;

-- Keep-warm refresh so new sign-ups surface quickly (pg_cron, pure SQL).
do $$ begin
  perform 1 from cron.job where jobname = 'refresh-leaderboard-every-10-min';
  if found then
    perform cron.unschedule('refresh-leaderboard-every-10-min');
  end if;
  perform cron.schedule(
    'refresh-leaderboard-every-10-min',
    '*/10 * * * *',
    $job$ select public.refresh_leaderboard(); $job$
  );
exception
  when undefined_table then
    raise notice 'pg_cron not installed; skipping refresh schedule.';
end $$;

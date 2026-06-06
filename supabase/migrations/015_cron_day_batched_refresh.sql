-- ============================================================================
-- 015 — Retire the every-10-min leaderboard refresh; add a daily safety-net
-- ----------------------------------------------------------------------------
-- The day-batched model (012/013) finalizes the leaderboard exactly when a
-- match-day completes, so the old "*/10 * * * *  select refresh_leaderboard()"
-- cron (which refreshed regardless) is removed. We keep ONE daily backstop that
-- re-checks yesterday and today in case a trigger was ever missed (e.g. a row
-- imported with triggers disabled). It uses the same guarded path, so it is a
-- no-op when nothing changed.
--
-- Risk:     low. Rollback: re-schedule the 10-min job if desired:
--           select cron.schedule('refresh-leaderboard-10min','*/10 * * * *',
--             $$ select public.refresh_leaderboard(); $$);
-- ============================================================================

-- Remove any cron job that just calls refresh_leaderboard on a timer.
select cron.unschedule(jobid)
from cron.job
where command ilike '%refresh_leaderboard%';

-- Daily safety-net at 04:10 (tournament rollover). Guarded → no redundant work.
select cron.schedule(
  'leaderboard-daily-backstop',
  '10 4 * * *',
  $$ select public.maybe_finalize_day((now() at time zone public.tournament_tz())::date - 1);
     select public.maybe_finalize_day((now() at time zone public.tournament_tz())::date); $$
);

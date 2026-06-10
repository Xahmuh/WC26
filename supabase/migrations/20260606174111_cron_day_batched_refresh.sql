select cron.unschedule(jobid)
from cron.job
where command ilike '%refresh_leaderboard%';

select cron.schedule(
  'leaderboard-daily-backstop',
  '10 4 * * *',
  $$ select public.maybe_finalize_day((now() at time zone public.tournament_tz())::date - 1);
     select public.maybe_finalize_day((now() at time zone public.tournament_tz())::date); $$
);;

-- Recreate the leaderboard MV with an exact-score tie-breaker.
-- Tie rule: equal total_points are ranked by who has MORE exact-score hits.
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
  rank() over (
    order by
      coalesce(sum(p.total_points), 0) desc,
      count(p.id) filter (where p.exact_bonus > 0) desc
  )                                                       as rank
from public.users u
left join public.points p on p.user_id = u.id
group by u.id, u.display_name, u.avatar_url;

-- REFRESH ... CONCURRENTLY requires a unique index.
create unique index leaderboard_user_id_idx on public.leaderboard(user_id);

-- Re-apply access: signed-in users see the ranking; anon never does.
grant select on public.leaderboard to authenticated;
revoke select on public.leaderboard from anon;

-- New users should appear without waiting for a match to finish. A light cron
-- keeps the view warm; calculate-points still refreshes instantly on scoring.
select cron.unschedule('refresh-leaderboard-every-10-min')
where exists (select 1 from cron.job where jobname = 'refresh-leaderboard-every-10-min');

select cron.schedule(
  'refresh-leaderboard-every-10-min',
  '*/10 * * * *',
  $$ select public.refresh_leaderboard(); $$
);;

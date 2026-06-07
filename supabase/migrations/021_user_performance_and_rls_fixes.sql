-- ============================================================================
-- 021 — RLS fix (is_active_user), user_performance view, score_match sync,
--       get_user_streak RPC, and backfill
-- ============================================================================
begin;

-- FIX 1A — SECURITY DEFINER helper for active-user checks in prediction RLS
create or replace function public.is_active_user(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = p_user_id
      and is_deleted = false
  );
$$;

revoke all on function public.is_active_user(uuid) from public;
grant execute on function public.is_active_user(uuid) to authenticated;

-- FIX 1B — Replace UPDATE policy on predictions
drop policy if exists predictions_update_own_before_kickoff on public.predictions;

create policy predictions_update_own_before_kickoff
on public.predictions
for update
to authenticated
using (
  (select auth.uid()) = user_id
  and is_locked = false
  and public.is_active_user((select auth.uid()))
  and exists (
    select 1 from public.matches m
    where m.id = predictions.match_id
      and m.kickoff_time > now()
  )
)
with check (
  (select auth.uid()) = user_id
  and is_locked = false
  and public.is_active_user((select auth.uid()))
  and exists (
    select 1 from public.matches m
    where m.id = predictions.match_id
      and m.kickoff_time > now()
  )
);

-- FIX 1C — Replace DELETE policy on predictions
drop policy if exists predictions_delete_own_before_kickoff on public.predictions;

create policy predictions_delete_own_before_kickoff
on public.predictions
for delete
to authenticated
using (
  (select auth.uid()) = user_id
  and is_locked = false
  and public.is_active_user((select auth.uid()))
  and exists (
    select 1 from public.matches m
    where m.id = predictions.match_id
      and m.kickoff_time > now()
  )
);

-- FIX 2A — user_performance view (reads from points, not predictions columns)
drop view if exists public.user_performance;

create or replace view public.user_performance
with (security_invoker = true) as
select
  p.user_id,
  count(distinct p.id)                                          as total_predictions,
  count(distinct pt.match_id) filter (
    where pt.winner_points > 0
  )                                                             as correct_predictions,
  count(distinct pt.match_id) filter (
    where pt.exact_bonus > 0
  )                                                             as exact_predictions,
  coalesce(sum(pt.total_points), 0)                            as total_points,
  count(distinct p.match_id)                                   as matches_participated
from public.predictions p
left join public.points pt
  on pt.user_id = p.user_id
  and pt.match_id = p.match_id
group by p.user_id;

grant select on public.user_performance to authenticated;
revoke all on public.user_performance from anon;

-- FIX 2B — score_match syncs users.total_points after scoring
create or replace function public.score_match(p_match_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  m        record;
  affected int := 0;
begin
  select id, home_score, away_score, status, points_multiplier
    into m from public.matches where id = p_match_id;

  if not found then return 0; end if;
  if m.status <> 'FINISHED' or m.home_score is null or m.away_score is null then
    return 0;
  end if;

  with scored as (
    select
      p.user_id,
      (case when sign(m.home_score - m.away_score)
               = sign(p.pred_home_score - p.pred_away_score) then 5 else 0 end) as wp,
      (case when m.home_score = p.pred_home_score then 2 else 0 end)            as hp,
      (case when m.away_score = p.pred_away_score then 2 else 0 end)            as ap,
      (case when m.home_score = p.pred_home_score
             and m.away_score = p.pred_away_score then 5 else 0 end)            as eb
    from public.predictions p
    where p.match_id = m.id
  )
  insert into public.points
    (user_id, match_id, winner_points, home_goal_points, away_goal_points,
     exact_bonus, total_points, calculated_at)
  select
    s.user_id, m.id,
    s.wp * m.points_multiplier,
    s.hp * m.points_multiplier,
    s.ap * m.points_multiplier,
    s.eb * m.points_multiplier,
    (s.wp + s.hp + s.ap + s.eb) * m.points_multiplier,
    now()
  from scored s
  on conflict (user_id, match_id) do update set
    winner_points    = excluded.winner_points,
    home_goal_points = excluded.home_goal_points,
    away_goal_points = excluded.away_goal_points,
    exact_bonus      = excluded.exact_bonus,
    total_points     = excluded.total_points,
    calculated_at    = now();

  get diagnostics affected = row_count;

  update public.users u
  set total_points = (
    select coalesce(sum(pt.total_points), 0)
    from public.points pt
    where pt.user_id = u.id
  )
  where u.id in (
    select distinct user_id from public.points where match_id = m.id
  );

  insert into public.notifications (user_id, type, title, body, data)
  select pt.user_id, 'points', 'Points awarded',
         'You earned ' || pt.total_points || ' pts for a finished match.',
         jsonb_build_object('match_id', m.id, 'points', pt.total_points)
  from public.points pt
  where pt.match_id = m.id and pt.total_points > 0
    and not exists (
      select 1 from public.notifications n
      where n.user_id = pt.user_id and n.type = 'points'
        and n.data->>'match_id' = m.id::text
    );

  return affected;
end;
$function$;

revoke execute on function public.score_match(uuid) from anon, authenticated;

-- Streak RPC — derived from scored match outcomes (winner_points > 0)
create or replace function public.get_user_streak(p_user_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  streak_count int := 0;
  streak_type  text := 'none';
  last_result  boolean;
  r            record;
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'Forbidden';
  end if;

  for r in
    select (pt.winner_points > 0) as is_correct
    from public.points pt
    join public.matches m on m.id = pt.match_id
    where pt.user_id = p_user_id
      and pt.match_id is not null
      and m.status = 'FINISHED'
    order by m.kickoff_time desc
  loop
    if streak_count = 0 then
      last_result := r.is_correct;
      streak_type := case when r.is_correct then 'win' else 'loss' end;
    end if;

    if r.is_correct = last_result then
      streak_count := streak_count + 1;
    else
      exit;
    end if;
  end loop;

  return json_build_object(
    'current_streak', streak_count,
    'streak_type', streak_type
  );
end;
$$;

revoke all on function public.get_user_streak(uuid) from public;
grant execute on function public.get_user_streak(uuid) to authenticated;

commit;

-- FIX 2C — Backfill (run once; idempotent via score_match upsert)
select public.score_match(m.id)
from public.matches m
where m.status = 'FINISHED'
  and m.home_score is not null
  and m.away_score is not null
  and exists (
    select 1 from public.predictions p where p.match_id = m.id
  );

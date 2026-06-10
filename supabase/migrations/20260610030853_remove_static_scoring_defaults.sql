-- Keep scoring values fully admin-controlled.
-- Existing historical migrations may contain bootstrap defaults, but the live
-- schema/function should not fall back to fixed game-point values.

begin;
alter table public.scoring_rules
  alter column winner_points drop default,
  alter column exact_bonus_points drop default;
create or replace function public.score_match(p_match_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  m        record;
  r        record;
  affected int := 0;
begin
  select id, home_score, away_score, status, points_multiplier,
         is_knockout, winner_team_id
    into m from public.matches where id = p_match_id;

  if not found then return 0; end if;
  if m.status <> 'FINISHED' or m.home_score is null or m.away_score is null then
    return 0;
  end if;
  if m.is_knockout and m.winner_team_id is null then
    return 0;
  end if;

  select winner_points, exact_bonus_points
    into r from public.scoring_rules where id = 1;

  if not found then
    raise exception 'Missing scoring_rules singleton row id=1; configure scoring from the admin dashboard before scoring matches.';
  end if;

  with scored as (
    select
      p.user_id,
      (m.points_multiplier + coalesce(uc.multiplier_bonus, 0)) as effective_multiplier,
      case
        when m.is_knockout then
          case when p.pred_winner_team_id = m.winner_team_id then r.winner_points else 0 end
        else
          case when sign(m.home_score - m.away_score)
                 = sign(p.pred_home_score - p.pred_away_score) then r.winner_points else 0 end
      end as wp,
      (case when m.home_score = p.pred_home_score
             and m.away_score = p.pred_away_score then r.exact_bonus_points else 0 end) as eb
    from public.predictions p
    left join public.user_cards uc
      on uc.id = p.applied_user_card_id
     and uc.user_id = p.user_id
    where p.match_id = m.id
  )
  insert into public.points
    (user_id, match_id, winner_points, home_goal_points, away_goal_points,
     exact_bonus, total_points, calculated_at)
  select
    s.user_id, m.id,
    s.wp * s.effective_multiplier,
    0,
    0,
    s.eb * s.effective_multiplier,
    (s.wp + s.eb) * s.effective_multiplier,
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
commit;

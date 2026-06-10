-- Notify every user who predicted a match whenever that match is scored.
--
-- Previous score_match() only inserted a notification when total_points > 0 and
-- only once per user/match. That meant users who predicted a match but earned
-- zero points never heard about the result, and later result corrections did
-- not create a new realtime notification.

begin;

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
  result_signature text;
begin
  select
    ma.id,
    ma.home_score,
    ma.away_score,
    ma.status,
    ma.points_multiplier,
    ma.is_knockout,
    ma.winner_team_id,
    ma.decision_method,
    ht.name as home_team_name,
    at.name as away_team_name
  into m
  from public.matches ma
  left join public.teams ht on ht.id = ma.home_team_id
  left join public.teams at on at.id = ma.away_team_id
  where ma.id = p_match_id;

  if not found then return 0; end if;
  if m.status <> 'FINISHED' or m.home_score is null or m.away_score is null then
    return 0;
  end if;
  if m.is_knockout and m.winner_team_id is null then
    return 0;
  end if;

  result_signature := concat_ws(
    '|',
    m.home_score::text,
    m.away_score::text,
    coalesce(m.winner_team_id::text, ''),
    coalesce(m.decision_method::text, '')
  );

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
  select
    pt.user_id,
    'points',
    case when pt.total_points > 0 then 'Your prediction earned points' else 'Your prediction was scored' end,
    'Result: ' || coalesce(m.home_team_name, 'Home') || ' ' || m.home_score || '-' || m.away_score || ' ' ||
      coalesce(m.away_team_name, 'Away') || E'\n' ||
      'Your prediction: ' || pr.pred_home_score || '-' || pr.pred_away_score || E'\n' ||
      case
        when pt.total_points > 0 then 'You earned ' || pt.total_points || ' pts.'
        else 'No points this time.'
      end,
    jsonb_build_object(
      'match_id', m.id,
      'points', pt.total_points,
      'total_points', pt.total_points,
      'home_team', m.home_team_name,
      'away_team', m.away_team_name,
      'home_score', m.home_score,
      'away_score', m.away_score,
      'pred_home_score', pr.pred_home_score,
      'pred_away_score', pr.pred_away_score,
      'pred_winner_team_id', pr.pred_winner_team_id,
      'winner_team_id', m.winner_team_id,
      'decision_method', m.decision_method,
      'result_signature', result_signature
    )
  from public.points pt
  join public.predictions pr
    on pr.user_id = pt.user_id
   and pr.match_id = pt.match_id
  where pt.match_id = m.id
    and not exists (
      select 1
      from public.notifications n
      where n.user_id = pt.user_id
        and n.type = 'points'
        and n.data->>'match_id' = m.id::text
        and n.data->>'result_signature' = result_signature
        and coalesce(n.data->>'total_points', n.data->>'points', '-1') = pt.total_points::text
    );

  return affected;
end;
$function$;

revoke execute on function public.score_match(uuid) from anon, authenticated;

commit;

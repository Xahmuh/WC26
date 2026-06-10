-- ============================================================================
-- 032 — Explicit knockout final outcome + admin result override support
--
-- Separates 90-minute score from final qualification outcome:
--   matches.home_score / away_score = 90-minute score only
--   matches.winner_team_id / decision_method = final outcome
--
-- Knockout winner points are awarded only from predictions.pred_winner_team_id
-- compared to matches.winner_team_id. Group-stage scoring remains unchanged.
-- ============================================================================

begin;

do $$ begin
  create type public.match_decision_method as enum ('FT', 'ET', 'PEN');
exception when duplicate_object then null;
end $$;

alter table public.matches
  add column if not exists is_knockout boolean not null default false,
  add column if not exists winner_team_id uuid references public.teams(id),
  add column if not exists decision_method public.match_decision_method;

alter table public.predictions
  add column if not exists pred_winner_team_id uuid references public.teams(id);

update public.matches
set is_knockout = (stage <> 'GROUP');

alter table public.matches
  drop constraint if exists matches_finished_knockout_has_outcome;

alter table public.matches
  add constraint matches_finished_knockout_has_outcome
  check (
    not is_knockout
    or status <> 'FINISHED'
    or (winner_team_id is not null and decision_method is not null)
  ) not valid;

create or replace function public.set_match_knockout_flag()
returns trigger
language plpgsql
as $function$
begin
  new.is_knockout := (new.stage <> 'GROUP');
  return new;
end;
$function$;

drop trigger if exists matches_set_knockout_flag on public.matches;
create trigger matches_set_knockout_flag
  before insert or update of stage on public.matches
  for each row execute function public.set_match_knockout_flag();

create or replace function public.validate_prediction_outcome()
returns trigger
language plpgsql
as $function$
declare
  m record;
begin
  select is_knockout, home_team_id, away_team_id
    into m
    from public.matches
   where id = new.match_id;

  if not found then
    raise exception 'Match not found.';
  end if;

  if m.is_knockout then
    if new.pred_winner_team_id is null then
      raise exception 'Knockout matches require a qualifying team prediction.';
    end if;

    if new.pred_winner_team_id is distinct from m.home_team_id
       and new.pred_winner_team_id is distinct from m.away_team_id then
      raise exception 'Predicted qualifying team must be one of the match teams.';
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists predictions_validate_outcome on public.predictions;
create trigger predictions_validate_outcome
  before insert or update of match_id, pred_winner_team_id on public.predictions
  for each row execute function public.validate_prediction_outcome();

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
    r := row(3, 5);
  end if;

  with scored as (
    select
      p.user_id,
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
    where p.match_id = m.id
  )
  insert into public.points
    (user_id, match_id, winner_points, home_goal_points, away_goal_points,
     exact_bonus, total_points, calculated_at)
  select
    s.user_id, m.id,
    s.wp * m.points_multiplier,
    0,
    0,
    s.eb * m.points_multiplier,
    (s.wp + s.eb) * m.points_multiplier,
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

create or replace function public.tg_match_after_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  new_day date := public.match_day(new.kickoff_time);
  old_day date := case when tg_op = 'UPDATE' then public.match_day(old.kickoff_time) end;
begin
  if new.status = 'FINISHED'
     and new.home_score is not null and new.away_score is not null
     and (
          tg_op = 'INSERT'
          or new.status          is distinct from old.status
          or new.home_score      is distinct from old.home_score
          or new.away_score      is distinct from old.away_score
          or new.winner_team_id  is distinct from old.winner_team_id
          or new.decision_method is distinct from old.decision_method
          or new.points_multiplier is distinct from old.points_multiplier
        ) then
    perform public.score_match(new.id);
  end if;

  perform public.maybe_finalize_day(new_day);
  if old_day is not null and old_day is distinct from new_day then
    perform public.maybe_finalize_day(old_day);
  end if;

  return new;
end;
$function$;

drop trigger if exists matches_after_write on public.matches;
create trigger matches_after_write
  after insert or update of status, home_score, away_score, winner_team_id,
    decision_method, points_multiplier, kickoff_time
  on public.matches
  for each row execute function public.tg_match_after_write();

create or replace function public.sync_matches(p_matches jsonb)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  n int;
begin
  insert into public.matches as m
    (external_id, home_team_id, away_team_id, status, stage, group_name,
     kickoff_time, venue, home_score, away_score, is_placeholder, is_knockout,
     winner_team_id, decision_method, last_synced_at)
  select
    (e->>'external_id')::int,
    nullif(e->>'home_team_id','')::uuid,
    nullif(e->>'away_team_id','')::uuid,
    (e->>'status')::public.match_status,
    (e->>'stage')::public.match_stage,
    nullif(e->>'group_name',''),
    (e->>'kickoff_time')::timestamptz,
    nullif(e->>'venue',''),
    case when (e->>'status') = 'FINISHED' then nullif(e->>'home_score','')::int end,
    case when (e->>'status') = 'FINISHED' then nullif(e->>'away_score','')::int end,
    (nullif(e->>'home_team_id','') is null or nullif(e->>'away_team_id','') is null),
    ((e->>'stage')::public.match_stage <> 'GROUP'),
    nullif(e->>'winner_team_id','')::uuid,
    nullif(e->>'decision_method','')::public.match_decision_method,
    now()
  from jsonb_array_elements(p_matches) e
  on conflict (external_id) do update
  set
    home_team_id = coalesce(excluded.home_team_id, m.home_team_id),
    away_team_id = coalesce(excluded.away_team_id, m.away_team_id),
    status       = case when m.status = 'FINISHED' then m.status else excluded.status end,
    home_score   = case when m.status = 'FINISHED' then m.home_score else excluded.home_score end,
    away_score   = case when m.status = 'FINISHED' then m.away_score else excluded.away_score end,
    winner_team_id = case when m.status = 'FINISHED' then m.winner_team_id else excluded.winner_team_id end,
    decision_method = case when m.status = 'FINISHED' then m.decision_method else excluded.decision_method end,
    stage        = excluded.stage,
    group_name   = excluded.group_name,
    kickoff_time = excluded.kickoff_time,
    venue        = coalesce(excluded.venue, m.venue),
    is_placeholder = (
      coalesce(excluded.home_team_id, m.home_team_id) is null
      or coalesce(excluded.away_team_id, m.away_team_id) is null
    ),
    is_knockout = (excluded.stage <> 'GROUP'),
    last_synced_at = now();

  get diagnostics n = row_count;
  return n;
end;
$function$;

revoke execute on function public.sync_matches(jsonb) from anon, authenticated, public;
grant execute on function public.sync_matches(jsonb) to service_role;

commit;

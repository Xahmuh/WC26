begin;

create table if not exists public.scoring_rules (
  id                  smallint primary key default 1,
  winner_points       integer not null default 3 check (winner_points >= 0),
  home_goal_points    integer not null default 1 check (home_goal_points >= 0),
  away_goal_points    integer not null default 1 check (away_goal_points >= 0),
  exact_bonus_points  integer not null default 5 check (exact_bonus_points >= 0),
  updated_at          timestamptz not null default now(),
  updated_by          uuid references public.users(id) on delete set null,
  constraint scoring_rules_singleton check (id = 1)
);

insert into public.scoring_rules (id)
values (1)
on conflict (id) do nothing;

alter table public.scoring_rules enable row level security;

create policy "Scoring rules are readable by authenticated users"
  on public.scoring_rules for select
  to authenticated
  using (true);

create policy "Admins update scoring rules"
  on public.scoring_rules for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create table if not exists public.stage_multipliers (
  stage       match_stage primary key,
  multiplier  integer not null default 1 check (multiplier between 1 and 6),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.users(id) on delete set null
);

insert into public.stage_multipliers (stage, multiplier)
values
  ('GROUP', 1),
  ('ROUND_OF_16', 1),
  ('QUARTER_FINAL', 1),
  ('SEMI_FINAL', 1),
  ('THIRD_PLACE', 1),
  ('FINAL', 1)
on conflict (stage) do nothing;

alter table public.stage_multipliers enable row level security;

create policy "Stage multipliers are readable by authenticated users"
  on public.stage_multipliers for select
  to authenticated
  using (true);

create policy "Admins update stage multipliers"
  on public.stage_multipliers for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

alter table public.matches drop constraint if exists matches_multiplier_check;
alter table public.matches drop constraint if exists matches_points_multiplier_check;
alter table public.matches
  add constraint matches_points_multiplier_range check (points_multiplier between 1 and 6);

create or replace function public.admin_set_stage_multiplier(
  p_stage match_stage,
  p_multiplier integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Only admins can change stage multipliers';
  end if;

  if p_multiplier < 1 or p_multiplier > 6 then
    raise exception 'Multiplier must be between 1 and 6';
  end if;

  insert into public.stage_multipliers (stage, multiplier, updated_at, updated_by)
  values (p_stage, p_multiplier, now(), auth.uid())
  on conflict (stage) do update
    set multiplier = excluded.multiplier,
        updated_at = now(),
        updated_by = auth.uid();

  update public.matches
  set points_multiplier = p_multiplier
  where stage = p_stage
    and points_multiplier <> p_multiplier;

  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.admin_set_stage_multiplier(match_stage, integer) from public;
grant execute on function public.admin_set_stage_multiplier(match_stage, integer) to authenticated;

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
  select id, home_score, away_score, status, points_multiplier
    into m from public.matches where id = p_match_id;

  if not found then return 0; end if;
  if m.status <> 'FINISHED' or m.home_score is null or m.away_score is null then
    return 0;
  end if;

  select winner_points, home_goal_points, away_goal_points, exact_bonus_points
    into r from public.scoring_rules where id = 1;

  if not found then
    r := row(3, 1, 1, 5);
  end if;

  with scored as (
    select
      p.user_id,
      (case when sign(m.home_score - m.away_score)
               = sign(p.pred_home_score - p.pred_away_score) then r.winner_points else 0 end) as wp,
      (case when m.home_score = p.pred_home_score then r.home_goal_points else 0 end)          as hp,
      (case when m.away_score = p.pred_away_score then r.away_goal_points else 0 end)          as ap,
      (case when m.home_score = p.pred_home_score
             and m.away_score = p.pred_away_score then r.exact_bonus_points else 0 end)        as eb
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

commit;
;

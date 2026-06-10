-- ============================================================================
-- 035 - Configurable stage reward cards
--
-- Admins define reward cards from the dashboard:
--   - name + artwork
--   - earning stage and threshold %
--   - usable stage window
--   - number of uses
--   - multiplier bonus
--
-- Users earn cards by reaching the configured percentage of a stage's total
-- possible points. A card can be attached to one or more predictions according
-- to its max_uses. Scoring applies a personal multiplier bonus only to the
-- prediction that used the card.
-- ============================================================================

begin;
-- ----------------------------------------------------------------------------
-- Stage ordering helpers
-- ----------------------------------------------------------------------------
create or replace function public.card_stage_rank(p_stage public.match_stage)
returns integer
language sql
immutable
as $$
  select case p_stage
    when 'GROUP' then 1
    when 'ROUND_OF_32' then 2
    when 'ROUND_OF_16' then 3
    when 'QUARTER_FINAL' then 4
    when 'SEMI_FINAL' then 5
    when 'THIRD_PLACE' then 6
    when 'FINAL' then 7
    else 999
  end;
$$;
create or replace function public.card_stage_is_between(
  p_stage public.match_stage,
  p_from public.match_stage,
  p_until public.match_stage
)
returns boolean
language sql
immutable
as $$
  select public.card_stage_rank(p_stage) between public.card_stage_rank(p_from)
    and public.card_stage_rank(p_until);
$$;
-- ----------------------------------------------------------------------------
-- Admin configurable card definitions
-- ----------------------------------------------------------------------------
create table if not exists public.card_definitions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 80),
  description text,
  image_path text,
  award_stage public.match_stage not null,
  threshold_percent numeric(5,2) not null default 70 check (threshold_percent > 0 and threshold_percent <= 100),
  usable_from_stage public.match_stage not null,
  usable_until_stage public.match_stage not null,
  max_uses integer not null default 1 check (max_uses between 1 and 20),
  multiplier_bonus integer not null default 1 check (multiplier_bonus between 1 and 10),
  is_active boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint card_definitions_stage_window_check check (
    public.card_stage_rank(usable_until_stage) >= public.card_stage_rank(usable_from_stage)
    and public.card_stage_rank(usable_from_stage) >= public.card_stage_rank(award_stage)
  )
);
drop trigger if exists card_definitions_set_updated_at on public.card_definitions;
create trigger card_definitions_set_updated_at
  before update on public.card_definitions
  for each row execute function public.set_updated_at();
-- ----------------------------------------------------------------------------
-- User-owned card instances. The mutable usage fields are snapshotted from the
-- definition so admin edits do not rewrite already-earned card power.
-- ----------------------------------------------------------------------------
create table if not exists public.user_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  card_definition_id uuid not null references public.card_definitions(id) on delete cascade,
  earned_stage public.match_stage not null,
  usable_from_stage public.match_stage not null,
  usable_until_stage public.match_stage not null,
  multiplier_bonus integer not null check (multiplier_bonus between 1 and 10),
  max_uses integer not null check (max_uses between 1 and 20),
  uses_remaining integer not null check (uses_remaining >= 0),
  status text not null default 'active' check (status in ('active', 'used', 'revoked')),
  unlocked_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_cards_uses_remaining_max_check check (uses_remaining <= max_uses),
  constraint user_cards_stage_window_check check (
    public.card_stage_rank(usable_until_stage) >= public.card_stage_rank(usable_from_stage)
  ),
  constraint user_cards_one_definition_per_user unique (user_id, card_definition_id)
);
create index if not exists idx_user_cards_user on public.user_cards(user_id);
create index if not exists idx_user_cards_definition on public.user_cards(card_definition_id);
create index if not exists idx_user_cards_status on public.user_cards(status);
drop trigger if exists user_cards_set_updated_at on public.user_cards;
create trigger user_cards_set_updated_at
  before update on public.user_cards
  for each row execute function public.set_updated_at();
-- ----------------------------------------------------------------------------
-- A prediction can spend one card instance.
-- ----------------------------------------------------------------------------
alter table public.predictions
  add column if not exists applied_user_card_id uuid references public.user_cards(id) on delete set null;
create index if not exists idx_predictions_applied_user_card
  on public.predictions(applied_user_card_id);
-- ----------------------------------------------------------------------------
-- RLS + grants
-- ----------------------------------------------------------------------------
alter table public.card_definitions enable row level security;
alter table public.user_cards enable row level security;
grant select, insert, update, delete on public.card_definitions to authenticated;
grant select on public.user_cards to authenticated;
drop policy if exists "Card definitions are readable by authenticated users" on public.card_definitions;
create policy "Card definitions are readable by authenticated users"
  on public.card_definitions for select
  to authenticated
  using (true);
drop policy if exists "Admins manage card definitions" on public.card_definitions;
create policy "Admins manage card definitions"
  on public.card_definitions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
drop policy if exists "Users read own cards" on public.user_cards;
create policy "Users read own cards"
  on public.user_cards for select
  to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "Admins read all user cards" on public.user_cards;
create policy "Admins read all user cards"
  on public.user_cards for select
  to authenticated
  using (public.is_admin());
-- ----------------------------------------------------------------------------
-- Storage for card artwork
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('card-images', 'card-images', true)
on conflict (id) do nothing;
drop policy if exists "Card images are publicly readable" on storage.objects;
drop policy if exists "Admins upload card images" on storage.objects;
drop policy if exists "Admins update card images" on storage.objects;
drop policy if exists "Admins delete card images" on storage.objects;
create policy "Card images are publicly readable"
  on storage.objects for select
  to public
  using (bucket_id = 'card-images');
create policy "Admins upload card images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'card-images' and public.is_admin());
create policy "Admins update card images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'card-images' and public.is_admin())
  with check (bucket_id = 'card-images' and public.is_admin());
create policy "Admins delete card images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'card-images' and public.is_admin());
-- ----------------------------------------------------------------------------
-- Awarding logic
-- ----------------------------------------------------------------------------
create or replace function public.stage_possible_points(p_stage public.match_stage)
returns numeric
language sql
stable
set search_path to 'public'
as $$
  select coalesce(sum((sr.winner_points + sr.exact_bonus_points) * m.points_multiplier), 0)::numeric
  from public.matches m
  cross join public.scoring_rules sr
  where sr.id = 1
    and m.stage = p_stage
    and m.status not in ('POSTPONED', 'CANCELLED');
$$;
create or replace function public.user_stage_points(p_user_id uuid, p_stage public.match_stage)
returns numeric
language sql
stable
set search_path to 'public'
as $$
  select coalesce(sum(pt.total_points), 0)::numeric
  from public.points pt
  join public.matches m on m.id = pt.match_id
  where pt.user_id = p_user_id
    and m.stage = p_stage;
$$;
create or replace function public.award_user_stage_cards(
  p_user_id uuid,
  p_stage public.match_stage
)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  possible numeric;
  earned numeric;
  inserted_count integer := 0;
begin
  possible := public.stage_possible_points(p_stage);
  if possible <= 0 then
    return 0;
  end if;

  earned := public.user_stage_points(p_user_id, p_stage);

  insert into public.user_cards (
    user_id,
    card_definition_id,
    earned_stage,
    usable_from_stage,
    usable_until_stage,
    multiplier_bonus,
    max_uses,
    uses_remaining
  )
  select
    p_user_id,
    cd.id,
    cd.award_stage,
    cd.usable_from_stage,
    cd.usable_until_stage,
    cd.multiplier_bonus,
    cd.max_uses,
    cd.max_uses
  from public.card_definitions cd
  where cd.is_active
    and cd.award_stage = p_stage
    and ((earned / possible) * 100) >= cd.threshold_percent
    and not exists (
      select 1
      from public.user_cards uc
      where uc.user_id = p_user_id
        and uc.card_definition_id = cd.id
    );

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$function$;
revoke execute on function public.award_user_stage_cards(uuid, public.match_stage) from public;
create or replace function public.admin_recalculate_stage_cards(p_stage public.match_stage)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  row_user record;
  total integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Only admins can recalculate stage cards';
  end if;

  for row_user in
    select distinct p.user_id
    from public.points p
    join public.matches m on m.id = p.match_id
    where m.stage = p_stage
  loop
    total := total + public.award_user_stage_cards(row_user.user_id, p_stage);
  end loop;

  return total;
end;
$function$;
revoke all on function public.admin_recalculate_stage_cards(public.match_stage) from public;
grant execute on function public.admin_recalculate_stage_cards(public.match_stage) to authenticated;
create or replace function public.tg_points_award_stage_cards()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_stage public.match_stage;
begin
  if new.match_id is null then
    return new;
  end if;

  select stage into v_stage
  from public.matches
  where id = new.match_id;

  if v_stage is not null then
    perform public.award_user_stage_cards(new.user_id, v_stage);
  end if;

  return new;
end;
$function$;
revoke execute on function public.tg_points_award_stage_cards() from public;
drop trigger if exists points_award_stage_cards on public.points;
create trigger points_award_stage_cards
  after insert or update of total_points on public.points
  for each row execute function public.tg_points_award_stage_cards();
-- ----------------------------------------------------------------------------
-- Card usage validation and accounting
-- ----------------------------------------------------------------------------
create or replace function public.restore_prediction_card_use(p_user_card_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  update public.user_cards
  set uses_remaining = least(max_uses, uses_remaining + 1),
      status = case when status = 'used' then 'active' else status end
  where id = p_user_card_id
    and status in ('active', 'used');
end;
$function$;
revoke execute on function public.restore_prediction_card_use(uuid) from public;
create or replace function public.tg_predictions_apply_card_usage()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_match_stage public.match_stage;
  v_card record;
  v_updated integer;
begin
  if tg_op = 'UPDATE'
     and old.applied_user_card_id is not null
     and (
       old.applied_user_card_id is distinct from new.applied_user_card_id
       or old.match_id is distinct from new.match_id
     ) then
    perform public.restore_prediction_card_use(old.applied_user_card_id);
  end if;

  if new.applied_user_card_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and old.applied_user_card_id is not distinct from new.applied_user_card_id
     and old.match_id is not distinct from new.match_id then
    return new;
  end if;

  select stage into v_match_stage
  from public.matches
  where id = new.match_id;

  if v_match_stage is null then
    raise exception 'Match not found for card usage.';
  end if;

  select
    uc.id,
    uc.user_id,
    uc.status,
    uc.uses_remaining,
    uc.usable_from_stage,
    uc.usable_until_stage,
    cd.is_active
    into v_card
  from public.user_cards uc
  join public.card_definitions cd on cd.id = uc.card_definition_id
  where uc.id = new.applied_user_card_id
  for update of uc;

  if not found then
    raise exception 'Selected card was not found.';
  end if;

  if v_card.user_id is distinct from new.user_id then
    raise exception 'Selected card does not belong to this user.';
  end if;

  if not v_card.is_active then
    raise exception 'Selected card is no longer active.';
  end if;

  if v_card.status <> 'active' or v_card.uses_remaining <= 0 then
    raise exception 'Selected card has no remaining uses.';
  end if;

  if not public.card_stage_is_between(v_match_stage, v_card.usable_from_stage, v_card.usable_until_stage) then
    raise exception 'Selected card cannot be used in this stage.';
  end if;

  update public.user_cards
  set uses_remaining = uses_remaining - 1,
      status = case when uses_remaining - 1 <= 0 then 'used' else 'active' end
  where id = v_card.id
    and uses_remaining > 0;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Selected card has already been used.';
  end if;

  return new;
end;
$function$;
revoke execute on function public.tg_predictions_apply_card_usage() from public;
drop trigger if exists predictions_apply_card_usage on public.predictions;
create trigger predictions_apply_card_usage
  before insert or update of user_id, match_id, applied_user_card_id
  on public.predictions
  for each row execute function public.tg_predictions_apply_card_usage();
create or replace function public.tg_predictions_restore_card_usage()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if old.applied_user_card_id is not null then
    perform public.restore_prediction_card_use(old.applied_user_card_id);
  end if;
  return old;
end;
$function$;
revoke execute on function public.tg_predictions_restore_card_usage() from public;
drop trigger if exists predictions_restore_card_usage on public.predictions;
create trigger predictions_restore_card_usage
  after delete on public.predictions
  for each row execute function public.tg_predictions_restore_card_usage();
-- ----------------------------------------------------------------------------
-- Re-score matches with personal card multiplier bonuses.
-- ----------------------------------------------------------------------------
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

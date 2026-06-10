begin;
-- ============================================================================
-- Stage card earning baselines
-- ============================================================================
-- The World Cup 2026 schedule has 104 matches:
-- Group 72, Round of 32 16, Round of 16 8, Quarter-final 4,
-- Semi-final 2, Third-place 1, Final 1.
--
-- football-data.org may publish only part of the bracket at first. Card earning
-- must still use the full stage ceiling, so future/placeholder stages do not
-- calculate as zero possible points.

create table if not exists public.stage_card_settings (
  stage public.match_stage primary key,
  expected_matches integer not null check (expected_matches >= 0),
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.stage_card_settings (stage, expected_matches)
values
  ('GROUP', 72),
  ('ROUND_OF_32', 16),
  ('ROUND_OF_16', 8),
  ('QUARTER_FINAL', 4),
  ('SEMI_FINAL', 2),
  ('THIRD_PLACE', 1),
  ('FINAL', 1)
on conflict (stage) do nothing;
alter table public.stage_card_settings enable row level security;
drop policy if exists "Stage card settings are readable" on public.stage_card_settings;
create policy "Stage card settings are readable"
  on public.stage_card_settings for select
  to authenticated
  using (true);
drop policy if exists "Admins manage stage card settings" on public.stage_card_settings;
create policy "Admins manage stage card settings"
  on public.stage_card_settings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
create or replace function public.admin_set_stage_expected_matches(
  p_stage public.match_stage,
  p_expected_matches integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can update stage card settings';
  end if;

  if p_expected_matches < 0 then
    raise exception 'Expected matches cannot be negative';
  end if;

  insert into public.stage_card_settings (stage, expected_matches, updated_by, updated_at)
  values (p_stage, p_expected_matches, auth.uid(), now())
  on conflict (stage) do update set
    expected_matches = excluded.expected_matches,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at;
end;
$$;
revoke execute on function public.admin_set_stage_expected_matches(public.match_stage, integer)
  from public, anon;
grant execute on function public.admin_set_stage_expected_matches(public.match_stage, integer)
  to authenticated;
create or replace function public.stage_possible_points(p_stage public.match_stage)
returns numeric
language plpgsql
stable
set search_path = public
as $$
declare
  base_points numeric := 0;
  actual_matches integer := 0;
  actual_multiplier_sum numeric := 0;
  expected_matches integer := 0;
  missing_matches integer := 0;
  fallback_multiplier integer := 1;
begin
  select (winner_points + exact_bonus_points)
    into base_points
  from public.scoring_rules
  where id = 1;

  if base_points is null then
    base_points := 0;
  end if;

  select
    count(*)::integer,
    coalesce(sum(points_multiplier), 0)::numeric
    into actual_matches, actual_multiplier_sum
  from public.matches
  where stage = p_stage
    and status not in ('POSTPONED', 'CANCELLED');

  select coalesce(scs.expected_matches, actual_matches)
    into expected_matches
  from public.stage_card_settings scs
  where scs.stage = p_stage;

  if expected_matches is null then
    expected_matches := actual_matches;
  end if;

  select coalesce(sm.multiplier, 1)
    into fallback_multiplier
  from public.stage_multipliers sm
  where sm.stage = p_stage;

  if fallback_multiplier is null then
    fallback_multiplier := 1;
  end if;

  missing_matches := greatest(expected_matches - actual_matches, 0);

  return base_points * (actual_multiplier_sum + (missing_matches * fallback_multiplier));
end;
$$;
-- ============================================================================
-- API provider registry
-- ============================================================================
-- The current Edge Functions support the football-data.org v4 response shape.
-- Other providers can be registered here; switching to a different adapter still
-- requires adding the matching parser in the Edge Function layer.

create table if not exists public.api_providers (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9_-]*$'),
  name text not null check (length(trim(name)) > 0),
  adapter text not null default 'football_data_v4',
  base_url text not null check (base_url ~ '^https?://'),
  competition_code text not null default 'WC',
  token_secret_name text not null default 'FOOTBALL_API_TOKEN',
  is_active boolean not null default false,
  rate_limit_per_minute integer check (rate_limit_per_minute is null or rate_limit_per_minute > 0),
  supports_fixtures boolean not null default true,
  supports_results boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id) on delete set null
);
create unique index if not exists api_providers_one_active
  on public.api_providers (is_active)
  where is_active;
insert into public.api_providers (
  id,
  name,
  adapter,
  base_url,
  competition_code,
  token_secret_name,
  is_active,
  rate_limit_per_minute,
  supports_fixtures,
  supports_results,
  notes
)
values (
  'football-data',
  'football-data.org',
  'football_data_v4',
  'https://api.football-data.org/v4',
  'WC',
  'FOOTBALL_API_TOKEN',
  true,
  10,
  true,
  true,
  'Current World Cup fixture/result provider.'
)
on conflict (id) do update set
  name = excluded.name,
  adapter = excluded.adapter,
  base_url = excluded.base_url,
  competition_code = excluded.competition_code,
  token_secret_name = excluded.token_secret_name,
  rate_limit_per_minute = excluded.rate_limit_per_minute,
  supports_fixtures = excluded.supports_fixtures,
  supports_results = excluded.supports_results,
  notes = excluded.notes,
  updated_at = now();
alter table public.api_providers enable row level security;
drop policy if exists "API providers are readable" on public.api_providers;
create policy "API providers are readable"
  on public.api_providers for select
  to authenticated
  using (true);
drop policy if exists "Admins manage API providers" on public.api_providers;
create policy "Admins manage API providers"
  on public.api_providers for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
create or replace function public.admin_upsert_api_provider(
  p_id text,
  p_name text,
  p_adapter text,
  p_base_url text,
  p_competition_code text,
  p_token_secret_name text,
  p_is_active boolean,
  p_rate_limit_per_minute integer,
  p_supports_fixtures boolean,
  p_supports_results boolean,
  p_notes text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can manage API providers';
  end if;

  if p_is_active then
    update public.api_providers set is_active = false, updated_at = now();
  end if;

  insert into public.api_providers (
    id,
    name,
    adapter,
    base_url,
    competition_code,
    token_secret_name,
    is_active,
    rate_limit_per_minute,
    supports_fixtures,
    supports_results,
    notes,
    updated_by,
    updated_at
  )
  values (
    lower(trim(p_id)),
    trim(p_name),
    trim(p_adapter),
    trim(p_base_url),
    trim(p_competition_code),
    trim(p_token_secret_name),
    p_is_active,
    p_rate_limit_per_minute,
    p_supports_fixtures,
    p_supports_results,
    nullif(trim(coalesce(p_notes, '')), ''),
    auth.uid(),
    now()
  )
  on conflict (id) do update set
    name = excluded.name,
    adapter = excluded.adapter,
    base_url = excluded.base_url,
    competition_code = excluded.competition_code,
    token_secret_name = excluded.token_secret_name,
    is_active = excluded.is_active,
    rate_limit_per_minute = excluded.rate_limit_per_minute,
    supports_fixtures = excluded.supports_fixtures,
    supports_results = excluded.supports_results,
    notes = excluded.notes,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at;
end;
$$;
revoke execute on function public.admin_upsert_api_provider(
  text, text, text, text, text, text, boolean, integer, boolean, boolean, text
) from public, anon;
grant execute on function public.admin_upsert_api_provider(
  text, text, text, text, text, text, boolean, integer, boolean, boolean, text
) to authenticated;
create or replace function public.admin_set_active_api_provider(p_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can manage API providers';
  end if;

  if not exists (select 1 from public.api_providers where id = p_id) then
    raise exception 'API provider not found';
  end if;

  update public.api_providers set is_active = false, updated_at = now();
  update public.api_providers
  set is_active = true, updated_by = auth.uid(), updated_at = now()
  where id = p_id;
end;
$$;
revoke execute on function public.admin_set_active_api_provider(text) from public, anon;
grant execute on function public.admin_set_active_api_provider(text) to authenticated;
commit;

-- ============================================================================
-- Stage multiplier presets should not fail on historical incomplete outcomes.
--
-- The knockout outcome constraint was added as NOT VALID so old finished
-- knockout rows can still exist without winner_team_id / decision_method.
-- Updating points_multiplier on those rows re-checks the constraint and fails.
-- ============================================================================
begin;
-- Keep the stored knockout flag aligned for cases that can be corrected
-- without violating the outcome constraint.
update public.matches
set is_knockout = false
where stage = 'GROUP'
  and is_knockout;
-- Backfill the safe cases where the final outcome is obvious from a non-tied
-- finished score. Tied knockout rows still need an explicit admin outcome.
update public.matches
set
  is_knockout = true,
  winner_team_id = case
    when winner_team_id is not null then winner_team_id
    when home_score > away_score then home_team_id
    when away_score > home_score then away_team_id
    else winner_team_id
  end,
  decision_method = coalesce(decision_method, 'FT'::public.match_decision_method)
where (is_knockout or stage <> 'GROUP')
  and status = 'FINISHED'
  and (winner_team_id is null or decision_method is null)
  and home_team_id is not null
  and away_team_id is not null
  and home_score is not null
  and away_score is not null
  and home_score <> away_score;
update public.matches
set is_knockout = true
where stage <> 'GROUP'
  and not is_knockout
  and (
    status <> 'FINISHED'
    or (winner_team_id is not null and decision_method is not null)
  );
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
    and points_multiplier is distinct from p_multiplier
    and (
      status <> 'FINISHED'
      or (stage = 'GROUP' and not is_knockout)
      or (winner_team_id is not null and decision_method is not null)
    );

  get diagnostics affected = row_count;
  return affected;
end;
$$;
revoke all on function public.admin_set_stage_multiplier(match_stage, integer) from public;
grant execute on function public.admin_set_stage_multiplier(match_stage, integer) to authenticated;
commit;

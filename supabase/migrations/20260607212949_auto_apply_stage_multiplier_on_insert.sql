-- ============================================================================
-- 031 — Auto-apply saved stage-multiplier presets to new/synced matches
-- ----------------------------------------------------------------------------
-- Bug: admin_set_stage_multiplier() (028) only bulk-applies a preset to
-- matches that exist *at the moment it's saved*. Matches created or synced
-- afterwards (sync_matches in 017 never touches points_multiplier) silently
-- fall back to the column default of 1 — so a saved "Quarter-final = 3x"
-- preset is invisible on a quarter-final match synced an hour later.
--
-- Fix:
--   1. Backfill — bring existing matches in line with whatever preset is
--      currently saved for their stage (same effect as re-pressing every
--      preset chip once).
--   2. Trigger — on insert, look up `stage_multipliers` for the new row's
--      stage and stamp `points_multiplier` from it. Runs BEFORE INSERT so it
--      composes with the existing scoring trigger (013/021/028), which fires
--      AFTER INSERT OR UPDATE OF points_multiplier and reads the final value.
--      Per-match overrides made later via the admin "Matches" tab are pure
--      UPDATEs and are untouched by this (insert-only) trigger.
--
-- Risk:     low — additive trigger + one-time data backfill, no existing
--           logic changed.
-- Rollback: drop trigger matches_apply_stage_multiplier on public.matches;
--           drop function public.apply_stage_multiplier_default();
--           (the backfill is data-only and not reversible, by design)
-- ============================================================================
begin;

-- 1. Backfill matches that were created/synced after their stage's preset
--    was saved (or before any preset existed for that stage).
update public.matches m
set points_multiplier = sm.multiplier
from public.stage_multipliers sm
where m.stage = sm.stage
  and m.points_multiplier <> sm.multiplier;

-- 2. Stamp new rows with their stage's saved preset (if one exists).
create or replace function public.apply_stage_multiplier_default()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_multiplier int;
begin
  select multiplier into v_multiplier
  from public.stage_multipliers
  where stage = new.stage;

  if v_multiplier is not null then
    new.points_multiplier := v_multiplier;
  end if;

  return new;
end;
$$;

drop trigger if exists matches_apply_stage_multiplier on public.matches;
create trigger matches_apply_stage_multiplier
  before insert on public.matches
  for each row execute function public.apply_stage_multiplier_default();

commit;
;

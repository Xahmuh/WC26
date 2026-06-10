-- ============================================================================
-- 016 — Lock down internal SECURITY DEFINER functions + fix search_path lints
-- ----------------------------------------------------------------------------
-- The scoring/finalization helpers are invoked only by triggers and the cron
-- backstop (which run as the function owner), never directly by clients.
-- Revoke them from PUBLIC so a signed-in user can't call them over PostgREST
-- (avoids on-demand matview-refresh / notification-spam abuse).
--
-- Also pins search_path on the two immutable date helpers (advisor 0011).
--
-- Risk:     low — triggers and owner-run cron do not need EXECUTE grants.
-- Rollback: grant execute on function ... to public;
-- ============================================================================
revoke execute on function public.score_match(uuid)          from public;
revoke execute on function public.finalize_leaderboard(date) from public;
revoke execute on function public.maybe_finalize_day(date)   from public;

alter function public.tournament_tz()              set search_path = public;
alter function public.match_day(timestamptz)       set search_path = public;

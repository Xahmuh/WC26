-- ============================================================================
-- 022 — Leaderboard always reflects earned points (fix stale matview)
-- ----------------------------------------------------------------------------
-- Bug: points are written immediately (score_match / resolve_prediction_question)
-- but the `leaderboard` MATERIALIZED VIEW was only refreshed by the day-batched
-- maybe_finalize_day(), which skips while a match-day still has SCHEDULED/IN_PLAY
-- matches. Result: a user's points stayed invisible on the leaderboard (and in
-- the DB view) until the whole day completed.
--
-- Fix: a statement-level trigger on public.points refreshes the matview on ANY
-- points change and bumps the realtime tick, so earned points appear on the
-- leaderboard the moment they're scored.
--
-- Rank-change NOTIFICATIONS stay day-batched (finalize_leaderboard owns them).
-- We bump ONLY leaderboard_state.version — NOT refreshed_at, which is
-- maybe_finalize_day()'s "new points since last refresh" watermark — so the
-- finalize logic is left intact.
--
-- Scale note: non-concurrent refresh (CONCURRENTLY isn't allowed inside the
-- writer's transaction) takes a brief ACCESS EXCLUSIVE lock; negligible for this
-- app's user count. Statement-level → one refresh per scoring statement.
--
-- Rollback: drop trigger points_sync_leaderboard on public.points;
--           drop function public.tg_points_sync_leaderboard();
-- ============================================================================
begin;

create or replace function public.tg_points_sync_leaderboard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  refresh materialized view public.leaderboard;
  update public.leaderboard_state
     set version = version + 1
   where id = true;
  return null;
end $$;
revoke execute on function public.tg_points_sync_leaderboard() from anon, authenticated;

drop trigger if exists points_sync_leaderboard on public.points;
create trigger points_sync_leaderboard
  after insert or update or delete on public.points
  for each statement execute function public.tg_points_sync_leaderboard();

commit;

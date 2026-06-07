-- ============================================================================
-- 025 — Leaderboard drops a user the moment they're deleted/deactivated
-- ----------------------------------------------------------------------------
-- The leaderboard MATERIALIZED VIEW filters `is_deleted = false`, but a stale
-- matview kept a deleted/soft-deleted user's card on screen until the next
-- refresh. The points-change trigger (024) only covers users who HAD points.
--
-- This statement-level trigger on public.users refreshes the matview and bumps
-- the realtime tick whenever a user is:
--   • hard-deleted (row removed — incl. cascade from auth.users), or
--   • soft-deleted / restored (is_deleted toggled), or
--   • has a leaderboard-visible profile field changed (name/username/avatar/teams).
-- So the user's card drops from the Leaderboard immediately, for ANY delete path
-- (Supabase dashboard, admin_delete_user RPC, or raw SQL).
--
-- total_points is intentionally NOT in the column list — points changes are
-- already handled by the points trigger (024); the matview sums `points`, not
-- users.total_points, so listing it would only cause redundant refreshes.
--
-- Rollback: drop trigger users_sync_leaderboard on public.users;
--           drop function public.tg_users_sync_leaderboard();
-- ============================================================================
begin;

create or replace function public.tg_users_sync_leaderboard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  refresh materialized view public.leaderboard;
  update public.leaderboard_state set version = version + 1 where id = true;
  return null;
end $$;
revoke execute on function public.tg_users_sync_leaderboard() from anon, authenticated;

drop trigger if exists users_sync_leaderboard on public.users;
create trigger users_sync_leaderboard
  after delete or update of is_deleted, display_name, username, avatar_url, supported_teams
  on public.users
  for each statement execute function public.tg_users_sync_leaderboard();

commit;

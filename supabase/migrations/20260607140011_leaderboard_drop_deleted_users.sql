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
  for each statement execute function public.tg_users_sync_leaderboard();;

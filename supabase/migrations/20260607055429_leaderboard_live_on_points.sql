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
  for each statement execute function public.tg_points_sync_leaderboard();;

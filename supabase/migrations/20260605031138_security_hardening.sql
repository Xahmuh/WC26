-- 1. Pin search_path on the remaining functions (advisor: function_search_path_mutable).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.lock_predictions_at_kickoff()
returns void
language sql
set search_path = public
as $$
  update public.predictions p
  set is_locked = true
  from public.matches m
  where p.match_id = m.id
    and m.kickoff_time <= now()
    and p.is_locked = false;
$$;

create or replace function public.sync_user_total_points()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  affected_user uuid := coalesce(new.user_id, old.user_id);
begin
  update public.users u
  set total_points = coalesce((
    select sum(pt.total_points) from public.points pt where pt.user_id = affected_user
  ), 0)
  where u.id = affected_user;
  return null;
end;
$$;

-- 2. These functions must NOT be callable through the public REST RPC surface.
--    handle_new_user runs only from the auth trigger; the others run only from
--    the service-role edge functions / cron. Triggers still fire regardless of
--    EXECUTE grants. (advisors 0028 / 0029)
revoke execute on function public.handle_new_user()            from public, anon, authenticated;
revoke execute on function public.refresh_leaderboard()        from public, anon, authenticated;
revoke execute on function public.lock_predictions_at_kickoff() from public, anon, authenticated;

-- The service role (edge functions) explicitly retains the ability to invoke
-- the two helpers it calls via rpc().
grant execute on function public.refresh_leaderboard()         to service_role;
grant execute on function public.lock_predictions_at_kickoff() to service_role;

-- 3. The leaderboard view is intentionally readable by signed-in users (it IS
--    a public ranking), but never by anonymous visitors.
revoke select on public.leaderboard from anon;;

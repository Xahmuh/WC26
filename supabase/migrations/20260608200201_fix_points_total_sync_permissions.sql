-- ============================================================================
-- Fix points cascade deletes after user table hardening.
--
-- Deleting a match cascades to points. The points trigger recalculates
-- users.total_points, but the trigger function was SECURITY INVOKER while
-- authenticated users no longer have permission to update total_points.
-- ============================================================================
begin;

create or replace function public.sync_user_total_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_user uuid := coalesce(new.user_id, old.user_id);
begin
  update public.users u
  set total_points = coalesce((
    select sum(pt.total_points)
    from public.points pt
    where pt.user_id = affected_user
  ), 0)
  where u.id = affected_user;

  return null;
end;
$$;

revoke all on function public.sync_user_total_points() from public;

drop trigger if exists points_sync_user_total on public.points;
create trigger points_sync_user_total
  after insert or update or delete on public.points
  for each row execute function public.sync_user_total_points();

create or replace function public.admin_delete_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can delete matches';
  end if;

  delete from public.matches
  where id = p_match_id;

  if not found then
    raise exception 'Match not found';
  end if;
end;
$$;

revoke all on function public.admin_delete_match(uuid) from public;
grant execute on function public.admin_delete_match(uuid) to authenticated;

commit;

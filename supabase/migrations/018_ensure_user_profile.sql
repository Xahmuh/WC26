-- ============================================================================
-- 018 -- Ensure user profile exists for FK constraints
-- ============================================================================
-- Problem: competition_groups.created_by / group_members.user_id reference
-- public.users(id), but the on_auth_user_created trigger only fires for new
-- sign-ups.  Pre-existing auth users may lack a public.users row, causing
-- insert-time FK violations.
--
-- This RPC lets the client idempotently ensure a profile row exists before
-- performing FK-bound inserts, without needing INSERT privileges on users.
-- ============================================================================

create or replace function public.ensure_user_profile()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid;
begin
  _uid := auth.uid();
  if _uid is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.users (id, display_name)
  values (
    _uid,
    coalesce(
      (select raw_user_meta_data->>'display_name' from auth.users where id = _uid),
      split_part((select email from auth.users where id = _uid), '@', 1),
      'Player'
    )
  )
  on conflict (id) do nothing;
end;
$$;

-- Restrict execution: only authenticated users, never anonymous.
revoke execute on function public.ensure_user_profile() from anon, public;
grant  execute on function public.ensure_user_profile() to authenticated;


-- ============================================================================
-- 019 — User lifecycle: FK root-cause fix, soft-delete, username
-- ============================================================================
-- Addresses three requirements:
--   1. FK violation between competition_groups.created_by and
--      public.users(id) — backfill missing profiles + enforce trigger.
--   2. User deletion — soft-delete via is_deleted flag; hard-delete via
--      auth.users removal (invalidates sessions, cascades all data).
--   3. Username — unique, changeable, used as primary display handle.
-- ============================================================================

begin;

-- ===========================================================================
-- 0. BACKFILL — insert a public.users row for every auth.users account that
--    was created before the on_auth_user_created trigger existed or failed.
--    Idempotent — safe to re-run.
-- ===========================================================================
insert into public.users (id, display_name, avatar_url)
select
  au.id,
  coalesce(
    au.raw_user_meta_data->>'display_name',
    au.raw_user_meta_data->>'full_name',
    split_part(au.email, '@', 1),
    'Player'
  ),
  coalesce(
    au.raw_user_meta_data->>'avatar_url',
    au.raw_user_meta_data->>'picture'
  )
from auth.users au
where not exists (select 1 from public.users pu where pu.id = au.id)
on conflict (id) do nothing;

-- ===========================================================================
-- 1. NEW COLUMNS — is_deleted (soft-delete), username (display handle)
-- ===========================================================================
alter table public.users
  add column if not exists is_deleted boolean not null default false;

alter table public.users
  add column if not exists deleted_at timestamptz;

alter table public.users
  add column if not exists username text;

-- Only enforce uniqueness when username IS NOT NULL (multiple nulls allowed).
create unique index if not exists users_username_unique
  on public.users (username)
  where username is not null;

-- ===========================================================================
-- 2. UPDATE TRIGGER FUNCTION — new users automatically get a public.users row
--    (was already created in migration 001). Updated to also handle is_deleted
--    and username.
-- ===========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, display_name, avatar_url, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    coalesce(
      new.raw_user_meta_data->>'username',
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ===========================================================================
-- 3. UPDATE SYNC TRIGGER — the on_auth_user_updated trigger (migration 003)
--    re-syncs display_name / avatar_url when auth metadata changes. Keep
--    existing, only add WHERE is_deleted = false so deleted users stay frozen.
-- ===========================================================================
create or replace function public.handle_user_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set
    email = new.email,
    avatar_url = coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', avatar_url),
    display_name = coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', display_name),
    last_login = new.last_sign_in_at
  where id = new.id and is_deleted = false;
  return new;
end;
$$;

-- ===========================================================================
-- 4. ADMIN HARD-DELETE — removes the user from auth.users, which cascades to
--    public.users (via FK) and from there to all dependent rows (predictions,
--    group_members, notifications, points, etc.). Also invalidates all active
--    sessions because the auth.users row is gone.
-- ===========================================================================
create or replace function public.admin_delete_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can delete users';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Admins cannot delete themselves';
  end if;
  delete from auth.users where id = p_user_id;
end;
$$;

revoke execute on function public.admin_delete_user(uuid) from anon, public;
grant  execute on function public.admin_delete_user(uuid) to authenticated;

-- ===========================================================================
-- 5. ADMIN SOFT-DELETE — marks the profile as deleted without removing the
--    auth account. RLS blocks all subsequent reads/writes (see section 7).
--    Useful for moderation / temporary bans.
-- ===========================================================================
create or replace function public.admin_soft_delete_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can delete users';
  end if;
  update public.users
  set is_deleted = true, deleted_at = now()
  where id = p_user_id;
end;
$$;

revoke execute on function public.admin_soft_delete_user(uuid) from anon, public;
grant  execute on function public.admin_soft_delete_user(uuid) to authenticated;

-- ===========================================================================
-- 6. ADMIN RESTORE — reverses a soft-delete.
-- ===========================================================================
create or replace function public.admin_restore_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can restore users';
  end if;
  update public.users
  set is_deleted = false, deleted_at = null
  where id = p_user_id;
end;
$$;

revoke execute on function public.admin_restore_user(uuid) from anon, public;
grant  execute on function public.admin_restore_user(uuid) to authenticated;

-- ===========================================================================
-- 7. USERNAME UPDATE — authenticated user changes their own username.
--    Validates: non-null, min 3 chars, unique (case-sensitive).
-- ===========================================================================
create or replace function public.update_username(p_username text)
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

  if p_username is null or length(trim(p_username)) < 3 then
    raise exception 'Username must be at least 3 characters';
  end if;

  if exists (select 1 from public.users where username = trim(p_username) and id <> _uid and is_deleted = false) then
    raise exception 'Username already taken';
  end if;

  update public.users
  set username = trim(p_username)
  where id = _uid;
end;
$$;

revoke execute on function public.update_username(text) from anon, public;
grant  execute on function public.update_username(text) to authenticated;

-- ===========================================================================
-- 8. COLUMN-LEVEL PRIVILEGES — add username to the grant set so the client
--    can read it and (via the definer function) write it.
-- ===========================================================================
revoke update on public.users from anon, authenticated;
grant  update (display_name, avatar_url, supported_teams, username)
  on public.users to authenticated;

revoke select on public.users from anon, authenticated;
grant  select (id, display_name, avatar_url, username, total_points, supported_teams, role, created_at)
  on public.users to authenticated;

-- ===========================================================================
-- 9. RLS — block soft-deleted users from reading or writing any row.
--    Own profile is selectable (to detect "your account was deactivated").
-- ===========================================================================
drop policy if exists "users_select_all" on public.users;
drop policy if exists "users_update_own"  on public.users;

create policy "users_select_all"
  on public.users for select to authenticated
  using (is_deleted = false or id = auth.uid());

create policy "users_update_own"
  on public.users for update to authenticated
  using ((select auth.uid()) = id and is_deleted = false)
  with check ((select auth.uid()) = id and is_deleted = false);

-- ===========================================================================
-- 10. RLS — groups: deleted users cannot be group creators
-- ===========================================================================
drop policy if exists "groups_insert" on public.competition_groups;
create policy "groups_insert"
  on public.competition_groups for insert to authenticated
  with check (
    (select auth.uid()) = created_by
    and (
      select is_deleted from public.users where id = (select auth.uid())
    ) = false
  );

-- ===========================================================================
-- 11. RLS — predictions: deleted users cannot insert/update/delete predictions
-- ===========================================================================
drop policy if exists "predictions_insert_own_before_kickoff" on public.predictions;
drop policy if exists "predictions_update_own_before_kickoff" on public.predictions;
drop policy if exists "predictions_delete_own_before_kickoff" on public.predictions;

create policy "predictions_insert_own_before_kickoff"
  on public.predictions for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and is_locked = false
    and (select is_deleted from public.users where id = (select auth.uid())) = false
    and exists (select 1 from public.matches m where m.id = match_id and m.kickoff_time > now())
  );

create policy "predictions_update_own_before_kickoff"
  on public.predictions for update to authenticated
  using (
    (select auth.uid()) = user_id
    and is_locked = false
    and (select is_deleted from public.users where id = (select auth.uid())) = false
    and exists (select 1 from public.matches m where m.id = match_id and m.kickoff_time > now())
  )
  with check (
    (select auth.uid()) = user_id
    and is_locked = false
    and (select is_deleted from public.users where id = (select auth.uid())) = false
    and exists (select 1 from public.matches m where m.id = match_id and m.kickoff_time > now())
  );

create policy "predictions_delete_own_before_kickoff"
  on public.predictions for delete to authenticated
  using (
    (select auth.uid()) = user_id
    and is_locked = false
    and (select is_deleted from public.users where id = (select auth.uid())) = false
    and exists (select 1 from public.matches m where m.id = match_id and m.kickoff_time > now())
  );

-- ===========================================================================
-- 12. RLS — group_members: deleted users cannot join groups
-- ===========================================================================
drop policy if exists "group_members_insert" on public.group_members;
create policy "group_members_insert"
  on public.group_members for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (select is_deleted from public.users where id = (select auth.uid())) = false
  );

-- ===========================================================================
-- 13. DROP the client-side band-aid RPC — no longer needed now that the DB
--     guarantees every auth user has a public.users row (backfill + trigger).
-- ===========================================================================
drop function if exists public.ensure_user_profile();

-- ===========================================================================
-- 14. UPDATE LEADERBOARD VIEW — include username, exclude soft-deleted users
-- ===========================================================================
drop materialized view if exists public.leaderboard;

create materialized view public.leaderboard as
select
  u.id            as user_id,
  u.display_name,
  u.username,
  u.avatar_url,
  coalesce(sum(p.total_points), 0)                       as total_points,
  count(p.id)                                            as predictions_made,
  count(p.id) filter (where p.total_points > 0)          as predictions_scored,
  count(p.id) filter (where p.exact_bonus > 0)           as exact_predictions,
  rank() over (
    order by
      coalesce(sum(p.total_points), 0) desc,
      count(p.id) filter (where p.exact_bonus > 0) desc
  )                                                       as rank
from public.users u
left join public.points p on p.user_id = u.id
where u.is_deleted = false
group by u.id, u.display_name, u.username, u.avatar_url;

create unique index if not exists leaderboard_user_id_idx
  on public.leaderboard(user_id);

grant select on public.leaderboard to authenticated;
revoke select on public.leaderboard from anon;

commit;

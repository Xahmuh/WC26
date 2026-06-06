-- ============================================================================
-- 009 — Security hardening (RLS / triggers / column privileges)
-- ----------------------------------------------------------------------------
-- Closes verified, exploitable vulnerabilities (all proven against the live DB):
--   C1  privilege escalation via self-update of users.role / total_points
--   C2  self-approval of user_question_predictions.status -> free points
--   H1  PII leak: users.email readable by every authenticated user
--   H3  predictions editable after kickoff (RLS only checked is_locked)
-- Plus policy consolidation (one policy per action; no OR-explosions).
--
-- All security is enforced server-side (RLS + column GRANTs + SECURITY DEFINER
-- triggers/functions). No reliance on client validation.
--
-- Companion client changes required for compatibility (NOT security):
--   • stores/auth.store.ts  — drop `email,last_login` from the refreshProfile select
--   • services/admin.service.ts — read submissions via rpc('admin_get_question_submissions')
-- ============================================================================

begin;

-- ===========================================================================
-- 0. ROLE SECURITY MODEL — role is changeable ONLY through a definer function
-- ===========================================================================
create or replace function public.admin_set_user_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can change roles';
  end if;
  if p_role not in ('user', 'admin') then
    raise exception 'Invalid role: %', p_role;
  end if;
  update public.users set role = p_role where id = p_user_id;
end;
$$;
revoke execute on function public.admin_set_user_role(uuid, text) from anon;
grant  execute on function public.admin_set_user_role(uuid, text) to authenticated;

-- ===========================================================================
-- 1. USERS — privileged columns become client-immutable
-- ===========================================================================

-- 1a. Defense-in-depth trigger: a non-admin client write can NEVER mutate
--     role / total_points / email / last_login / id / created_at.
--     Runs only for client (authenticated) writes — GoTrue/service contexts
--     have auth.uid() = NULL and are skipped, so the email/role sync triggers
--     on auth.users keep working.
create or replace function public.protect_users_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select auth.uid()) is not null and not public.is_admin() then
    new.role         := old.role;
    new.total_points := old.total_points;
    new.email        := old.email;
    new.last_login   := old.last_login;
    new.id           := old.id;
    new.created_at   := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists users_protect_privileged on public.users;
create trigger users_protect_privileged
  before update on public.users
  for each row execute function public.protect_users_privileged_columns();

-- 1b. Column-level privileges — the hard guarantee. Clients may write ONLY
--     these three columns; role/total_points/email/last_login are rejected
--     at the privilege layer (permission denied), before any policy/trigger.
revoke update on public.users from anon, authenticated;
grant  update (display_name, avatar_url, supported_teams) on public.users to authenticated;

-- 1c. PII: hide email + last_login from client SELECT. Rows stay visible
--     (leaderboard / group standings / player profiles need the other cols);
--     a user reads their own email from the auth session, admins via the RPC.
revoke select on public.users from anon, authenticated;
grant  select (id, display_name, avatar_url, total_points, supported_teams, role, created_at)
  on public.users to authenticated;

-- 1d. One clear SELECT + one clear UPDATE policy (no INSERT/DELETE for clients;
--     rows are created by the handle_new_user definer trigger).
drop policy if exists "Profiles are publicly readable" on public.users;
drop policy if exists "Users read own profile"          on public.users;
drop policy if exists "Users update own profile"         on public.users;
drop policy if exists "users_select_all"                 on public.users;
drop policy if exists "users_update_own"                 on public.users;

create policy "users_select_all"
  on public.users for select to authenticated
  using (true);

create policy "users_update_own"
  on public.users for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ===========================================================================
-- 2. USER_QUESTION_PREDICTIONS — status is admin-only; client status ignored
-- ===========================================================================

-- 2a. Trigger ignores any client-supplied status. Non-admins: forced 'pending'
--     on insert, frozen to the previous value on update. Only is_admin() may
--     move status to 'approved'/'rejected' (which fires the points trigger).
create or replace function public.guard_uqp_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    if tg_op = 'INSERT' then
      new.status := 'pending';
    elsif tg_op = 'UPDATE' then
      new.status := old.status;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists uqp_guard_status on public.user_question_predictions;
create trigger uqp_guard_status
  before insert or update on public.user_question_predictions
  for each row execute function public.guard_uqp_status();

-- 2b. Drop the loose / duplicate policies that bypassed the open-question and
--     status checks (OR-combined permissive policies defeated the strict ones).
drop policy if exists "Users upsert own question predictions" on public.user_question_predictions;
drop policy if exists "Users update own question predictions"  on public.user_question_predictions;
drop policy if exists "Users read own question predictions"    on public.user_question_predictions;
-- Retained (already correct): "Admins can manage all question predictions" (ALL),
-- "Users can read own question predictions" (SELECT),
-- "Users can submit/update/delete own question predictions for open questions".

-- ===========================================================================
-- 3. PREDICTIONS — server-enforced kickoff cutoff (not just is_locked)
-- ===========================================================================
drop policy if exists "Users insert own unlocked predictions" on public.predictions;
drop policy if exists "Users update own unlocked predictions" on public.predictions;
drop policy if exists "Users delete own unlocked predictions" on public.predictions;
drop policy if exists "predictions_insert_own_before_kickoff" on public.predictions;
drop policy if exists "predictions_update_own_before_kickoff" on public.predictions;
drop policy if exists "predictions_delete_own_before_kickoff" on public.predictions;

create policy "predictions_insert_own_before_kickoff"
  on public.predictions for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and is_locked = false
    and exists (select 1 from public.matches m
                where m.id = match_id and m.kickoff_time > now())
  );

create policy "predictions_update_own_before_kickoff"
  on public.predictions for update to authenticated
  using (
    (select auth.uid()) = user_id
    and is_locked = false
    and exists (select 1 from public.matches m
                where m.id = match_id and m.kickoff_time > now())
  )
  with check (
    (select auth.uid()) = user_id
    and is_locked = false
    and exists (select 1 from public.matches m
                where m.id = match_id and m.kickoff_time > now())
  );

create policy "predictions_delete_own_before_kickoff"
  on public.predictions for delete to authenticated
  using (
    (select auth.uid()) = user_id
    and is_locked = false
    and exists (select 1 from public.matches m
                where m.id = match_id and m.kickoff_time > now())
  );
-- SELECT "Users read own predictions" retained unchanged.

-- ===========================================================================
-- 4. ADMIN PII ACCESS — admins keep submitter emails via a gated definer fn
-- ===========================================================================
create or replace function public.admin_get_question_submissions(p_question_id uuid)
returns table (
  id           uuid,
  prediction   text,
  status       text,
  created_at   timestamptz,
  user_id      uuid,
  display_name text,
  email        text,
  avatar_url   text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;
  return query
    select uqp.id, uqp.prediction, uqp.status, uqp.created_at,
           u.id, u.display_name, u.email, u.avatar_url
    from public.user_question_predictions uqp
    join public.users u on u.id = uqp.user_id
    where uqp.question_id = p_question_id
    order by uqp.created_at desc;
end;
$$;
revoke execute on function public.admin_get_question_submissions(uuid) from anon;
grant  execute on function public.admin_get_question_submissions(uuid) to authenticated;

-- ===========================================================================
-- 5. POLICY CLEANUP — one policy per action (no OR-explosions)
-- ===========================================================================

-- competition_groups -------------------------------------------------------
drop policy if exists "Competition groups are readable by authenticated users" on public.competition_groups;
drop policy if exists "Groups readable"                                        on public.competition_groups;
drop policy if exists "Authenticated users can create competition groups"      on public.competition_groups;
drop policy if exists "Users create groups"                                    on public.competition_groups;
drop policy if exists "Creators delete groups"                                 on public.competition_groups;
drop policy if exists "Group creators or admins can update/delete groups"      on public.competition_groups;
drop policy if exists "groups_select" on public.competition_groups;
drop policy if exists "groups_insert" on public.competition_groups;
drop policy if exists "groups_update" on public.competition_groups;
drop policy if exists "groups_delete" on public.competition_groups;

create policy "groups_select" on public.competition_groups for select to authenticated
  using (true);
create policy "groups_insert" on public.competition_groups for insert to authenticated
  with check ((select auth.uid()) = created_by);
create policy "groups_update" on public.competition_groups for update to authenticated
  using ((select auth.uid()) = created_by or public.is_admin())
  with check ((select auth.uid()) = created_by or public.is_admin());
create policy "groups_delete" on public.competition_groups for delete to authenticated
  using ((select auth.uid()) = created_by or public.is_admin());

-- group_members ------------------------------------------------------------
drop policy if exists "Group members are readable by authenticated users" on public.group_members;
drop policy if exists "Members readable"                                  on public.group_members;
drop policy if exists "Authenticated users can join groups themselves"    on public.group_members;
drop policy if exists "Users join groups"                                 on public.group_members;
drop policy if exists "Users can leave groups, group creators or admins can kick membe" on public.group_members;
drop policy if exists "Users leave groups"                               on public.group_members;
drop policy if exists "group_members_select" on public.group_members;
drop policy if exists "group_members_insert" on public.group_members;
drop policy if exists "group_members_delete" on public.group_members;

create policy "group_members_select" on public.group_members for select to authenticated
  using (true);
create policy "group_members_insert" on public.group_members for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "group_members_delete" on public.group_members for delete to authenticated
  using (
    (select auth.uid()) = user_id
    or (select g.created_by from public.competition_groups g where g.id = group_id) = (select auth.uid())
    or public.is_admin()
  );

-- prediction_questions -----------------------------------------------------
drop policy if exists "Prediction questions are readable by authenticated users" on public.prediction_questions;
drop policy if exists "Questions are public"                                     on public.prediction_questions;
drop policy if exists "Admins insert questions"                                  on public.prediction_questions;
drop policy if exists "Admins update questions"                                  on public.prediction_questions;
drop policy if exists "Admins can manage prediction questions"                   on public.prediction_questions;
drop policy if exists "questions_select" on public.prediction_questions;
drop policy if exists "questions_insert" on public.prediction_questions;
drop policy if exists "questions_update" on public.prediction_questions;
drop policy if exists "questions_delete" on public.prediction_questions;

create policy "questions_select" on public.prediction_questions for select to authenticated
  using (true);
create policy "questions_insert" on public.prediction_questions for insert to authenticated
  with check (public.is_admin());
create policy "questions_update" on public.prediction_questions for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "questions_delete" on public.prediction_questions for delete to authenticated
  using (public.is_admin());

commit;

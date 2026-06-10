-- 0. ROLE SECURITY MODEL — role changeable ONLY through a definer function
create or replace function public.admin_set_user_role(p_user_id uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
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

-- 1a. Defense-in-depth trigger: client write can NEVER mutate privileged cols.
create or replace function public.protect_users_privileged_columns()
returns trigger language plpgsql security definer set search_path = public as $$
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

-- 1b. Column-level privileges — clients may write ONLY these three columns.
revoke update on public.users from anon, authenticated;
grant  update (display_name, avatar_url, supported_teams) on public.users to authenticated;

-- 1c. PII: hide email + last_login from client SELECT.
revoke select on public.users from anon, authenticated;
grant  select (id, display_name, avatar_url, total_points, supported_teams, role, created_at)
  on public.users to authenticated;

-- 1d. One clear SELECT + one clear UPDATE policy.
drop policy if exists "Profiles are publicly readable" on public.users;
drop policy if exists "Users read own profile"          on public.users;
drop policy if exists "Users update own profile"         on public.users;
drop policy if exists "users_select_all"                 on public.users;
drop policy if exists "users_update_own"                 on public.users;
create policy "users_select_all" on public.users for select to authenticated using (true);
create policy "users_update_own" on public.users for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- 2. USER_QUESTION_PREDICTIONS — status is admin-only.
create or replace function public.guard_uqp_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if tg_op = 'INSERT' then new.status := 'pending';
    elsif tg_op = 'UPDATE' then new.status := old.status;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists uqp_guard_status on public.user_question_predictions;
create trigger uqp_guard_status
  before insert or update on public.user_question_predictions
  for each row execute function public.guard_uqp_status();

drop policy if exists "Users upsert own question predictions" on public.user_question_predictions;
drop policy if exists "Users update own question predictions"  on public.user_question_predictions;
drop policy if exists "Users read own question predictions"    on public.user_question_predictions;

-- 3. PREDICTIONS — server-enforced kickoff cutoff.
drop policy if exists "Users insert own unlocked predictions" on public.predictions;
drop policy if exists "Users update own unlocked predictions" on public.predictions;
drop policy if exists "Users delete own unlocked predictions" on public.predictions;
drop policy if exists "predictions_insert_own_before_kickoff" on public.predictions;
drop policy if exists "predictions_update_own_before_kickoff" on public.predictions;
drop policy if exists "predictions_delete_own_before_kickoff" on public.predictions;
create policy "predictions_insert_own_before_kickoff" on public.predictions for insert to authenticated
  with check ((select auth.uid()) = user_id and is_locked = false
    and exists (select 1 from public.matches m where m.id = match_id and m.kickoff_time > now()));
create policy "predictions_update_own_before_kickoff" on public.predictions for update to authenticated
  using ((select auth.uid()) = user_id and is_locked = false
    and exists (select 1 from public.matches m where m.id = match_id and m.kickoff_time > now()))
  with check ((select auth.uid()) = user_id and is_locked = false
    and exists (select 1 from public.matches m where m.id = match_id and m.kickoff_time > now()));
create policy "predictions_delete_own_before_kickoff" on public.predictions for delete to authenticated
  using ((select auth.uid()) = user_id and is_locked = false
    and exists (select 1 from public.matches m where m.id = match_id and m.kickoff_time > now()));

-- 4. ADMIN PII ACCESS — gated definer fn returns submitter emails.
create or replace function public.admin_get_question_submissions(p_question_id uuid)
returns table (id uuid, prediction text, status text, created_at timestamptz,
  user_id uuid, display_name text, email text, avatar_url text)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
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
grant  execute on function public.admin_get_question_submissions(uuid) to authenticated;;

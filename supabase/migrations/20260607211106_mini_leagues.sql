-- ============================================================================
-- 030 — Mini Leagues (private group leaderboards)
-- ----------------------------------------------------------------------------
-- Adds user-created private leagues with their own ranking, derived live from
-- the existing `leaderboard` matview (no duplicated scoring/ranking).
-- ============================================================================
begin;

create table if not exists public.leagues (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(btrim(name)) between 3 and 40),
  description  text check (description is null or char_length(description) <= 280),
  avatar_url   text,
  owner_id     uuid not null references public.users(id) on delete cascade,
  invite_code  text not null unique,
  max_members  int check (max_members is null or max_members between 2 and 500),
  is_deleted   boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_leagues_owner on public.leagues(owner_id);
create index if not exists idx_leagues_invite_code on public.leagues(invite_code);

create table if not exists public.league_members (
  league_id  uuid not null references public.leagues(id) on delete cascade,
  user_id    uuid not null references public.users(id) on delete cascade,
  role       text not null default 'member' check (role in ('owner', 'member')),
  joined_at  timestamptz not null default now(),
  primary key (league_id, user_id)
);

create index if not exists idx_league_members_user on public.league_members(user_id);
create index if not exists idx_league_members_league on public.league_members(league_id);

drop trigger if exists leagues_set_updated_at on public.leagues;
create trigger leagues_set_updated_at
  before update on public.leagues
  for each row execute function public.set_updated_at();

create or replace function public.generate_league_invite_code()
returns text language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
begin
  loop
    code := 'WC26';
    for i in 1..4 loop
      code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    end loop;
    exit when not exists (select 1 from public.leagues where invite_code = code);
  end loop;
  return code;
end $$;

-- `supported_teams` lives on `users`, not on the `leaderboard` matview (it was
-- dropped from the view's column list in migration 019) — sourced directly
-- from `users` here so league rows show supported-team crests correctly.
create or replace view public.league_leaderboard as
select
  lm.league_id,
  lb.user_id,
  lb.display_name,
  lb.username,
  lb.avatar_url,
  lb.total_points,
  lb.predictions_made,
  lb.predictions_scored,
  lb.exact_predictions,
  u.supported_teams,
  rank() over (
    partition by lm.league_id
    order by lb.total_points desc, lb.user_id
  ) as league_rank,
  count(*) over (partition by lm.league_id) as league_member_count
from public.league_members lm
join public.leaderboard lb on lb.user_id = lm.user_id
join public.users u on u.id = lm.user_id;

grant select on public.league_leaderboard to authenticated;

alter table public.leagues enable row level security;
alter table public.league_members enable row level security;

drop policy if exists leagues_select on public.leagues;
create policy leagues_select on public.leagues
  for select to authenticated
  using (
    not is_deleted and (
      exists (select 1 from public.league_members m where m.league_id = leagues.id and m.user_id = auth.uid())
      or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
    )
  );

drop policy if exists leagues_insert on public.leagues;
create policy leagues_insert on public.leagues
  for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists leagues_update on public.leagues;
create policy leagues_update on public.leagues
  for update to authenticated
  using (owner_id = auth.uid() or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'))
  with check (owner_id = auth.uid() or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

drop policy if exists leagues_delete on public.leagues;
create policy leagues_delete on public.leagues
  for delete to authenticated
  using (owner_id = auth.uid() or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

drop policy if exists league_members_select on public.league_members;
create policy league_members_select on public.league_members
  for select to authenticated
  using (
    exists (select 1 from public.league_members m2 where m2.league_id = league_members.league_id and m2.user_id = auth.uid())
    or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

create or replace function public.create_league(
  p_name text,
  p_description text default null,
  p_avatar_url text default null,
  p_max_members int default null
) returns public.leagues
language plpgsql security definer set search_path = public as $$
declare
  v_league public.leagues;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.leagues (name, description, avatar_url, owner_id, invite_code, max_members)
  values (btrim(p_name), nullif(btrim(coalesce(p_description, '')), ''), p_avatar_url, auth.uid(),
          public.generate_league_invite_code(), p_max_members)
  returning * into v_league;

  insert into public.league_members (league_id, user_id, role)
  values (v_league.id, auth.uid(), 'owner');

  return v_league;
end $$;
revoke all on function public.create_league(text, text, text, int) from anon;
grant execute on function public.create_league(text, text, text, int) to authenticated;

create or replace function public.join_league_by_code(p_invite_code text)
returns public.leagues
language plpgsql security definer set search_path = public as $$
declare
  v_league public.leagues;
  v_count int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_league from public.leagues
   where invite_code = upper(btrim(p_invite_code)) and not is_deleted
   for update;

  if not found then
    raise exception 'Invalid invite code';
  end if;

  if exists (select 1 from public.league_members where league_id = v_league.id and user_id = auth.uid()) then
    return v_league;
  end if;

  if v_league.max_members is not null then
    select count(*) into v_count from public.league_members where league_id = v_league.id;
    if v_count >= v_league.max_members then
      raise exception 'This league is full';
    end if;
  end if;

  insert into public.league_members (league_id, user_id, role) values (v_league.id, auth.uid(), 'member');
  return v_league;
end $$;
revoke all on function public.join_league_by_code(text) from anon;
grant execute on function public.join_league_by_code(text) to authenticated;

create or replace function public.leave_league(p_league_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from public.leagues where id = p_league_id and owner_id = auth.uid()) then
    raise exception 'Owners cannot leave — delete the league or transfer ownership first';
  end if;

  delete from public.league_members where league_id = p_league_id and user_id = auth.uid();
end $$;
revoke all on function public.leave_league(uuid) from anon;
grant execute on function public.leave_league(uuid) to authenticated;

create or replace function public.remove_league_member(p_league_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.leagues where id = p_league_id and owner_id = auth.uid()) then
    raise exception 'Only the league owner can remove members';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Use leave_league or delete_league instead';
  end if;

  delete from public.league_members where league_id = p_league_id and user_id = p_user_id;
end $$;
revoke all on function public.remove_league_member(uuid, uuid) from anon;
grant execute on function public.remove_league_member(uuid, uuid) to authenticated;

create or replace function public.regenerate_league_invite_code(p_league_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_code text;
begin
  if not exists (select 1 from public.leagues where id = p_league_id and owner_id = auth.uid()) then
    raise exception 'Only the league owner can regenerate the invite code';
  end if;

  v_code := public.generate_league_invite_code();
  update public.leagues set invite_code = v_code, updated_at = now() where id = p_league_id;
  return v_code;
end $$;
revoke all on function public.regenerate_league_invite_code(uuid) from anon;
grant execute on function public.regenerate_league_invite_code(uuid) to authenticated;

create or replace function public.update_league(
  p_league_id uuid,
  p_name text default null,
  p_description text default null,
  p_avatar_url text default null,
  p_max_members int default null
) returns public.leagues
language plpgsql security definer set search_path = public as $$
declare v_league public.leagues;
begin
  if not exists (select 1 from public.leagues where id = p_league_id and owner_id = auth.uid()) then
    raise exception 'Only the league owner can edit this league';
  end if;

  update public.leagues set
    name        = coalesce(nullif(btrim(p_name), ''), name),
    description = case when p_description is not null then nullif(btrim(p_description), '') else description end,
    avatar_url  = coalesce(p_avatar_url, avatar_url),
    max_members = case when p_max_members is not null then p_max_members else max_members end,
    updated_at  = now()
  where id = p_league_id
  returning * into v_league;

  return v_league;
end $$;
revoke all on function public.update_league(uuid, text, text, text, int) from anon;
grant execute on function public.update_league(uuid, text, text, text, int) to authenticated;

create or replace function public.delete_league(p_league_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.leagues l
    where l.id = p_league_id
      and (l.owner_id = auth.uid() or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'))
  ) then
    raise exception 'Only the league owner or an admin can delete this league';
  end if;

  delete from public.leagues where id = p_league_id;
end $$;
revoke all on function public.delete_league(uuid) from anon;
grant execute on function public.delete_league(uuid) to authenticated;

create or replace function public.transfer_league_ownership(p_league_id uuid, p_new_owner_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.leagues l
    where l.id = p_league_id
      and (l.owner_id = auth.uid() or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'))
  ) then
    raise exception 'Only the league owner or an admin can transfer ownership';
  end if;

  if not exists (select 1 from public.league_members where league_id = p_league_id and user_id = p_new_owner_id) then
    raise exception 'New owner must already be a member of the league';
  end if;

  update public.leagues set owner_id = p_new_owner_id, updated_at = now() where id = p_league_id;
  update public.league_members set role = 'member' where league_id = p_league_id and user_id <> p_new_owner_id;
  update public.league_members set role = 'owner' where league_id = p_league_id and user_id = p_new_owner_id;
end $$;
revoke all on function public.transfer_league_ownership(uuid, uuid) from anon;
grant execute on function public.transfer_league_ownership(uuid, uuid) to authenticated;

commit;
;

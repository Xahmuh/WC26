-- ============================================================================
-- Fix mini-league RLS recursion
-- ----------------------------------------------------------------------------
-- `league_members_select` queried `league_members` from inside a policy on the
-- same table, which makes Postgres recursively apply that policy until it fails:
--   infinite recursion detected in policy for relation "league_members"
--
-- Move the membership check into a tightly scoped SECURITY DEFINER helper so
-- the policy can answer "is the current user in this league?" without invoking
-- the same table policy again.
-- ============================================================================

begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create or replace function private.current_user_is_league_member(p_league_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.league_members lm
      where lm.league_id = p_league_id
        and lm.user_id = (select auth.uid())
    );
$$;
revoke all on function private.current_user_is_league_member(uuid) from public;
grant execute on function private.current_user_is_league_member(uuid) to authenticated;
-- Be explicit for projects created after Supabase's table-exposure default
-- change: RLS decides row access, but GRANT decides whether the Data API can
-- see these tables at all.
revoke all on table public.leagues, public.league_members from anon;
grant select on table public.leagues, public.league_members to authenticated;
drop policy if exists leagues_select on public.leagues;
create policy leagues_select on public.leagues
  for select to authenticated
  using (
    not is_deleted
    and (
      private.current_user_is_league_member(leagues.id)
      or public.is_admin()
    )
  );
drop policy if exists league_members_select on public.league_members;
create policy league_members_select on public.league_members
  for select to authenticated
  using (
    private.current_user_is_league_member(league_members.league_id)
    or public.is_admin()
  );
-- Plain views are security-definer by default in Postgres, so make this view
-- respect the caller's RLS policies on league_members/users.
create or replace view public.league_leaderboard
with (security_invoker = true) as
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
revoke all on public.league_leaderboard from anon;
commit;

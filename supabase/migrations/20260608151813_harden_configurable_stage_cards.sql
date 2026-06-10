-- ============================================================================
-- Hardening pass for configurable stage cards.
-- ============================================================================

begin;
create or replace function public.card_stage_rank(p_stage public.match_stage)
returns integer
language sql
immutable
set search_path to 'public'
as $$
  select case p_stage
    when 'GROUP' then 1
    when 'ROUND_OF_32' then 2
    when 'ROUND_OF_16' then 3
    when 'QUARTER_FINAL' then 4
    when 'SEMI_FINAL' then 5
    when 'THIRD_PLACE' then 6
    when 'FINAL' then 7
    else 999
  end;
$$;
create or replace function public.card_stage_is_between(
  p_stage public.match_stage,
  p_from public.match_stage,
  p_until public.match_stage
)
returns boolean
language sql
immutable
set search_path to 'public'
as $$
  select public.card_stage_rank(p_stage) between public.card_stage_rank(p_from)
    and public.card_stage_rank(p_until);
$$;
-- Public buckets can serve public object URLs without a broad SELECT policy.
-- Dropping it prevents clients from listing every card image path.
drop policy if exists "Card images are publicly readable" on storage.objects;
-- Avoid duplicate permissive SELECT policies on card_definitions. Authenticated
-- users can read definitions; only admins can write them.
drop policy if exists "Admins manage card definitions" on public.card_definitions;
drop policy if exists "Admins create card definitions" on public.card_definitions;
create policy "Admins create card definitions"
  on public.card_definitions for insert
  to authenticated
  with check (public.is_admin());
drop policy if exists "Admins update card definitions" on public.card_definitions;
create policy "Admins update card definitions"
  on public.card_definitions for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
drop policy if exists "Admins delete card definitions" on public.card_definitions;
create policy "Admins delete card definitions"
  on public.card_definitions for delete
  to authenticated
  using (public.is_admin());
-- One SELECT policy covers both owner access and admin visibility.
drop policy if exists "Users read own cards" on public.user_cards;
drop policy if exists "Admins read all user cards" on public.user_cards;
drop policy if exists "Users and admins read cards" on public.user_cards;
create policy "Users and admins read cards"
  on public.user_cards for select
  to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());
-- SECURITY DEFINER functions should not be callable by anon. Internal helpers
-- are trigger-only; the recalculation RPC is admin-guarded and authenticated.
revoke execute on function public.award_user_stage_cards(uuid, public.match_stage)
  from public, anon, authenticated;
revoke execute on function public.tg_points_award_stage_cards()
  from public, anon, authenticated;
revoke execute on function public.restore_prediction_card_use(uuid)
  from public, anon, authenticated;
revoke execute on function public.tg_predictions_apply_card_usage()
  from public, anon, authenticated;
revoke execute on function public.tg_predictions_restore_card_usage()
  from public, anon, authenticated;
revoke execute on function public.admin_recalculate_stage_cards(public.match_stage)
  from public, anon;
grant execute on function public.admin_recalculate_stage_cards(public.match_stage)
  to authenticated;
commit;

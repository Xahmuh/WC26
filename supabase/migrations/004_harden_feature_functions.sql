-- ============================================================================
-- 004 — Security hardening for the 003 feature functions
-- ============================================================================
-- • Removes the redundant creator-join trigger (auto_join_group_creator already
--   enrols the creator idempotently).
-- • Revokes EXECUTE on SECURITY DEFINER functions from the roles that should not
--   call them over the REST RPC surface. Supabase grants EXECUTE to anon AND
--   authenticated explicitly, so we revoke from the specific roles (not PUBLIC).
--   Trigger functions never need a direct call. is_admin() keeps `authenticated`
--   (RLS policies evaluate it) and resolve_prediction_question() keeps
--   `authenticated` (admins call it; it self-guards with an is_admin() check).
-- ============================================================================

drop trigger if exists groups_add_creator on public.competition_groups;
drop function if exists public.add_group_creator_as_member();

revoke execute on function public.auto_join_group_creator() from anon, authenticated;
revoke execute on function public.handle_user_update()      from anon, authenticated;
revoke execute on function public.is_admin()                              from anon;
revoke execute on function public.resolve_prediction_question(uuid, text) from anon;

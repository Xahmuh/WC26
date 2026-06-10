-- Drop my redundant creator-join trigger; the existing on_group_created /
-- auto_join_group_creator() (idempotent, ON CONFLICT DO NOTHING) already covers it.
drop trigger if exists groups_add_creator on public.competition_groups;
drop function if exists public.add_group_creator_as_member();

-- Close the anon/public REST RPC surface on SECURITY DEFINER functions.
-- Trigger functions still fire regardless of EXECUTE grants. is_admin() and
-- resolve_prediction_question() keep their explicit `authenticated` grants
-- (RLS needs is_admin; resolve self-guards with an is_admin() check).
revoke execute on function public.auto_join_group_creator()                from public;
revoke execute on function public.handle_user_update()                     from public;
revoke execute on function public.is_admin()                               from public;
revoke execute on function public.resolve_prediction_question(uuid, text)  from public;;

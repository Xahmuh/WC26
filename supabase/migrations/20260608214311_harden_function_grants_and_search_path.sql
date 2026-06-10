begin;
-- Supabase advisor: set a stable search_path on helper functions that lacked it.
alter function public.set_hero_slides_updated_at() set search_path = public;
alter function public.generate_league_invite_code() set search_path = public;
alter function public.set_home_cards_tile_settings_updated_at() set search_path = public;
alter function public.set_match_knockout_flag() set search_path = public;
alter function public.validate_prediction_outcome() set search_path = public;
-- Helper/trigger functions should not be callable as REST RPC endpoints.
revoke execute on function public.generate_league_invite_code() from public, anon, authenticated;
revoke execute on function public.set_hero_slides_updated_at() from public, anon, authenticated;
revoke execute on function public.set_home_cards_tile_settings_updated_at() from public, anon, authenticated;
revoke execute on function public.set_match_knockout_flag() from public, anon, authenticated;
revoke execute on function public.validate_prediction_outcome() from public, anon, authenticated;
-- These are trigger/internal guard functions. They should run from triggers or
-- policies, not as REST RPC endpoints.
revoke execute on function public.guard_notification_update() from public, anon, authenticated;
revoke execute on function public.guard_uqp_status() from public, anon, authenticated;
revoke execute on function public.handle_prediction_audit() from public, anon, authenticated;
revoke execute on function public.protect_users_privileged_columns() from public, anon, authenticated;
revoke execute on function public.sync_user_total_points() from public, anon, authenticated;
revoke execute on function public.tg_match_after_write() from public, anon, authenticated;
revoke execute on function public.tg_points_award_stage_cards() from public, anon, authenticated;
revoke execute on function public.tg_points_sync_leaderboard() from public, anon, authenticated;
revoke execute on function public.tg_predictions_apply_card_usage() from public, anon, authenticated;
revoke execute on function public.tg_predictions_restore_card_usage() from public, anon, authenticated;
revoke execute on function public.tg_users_sync_leaderboard() from public, anon, authenticated;
-- Keep user/admin RPCs available to signed-in users only. Many older migrations
-- revoked from anon but left the default PUBLIC grant in place, which still
-- lets anon inherit EXECUTE.
revoke execute on function public.admin_broadcast(text, text, text) from public, anon;
revoke execute on function public.admin_get_question_submissions(uuid) from public, anon;
revoke execute on function public.admin_set_stage_multiplier(match_stage, integer) from public, anon;
revoke execute on function public.admin_set_user_role(uuid, text) from public, anon;
revoke execute on function public.create_league(text, text, text, integer) from public, anon;
revoke execute on function public.delete_league(uuid) from public, anon;
revoke execute on function public.get_user_streak(uuid) from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_active_user(uuid) from public, anon;
revoke execute on function public.join_league_by_code(text) from public, anon;
revoke execute on function public.leave_league(uuid) from public, anon;
revoke execute on function public.regenerate_league_invite_code(uuid) from public, anon;
revoke execute on function public.remove_league_member(uuid, uuid) from public, anon;
revoke execute on function public.resolve_prediction_question(uuid, text) from public, anon;
revoke execute on function public.transfer_league_ownership(uuid, uuid) from public, anon;
revoke execute on function public.update_league(uuid, text, text, text, integer) from public, anon;
revoke execute on function public.update_username(text) from public, anon;
grant execute on function public.admin_broadcast(text, text, text) to authenticated;
grant execute on function public.admin_get_question_submissions(uuid) to authenticated;
grant execute on function public.admin_set_stage_multiplier(match_stage, integer) to authenticated;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;
grant execute on function public.create_league(text, text, text, integer) to authenticated;
grant execute on function public.delete_league(uuid) to authenticated;
grant execute on function public.get_user_streak(uuid) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_active_user(uuid) to authenticated;
grant execute on function public.join_league_by_code(text) to authenticated;
grant execute on function public.leave_league(uuid) to authenticated;
grant execute on function public.regenerate_league_invite_code(uuid) to authenticated;
grant execute on function public.remove_league_member(uuid, uuid) to authenticated;
grant execute on function public.resolve_prediction_question(uuid, text) to authenticated;
grant execute on function public.transfer_league_ownership(uuid, uuid) to authenticated;
grant execute on function public.update_league(uuid, text, text, text, integer) to authenticated;
grant execute on function public.update_username(text) to authenticated;
commit;

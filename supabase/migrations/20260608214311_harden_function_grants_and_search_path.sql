begin;

-- Supabase advisor: set a stable search_path on helper functions that lacked it.
alter function public.set_hero_slides_updated_at() set search_path = public;
alter function public.generate_league_invite_code() set search_path = public;
alter function public.set_home_cards_tile_settings_updated_at() set search_path = public;
alter function public.set_match_knockout_flag() set search_path = public;
alter function public.validate_prediction_outcome() set search_path = public;

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

-- Keep these as authenticated RPCs, but remove anonymous access.
revoke execute on function public.admin_set_stage_multiplier(match_stage, integer) from public, anon;
revoke execute on function public.get_user_streak(uuid) from public, anon;
revoke execute on function public.is_active_user(uuid) from public, anon;
grant execute on function public.admin_set_stage_multiplier(match_stage, integer) to authenticated;
grant execute on function public.get_user_streak(uuid) to authenticated;
grant execute on function public.is_active_user(uuid) to authenticated;

commit;

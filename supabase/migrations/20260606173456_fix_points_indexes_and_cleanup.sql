-- 010 — Fix points upsert arbiter + remove duplicate indexes/triggers
drop index if exists public.points_user_match_idx;
create unique index if not exists points_user_match_uidx
  on public.points (user_id, match_id);

drop index if exists public.points_user_question_idx;

create index if not exists idx_points_question on public.points (question_id);

drop trigger if exists uq_predictions_set_updated_at on public.user_question_predictions;;

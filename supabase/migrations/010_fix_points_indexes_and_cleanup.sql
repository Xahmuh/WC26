-- ============================================================================
-- 010 — Fix the points upsert arbiter + remove duplicate indexes/triggers
-- ----------------------------------------------------------------------------
-- ROOT CAUSE of "no points ever awarded":
--   The only unique index covering (user_id, match_id) was PARTIAL
--     CREATE UNIQUE INDEX points_user_match_idx ... WHERE (match_id IS NOT NULL)
--   PostgreSQL cannot infer a partial unique index as an ON CONFLICT arbiter
--   unless the statement repeats its WHERE predicate (which supabase-js /
--   PostgREST cannot send). Result: every points upsert failed with
--     42P10 / there is no unique or exclusion constraint matching the
--     ON CONFLICT specification
--   (Reproduced live before this migration.)
--
-- This migration replaces it with a plain (non-partial) unique index, which IS
-- inferrable. NULL match_id rows (question-points) remain allowed many times
-- because NULLs are distinct in a unique index, so no false conflicts arise.
--
-- Risk:      very low. points currently holds 0 rows; index build is instant.
-- Rollback:  drop index points_user_match_uidx;
--            create unique index points_user_match_idx on public.points
--              (user_id, match_id) where (match_id is not null);
-- ============================================================================
begin;

-- 1. Replace the un-inferrable partial index with a plain unique index.
drop index if exists public.points_user_match_idx;
create unique index if not exists points_user_match_uidx
  on public.points (user_id, match_id);

-- 2. Drop the redundant duplicate on (user_id, question_id). The non-partial
--    points_user_question_key remains and is itself an inferrable arbiter.
drop index if exists public.points_user_question_idx;

-- 3. Add the missing FK index on points.question_id (FK had no supporting index).
create index if not exists idx_points_question on public.points (question_id);

-- 4. Remove the duplicate updated_at trigger on user_question_predictions.
--    Both uq_predictions_set_updated_at and uqp_set_updated_at call
--    set_updated_at(); keep one.
drop trigger if exists uq_predictions_set_updated_at on public.user_question_predictions;

commit;

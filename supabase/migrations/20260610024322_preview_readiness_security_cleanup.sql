-- ============================================================================
-- Preview readiness safety cleanup.
--
-- Non-destructive hardening for Supabase advisor findings that can be fixed
-- without changing app flows, scoring, predictions, auth, or admin behavior.
-- ============================================================================
begin;
-- user_rank_snapshot is an internal rank-change snapshot table. Keep RLS on,
-- and allow a signed-in user to read only their own snapshot if queried.
drop policy if exists user_rank_snapshot_select_own on public.user_rank_snapshot;
create policy user_rank_snapshot_select_own
  on public.user_rank_snapshot
  for select
  to authenticated
  using ((select auth.uid()) = user_id);
-- Public storage buckets do not need broad SELECT policies for public object
-- URLs. Dropping these policies prevents clients from listing every object in
-- the bucket while preserving public URL rendering and admin upload/update/delete
-- policies.
drop policy if exists "Hero banner images are publicly readable" on storage.objects;
drop policy if exists "Prediction card images are publicly readable" on storage.objects;
drop policy if exists "Card images are publicly readable" on storage.objects;
-- Older remote history created duplicate indexes with idx_uq_pred_* names.
-- Keep the current idx_uqp_* indexes from 003_features_groups_questions_multiplier.
drop index if exists public.idx_uq_pred_user;
drop index if exists public.idx_uq_pred_question;
commit;

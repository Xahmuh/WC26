-- ============================================================================
-- 022 — Fix predictions INSERT RLS (is_active_user + SCHEDULED match check)
-- Phase 2 of fix-predictions-insert-rls.md
-- FIX 1 (is_active_user) already applied in 021.
-- FIX 3/4 (UPDATE/DELETE) already applied in 021 — skipped here.
-- ============================================================================
begin;

-- FIX 2 — Replace INSERT policy (remove raw public.users subquery)
drop policy if exists predictions_insert_own_before_kickoff on public.predictions;

create policy predictions_insert_own_before_kickoff
on public.predictions
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and public.is_active_user((select auth.uid()))
  and exists (
    select 1 from public.matches m
    where m.id = predictions.match_id
      and m.kickoff_time > now()
      and m.status = 'SCHEDULED'
  )
);

-- FIX 5 — Ensure RLS is enabled
alter table public.predictions enable row level security;

commit;

-- ============================================================================
-- World Cup 2026 Prediction Platform — Admin Manage Matches Policies
-- ============================================================================

-- Allow admins to insert new matches
drop policy if exists "Admins insert matches" on public.matches;
create policy "Admins insert matches"
  on public.matches for insert to authenticated
  with check (public.is_admin());

-- Allow admins to delete matches
drop policy if exists "Admins delete matches" on public.matches;
create policy "Admins delete matches"
  on public.matches for delete to authenticated
  using (public.is_admin());

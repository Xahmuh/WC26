-- ============================================================================
-- 1) Avatars bucket: the app uploads profile pictures to
--    avatars/<user_id>-<timestamp>.jpg (see app/(tabs)/profile.tsx), but the
--    bucket was never created. Public read; users manage only their own files.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "Users upload own avatar" on storage.objects;
create policy "Users upload own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and name like 'avatars/' || (select auth.uid())::text || '-%'
  );

drop policy if exists "Users update own avatar" on storage.objects;
create policy "Users update own avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and name like 'avatars/' || (select auth.uid())::text || '-%'
  )
  with check (
    bucket_id = 'avatars'
    and name like 'avatars/' || (select auth.uid())::text || '-%'
  );

drop policy if exists "Users delete own avatar" on storage.objects;
create policy "Users delete own avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and name like 'avatars/' || (select auth.uid())::text || '-%'
  );

-- ============================================================================
-- 2) Seed the singleton leaderboard_state row. finalize_leaderboard() bumps
--    version with `update ... where id = true`, which silently no-ops on an
--    empty table — so the realtime leaderboard tick never fired.
-- ============================================================================
insert into public.leaderboard_state (id, version)
values (true, 0)
on conflict (id) do nothing;

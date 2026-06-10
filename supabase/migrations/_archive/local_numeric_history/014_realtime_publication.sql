-- ============================================================================
-- 014 — Enable realtime on the tables the app subscribes to
-- ----------------------------------------------------------------------------
-- The supabase_realtime publication was EMPTY (0 tables) so every
-- postgres_changes subscription silently received nothing. We publish:
--   • notifications        → bell / unread badge / sound (points + rank_change)
--   • leaderboard_state     → single-row tick; clients refetch the matview when
--                             ranks are finalized (NOT on every match)
--   • matches, predictions  → live match cards / personal prediction state
--   • points                → a user's own points cards
--   • user_question_predictions → audit status
-- Idempotent — skips tables already in the publication. Materialized views
-- (public.leaderboard) cannot be published; leaderboard_state is the signal.
--
-- Risk: low. Rollback: alter publication supabase_realtime drop table <t>;
-- ============================================================================
do $$
declare
  t text;
  tables text[] := array[
    'notifications', 'leaderboard_state', 'matches',
    'predictions', 'points', 'user_question_predictions'
  ];
begin
  foreach t in array tables loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

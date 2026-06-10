-- ============================================================================
-- 020 — Remove the Mini-Leagues / Groups feature
-- ----------------------------------------------------------------------------
-- Drops the competition_groups + group_members tables and their auto-enrol
-- trigger function. Tables were empty at removal time. CASCADE removes the
-- dependent foreign keys, RLS policies, triggers and indexes.
-- ============================================================================

drop table if exists public.group_members cascade;
drop table if exists public.competition_groups cascade;

drop function if exists public.auto_join_group_creator() cascade;
drop function if exists public.add_group_creator_as_member() cascade;

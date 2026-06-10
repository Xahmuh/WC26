-- Remove the Mini-Leagues / Groups feature entirely.
-- Tables are empty (0 rows) at time of removal. CASCADE drops the dependent
-- foreign keys, RLS policies, triggers and indexes along with the tables.

drop table if exists public.group_members cascade;
drop table if exists public.competition_groups cascade;

-- Trigger function(s) that auto-enrolled the creator (orphaned once tables go).
drop function if exists public.auto_join_group_creator() cascade;
drop function if exists public.add_group_creator_as_member() cascade;;

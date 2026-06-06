-- ============================================================================
-- 017 — Placeholder (TBD) matches + a safe, idempotent fixtures upsert
-- ----------------------------------------------------------------------------
-- Knockout fixtures are published by the API with TBD (null) team ids until
-- qualification is decided. Previously sync-fixtures dropped them, so the
-- bracket was incomplete. This migration:
--   1. Allows matches with unknown teams (home/away_team_id nullable) + an
--      is_placeholder flag, so the full bracket can exist from day one.
--   2. Adds public.sync_matches(jsonb) — a single conditional upsert that:
--        • inserts new fixtures (incl. TBD placeholders),
--        • progressively fills team ids as they resolve (COALESCE, never nulls
--          out a known team),
--        • NEVER overwrites a FINISHED result (status/scores frozen once final),
--        • never deletes, keyed on external_id, fully idempotent.
--
-- Leaderboard is untouched: the existing matches_after_write trigger still only
-- scores on FINISHED transitions and only finalizes a fully-complete match-day.
--
-- Risk:     low/additive. Existing rows unaffected (nullable widen + new col
--           default false). matches_distinct_teams CHECK still holds (NULL<>x
--           is NULL → passes), so placeholders are allowed.
-- Rollback: drop function public.sync_matches(jsonb);
--           alter table public.matches drop column is_placeholder;
--           (re-adding NOT NULL requires backfilling team ids first.)
-- ============================================================================
begin;

alter table public.matches alter column home_team_id drop not null;
alter table public.matches alter column away_team_id drop not null;
alter table public.matches add column if not exists is_placeholder boolean not null default false;
create index if not exists idx_matches_stage on public.matches(stage);

-- Safe bulk upsert. Input: jsonb array of
--   { external_id, home_team_id?, away_team_id?, status, stage, group_name?,
--     kickoff_time, venue?, home_score?, away_score? }
-- Returns the number of rows processed.
create or replace function public.sync_matches(p_matches jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare n int;
begin
  insert into public.matches as m
    (external_id, home_team_id, away_team_id, status, stage, group_name,
     kickoff_time, venue, home_score, away_score, is_placeholder, last_synced_at)
  select
    (e->>'external_id')::int,
    nullif(e->>'home_team_id','')::uuid,
    nullif(e->>'away_team_id','')::uuid,
    coalesce(e->>'status','SCHEDULED')::match_status,
    coalesce(e->>'stage','GROUP')::match_stage,
    nullif(e->>'group_name',''),
    (e->>'kickoff_time')::timestamptz,
    nullif(e->>'venue',''),
    case when (e->>'status') = 'FINISHED' then nullif(e->>'home_score','')::int end,
    case when (e->>'status') = 'FINISHED' then nullif(e->>'away_score','')::int end,
    (nullif(e->>'home_team_id','') is null or nullif(e->>'away_team_id','') is null),
    now()
  from jsonb_array_elements(p_matches) as e
  on conflict (external_id) do update set
    -- Always-safe fields refreshed from the API.
    kickoff_time = excluded.kickoff_time,
    venue        = excluded.venue,
    stage        = excluded.stage,
    group_name   = excluded.group_name,
    -- Progressive team fill: take the API value when present, else keep ours.
    home_team_id = coalesce(excluded.home_team_id, m.home_team_id),
    away_team_id = coalesce(excluded.away_team_id, m.away_team_id),
    is_placeholder = (coalesce(excluded.home_team_id, m.home_team_id) is null
                      or coalesce(excluded.away_team_id, m.away_team_id) is null),
    -- NEVER overwrite a finished result; otherwise accept the API status/score.
    status     = case when m.status = 'FINISHED' then m.status     else excluded.status     end,
    home_score = case when m.status = 'FINISHED' then m.home_score else excluded.home_score end,
    away_score = case when m.status = 'FINISHED' then m.away_score else excluded.away_score end,
    last_synced_at = now();

  get diagnostics n = row_count;
  return n;
end $$;

revoke execute on function public.sync_matches(jsonb) from anon, authenticated, public;
grant  execute on function public.sync_matches(jsonb) to service_role;

commit;

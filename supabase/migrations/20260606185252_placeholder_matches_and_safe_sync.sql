alter table public.matches alter column home_team_id drop not null;
alter table public.matches alter column away_team_id drop not null;
alter table public.matches add column if not exists is_placeholder boolean not null default false;
create index if not exists idx_matches_stage on public.matches(stage);

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
    kickoff_time = excluded.kickoff_time,
    venue        = excluded.venue,
    stage        = excluded.stage,
    group_name   = excluded.group_name,
    home_team_id = coalesce(excluded.home_team_id, m.home_team_id),
    away_team_id = coalesce(excluded.away_team_id, m.away_team_id),
    is_placeholder = (coalesce(excluded.home_team_id, m.home_team_id) is null
                      or coalesce(excluded.away_team_id, m.away_team_id) is null),
    status     = case when m.status = 'FINISHED' then m.status     else excluded.status     end,
    home_score = case when m.status = 'FINISHED' then m.home_score else excluded.home_score end,
    away_score = case when m.status = 'FINISHED' then m.away_score else excluded.away_score end,
    last_synced_at = now();

  get diagnostics n = row_count;
  return n;
end $$;

revoke execute on function public.sync_matches(jsonb) from anon, authenticated, public;
grant  execute on function public.sync_matches(jsonb) to service_role;;

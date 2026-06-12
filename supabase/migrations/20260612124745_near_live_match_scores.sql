-- Near-live match status support. Values are additive and safe for existing rows.
alter type public.match_status add value if not exists 'TIMED';
alter type public.match_status add value if not exists 'PAUSED';
alter type public.match_status add value if not exists 'SUSPENDED';
alter type public.match_status add value if not exists 'EXTRA_TIME';
alter type public.match_status add value if not exists 'PENALTY_SHOOTOUT';

create table if not exists public.api_sync_state (
  key text primary key,
  last_started_at timestamptz,
  last_completed_at timestamptz,
  last_skipped_at timestamptz,
  last_status text,
  last_message text,
  updated_at timestamptz not null default now()
);

alter table public.api_sync_state enable row level security;
revoke all on table public.api_sync_state from public, anon, authenticated;
grant select, insert, update, delete on table public.api_sync_state to service_role;

create or replace function public.try_begin_api_sync(
  p_key text,
  p_min_interval_seconds integer default 60
)
returns table (
  should_run boolean,
  last_started_at timestamptz,
  wait_seconds integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := btrim(coalesce(p_key, ''));
  v_now timestamptz := clock_timestamp();
  v_last_started_at timestamptz;
  v_elapsed_seconds numeric;
  v_min_interval integer := greatest(coalesce(p_min_interval_seconds, 60), 1);
begin
  if v_key = '' then
    raise exception 'sync key is required';
  end if;

  insert into public.api_sync_state (key, updated_at)
  values (v_key, v_now)
  on conflict (key) do nothing;

  select s.last_started_at
    into v_last_started_at
    from public.api_sync_state s
    where s.key = v_key
    for update;

  if v_last_started_at is not null then
    v_elapsed_seconds := extract(epoch from (v_now - v_last_started_at));
    if v_elapsed_seconds < v_min_interval then
      update public.api_sync_state
      set
        last_skipped_at = v_now,
        last_status = 'skipped',
        last_message = 'throttled',
        updated_at = v_now
      where key = v_key;

      return query select
        false,
        v_last_started_at,
        ceiling(v_min_interval - v_elapsed_seconds)::integer;
      return;
    end if;
  end if;

  update public.api_sync_state
  set
    last_started_at = v_now,
    last_status = 'started',
    last_message = null,
    updated_at = v_now
  where key = v_key;

  return query select true, v_now, 0;
end;
$$;

revoke execute on function public.try_begin_api_sync(text, integer) from public, anon, authenticated;
grant execute on function public.try_begin_api_sync(text, integer) to service_role;

drop policy if exists predictions_insert_own_before_kickoff on public.predictions;
drop policy if exists predictions_update_own_before_kickoff on public.predictions;
drop policy if exists predictions_delete_own_before_kickoff on public.predictions;

create policy predictions_insert_own_before_kickoff
  on public.predictions for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and is_locked = false
    and public.is_active_user((select auth.uid()))
    and exists (
      select 1
      from public.matches m
      where m.id = match_id
        and m.kickoff_time > now()
        and m.status::text in ('SCHEDULED', 'TIMED')
    )
  );

create policy predictions_update_own_before_kickoff
  on public.predictions for update
  to authenticated
  using (
    (select auth.uid()) = user_id
    and is_locked = false
    and public.is_active_user((select auth.uid()))
    and exists (
      select 1
      from public.matches m
      where m.id = match_id
        and m.kickoff_time > now()
        and m.status::text in ('SCHEDULED', 'TIMED')
    )
  )
  with check (
    (select auth.uid()) = user_id
    and is_locked = false
    and public.is_active_user((select auth.uid()))
    and exists (
      select 1
      from public.matches m
      where m.id = match_id
        and m.kickoff_time > now()
        and m.status::text in ('SCHEDULED', 'TIMED')
    )
  );

create policy predictions_delete_own_before_kickoff
  on public.predictions for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    and is_locked = false
    and public.is_active_user((select auth.uid()))
    and exists (
      select 1
      from public.matches m
      where m.id = match_id
        and m.kickoff_time > now()
        and m.status::text in ('SCHEDULED', 'TIMED')
    )
  );

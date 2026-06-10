-- World Cup 2026 Prediction Platform — Initial Schema

create extension if not exists "pgcrypto";

do $$ begin
  create type match_status as enum (
    'SCHEDULED', 'IN_PLAY', 'FINISHED', 'POSTPONED', 'CANCELLED'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type match_stage as enum (
    'GROUP', 'ROUND_OF_16', 'QUARTER_FINAL',
    'SEMI_FINAL', 'THIRD_PLACE', 'FINAL'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.users (
  id           uuid references auth.users(id) on delete cascade primary key,
  display_name text not null,
  avatar_url   text,
  total_points int not null default 0,
  created_at   timestamptz not null default now()
);

create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  external_id int unique not null,
  name        text not null,
  short_name  text,
  code        char(3),
  flag_url    text,
  group_name  char(1),
  created_at  timestamptz not null default now()
);

create table if not exists public.matches (
  id            uuid primary key default gen_random_uuid(),
  external_id   int unique not null,
  home_team_id  uuid not null references public.teams(id),
  away_team_id  uuid not null references public.teams(id),
  home_score    int,
  away_score    int,
  status        match_status not null default 'SCHEDULED',
  stage         match_stage not null default 'GROUP',
  group_name    char(1),
  kickoff_time  timestamptz not null,
  venue         text,
  last_synced_at timestamptz,
  created_at    timestamptz not null default now(),
  constraint matches_distinct_teams check (home_team_id <> away_team_id)
);

create table if not exists public.predictions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  match_id        uuid not null references public.matches(id) on delete cascade,
  pred_home_score int not null check (pred_home_score >= 0 and pred_home_score <= 20),
  pred_away_score int not null check (pred_away_score >= 0 and pred_away_score <= 20),
  is_locked       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, match_id)
);

create table if not exists public.points (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users(id) on delete cascade,
  match_id         uuid not null references public.matches(id) on delete cascade,
  winner_points    int not null default 0,
  home_goal_points int not null default 0,
  away_goal_points int not null default 0,
  exact_bonus      int not null default 0,
  total_points     int not null default 0,
  calculated_at    timestamptz not null default now(),
  unique (user_id, match_id)
);

create index if not exists idx_matches_status      on public.matches(status);
create index if not exists idx_matches_kickoff     on public.matches(kickoff_time);
create index if not exists idx_predictions_user    on public.predictions(user_id);
create index if not exists idx_predictions_match   on public.predictions(match_id);
create index if not exists idx_points_user         on public.points(user_id);
create index if not exists idx_points_match        on public.points(match_id);

drop materialized view if exists public.leaderboard;
create materialized view public.leaderboard as
select
  u.id            as user_id,
  u.display_name,
  u.avatar_url,
  coalesce(sum(p.total_points), 0)                            as total_points,
  count(p.id)                                                 as predictions_made,
  count(p.id) filter (where p.total_points > 0)               as predictions_scored,
  rank() over (order by coalesce(sum(p.total_points), 0) desc) as rank
from public.users u
left join public.points p on p.user_id = u.id
group by u.id, u.display_name, u.avatar_url;

create unique index if not exists leaderboard_user_id_idx
  on public.leaderboard(user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists predictions_set_updated_at on public.predictions;
create trigger predictions_set_updated_at
  before update on public.predictions
  for each row execute function public.set_updated_at();

create or replace function public.lock_predictions_at_kickoff()
returns void
language sql
as $$
  update public.predictions p
  set is_locked = true
  from public.matches m
  where p.match_id = m.id
    and m.kickoff_time <= now()
    and p.is_locked = false;
$$;

create or replace function public.refresh_leaderboard()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view concurrently public.leaderboard;
exception when others then
  refresh materialized view public.leaderboard;
end;
$$;

create or replace function public.sync_user_total_points()
returns trigger
language plpgsql
as $$
declare
  affected_user uuid := coalesce(new.user_id, old.user_id);
begin
  update public.users u
  set total_points = coalesce((
    select sum(pt.total_points) from public.points pt where pt.user_id = affected_user
  ), 0)
  where u.id = affected_user;
  return null;
end;
$$;

drop trigger if exists points_sync_user_total on public.points;
create trigger points_sync_user_total
  after insert or update or delete on public.points
  for each row execute function public.sync_user_total_points();

alter table public.users enable row level security;
drop policy if exists "Users read own profile" on public.users;
create policy "Users read own profile"
  on public.users for select to authenticated
  using (id = auth.uid());
drop policy if exists "Profiles are publicly readable" on public.users;
create policy "Profiles are publicly readable"
  on public.users for select to authenticated
  using (true);
drop policy if exists "Users update own profile" on public.users;
create policy "Users update own profile"
  on public.users for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

alter table public.teams enable row level security;
drop policy if exists "Teams are public" on public.teams;
create policy "Teams are public"
  on public.teams for select to authenticated using (true);

alter table public.matches enable row level security;
drop policy if exists "Matches are public" on public.matches;
create policy "Matches are public"
  on public.matches for select to authenticated using (true);

alter table public.predictions enable row level security;
drop policy if exists "Users read own predictions" on public.predictions;
create policy "Users read own predictions"
  on public.predictions for select to authenticated
  using (user_id = auth.uid());
drop policy if exists "Users insert own unlocked predictions" on public.predictions;
create policy "Users insert own unlocked predictions"
  on public.predictions for insert to authenticated
  with check (user_id = auth.uid() and is_locked = false);
drop policy if exists "Users update own unlocked predictions" on public.predictions;
create policy "Users update own unlocked predictions"
  on public.predictions for update to authenticated
  using (user_id = auth.uid() and is_locked = false)
  with check (user_id = auth.uid() and is_locked = false);
drop policy if exists "Users delete own unlocked predictions" on public.predictions;
create policy "Users delete own unlocked predictions"
  on public.predictions for delete to authenticated
  using (user_id = auth.uid() and is_locked = false);

alter table public.points enable row level security;
drop policy if exists "Points are public" on public.points;
create policy "Points are public"
  on public.points for select to authenticated using (true);

grant select on public.leaderboard to authenticated;;

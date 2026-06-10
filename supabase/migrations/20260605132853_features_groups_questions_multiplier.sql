-- ============================================================================
-- 003 — Feature expansion: roles, joker multiplier, custom questions, mini-leagues
-- ============================================================================

-- ── users: email / last_login / role ───────────────────────────────────────
alter table public.users add column if not exists email text;
alter table public.users add column if not exists last_login timestamptz;
alter table public.users add column if not exists role text not null default 'user';
do $$ begin
  alter table public.users add constraint users_role_check check (role in ('user','admin'));
exception when duplicate_object then null; end $$;

-- ── matches: joker points multiplier ───────────────────────────────────────
alter table public.matches add column if not exists points_multiplier int not null default 1;
do $$ begin
  alter table public.matches add constraint matches_multiplier_check check (points_multiplier between 1 and 5);
exception when duplicate_object then null; end $$;

-- ── admin helper (used by RLS policies) ────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.users where id = auth.uid() and role = 'admin');
$$;
grant execute on function public.is_admin() to authenticated;

-- ── prediction_questions ───────────────────────────────────────────────────
create table if not exists public.prediction_questions (
  id             uuid primary key default gen_random_uuid(),
  question_text  text not null,
  options        jsonb not null default '[]'::jsonb,
  correct_answer text,
  points         int not null default 10 check (points > 0),
  status         text not null default 'open' check (status in ('open','closed','resolved')),
  created_at     timestamptz not null default now(),
  resolved_at    timestamptz,
  created_by     uuid references public.users(id) on delete set null
);
create index if not exists idx_questions_status on public.prediction_questions(status);

-- ── user_question_predictions ──────────────────────────────────────────────
create table if not exists public.user_question_predictions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  question_id uuid not null references public.prediction_questions(id) on delete cascade,
  prediction  text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, question_id)
);
create index if not exists idx_uqp_user on public.user_question_predictions(user_id);
create index if not exists idx_uqp_question on public.user_question_predictions(question_id);

drop trigger if exists uqp_set_updated_at on public.user_question_predictions;
create trigger uqp_set_updated_at
  before update on public.user_question_predictions
  for each row execute function public.set_updated_at();

-- ── points: allow question-based points alongside match points ─────────────
alter table public.points alter column match_id drop not null;
alter table public.points add column if not exists question_id uuid
  references public.prediction_questions(id) on delete cascade;
do $$ begin
  alter table public.points add constraint points_one_source_check
    check (num_nonnulls(match_id, question_id) = 1);
exception when duplicate_object then null; end $$;
-- (existing unique(user_id, match_id) stays; nulls are distinct so question
--  rows never collide. Add a matching uniqueness for question rows.)
do $$ begin
  alter table public.points add constraint points_user_question_key unique (user_id, question_id);
exception when duplicate_object then null; end $$;

-- ── competition_groups (mini-leagues) ──────────────────────────────────────
create table if not exists public.competition_groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) >= 3),
  code       text not null unique,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id  uuid not null references public.competition_groups(id) on delete cascade,
  user_id   uuid not null references public.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists idx_group_members_user on public.group_members(user_id);

-- Auto-enrol the creator as the first member.
create or replace function public.add_group_creator_as_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is not null then
    insert into public.group_members (group_id, user_id)
    values (new.id, new.created_by)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists groups_add_creator on public.competition_groups;
create trigger groups_add_creator
  after insert on public.competition_groups
  for each row execute function public.add_group_creator_as_member();

-- ── resolve_prediction_question RPC (admin-only; awards points) ─────────────
create or replace function public.resolve_prediction_question(
  p_question_id uuid,
  p_correct_answer text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  q public.prediction_questions%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can resolve questions';
  end if;

  select * into q from public.prediction_questions where id = p_question_id;
  if not found then
    raise exception 'Question not found';
  end if;

  update public.prediction_questions
    set correct_answer = p_correct_answer,
        status = 'resolved',
        resolved_at = now()
    where id = p_question_id;

  -- Award `points` to everyone who picked the correct option (idempotent).
  insert into public.points (
    user_id, match_id, question_id,
    winner_points, home_goal_points, away_goal_points, exact_bonus,
    total_points, calculated_at
  )
  select uqp.user_id, null, p_question_id, 0, 0, 0, 0, q.points, now()
  from public.user_question_predictions uqp
  where uqp.question_id = p_question_id
    and uqp.prediction = p_correct_answer
  on conflict (user_id, question_id)
    do update set total_points = excluded.total_points, calculated_at = now();

  perform public.refresh_leaderboard();
end;
$$;
grant execute on function public.resolve_prediction_question(uuid, text) to authenticated;

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- matches: admins may update (joker multiplier / corrections).
drop policy if exists "Admins update matches" on public.matches;
create policy "Admins update matches"
  on public.matches for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- prediction_questions: everyone reads; admins write.
alter table public.prediction_questions enable row level security;
drop policy if exists "Questions are public" on public.prediction_questions;
create policy "Questions are public"
  on public.prediction_questions for select to authenticated using (true);
drop policy if exists "Admins insert questions" on public.prediction_questions;
create policy "Admins insert questions"
  on public.prediction_questions for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins update questions" on public.prediction_questions;
create policy "Admins update questions"
  on public.prediction_questions for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- user_question_predictions: users manage their own.
alter table public.user_question_predictions enable row level security;
drop policy if exists "Users read own question predictions" on public.user_question_predictions;
create policy "Users read own question predictions"
  on public.user_question_predictions for select to authenticated
  using (user_id = auth.uid());
drop policy if exists "Users upsert own question predictions" on public.user_question_predictions;
create policy "Users upsert own question predictions"
  on public.user_question_predictions for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists "Users update own question predictions" on public.user_question_predictions;
create policy "Users update own question predictions"
  on public.user_question_predictions for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- competition_groups: any signed-in user can read (needed to join by code) +
-- create; the creator may delete.
alter table public.competition_groups enable row level security;
drop policy if exists "Groups readable" on public.competition_groups;
create policy "Groups readable"
  on public.competition_groups for select to authenticated using (true);
drop policy if exists "Users create groups" on public.competition_groups;
create policy "Users create groups"
  on public.competition_groups for insert to authenticated
  with check (created_by = auth.uid());
drop policy if exists "Creators delete groups" on public.competition_groups;
create policy "Creators delete groups"
  on public.competition_groups for delete to authenticated
  using (created_by = auth.uid());

-- group_members: members readable to signed-in users; users join themselves.
alter table public.group_members enable row level security;
drop policy if exists "Members readable" on public.group_members;
create policy "Members readable"
  on public.group_members for select to authenticated using (true);
drop policy if exists "Users join groups" on public.group_members;
create policy "Users join groups"
  on public.group_members for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists "Users leave groups" on public.group_members;
create policy "Users leave groups"
  on public.group_members for delete to authenticated
  using (user_id = auth.uid());

-- ── handle_new_user: capture email + role from signup metadata ─────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, display_name, avatar_url, email, role, last_login)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    new.email,
    case when new.raw_user_meta_data->>'role' = 'admin' then 'admin' else 'user' end,
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;;

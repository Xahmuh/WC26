-- ============================================================================
-- World Cup 2026 Prediction Platform — Admin Roles & Competition Groups
-- ============================================================================

-- ── 1. Update Users Table ───────────────────────────────────────────────────
alter table public.users add column if not exists email text;
alter table public.users add column if not exists last_login timestamptz;
alter table public.users add column if not exists role text not null default 'user' check (role in ('user', 'admin'));

-- Update existing users with email if we can find it (for safety)
update public.users u
set email = (select email from auth.users where id = u.id)
where email is null;

-- Recreate trigger function for handle_new_user to sync new columns
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, display_name, email, avatar_url, role, last_login)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    ),
    new.email,
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    coalesce(new.raw_user_meta_data->>'role', 'user'),
    new.last_sign_in_at
  )
  on conflict (id) do update
  set
    email = excluded.email,
    avatar_url = coalesce(excluded.avatar_url, users.avatar_url),
    last_login = coalesce(excluded.last_login, users.last_login);
  return new;
end;
$$;

-- Create update trigger to keep email, avatar_url, and last_login updated
create or replace function public.handle_user_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set
    email = new.email,
    avatar_url = coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', avatar_url),
    display_name = coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', display_name),
    last_login = coalesce(new.last_sign_in_at, last_login)
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute function public.handle_user_update();

-- ── 2. Admin Helper Functions ───────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.users where id = auth.uid()),
    false
  );
$$;

-- ── 3. Update Matches Table ─────────────────────────────────────────────────
alter table public.matches add column if not exists points_multiplier int not null default 1 check (points_multiplier in (1, 2, 3));

-- ── 4. Custom Prediction Questions (Tournament Predictions) ─────────────────
create table if not exists public.prediction_questions (
  id             uuid primary key default gen_random_uuid(),
  question_text  text not null,
  options        jsonb not null, -- JSON array of strings, e.g., ["Messi", "Mbappe", "Neymar"]
  correct_answer text,           -- Populated when resolved
  points         int not null default 10,
  status         text not null default 'open' check (status in ('open', 'closed', 'resolved')),
  created_at     timestamptz not null default now(),
  resolved_at    timestamptz,
  created_by     uuid references public.users(id) on delete set null
);

create table if not exists public.user_question_predictions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  question_id uuid not null references public.prediction_questions(id) on delete cascade,
  prediction  text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, question_id)
);

create index if not exists idx_uq_pred_user on public.user_question_predictions(user_id);
create index if not exists idx_uq_pred_question on public.user_question_predictions(question_id);

-- Keep user_question_predictions.updated_at fresh.
drop trigger if exists uq_predictions_set_updated_at on public.user_question_predictions;
create trigger uq_predictions_set_updated_at
  before update on public.user_question_predictions
  for each row execute function public.set_updated_at();

-- ── 5. Modify Points Table ──────────────────────────────────────────────────
-- Drop old foreign key & unique constraints
alter table public.points drop constraint if exists points_match_id_fkey;
alter table public.points alter column match_id drop not null;
alter table public.points add column if not exists question_id uuid references public.prediction_questions(id) on delete cascade;

-- Restore foreign key for match_id
alter table public.points add constraint points_match_id_fkey foreign key (match_id) references public.matches(id) on delete cascade;

-- Unique constraint update: user can have only one point entry per match, and one per custom question
alter table public.points drop constraint if exists points_user_id_match_id_key;
drop index if exists public.points_user_id_match_id_key;

create unique index if not exists points_user_match_idx on public.points(user_id, match_id) where match_id is not null;
create unique index if not exists points_user_question_idx on public.points(user_id, question_id) where question_id is not null;

-- Ensure points row is either for a match or for a custom question, not both or neither
alter table public.points drop constraint if exists points_match_or_question;
alter table public.points add constraint points_match_or_question check (
  (match_id is not null and question_id is null) or
  (match_id is null and question_id is not null)
);

-- ── 6. Create Function to Resolve Prediction Questions ──────────────────────
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
  q_status text;
  q_points int;
begin
  -- 1. Verify caller is admin
  if not public.is_admin() then
    raise exception 'Unauthorized: Only admins can resolve questions.';
  end if;

  -- 2. Fetch question info
  select status, points into q_status, q_points
  from public.prediction_questions
  where id = p_question_id;

  if not found then
    raise exception 'Question not found.';
  end if;

  if q_status = 'resolved' then
    raise exception 'Question is already resolved.';
  end if;

  -- 3. Update the question status
  update public.prediction_questions
  set
    correct_answer = p_correct_answer,
    status = 'resolved',
    resolved_at = now()
  where id = p_question_id;

  -- 4. Award points to users who predicted correctly
  -- Insert into public.points which will trigger sync_user_total_points()
  insert into public.points (user_id, question_id, winner_points, total_points, calculated_at)
  select
    uqp.user_id,
    uqp.question_id,
    q_points,
    q_points,
    now()
  from public.user_question_predictions uqp
  where uqp.question_id = p_question_id
    and uqp.prediction = p_correct_answer
  on conflict (user_id, question_id) do update
  set
    winner_points = excluded.winner_points,
    total_points = excluded.total_points,
    calculated_at = now();

  -- 5. Refresh the leaderboard
  perform public.refresh_leaderboard();
end;
$$;

-- ── 7. Competition Groups (Mini-Leagues) ────────────────────────────────────
create table if not exists public.competition_groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  code        varchar(10) unique not null,
  created_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id    uuid not null references public.competition_groups(id) on delete cascade,
  user_id     uuid not null references public.users(id) on delete cascade,
  joined_at   timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists idx_group_members_user on public.group_members(user_id);
create index if not exists idx_group_members_group on public.group_members(group_id);

-- Auto-join group creator
create or replace function public.auto_join_group_creator()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is not null then
    insert into public.group_members (group_id, user_id)
    values (new.id, new.created_by)
    on conflict (group_id, user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_group_created on public.competition_groups;
create trigger on_group_created
  after insert on public.competition_groups
  for each row execute function public.auto_join_group_creator();

-- ── 8. RLS Policies ─────────────────────────────────────────────────────────

-- 8.1. Prediction Questions
alter table public.prediction_questions enable row level security;

drop policy if exists "Prediction questions are readable by authenticated users" on public.prediction_questions;
create policy "Prediction questions are readable by authenticated users"
  on public.prediction_questions for select to authenticated
  using (true);

drop policy if exists "Admins can manage prediction questions" on public.prediction_questions;
create policy "Admins can manage prediction questions"
  on public.prediction_questions for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 8.2. User Question Predictions
alter table public.user_question_predictions enable row level security;

drop policy if exists "Users can read own question predictions" on public.user_question_predictions;
create policy "Users can read own question predictions"
  on public.user_question_predictions for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can submit own question predictions for open questions" on public.user_question_predictions;
create policy "Users can submit own question predictions for open questions"
  on public.user_question_predictions for insert to authenticated
  with check (
    user_id = auth.uid() and 
    (select status from public.prediction_questions where id = question_id) = 'open'
  );

drop policy if exists "Users can update own question predictions for open questions" on public.user_question_predictions;
create policy "Users can update own question predictions for open questions"
  on public.user_question_predictions for update to authenticated
  using (
    user_id = auth.uid() and 
    (select status from public.prediction_questions where id = question_id) = 'open'
  )
  with check (
    user_id = auth.uid() and 
    (select status from public.prediction_questions where id = question_id) = 'open'
  );

drop policy if exists "Users can delete own question predictions for open questions" on public.user_question_predictions;
create policy "Users can delete own question predictions for open questions"
  on public.user_question_predictions for delete to authenticated
  using (
    user_id = auth.uid() and 
    (select status from public.prediction_questions where id = question_id) = 'open'
  );

-- 8.3. Competition Groups
alter table public.competition_groups enable row level security;

drop policy if exists "Competition groups are readable by authenticated users" on public.competition_groups;
create policy "Competition groups are readable by authenticated users"
  on public.competition_groups for select to authenticated
  using (true);

drop policy if exists "Authenticated users can create competition groups" on public.competition_groups;
create policy "Authenticated users can create competition groups"
  on public.competition_groups for insert to authenticated
  with check (created_by = auth.uid());

drop policy if exists "Group creators or admins can update/delete groups" on public.competition_groups;
create policy "Group creators or admins can update/delete groups"
  on public.competition_groups for all to authenticated
  using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());

-- 8.4. Group Members
alter table public.group_members enable row level security;

drop policy if exists "Group members are readable by authenticated users" on public.group_members;
create policy "Group members are readable by authenticated users"
  on public.group_members for select to authenticated
  using (true);

drop policy if exists "Authenticated users can join groups themselves" on public.group_members;
create policy "Authenticated users can join groups themselves"
  on public.group_members for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can leave groups, group creators or admins can kick members" on public.group_members;
create policy "Users can leave groups, group creators or admins can kick members"
  on public.group_members for delete to authenticated
  using (
    user_id = auth.uid() or 
    (select created_by from public.competition_groups where id = group_id) = auth.uid() or 
    public.is_admin()
  );

-- Prediction breaking-news ticker shown above the app header.
create table if not exists public.prediction_news (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prediction_news_message_len check (
    char_length(btrim(message)) between 8 and 220
  )
);

create index if not exists idx_prediction_news_active_order
  on public.prediction_news (is_active, sort_order, created_at desc);

alter table public.prediction_news enable row level security;

grant select on public.prediction_news to anon, authenticated;
grant insert, update, delete on public.prediction_news to authenticated;

drop policy if exists prediction_news_public_read_active on public.prediction_news;
create policy prediction_news_public_read_active
  on public.prediction_news for select
  to anon, authenticated
  using (is_active = true or public.is_admin());

drop policy if exists prediction_news_admin_insert on public.prediction_news;
create policy prediction_news_admin_insert
  on public.prediction_news for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists prediction_news_admin_update on public.prediction_news;
create policy prediction_news_admin_update
  on public.prediction_news for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists prediction_news_admin_delete on public.prediction_news;
create policy prediction_news_admin_delete
  on public.prediction_news for delete
  to authenticated
  using (public.is_admin());

create or replace function public.set_prediction_news_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists prediction_news_set_updated_at on public.prediction_news;
create trigger prediction_news_set_updated_at
  before update on public.prediction_news
  for each row execute function public.set_prediction_news_updated_at();

revoke execute on function public.set_prediction_news_updated_at() from public, anon, authenticated;

-- Extend the notification feed with a dedicated type for this ticker.
alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'points',
    'rank_change',
    'match_result',
    'announcement',
    'tournament',
    'prediction_news'
  ));

drop function if exists public.admin_create_prediction_news(text, boolean, boolean);

create or replace function public.admin_broadcast(p_type text, p_title text, p_body text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_type not in ('announcement','tournament','prediction_news') then
    raise exception 'admin_broadcast supports announcement|tournament|prediction_news only';
  end if;
  insert into public.notifications (user_id, type, title, body)
  select id, p_type, p_title, p_body
  from public.users
  where coalesce(is_deleted, false) = false;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function public.admin_broadcast(text, text, text) from public, anon;
grant execute on function public.admin_broadcast(text, text, text) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.prediction_news;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

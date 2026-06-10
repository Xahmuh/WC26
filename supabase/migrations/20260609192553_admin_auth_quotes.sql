begin;
create table if not exists public.auth_quotes (
  id uuid primary key default gen_random_uuid(),
  quote_text text not null check (length(trim(quote_text)) between 1 and 240),
  author text not null check (length(trim(author)) between 1 and 80),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists auth_quotes_active_order_idx
  on public.auth_quotes (is_active, sort_order, created_at);
drop trigger if exists auth_quotes_set_updated_at on public.auth_quotes;
create trigger auth_quotes_set_updated_at
  before update on public.auth_quotes
  for each row execute function public.set_updated_at();
alter table public.auth_quotes enable row level security;
grant select on public.auth_quotes to anon, authenticated;
grant insert, update, delete on public.auth_quotes to authenticated;
drop policy if exists "Active auth quotes are public" on public.auth_quotes;
create policy "Active auth quotes are public"
  on public.auth_quotes for select
  to anon, authenticated
  using (is_active);
drop policy if exists "Admins read all auth quotes" on public.auth_quotes;
create policy "Admins read all auth quotes"
  on public.auth_quotes for select
  to authenticated
  using (public.is_admin());
drop policy if exists "Admins create auth quotes" on public.auth_quotes;
create policy "Admins create auth quotes"
  on public.auth_quotes for insert
  to authenticated
  with check (public.is_admin());
drop policy if exists "Admins update auth quotes" on public.auth_quotes;
create policy "Admins update auth quotes"
  on public.auth_quotes for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
drop policy if exists "Admins delete auth quotes" on public.auth_quotes;
create policy "Admins delete auth quotes"
  on public.auth_quotes for delete
  to authenticated
  using (public.is_admin());
create table if not exists public.auth_screen_settings (
  id integer primary key default 1,
  developer_name text not null default 'Ahmed Elsherbini',
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint auth_screen_settings_singleton check (id = 1),
  constraint auth_screen_settings_developer_name_len
    check (length(trim(developer_name)) between 1 and 100)
);
drop trigger if exists auth_screen_settings_set_updated_at on public.auth_screen_settings;
create trigger auth_screen_settings_set_updated_at
  before update on public.auth_screen_settings
  for each row execute function public.set_updated_at();
alter table public.auth_screen_settings enable row level security;
grant select on public.auth_screen_settings to anon, authenticated;
grant insert, update on public.auth_screen_settings to authenticated;
drop policy if exists "Auth screen settings are public" on public.auth_screen_settings;
create policy "Auth screen settings are public"
  on public.auth_screen_settings for select
  to anon, authenticated
  using (true);
drop policy if exists "Admins create auth screen settings" on public.auth_screen_settings;
create policy "Admins create auth screen settings"
  on public.auth_screen_settings for insert
  to authenticated
  with check (id = 1 and public.is_admin());
drop policy if exists "Admins update auth screen settings" on public.auth_screen_settings;
create policy "Admins update auth screen settings"
  on public.auth_screen_settings for update
  to authenticated
  using (id = 1 and public.is_admin())
  with check (id = 1 and public.is_admin());
insert into public.auth_screen_settings (id, developer_name)
values (1, 'Ahmed Elsherbini')
on conflict (id) do nothing;
insert into public.auth_quotes (quote_text, author, sort_order, is_active)
select quote_text, author, sort_order, true
from (
  values
    ('Read the match. Trust your call.', 'No Budget World Cup 26', 0),
    ('One prediction can change the table.', 'No Budget World Cup 26', 1),
    ('Climb the ranks before the whistle blows.', 'No Budget World Cup 26', 2),
    ('Every pick is a chance to move up.', 'No Budget World Cup 26', 3),
    ('The leaderboard remembers the brave calls.', 'No Budget World Cup 26', 4)
) as seed(quote_text, author, sort_order)
where not exists (select 1 from public.auth_quotes);
commit;

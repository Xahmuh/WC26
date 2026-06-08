-- ============================================================================
-- Matches hero banner settings
--       Lets admins control the artwork shown at the top of the Matches screen.
-- ============================================================================
begin;

create table if not exists public.matches_hero_settings (
  id integer primary key default 1,
  image_path text,
  background_color text not null default '#13214a',
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint matches_hero_settings_singleton check (id = 1)
);

alter table public.matches_hero_settings enable row level security;

grant select, insert, update, delete on public.matches_hero_settings to authenticated;

create policy "Matches hero settings are readable"
  on public.matches_hero_settings for select
  to authenticated
  using (true);

create policy "Admins insert matches hero settings"
  on public.matches_hero_settings for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins update matches hero settings"
  on public.matches_hero_settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins delete matches hero settings"
  on public.matches_hero_settings for delete
  to authenticated
  using (public.is_admin());

drop trigger if exists matches_hero_settings_set_updated_at on public.matches_hero_settings;
create trigger matches_hero_settings_set_updated_at
  before update on public.matches_hero_settings
  for each row execute function public.set_updated_at();

insert into public.matches_hero_settings (id)
values (1)
on conflict (id) do nothing;

-- Matches hero artwork is stored in the existing public `hero-banners` bucket
-- under the `matches-hero/` folder, reusing the admin-only upload policies.

commit;

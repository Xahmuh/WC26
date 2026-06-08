-- ============================================================================
-- 034 - Home My Cards tile settings
--       Lets admins control the background artwork for the home My Cards cell.
-- ============================================================================
begin;

create table if not exists public.home_cards_tile_settings (
  id integer primary key default 1,
  image_path text,
  background_color text not null default '#141414',
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint home_cards_tile_settings_singleton check (id = 1)
);

alter table public.home_cards_tile_settings enable row level security;

create policy "Home cards tile settings are public"
  on public.home_cards_tile_settings for select
  to authenticated
  using (true);

create policy "Admins insert home cards tile settings"
  on public.home_cards_tile_settings for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins update home cards tile settings"
  on public.home_cards_tile_settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.set_home_cards_tile_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists home_cards_tile_settings_set_updated_at on public.home_cards_tile_settings;
create trigger home_cards_tile_settings_set_updated_at
  before update on public.home_cards_tile_settings
  for each row execute function public.set_home_cards_tile_settings_updated_at();

insert into public.home_cards_tile_settings (id)
values (1)
on conflict (id) do nothing;

-- My Cards tile artwork is stored in the existing public `hero-banners`
-- bucket under the `my-cards/` folder. Reusing that bucket keeps home-screen
-- artwork permissions aligned with the already-working hero banner uploader.

commit;

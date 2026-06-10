-- ============================================================================
-- 023 — Hero banner management: hero_slides table + storage bucket
--       Lets admins control the home screen hero carousel from the dashboard.
-- ============================================================================
begin;

create table if not exists public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  image_path text not null,
  background_color text not null default '#13214a',
  title text,
  subtitle text,
  link_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hero_slides_active_order_idx
  on public.hero_slides (is_active, sort_order);

alter table public.hero_slides enable row level security;

create policy "Hero slides are public"
  on public.hero_slides for select
  to authenticated
  using (true);

create policy "Admins insert hero slides"
  on public.hero_slides for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins update hero slides"
  on public.hero_slides for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins delete hero slides"
  on public.hero_slides for delete
  to authenticated
  using (public.is_admin());

create or replace function public.set_hero_slides_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists hero_slides_set_updated_at on public.hero_slides;
create trigger hero_slides_set_updated_at
  before update on public.hero_slides
  for each row execute function public.set_hero_slides_updated_at();

-- ----------------------------------------------------------------------------
-- Storage bucket for hero banner images (public read, admin-only writes)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('hero-banners', 'hero-banners', true)
on conflict (id) do nothing;

create policy "Hero banner images are publicly readable"
  on storage.objects for select
  to public
  using (bucket_id = 'hero-banners');

create policy "Admins upload hero banner images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'hero-banners' and public.is_admin());

create policy "Admins update hero banner images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'hero-banners' and public.is_admin())
  with check (bucket_id = 'hero-banners' and public.is_admin());

create policy "Admins delete hero banner images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'hero-banners' and public.is_admin());

commit;
;

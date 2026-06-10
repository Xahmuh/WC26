begin;
create table if not exists public.banner_collections (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 80),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists banner_collections_active_order_idx
  on public.banner_collections (is_active, sort_order);
drop trigger if exists banner_collections_set_updated_at on public.banner_collections;
create trigger banner_collections_set_updated_at
  before update on public.banner_collections
  for each row execute function public.set_updated_at();
alter table public.banner_collections enable row level security;
grant select, insert, update, delete on public.banner_collections to authenticated;
drop policy if exists "Banner collections are readable" on public.banner_collections;
create policy "Banner collections are readable"
  on public.banner_collections for select
  to authenticated
  using (true);
drop policy if exists "Admins create banner collections" on public.banner_collections;
create policy "Admins create banner collections"
  on public.banner_collections for insert
  to authenticated
  with check (public.is_admin());
drop policy if exists "Admins update banner collections" on public.banner_collections;
create policy "Admins update banner collections"
  on public.banner_collections for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
drop policy if exists "Admins delete banner collections" on public.banner_collections;
create policy "Admins delete banner collections"
  on public.banner_collections for delete
  to authenticated
  using (public.is_admin());
alter table public.hero_slides
  add column if not exists placement text not null default 'top',
  add column if not exists collection_id uuid references public.banner_collections(id) on delete cascade;
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'hero_slides_placement_check'
      and conrelid = 'public.hero_slides'::regclass
  ) then
    alter table public.hero_slides
      add constraint hero_slides_placement_check
      check (placement in ('top', 'bottom'));
  end if;
end $$;
create index if not exists hero_slides_placement_order_idx
  on public.hero_slides (placement, sort_order);
create index if not exists hero_slides_collection_order_idx
  on public.hero_slides (collection_id, sort_order);
insert into public.banner_collections (title, sort_order, is_active)
select 'Special moments', 0, true
where not exists (select 1 from public.banner_collections);
commit;

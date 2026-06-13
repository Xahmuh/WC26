-- Mobile update gate settings. Public read lets old app builds check whether
-- they must update before entering; writes stay admin-only through RLS.
create table if not exists public.app_update_settings (
  id integer primary key default 1,
  latest_version text not null default '1.0.1',
  minimum_supported_version text not null default '1.0.0',
  update_required boolean not null default false,
  update_url text,
  release_notes text not null default 'A new version is available. Please update to continue.',
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint app_update_settings_singleton check (id = 1),
  constraint app_update_latest_version_len check (char_length(btrim(latest_version)) between 1 and 24),
  constraint app_update_min_version_len check (char_length(btrim(minimum_supported_version)) between 1 and 24),
  constraint app_update_url_len check (update_url is null or char_length(btrim(update_url)) <= 500),
  constraint app_update_release_notes_len check (char_length(btrim(release_notes)) between 8 and 500)
);

insert into public.app_update_settings (
  id,
  latest_version,
  minimum_supported_version,
  update_required,
  update_url,
  release_notes
) values (
  1,
  '1.0.1',
  '1.0.0',
  false,
  null,
  'A new version is available. Please update to continue.'
)
on conflict (id) do nothing;

drop trigger if exists app_update_settings_set_updated_at on public.app_update_settings;
create trigger app_update_settings_set_updated_at
  before update on public.app_update_settings
  for each row execute function public.set_updated_at();

alter table public.app_update_settings enable row level security;

grant select on public.app_update_settings to anon, authenticated;
grant insert, update on public.app_update_settings to authenticated;

drop policy if exists app_update_settings_public_read on public.app_update_settings;
create policy app_update_settings_public_read
  on public.app_update_settings for select
  to anon, authenticated
  using (true);

drop policy if exists app_update_settings_admin_insert on public.app_update_settings;
create policy app_update_settings_admin_insert
  on public.app_update_settings for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists app_update_settings_admin_update on public.app_update_settings;
create policy app_update_settings_admin_update
  on public.app_update_settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

do $$
begin
  alter publication supabase_realtime add table public.app_update_settings;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

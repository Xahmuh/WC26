-- ============================================================================
-- 011 — Notifications (schema, RLS, guard trigger, admin broadcast)
-- ----------------------------------------------------------------------------
-- Per-user notification feed. Rows are written ONLY by SECURITY DEFINER code
-- (scoring trigger in 012, admin_broadcast RPC below). Clients may read their
-- own rows and may flip is_read; a guard trigger freezes every other column.
--
-- Risk:     low. New table; no existing data touched.
-- Rollback: drop table public.notifications cascade;
--           drop function public.admin_broadcast(text,text,text);
--           drop function public.guard_notification_update();
-- ============================================================================
begin;

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  type        text not null check (type in
                ('points','rank_change','match_result','announcement','tournament')),
  title       text not null,
  body        text,
  data        jsonb not null default '{}'::jsonb,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Unread-count + feed ordering in one index.
create index if not exists idx_notifications_user_unread
  on public.notifications (user_id, is_read, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
-- No client INSERT/DELETE policies on purpose.

-- A client UPDATE may change ONLY is_read; everything else is frozen.
create or replace function public.guard_notification_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select auth.uid()) is not null then
    new.user_id    := old.user_id;
    new.type       := old.type;
    new.title      := old.title;
    new.body       := old.body;
    new.data       := old.data;
    new.created_at := old.created_at;
  end if;
  return new;
end $$;

drop trigger if exists notifications_guard_update on public.notifications;
create trigger notifications_guard_update
  before update on public.notifications
  for each row execute function public.guard_notification_update();

-- Admin announcements / tournament updates: fan-out insert to all users.
create or replace function public.admin_broadcast(p_type text, p_title text, p_body text)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_type not in ('announcement','tournament') then
    raise exception 'admin_broadcast supports announcement|tournament only';
  end if;
  insert into public.notifications (user_id, type, title, body)
  select id, p_type, p_title, p_body from public.users;
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.admin_broadcast(text,text,text) from anon;
grant  execute on function public.admin_broadcast(text,text,text) to authenticated;

commit;

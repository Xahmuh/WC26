begin;

-- Keep auth.users as the source for auth-only fields, but do not overwrite
-- profile fields that users/admins can edit in public.users.
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
    role = case
      when lower(new.email) = 'ahmedelsherbiinii@gmail.com' then 'admin'
      else role
    end,
    avatar_url = coalesce(
      public.users.avatar_url,
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    ),
    last_login = coalesce(new.last_sign_in_at, last_login)
  where id = new.id;
  return new;
end;
$$;

commit;

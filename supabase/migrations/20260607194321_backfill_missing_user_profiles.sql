insert into public.users (id, display_name, email, avatar_url, role, last_login)
select
  au.id,
  coalesce(
    au.raw_user_meta_data->>'display_name',
    au.raw_user_meta_data->>'full_name',
    split_part(au.email, '@', 1)
  ),
  au.email,
  coalesce(au.raw_user_meta_data->>'avatar_url', au.raw_user_meta_data->>'picture'),
  case
    when lower(au.email) = 'ahmedelsherbiinii@gmail.com' then 'admin'
    else coalesce(au.raw_user_meta_data->>'role', 'user')
  end,
  au.last_sign_in_at
from auth.users au
left join public.users pu on pu.id = au.id
where pu.id is null
on conflict (id) do nothing;
;

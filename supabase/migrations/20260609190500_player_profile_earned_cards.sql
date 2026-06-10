begin;
-- Public profile cards: expose only the display-safe card fields needed by
-- leaderboard/profile modals. `user_cards` itself remains owner/admin-only.
create or replace function public.get_player_profile_cards(p_user_id uuid)
returns table (
  user_card_id uuid,
  card_definition_id uuid,
  name text,
  image_path text,
  earned_stage public.match_stage,
  multiplier_bonus integer,
  status text,
  unlocked_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    uc.id as user_card_id,
    cd.id as card_definition_id,
    cd.name,
    cd.image_path,
    uc.earned_stage,
    uc.multiplier_bonus,
    uc.status::text,
    uc.unlocked_at
  from public.user_cards uc
  join public.card_definitions cd on cd.id = uc.card_definition_id
  where uc.user_id = p_user_id
    and uc.status <> 'revoked'
  order by uc.unlocked_at desc, cd.created_at desc;
$$;
revoke execute on function public.get_player_profile_cards(uuid) from public, anon;
grant execute on function public.get_player_profile_cards(uuid) to authenticated;
commit;

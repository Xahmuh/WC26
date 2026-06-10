begin;
alter table public.banner_collections
  add column if not exists home_position text not null default 'after_today_matches';
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'banner_collections_home_position_check'
      and conrelid = 'public.banner_collections'::regclass
  ) then
    alter table public.banner_collections
      add constraint banner_collections_home_position_check
      check (
        home_position in (
          'after_top_banner',
          'after_cards_countdown',
          'after_my_teams',
          'after_pending_predictions',
          'after_today_matches',
          'after_performance',
          'before_tournament_questions'
        )
      );
  end if;
end $$;
create index if not exists banner_collections_position_order_idx
  on public.banner_collections (home_position, is_active, sort_order);
commit;

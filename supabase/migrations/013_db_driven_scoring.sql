-- ============================================================================
-- 013 — Database-driven scoring (immediate points) + match-day finalization hook
-- ----------------------------------------------------------------------------
-- One AFTER trigger on public.matches is the single entry point for ALL writers
-- (external API / admin panel / manual SQL / future import):
--   • If the match is FINISHED with both scores → score it NOW (points +
--     "points awarded" notifications). Leaderboard is NOT refreshed here.
--   • Always re-evaluate match-day completion (013 calls 012's maybe_finalize_day),
--     for the new day and, on a reschedule, the old day too.
--
-- Requires 010 (plain unique index on points(user_id,match_id)),
-- 011 (notifications) and 012 (finalization functions).
--
-- Risk:     medium. score_match is idempotent (re-finishing re-upserts).
-- Rollback: drop trigger matches_after_write on public.matches;
--           drop function public.tg_match_after_write();
--           drop function public.score_match(uuid);
-- ============================================================================
begin;

-- Score one match: points + per-user "points" notifications. No ranking here.
create or replace function public.score_match(p_match_id uuid)
returns int language plpgsql security definer set search_path = public as $$
declare m record; affected int := 0;
begin
  select id, home_score, away_score, status, points_multiplier
    into m from public.matches where id = p_match_id;

  if not found then return 0; end if;
  if m.status <> 'FINISHED' or m.home_score is null or m.away_score is null then
    return 0;
  end if;

  with scored as (
    select
      p.user_id,
      (case when sign(m.home_score - m.away_score)
               = sign(p.pred_home_score - p.pred_away_score) then 5 else 0 end) as wp,
      (case when m.home_score = p.pred_home_score then 2 else 0 end)            as hp,
      (case when m.away_score = p.pred_away_score then 2 else 0 end)            as ap,
      (case when m.home_score = p.pred_home_score
             and m.away_score = p.pred_away_score   then 5 else 0 end)          as eb
    from public.predictions p
    where p.match_id = m.id
  )
  insert into public.points
    (user_id, match_id, winner_points, home_goal_points, away_goal_points,
     exact_bonus, total_points, calculated_at)
  select
    s.user_id, m.id,
    s.wp * m.points_multiplier, s.hp * m.points_multiplier,
    s.ap * m.points_multiplier, s.eb * m.points_multiplier,
    (s.wp + s.hp + s.ap + s.eb) * m.points_multiplier, now()
  from scored s
  on conflict (user_id, match_id) do update set
    winner_points    = excluded.winner_points,
    home_goal_points = excluded.home_goal_points,
    away_goal_points = excluded.away_goal_points,
    exact_bonus      = excluded.exact_bonus,
    total_points     = excluded.total_points,
    calculated_at    = now();
  get diagnostics affected = row_count;

  -- "Points awarded" notification per scoring user, de-duped per match.
  insert into public.notifications (user_id, type, title, body, data)
  select pt.user_id, 'points', 'Points awarded',
         'You earned ' || pt.total_points || ' pts for a finished match.',
         jsonb_build_object('match_id', m.id, 'points', pt.total_points)
  from public.points pt
  where pt.match_id = m.id and pt.total_points > 0
    and not exists (
      select 1 from public.notifications n
      where n.user_id = pt.user_id and n.type = 'points'
        and n.data->>'match_id' = m.id::text);

  return affected;
end $$;
revoke execute on function public.score_match(uuid) from anon, authenticated;

-- Single AFTER trigger: score on finish, then re-check match-day completion.
create or replace function public.tg_match_after_write()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  new_day date := public.match_day(new.kickoff_time);
  old_day date := case when tg_op = 'UPDATE' then public.match_day(old.kickoff_time) end;
begin
  if new.status = 'FINISHED'
     and new.home_score is not null and new.away_score is not null
     and (tg_op = 'INSERT'
          or new.status            is distinct from old.status
          or new.home_score        is distinct from old.home_score
          or new.away_score        is distinct from old.away_score
          or new.points_multiplier is distinct from old.points_multiplier)
  then
    perform public.score_match(new.id);
  end if;

  -- Re-evaluate the day(s) affected (covers FINISHED / POSTPONED / CANCELLED /
  -- reschedule where kickoff moves between days).
  perform public.maybe_finalize_day(new_day);
  if old_day is not null and old_day is distinct from new_day then
    perform public.maybe_finalize_day(old_day);
  end if;

  return new;
end $$;

drop trigger if exists matches_score_on_finish on public.matches;  -- (never shipped)
drop trigger if exists matches_after_write     on public.matches;
create trigger matches_after_write
  after insert or update of status, home_score, away_score, points_multiplier, kickoff_time
  on public.matches for each row execute function public.tg_match_after_write();

commit;

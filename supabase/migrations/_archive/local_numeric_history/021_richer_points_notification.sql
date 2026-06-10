-- ============================================================================
-- 021 — Richer "match result" notification (Issue 7)
-- ----------------------------------------------------------------------------
-- Re-creates public.score_match() with the SAME scoring math as migration 013
-- (UNCHANGED), only replacing the notification INSERT so each predictor gets a
-- self-contained result summary: teams, final score, their prediction, points,
-- and a per-component breakdown. The `data` JSONB carries every field the app
-- needs (incl. match_id for deep-linking — Issue 8).
--
-- Behaviour note: now notifies EVERY user who predicted the match (previously
-- only those who scored > 0) so a "you got 0" result still reaches the player.
-- To restore the old behaviour, add `and pt.total_points > 0` to the WHERE.
--
-- Risk:     low. Pure notification-content change; scoring is byte-for-byte 013.
-- Rollback: re-apply migration 013's score_match definition.
-- ============================================================================
begin;

create or replace function public.score_match(p_match_id uuid)
returns int language plpgsql security definer set search_path = public as $$
declare m record; affected int := 0;
begin
  select id, home_team_id, away_team_id, home_score, away_score, status, points_multiplier
    into m from public.matches where id = p_match_id;

  if not found then return 0; end if;
  if m.status <> 'FINISHED' or m.home_score is null or m.away_score is null then
    return 0;
  end if;

  -- ── Scoring (UNCHANGED from migration 013) ────────────────────────────────
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

  -- ── Rich per-predictor "Match Result" notification (de-duped per match) ────
  insert into public.notifications (user_id, type, title, body, data)
  select
    pt.user_id,
    'points',
    'Match Result: ' || coalesce(ht.name, 'Home') || ' vs ' || coalesce(at.name, 'Away'),
    coalesce(ht.name, 'Home') || ' ' || m.home_score || ' - ' || m.away_score || ' ' || coalesce(at.name, 'Away')
      || chr(10) || 'Your prediction: ' || pr.pred_home_score || ' - ' || pr.pred_away_score
      || chr(10) || 'Points earned: ' || pt.total_points || ' pts'
      || chr(10)
      || 'Winner ' || case when pt.winner_points > 0 then '✓' else '✗' end
      || ' · Home ' || case when pt.home_goal_points > 0 then '✓' else '✗' end
      || ' · Away ' || case when pt.away_goal_points > 0 then '✓' else '✗' end
      || case when pt.exact_bonus > 0 then ' · Exact ✓' else '' end,
    jsonb_build_object(
      'match_id',         m.id,
      'home_team',        coalesce(ht.name, 'Home'),
      'away_team',        coalesce(at.name, 'Away'),
      'home_score',       m.home_score,
      'away_score',       m.away_score,
      'pred_home_score',  pr.pred_home_score,
      'pred_away_score',  pr.pred_away_score,
      'total_points',     pt.total_points,
      'winner_points',    pt.winner_points,
      'home_goal_points', pt.home_goal_points,
      'away_goal_points', pt.away_goal_points,
      'exact_bonus',      pt.exact_bonus,
      'points',           pt.total_points
    )
  from public.points pt
  join public.predictions pr
    on pr.user_id = pt.user_id and pr.match_id = m.id
  left join public.teams ht on ht.id = m.home_team_id
  left join public.teams at on at.id = m.away_team_id
  where pt.match_id = m.id
    and not exists (
      select 1 from public.notifications n
      where n.user_id = pt.user_id and n.type = 'points'
        and n.data->>'match_id' = m.id::text
    );

  return affected;
end $$;

revoke execute on function public.score_match(uuid) from anon, authenticated;

commit;

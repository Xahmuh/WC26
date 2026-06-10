-- Seed the default scoring multiplier preset for Round of 32.
insert into public.stage_multipliers (stage, multiplier)
values ('ROUND_OF_32', 1)
on conflict (stage) do nothing;
update public.matches
set is_knockout = true
where stage <> 'GROUP'
  and (
    status <> 'FINISHED'
    or (winner_team_id is not null and decision_method is not null)
  );

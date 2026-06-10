revoke execute on function public.score_match(uuid)          from public;
revoke execute on function public.finalize_leaderboard(date) from public;
revoke execute on function public.maybe_finalize_day(date)   from public;

alter function public.tournament_tz()              set search_path = public;
alter function public.match_day(timestamptz)       set search_path = public;;

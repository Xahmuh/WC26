-- Reliable admin match deletion (clear error instead of silent RLS no-op).
create or replace function public.admin_delete_match(p_match_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can delete matches';
  end if;
  delete from public.matches where id = p_match_id;
end $$;
revoke execute on function public.admin_delete_match(uuid) from anon;
grant  execute on function public.admin_delete_match(uuid) to authenticated;

-- Award question points on approve (unchanged) + notify the user; clean up on reject.
create or replace function public.handle_prediction_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare q_points int; q_text text;
begin
  if (tg_op = 'INSERT' and new.status = 'approved') or
     (tg_op = 'UPDATE' and old.status is distinct from new.status) then

    select points, question_text into q_points, q_text
      from public.prediction_questions where id = new.question_id;

    if new.status = 'approved' then
      insert into public.points (user_id, question_id, winner_points, total_points, calculated_at)
      values (new.user_id, new.question_id, q_points, q_points, now())
      on conflict (user_id, question_id) do update
        set winner_points = excluded.winner_points,
            total_points  = excluded.total_points,
            calculated_at = now();

      insert into public.notifications (user_id, type, title, body, data)
      select new.user_id, 'points',
             'Prediction approved',
             'Your answer "' || new.prediction || '" was approved — you earned ' || q_points || ' pts'
               || case when q_text is not null then ' for "' || q_text || '"' else '' end || '.',
             jsonb_build_object('question_id', new.question_id, 'points', q_points)
      where not exists (
        select 1 from public.notifications n
        where n.user_id = new.user_id and n.type = 'points'
          and n.data->>'question_id' = new.question_id::text
      );
    elsif new.status = 'rejected' or new.status = 'pending' then
      delete from public.points
       where user_id = new.user_id and question_id = new.question_id;
      delete from public.notifications
       where user_id = new.user_id and type = 'points'
         and data->>'question_id' = new.question_id::text;
    end if;

    perform public.refresh_leaderboard();
  end if;
  return new;
end $$;;

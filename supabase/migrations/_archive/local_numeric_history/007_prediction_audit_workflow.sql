-- ============================================================================
-- World Cup 2026 Prediction Platform — Prediction Audit Workflow
-- ============================================================================

-- 1. Add lock_at column to prediction_questions
alter table public.prediction_questions add column if not exists lock_at timestamptz not null default (now() + interval '24 hours');

-- 2. Add status column to user_question_predictions
alter table public.user_question_predictions add column if not exists status text not null default 'pending';

-- Drop constraint if exists first
alter table public.user_question_predictions drop constraint if exists user_question_predictions_status_check;
alter table public.user_question_predictions add constraint user_question_predictions_status_check check (status in ('pending', 'approved', 'rejected'));

-- 3. Update RLS policies to enforce lock_at and allow admins full access
drop policy if exists "Users can submit own question predictions for open questions" on public.user_question_predictions;
create policy "Users can submit own question predictions for open questions"
  on public.user_question_predictions for insert to authenticated
  with check (
    user_id = auth.uid() and 
    (select status = 'open' and lock_at > now() from public.prediction_questions where id = question_id)
  );

drop policy if exists "Users can update own question predictions for open questions" on public.user_question_predictions;
create policy "Users can update own question predictions for open questions"
  on public.user_question_predictions for update to authenticated
  using (
    user_id = auth.uid() and 
    (select status = 'open' and lock_at > now() from public.prediction_questions where id = question_id)
  )
  with check (
    user_id = auth.uid() and 
    (select status = 'open' and lock_at > now() from public.prediction_questions where id = question_id)
  );

drop policy if exists "Admins can manage all question predictions" on public.user_question_predictions;
create policy "Admins can manage all question predictions"
  on public.user_question_predictions for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 4. Trigger function to dynamically award points and refresh leaderboard
create or replace function public.handle_prediction_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  q_points int;
begin
  if (tg_op = 'INSERT' and new.status = 'approved') or 
     (tg_op = 'UPDATE' and old.status is distinct from new.status) then
    
    select points into q_points from public.prediction_questions where id = new.question_id;
    
    if new.status = 'approved' then
      insert into public.points (user_id, question_id, winner_points, total_points, calculated_at)
      values (new.user_id, new.question_id, q_points, q_points, now())
      on conflict (user_id, question_id) do update
      set winner_points = excluded.winner_points,
          total_points = excluded.total_points,
          calculated_at = now();
    elsif new.status = 'rejected' or new.status = 'pending' then
      delete from public.points
      where user_id = new.user_id and question_id = new.question_id;
    end if;
    
    perform public.refresh_leaderboard();
  end if;
  return new;
end;
$$;

drop trigger if exists on_prediction_audit_change on public.user_question_predictions;
create trigger on_prediction_audit_change
  after insert or update on public.user_question_predictions
  for each row execute function public.handle_prediction_audit();

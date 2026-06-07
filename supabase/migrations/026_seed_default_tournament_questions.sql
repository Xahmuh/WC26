-- ============================================================================
-- Seed the default Tournament Prediction questions (Champion, Best Player,
-- Best Goalkeeper, Top Scorer) so the carousel always has content without
-- requiring manual creation from the admin panel.
--
-- These are open-ended user predictions (free-text answers), not multiple
-- choice — `options` is an empty array so the prediction card renders a text
-- input. All four lock on 2026-06-28.
--
-- Idempotent: each insert is guarded by a NOT EXISTS check on question_text,
-- so re-running this migration never creates duplicate rows.
-- ============================================================================

insert into public.prediction_questions (question_text, options, points, status, lock_at)
select 'Who will win the World Cup?', '[]'::jsonb, 100, 'open', '2026-06-28 00:00:00+00'::timestamptz
where not exists (
  select 1 from public.prediction_questions where question_text = 'Who will win the World Cup?'
);

insert into public.prediction_questions (question_text, options, points, status, lock_at)
select 'Who will be the Best Player of the tournament?', '[]'::jsonb, 75, 'open', '2026-06-28 00:00:00+00'::timestamptz
where not exists (
  select 1 from public.prediction_questions where question_text = 'Who will be the Best Player of the tournament?'
);

insert into public.prediction_questions (question_text, options, points, status, lock_at)
select 'Who will be the Best Goalkeeper of the tournament?', '[]'::jsonb, 75, 'open', '2026-06-28 00:00:00+00'::timestamptz
where not exists (
  select 1 from public.prediction_questions where question_text = 'Who will be the Best Goalkeeper of the tournament?'
);

insert into public.prediction_questions (question_text, options, points, status, lock_at)
select 'Who will be the Top Scorer of the tournament?', '[]'::jsonb, 75, 'open', '2026-06-28 00:00:00+00'::timestamptz
where not exists (
  select 1 from public.prediction_questions where question_text = 'Who will be the Top Scorer of the tournament?'
);

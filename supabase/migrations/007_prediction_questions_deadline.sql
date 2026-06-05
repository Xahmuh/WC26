-- ============================================================================
-- Custom Prediction Questions - Deadline / Auto-lock
-- ============================================================================

-- 1. Add lock_at column to prediction_questions
ALTER TABLE public.prediction_questions ADD COLUMN IF NOT EXISTS lock_at TIMESTAMPTZ;

-- 2. Backfill existing questions with a default lock_at (7 days from creation)
UPDATE public.prediction_questions 
SET lock_at = created_at + INTERVAL '7 days' 
WHERE lock_at IS NULL;

-- Make lock_at NOT NULL
ALTER TABLE public.prediction_questions ALTER COLUMN lock_at SET NOT NULL;

-- 3. Update RLS policies to prevent submitting or modifying predictions after lock_at
DROP POLICY IF EXISTS "Users can submit own question predictions for open questions" ON public.user_question_predictions;
CREATE POLICY "Users can submit own question predictions for open questions"
  ON public.user_question_predictions FOR INSERT TO AUTHENTICATED
  WITH CHECK (
    user_id = auth.uid() AND 
    EXISTS (
      SELECT 1 FROM public.prediction_questions 
      WHERE id = question_id AND status = 'open' AND lock_at > NOW()
    )
  );

DROP POLICY IF EXISTS "Users can update own question predictions for open questions" ON public.user_question_predictions;
CREATE POLICY "Users can update own question predictions for open questions"
  ON public.user_question_predictions FOR UPDATE TO AUTHENTICATED
  USING (
    user_id = auth.uid() AND 
    EXISTS (
      SELECT 1 FROM public.prediction_questions 
      WHERE id = question_id AND status = 'open' AND lock_at > NOW()
    )
  )
  WITH CHECK (
    user_id = auth.uid() AND 
    EXISTS (
      SELECT 1 FROM public.prediction_questions 
      WHERE id = question_id AND status = 'open' AND lock_at > NOW()
    )
  );

DROP POLICY IF EXISTS "Users can delete own question predictions for open questions" ON public.user_question_predictions;
CREATE POLICY "Users can delete own question predictions for open questions"
  ON public.user_question_predictions FOR DELETE TO AUTHENTICATED
  USING (
    user_id = auth.uid() AND 
    EXISTS (
      SELECT 1 FROM public.prediction_questions 
      WHERE id = question_id AND status = 'open' AND lock_at > NOW()
    )
  );

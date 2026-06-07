# BUG FIX PROMPT — Points Not Calculating & Permission Denied

You are a senior Supabase/PostgreSQL engineer.
Fix two production bugs in a World Cup 2026 prediction app.
Run ALL fixes in the Supabase SQL Editor in the order listed below.

---

## BUG 1 — `permission denied for table users`

### Root Cause

The RLS policies on `predictions` (UPDATE and DELETE) contain this subquery:

```sql
(SELECT users.is_deleted FROM users WHERE users.id = auth.uid()) = false
```

When a regular user triggers this policy, Supabase evaluates it under the
calling user's permissions. The query references `public.users` but Supabase
resolves it as `auth.users` in some contexts — causing `permission denied`.

The fix is to make the subquery explicitly use `public.users` and wrap it
in a SECURITY DEFINER helper function so it always runs with elevated permissions.

---

### FIX 1A — Create a helper function (SECURITY DEFINER)

```sql
CREATE OR REPLACE FUNCTION public.is_active_user(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = p_user_id
      AND is_deleted = false
  );
$$;
```

---

### FIX 1B — Replace the UPDATE policy on predictions

```sql
-- Drop old policy
DROP POLICY IF EXISTS predictions_update_own_before_kickoff ON public.predictions;

-- Create clean replacement
CREATE POLICY predictions_update_own_before_kickoff
ON public.predictions
FOR UPDATE
TO authenticated
USING (
  (SELECT auth.uid()) = user_id
  AND is_locked = false
  AND public.is_active_user((SELECT auth.uid()))
  AND EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = predictions.match_id
      AND m.kickoff_time > now()
  )
);
```

---

### FIX 1C — Replace the DELETE policy on predictions

```sql
-- Drop old policy
DROP POLICY IF EXISTS predictions_delete_own_before_kickoff ON public.predictions;

-- Create clean replacement
CREATE POLICY predictions_delete_own_before_kickoff
ON public.predictions
FOR DELETE
TO authenticated
USING (
  (SELECT auth.uid()) = user_id
  AND is_locked = false
  AND public.is_active_user((SELECT auth.uid()))
  AND EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = predictions.match_id
      AND m.kickoff_time > now()
  )
);
```

---

### VERIFY FIX 1

Run this as an authenticated regular user (not admin) and confirm no error:

```sql
SELECT * FROM public.predictions WHERE user_id = auth.uid();
```

---

---

## BUG 2 — Points Not Showing in User Performance

### Root Cause

The `score_match()` function correctly calculates points and writes them
to `public.points` table (not directly to `users.total_points`).

The `user_performance` view was reading from `predictions` only,
which has no points data. It needs to read from `public.points` instead.

### Points Scoring Logic (for reference)

| Condition | Points |
|-----------|--------|
| Correct winner / draw | 5 pts |
| Correct home score | 2 pts |
| Correct away score | 2 pts |
| Exact score bonus | 5 pts |
| All values × `points_multiplier` | |

---

### FIX 2A — Replace the `user_performance` view

```sql
DROP VIEW IF EXISTS public.user_performance;

CREATE OR REPLACE VIEW public.user_performance AS
SELECT
  p.user_id,

  -- Total predictions made
  COUNT(DISTINCT p.id)                                          AS total_predictions,

  -- Matches where user scored any points (winner correct)
  COUNT(DISTINCT pt.match_id) FILTER (
    WHERE pt.winner_points > 0
  )                                                             AS correct_predictions,

  -- Exact score predictions
  COUNT(DISTINCT pt.match_id) FILTER (
    WHERE pt.exact_bonus > 0
  )                                                             AS exact_predictions,

  -- Total points earned
  COALESCE(SUM(pt.total_points), 0)                            AS total_points,

  -- Matches participated in (had a prediction)
  COUNT(DISTINCT p.match_id)                                   AS matches_participated

FROM public.predictions p
LEFT JOIN public.points pt
  ON pt.user_id = p.user_id
  AND pt.match_id = p.match_id
GROUP BY p.user_id;
```

---

### FIX 2B — Also sync `users.total_points` column

The `users` table has a `total_points` column that should stay in sync.
Add this to the `score_match` function by updating it after the insert:

```sql
CREATE OR REPLACE FUNCTION public.score_match(p_match_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  m        record;
  affected int := 0;
BEGIN
  SELECT id, home_score, away_score, status, points_multiplier
    INTO m FROM public.matches WHERE id = p_match_id;

  IF NOT FOUND THEN RETURN 0; END IF;
  IF m.status <> 'FINISHED' OR m.home_score IS NULL OR m.away_score IS NULL THEN
    RETURN 0;
  END IF;

  -- Calculate and upsert into points table
  WITH scored AS (
    SELECT
      p.user_id,
      (CASE WHEN sign(m.home_score - m.away_score)
               = sign(p.pred_home_score - p.pred_away_score) THEN 5 ELSE 0 END) AS wp,
      (CASE WHEN m.home_score = p.pred_home_score THEN 2 ELSE 0 END)            AS hp,
      (CASE WHEN m.away_score = p.pred_away_score THEN 2 ELSE 0 END)            AS ap,
      (CASE WHEN m.home_score = p.pred_home_score
             AND m.away_score = p.pred_away_score THEN 5 ELSE 0 END)            AS eb
    FROM public.predictions p
    WHERE p.match_id = m.id
  )
  INSERT INTO public.points
    (user_id, match_id, winner_points, home_goal_points, away_goal_points,
     exact_bonus, total_points, calculated_at)
  SELECT
    s.user_id, m.id,
    s.wp * m.points_multiplier,
    s.hp * m.points_multiplier,
    s.ap * m.points_multiplier,
    s.eb * m.points_multiplier,
    (s.wp + s.hp + s.ap + s.eb) * m.points_multiplier,
    now()
  FROM scored s
  ON CONFLICT (user_id, match_id) DO UPDATE SET
    winner_points    = excluded.winner_points,
    home_goal_points = excluded.home_goal_points,
    away_goal_points = excluded.away_goal_points,
    exact_bonus      = excluded.exact_bonus,
    total_points     = excluded.total_points,
    calculated_at    = now();

  GET DIAGNOSTICS affected = ROW_COUNT;

  -- ✅ NEW: Sync users.total_points from points table
  UPDATE public.users u
  SET total_points = (
    SELECT COALESCE(SUM(pt.total_points), 0)
    FROM public.points pt
    WHERE pt.user_id = u.id
  )
  WHERE u.id IN (
    SELECT DISTINCT user_id FROM public.points WHERE match_id = m.id
  );

  -- Send notifications (unchanged)
  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT pt.user_id, 'points', 'Points awarded',
         'You earned ' || pt.total_points || ' pts for a finished match.',
         jsonb_build_object('match_id', m.id, 'points', pt.total_points)
  FROM public.points pt
  WHERE pt.match_id = m.id AND pt.total_points > 0
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = pt.user_id AND n.type = 'points'
        AND n.data->>'match_id' = m.id::text
    );

  RETURN affected;
END;
$function$;
```

---

### FIX 2C — Backfill existing finished matches (run once)

If there are already finished matches with predictions but no points recorded:

```sql
-- Re-score all finished matches that have predictions but no points entry
SELECT public.score_match(m.id)
FROM public.matches m
WHERE m.status = 'FINISHED'
  AND m.home_score IS NOT NULL
  AND m.away_score IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.predictions p WHERE p.match_id = m.id
  );
```

---

### VERIFY FIX 2

```sql
-- Should return rows with points > 0 for finished matches
SELECT
  u.display_name,
  up.total_predictions,
  up.correct_predictions,
  up.exact_predictions,
  up.total_points,
  up.matches_participated
FROM public.user_performance up
JOIN public.users u ON u.id = up.user_id
ORDER BY up.total_points DESC;

-- Cross-check against points table directly
SELECT user_id, SUM(total_points) as raw_total
FROM public.points
GROUP BY user_id;
```

---

## EXECUTION ORDER

Run in this exact order:

1. **FIX 1A** — Create `is_active_user()` helper function
2. **FIX 1B** — Replace UPDATE policy on predictions
3. **FIX 1C** — Replace DELETE policy on predictions
4. **FIX 2A** — Replace `user_performance` view
5. **FIX 2B** — Replace `score_match()` function
6. **FIX 2C** — Backfill existing finished matches (run once)
7. Run both **VERIFY** queries to confirm

---

## RULES

- Do NOT touch auth configuration
- Do NOT drop or alter the `points` table schema
- Do NOT modify the `tg_match_after_write` trigger
- Do NOT change leaderboard logic
- All changes are additive or replacements only

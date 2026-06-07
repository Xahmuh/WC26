# CURSOR PROMPT — FIX: Permission Denied on Predictions Insert

You are a senior Supabase/PostgreSQL engineer.
Fix a production bug where users get "permission denied for table users"
when trying to submit a prediction on a newly created match.

---

## THE BUG

**Symptom:**
- Admin creates a new match
- User opens the match and submits a prediction
- Error returned: `permission denied for table users`
- Prediction is NOT saved to the database

**Root Cause:**
The RLS INSERT policy on `public.predictions` does NOT currently exist
(only SELECT, UPDATE, DELETE policies exist).

When Supabase tries to evaluate whether the user can insert, it falls back
to a default DENY — but before that, some internal policy check or trigger
attempts to read from `public.users` (or `auth.users`) without proper
permissions, causing the "permission denied" error.

Additionally, the existing UPDATE and DELETE policies contain a raw subquery
on `public.users` that runs under the calling user's permissions and can
fail with the same error:

```sql
-- PROBLEMATIC subquery in existing policies
(SELECT users.is_deleted FROM users WHERE users.id = auth.uid()) = false
```

---

## FIXES — Run in Supabase SQL Editor in this exact order

---

### FIX 1 — Create SECURITY DEFINER helper function

This function safely checks if a user is active without exposing
the users table to RLS permission issues.

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

### FIX 2 — Add the missing INSERT policy on predictions

```sql
CREATE POLICY predictions_insert_own_before_kickoff
ON public.predictions
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND public.is_active_user((SELECT auth.uid()))
  AND EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = predictions.match_id
      AND m.kickoff_time > now()
      AND m.status = 'SCHEDULED'
  )
);
```

---

### FIX 3 — Replace UPDATE policy (remove raw users subquery)

```sql
DROP POLICY IF EXISTS predictions_update_own_before_kickoff ON public.predictions;

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

### FIX 4 — Replace DELETE policy (remove raw users subquery)

```sql
DROP POLICY IF EXISTS predictions_delete_own_before_kickoff ON public.predictions;

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

### FIX 5 — Verify RLS is enabled on predictions table

```sql
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
```

---

## VERIFICATION — Run after all fixes

### Check 1: All policies exist correctly
```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'predictions'
ORDER BY cmd;
```

Expected result — you should see 4 policies:
| policyname | cmd |
|------------|-----|
| predictions_insert_own_before_kickoff | INSERT |
| predictions_update_own_before_kickoff | UPDATE |
| predictions_delete_own_before_kickoff | DELETE |
| Users read own predictions | SELECT |

---

### Check 2: Helper function exists
```sql
SELECT proname, prosecdef
FROM pg_proc
WHERE proname = 'is_active_user';
```

Expected: `prosecdef = true` (confirms SECURITY DEFINER is set)

---

### Check 3: Simulate an insert as a regular user
In the app, log in as a regular user (not admin) and submit a prediction
on the newly created match. Confirm:
- [ ] No "permission denied" error
- [ ] Prediction appears in the predictions table
- [ ] `user_id` matches the logged-in user's ID

---

## RULES

- Do NOT touch auth configuration
- Do NOT modify the `matches` table or its policies
- Do NOT modify the `tg_match_after_write` trigger
- Do NOT change leaderboard logic
- Do NOT drop the existing SELECT policy on predictions
- All changes are additive or policy replacements only

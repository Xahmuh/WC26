# AI AGENT PROMPT — USER PERFORMANCE KPI FEATURE (v2)

You are a senior React Native (Expo SDK 56) engineer working on a production sports prediction app using:
- Expo Router v4
- Supabase JS v2
- TypeScript (strict mode)
- Existing UI Kit (MANDATORY — see UI Kit section below)

---

## CONTEXT

This is a World Cup 2026 prediction app with a dark stadium aesthetic.
- Background: dark (#0D0D0D or near-black)
- Accent color: `#C9DF6A` (lime-green)
- All new screens must match this existing visual language

---

## FEATURE TO BUILD

Implement a **User Performance** dashboard accessible from the User Profile screen.

This screen shows KPI analytics for the currently authenticated user based on their prediction history.

---

## UI KIT — MANDATORY

> Before writing any JSX, scan the project for existing UI components. They are located in:
> `@/components/ui/` or `@/components/`

Use ONLY existing UI Kit components. Do NOT create new primitive components.

Expected available components (verify import paths by scanning the project):
- `Card` — for KPI cards
- `Button` — for navigation trigger in Profile
- `Stack` / `VStack` / `HStack` — for layout
- `Text` / `Heading` — for typography
- `Icon` — if available in kit

If a component does not exist in the kit, use React Native core (`View`, `Text`, `Pressable`, `ScrollView`) as fallback ONLY.

---

## FILES TO CREATE

```
app/
  (tabs)/
    user-performance.tsx       ← Main screen

components/
  performance/
    KpiCard.tsx                ← Single KPI card component
    KpiGrid.tsx                ← 2-column grid of KPI cards
    PerformanceHeader.tsx      ← Screen header with user name/avatar

hooks/
  useUserPerformance.ts        ← Data fetching hook (Supabase)

types/
  performance.ts               ← All TypeScript interfaces

lib/
  supabase/
    queries/
      performance.ts           ← Typed Supabase query functions
```

---

## FILES TO MODIFY

```
app/(tabs)/profile.tsx
  → Add a Button: "View My Performance"
  → onPress: router.push('/user-performance')
  → Place it below the user info section, above settings
```

---

## TYPESCRIPT TYPES

Define these in `types/performance.ts`:

```typescript
export interface UserPerformanceStats {
  total_predictions: number;
  correct_predictions: number;
  exact_predictions: number;
  total_points: number;
  matches_participated: number;
}

export interface UserStreak {
  current_streak: number;
  streak_type: 'win' | 'loss' | 'none';
}

export interface ComputedKPIs {
  accuracyRate: number;          // percentage 0–100
  exactScoreAccuracy: number;    // percentage 0–100
  pointsPerMatch: number;        // float, 1 decimal
  participationRate: number;     // percentage 0–100
  streak: UserStreak;
}
```

---

## BACKEND — SUPABASE

### Step 1: Create SQL View (run in Supabase SQL Editor)

```sql
CREATE OR REPLACE VIEW user_performance AS
SELECT
  p.user_id,
  COUNT(p.id)                                           AS total_predictions,
  COUNT(p.id) FILTER (WHERE p.is_correct = true)        AS correct_predictions,
  COUNT(p.id) FILTER (WHERE p.is_exact = true)          AS exact_predictions,
  COALESCE(SUM(p.points_earned), 0)                     AS total_points,
  COUNT(DISTINCT p.match_id)                            AS matches_participated
FROM predictions p
GROUP BY p.user_id;
```

> ⚠️ Adjust column names (`is_correct`, `is_exact`, `points_earned`, `match_id`) to match the actual `predictions` table schema. Scan the existing Supabase types file (`types/supabase.ts` or `database.types.ts`) before writing the query.

### Step 2: Create RPC for Streak (run in Supabase SQL Editor)

```sql
CREATE OR REPLACE FUNCTION get_user_streak(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  streak_count INT := 0;
  streak_type  TEXT := 'none';
  last_result  BOOLEAN;
  r            RECORD;
BEGIN
  FOR r IN
    SELECT is_correct
    FROM predictions
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
  LOOP
    IF streak_count = 0 THEN
      last_result := r.is_correct;
      streak_type := CASE WHEN r.is_correct THEN 'win' ELSE 'loss' END;
    END IF;

    IF r.is_correct = last_result THEN
      streak_count := streak_count + 1;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  RETURN json_build_object(
    'current_streak', streak_count,
    'streak_type', streak_type
  );
END;
$$;
```

> ⚠️ Adjust `is_correct` and `created_at` column names to match the actual schema.

### Step 3: Typed Query Functions (`lib/supabase/queries/performance.ts`)

```typescript
import { supabase } from '@/lib/supabase';
import { UserPerformanceStats, UserStreak } from '@/types/performance';

export async function fetchUserPerformance(
  userId: string
): Promise<UserPerformanceStats | null> {
  const { data, error } = await supabase
    .from('user_performance')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('[fetchUserPerformance]', error.message);
    return null;
  }

  return data as UserPerformanceStats;
}

export async function fetchUserStreak(
  userId: string
): Promise<UserStreak> {
  const { data, error } = await supabase
    .rpc('get_user_streak', { p_user_id: userId });

  if (error) {
    console.error('[fetchUserStreak]', error.message);
    return { current_streak: 0, streak_type: 'none' };
  }

  return data as UserStreak;
}
```

---

## DATA HOOK (`hooks/useUserPerformance.ts`)

```typescript
import { useEffect, useState } from 'react';
import { fetchUserPerformance, fetchUserStreak } from '@/lib/supabase/queries/performance';
import { ComputedKPIs } from '@/types/performance';

export function useUserPerformance(userId: string | null) {
  const [kpis, setKpis] = useState<ComputedKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [stats, streak] = await Promise.all([
          fetchUserPerformance(userId),
          fetchUserStreak(userId),
        ]);

        if (!stats) {
          setKpis(null);
          return;
        }

        const safe = (n: number, d: number) => (d === 0 ? 0 : n / d);

        setKpis({
          accuracyRate:       Math.round(safe(stats.correct_predictions, stats.total_predictions) * 100),
          exactScoreAccuracy: Math.round(safe(stats.exact_predictions,   stats.total_predictions) * 100),
          pointsPerMatch:     parseFloat(safe(stats.total_points, stats.matches_participated).toFixed(1)),
          participationRate:  Math.round(safe(stats.matches_participated, stats.total_predictions) * 100),
          streak,
        });
      } catch (e: any) {
        setError(e.message ?? 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [userId]);

  return { kpis, loading, error };
}
```

---

## KPI CARDS SPEC

Render 5 KPI cards in a 2-column grid (last card centered if odd):

| # | Title | Value Format | Icon Suggestion | Accent Condition |
|---|-------|-------------|-----------------|-----------------|
| 1 | Accuracy Rate | `72%` | 🎯 target | green if ≥ 60% |
| 2 | Exact Score | `18%` | ⚡ bolt | gold if ≥ 15% |
| 3 | Points / Match | `4.2 pts` | ⭐ star | always accent |
| 4 | Streak | `🔥 5 Win` or `❄️ 3 Loss` | dynamic | win=green, loss=red |
| 5 | Participation | `85%` | 📊 chart | green if ≥ 70% |

Each KPI card must show:
- Title (small, muted)
- Value (large, bold, accent color `#C9DF6A`)
- Subtitle or unit label
- Optional icon

---

## SCREEN STATES

Handle all three states on the `/user-performance` screen:

### Loading
- Show skeleton cards (2-column grid matching KPI layout)
- Use `ActivityIndicator` or skeleton shimmer if available in UI Kit

### Error
- Show centered error message
- Show "Try Again" Button that re-triggers the fetch

### Empty (no predictions yet)
- Show message: "No predictions yet. Start predicting to see your stats!"
- Show a CTA Button back to the matches screen

---

## UI FLOW

```
Profile Screen
    └── Button: "View My Performance"
            └── router.push('/user-performance')
                    └── /user-performance screen
                            ├── PerformanceHeader (user avatar + name + "Your Stats")
                            ├── KpiGrid (2-col, 5 cards)
                            └── [loading | error | empty] states
```

---

## RULES

- No auth changes — use existing `useAuth()` or `useSession()` hook to get `user.id`
- No leaderboard changes
- No schema breaking changes — the SQL view and RPC are additive only
- All Supabase queries must be typed
- All division operations must guard against zero (`safe()` helper)
- No hardcoded user IDs
- Follow existing file/folder naming conventions in the project
- Match dark theme (`#0D0D0D` background, `#C9DF6A` accent) on all new components

---

## ACCEPTANCE CRITERIA

- [ ] Profile screen has a working "View My Performance" button
- [ ] `/user-performance` route is registered and navigates correctly
- [ ] All 5 KPI cards render with correct values
- [ ] Loading state shows skeletons
- [ ] Error state shows message + retry button
- [ ] Empty state shows message + CTA
- [ ] No TypeScript errors (`strict: true`)
- [ ] No division-by-zero errors
- [ ] Dark theme matches rest of app

---

## GOAL

Build a production-ready, typed, error-safe KPI dashboard integrated into the user profile screen — using the existing UI Kit and matching the app's dark stadium aesthetic.

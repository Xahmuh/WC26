# WC26 — UI Regression, KPI & Notification Fixes
# UPGRADED IMPLEMENTATION SPECIFICATION v2.0
# Optimized for Cursor AI Execution

---

## Document Purpose

This is the authoritative implementation specification for fixing UI regressions,
KPI data inconsistencies, match visibility logic, notification behavior, and emoji
replacement across the WC26 prediction app.

This document is written for direct execution by Cursor AI.
Every requirement is unambiguous, actionable, testable, and verifiable.

---

## Agent Mandate

You are acting simultaneously as:
- Senior Staff Engineer
- Senior React Native Architect
- Senior UX Auditor
- Senior Supabase Integration Engineer

You must follow all four phases in strict order.
Do NOT skip phases.
Do NOT implement before completing Root Cause Analysis.
Do NOT proceed to the next issue before verifying the current one.

---

## Tech Stack (Read Before Starting)

- React Native + Expo SDK 56
- Expo Router v4
- Supabase JS v2
- TypeScript strict mode
- Custom UI Kit at `components/ui/`
- Dark theme: background `#0D0D0D`, accent `#C9DF6A`

---

## PHASE 0 — ROOT CAUSE ANALYSIS (MANDATORY FIRST STEP)

Before modifying any file, perform a full codebase investigation.

For each issue below, document:

```
ISSUE: [number and title]
FILE(S) INVOLVED: [exact file paths]
ROOT CAUSE: [what is actually wrong]
DATA FLOW: [where data comes from → where it breaks]
RISK LEVEL: HIGH / MEDIUM / LOW
SHARED COMPONENTS AFFECTED: [list any]
```

Do NOT proceed to Phase 1 implementation until this analysis is complete and output.

---

## PHASE 1 — IMPLEMENTATION PLAN (MANDATORY BEFORE CODING)

After Root Cause Analysis, output a step-by-step implementation plan:

```
ISSUE: [number]
STEP 1: [exact action]
STEP 2: [exact action]
FILES TO MODIFY: [list]
FILES TO CREATE: [list if any]
DATABASE CHANGES: YES / NO
REGRESSION RISK: [what could break]
```

Only begin coding after the full plan is output.

---

## PHASE 2 — IMPLEMENTATION

Execute fixes in priority order: Critical → High → Medium.
One issue at a time. Verify before moving to the next.

---

# CRITICAL PRIORITY ISSUES

---

## ISSUE 1 — Home Screen Total Points Card Shows Wrong Value

### Context
- `users.total_points` is correctly stored in the database (confirmed value: 14)
- The Home Screen KPI card displays a different or stale value

### Root Cause Investigation Required
- [ ] Identify which hook or query feeds the Home KPI cards
- [ ] Confirm whether it reads from `users.total_points` or aggregates from `points` table
- [ ] Check if the query runs on mount only, or also on focus
- [ ] Check if there is a cache layer (React Query, Zustand, useState) holding stale data
- [ ] Check if Supabase realtime subscription exists for this value

### Implementation Requirements
1. The Home Screen MUST read `total_points` from `public.users` WHERE `id = auth.uid()`
2. The query MUST re-execute when the screen gains focus (use `useFocusEffect`)
3. A Supabase realtime subscription MUST update the value when `users.total_points` changes
4. Loading state: show skeleton placeholder while fetching
5. Error state: show `--` as fallback value, never show `null`, `undefined`, or crash
6. Zero state: show `0` explicitly — never blank

### Acceptance Criteria
- [ ] Home Screen shows `14` when `users.total_points = 14` in database
- [ ] Value updates within 3 seconds after admin finalizes a match result
- [ ] Value refreshes every time the user navigates back to Home screen
- [ ] Loading skeleton visible during fetch (not blank screen)
- [ ] If fetch fails, card shows `--` not a crash

### Code Pattern Required
```typescript
useFocusEffect(
  useCallback(() => {
    fetchUserPoints(); // re-fetch on every focus
  }, [])
);
```

---

## ISSUE 2 — Leaderboard Data Not Synchronized

### Context
Leaderboard does not reflect updated points, rank, or current user position
after match scoring.

### Root Cause Investigation Required
- [ ] Trace full data flow: `score_match()` → `users.total_points` → leaderboard query → UI
- [ ] Identify if leaderboard query is cached and never invalidated
- [ ] Identify if current user's row is fetched separately or included in main list
- [ ] Check if leaderboard uses pagination that excludes the current user's position
- [ ] Check if rank is calculated client-side or server-side

### Implementation Requirements
1. Leaderboard MUST re-fetch when screen gains focus
2. Leaderboard query MUST ORDER BY `total_points DESC`
3. Rank MUST be calculated server-side using a SQL view or window function — NOT client-side
4. Current user row MUST always be visible — pin it if outside viewport
5. Current user row MUST be visually distinct (accent color border or highlight)
6. If current user is not in top N results, show them separately at the bottom with their actual rank
7. Cache invalidation MUST occur after any points update event

### SQL Requirement — Leaderboard View
Confirm or create this view in Supabase:
```sql
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  u.id,
  u.display_name,
  u.avatar_url,
  u.total_points,
  RANK() OVER (ORDER BY u.total_points DESC) AS rank
FROM public.users u
WHERE u.is_deleted = false
ORDER BY u.total_points DESC;
```

### Acceptance Criteria
- [ ] After `score_match()` runs, leaderboard reflects new points within 5 seconds
- [ ] User's rank updates correctly after points change
- [ ] Current user's row is always visible regardless of their position
- [ ] Navigating away and back to leaderboard shows fresh data (not cached)
- [ ] Rank 1 user has the highest `total_points` in the database — verified by cross-check

---

## ISSUE 3 — Remove Trend Indicator From KPI Rank Card

### Context
The Rank KPI card currently shows trend arrows and delta indicators (e.g. ↑3, ↓1).

### Implementation Requirements
1. Remove trend arrow icon/component from the Rank KPI card ONLY
2. Remove delta value (e.g. "+2", "-1") from the Rank KPI card ONLY
3. Display only: rank number (e.g. `#4`)
4. Preserve all other card styling: size, color, background, typography
5. Do NOT modify any other KPI card
6. Do NOT remove trend indicators from any other screen

### Acceptance Criteria
- [ ] Rank KPI card shows only the rank number (e.g. `#4`)
- [ ] No arrow icon visible on Rank card
- [ ] No delta number visible on Rank card
- [ ] Card dimensions unchanged
- [ ] All other KPI cards unchanged

---

## ISSUE 4 — Today's Matches Not Sorted Chronologically

### Context
Match ordering relies on API response order which is non-deterministic.

### Implementation Requirements
1. After fetching matches, sort client-side by `kickoff_time ASC`
2. Also add `.order('kickoff_time', { ascending: true })` to the Supabase query
3. Sort must handle timezone correctly — use UTC comparison
4. Sort must be applied BEFORE rendering — not after

### Code Pattern Required
```typescript
const sorted = matches.sort(
  (a, b) => new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime()
);
```

### Acceptance Criteria
- [ ] Earliest kickoff match appears first in the list
- [ ] Latest kickoff match appears last
- [ ] Order is consistent on every render — not random
- [ ] Verified against database `kickoff_time` values directly

---

## ISSUE 5 — Finished Matches Visible in Today's Matches

### Context
FINISHED, COMPLETED, and CANCELLED matches appear in Today's Matches view.

### Implementation Requirements
1. Filter matches WHERE `status IN ('SCHEDULED', 'LIVE')` only
2. Filter must be applied at the Supabase query level — NOT only client-side
3. Also apply client-side filter as a safety net
4. FINISHED, COMPLETED, CANCELLED statuses must never appear

### Supabase Query Pattern
```typescript
const { data } = await supabase
  .from('matches')
  .select('*')
  .in('status', ['SCHEDULED', 'LIVE'])
  .order('kickoff_time', { ascending: true });
```

### Empty State Requirement
If no SCHEDULED or LIVE matches exist for today:
- Show message: "No matches scheduled for today"
- Do NOT show an empty list with no explanation

### Acceptance Criteria
- [ ] No FINISHED match appears in Today's Matches
- [ ] No COMPLETED match appears in Today's Matches
- [ ] No CANCELLED match appears in Today's Matches
- [ ] LIVE matches appear correctly
- [ ] SCHEDULED matches appear correctly
- [ ] Empty state message shown when no active matches exist

---

## ISSUE 6 — Finished Matches Visible in My Predictions

### Context
My Predictions screen shows predictions for matches that are already finished.

### Implementation Requirements
1. Query predictions with a JOIN on matches
2. Filter WHERE `matches.status IN ('SCHEDULED', 'LIVE')`
3. Show only predictions for active matches
4. Apply filter at query level — not client-side only

### Supabase Query Pattern
```typescript
const { data } = await supabase
  .from('predictions')
  .select(`
    *,
    match:matches!inner(
      id, status, kickoff_time, home_score, away_score,
      home_team:teams!home_team_id(name, logo_url),
      away_team:teams!away_team_id(name, logo_url)
    )
  `)
  .eq('user_id', userId)
  .in('match.status', ['SCHEDULED', 'LIVE'])
  .order('match.kickoff_time', { ascending: true });
```

### Empty State Requirement
If user has no active predictions:
- Show: "No active predictions. Go predict upcoming matches!"
- Include CTA Button → navigate to Matches screen

### Acceptance Criteria
- [ ] No prediction for a FINISHED match appears in this screen
- [ ] Predictions for SCHEDULED matches appear
- [ ] Predictions for LIVE matches appear
- [ ] Empty state shown with CTA when no active predictions exist

---

# HIGH PRIORITY ISSUES

---

## ISSUE 7 — Notification Content Incomplete

### Context
Points earned notifications do not include enough context for the user to understand
what happened without navigating away.

### Implementation Requirements
Notification body must include ALL of the following:

| Field | Example |
|-------|---------|
| Home team name | Brazil |
| Away team name | Argentina |
| Final score | 2 - 1 |
| User's prediction | 2 - 0 |
| Points earned | 9 pts |
| Breakdown | Winner ✓ (5) + Home Goal ✓ (2) + Exact Bonus (0) |

### Notification Body Template
```
Brazil 2 - 1 Argentina
Your prediction: 2 - 0
Points earned: 9 pts
Winner ✓ · Home Goal ✓ · Away Goal ✗
```

### Implementation Location
Modify `score_match()` PostgreSQL function — the notification INSERT statement.

The `data` JSONB field must include:
```json
{
  "match_id": "uuid",
  "home_team": "Brazil",
  "away_team": "Argentina",
  "home_score": 2,
  "away_score": 1,
  "pred_home_score": 2,
  "pred_away_score": 0,
  "total_points": 9,
  "winner_points": 5,
  "home_goal_points": 2,
  "away_goal_points": 0,
  "exact_bonus": 0
}
```

### Acceptance Criteria
- [ ] Notification title: "Match Result: Brazil vs Argentina"
- [ ] Notification body includes final score
- [ ] Notification body includes user prediction
- [ ] Notification body includes total points earned
- [ ] Notification body includes scoring breakdown
- [ ] Notification `data.match_id` is always present (required for deep link)

---

## ISSUE 8 — Notifications Deep Link to Wrong Screen

### Context
Tapping a points notification navigates to Home instead of Match Details.

### Implementation Requirements
1. Notification handler must read `data.match_id` from the notification payload
2. Navigate to `/match-details/[match_id]` — NOT to home
3. The match details screen must scroll to or highlight the result breakdown section
4. Handle edge case: if match no longer exists, show toast "Match not found" and stay on current screen
5. Handle edge case: if notification has no `match_id`, navigate to Notifications screen

### Navigation Pattern
```typescript
// In notification handler
const matchId = notification.data?.match_id;
if (matchId) {
  router.push(`/match-details/${matchId}`);
} else {
  router.push('/notifications');
}
```

### Acceptance Criteria
- [ ] Tapping points notification opens Match Details for that specific match
- [ ] Home screen is NOT opened when tapping a points notification
- [ ] If `match_id` missing from payload, navigates to Notifications screen
- [ ] If match not found, shows toast error — does not crash

---

## ISSUE 9 — Match Details Missing Result Breakdown

### Context
Match Details screen does not show scoring breakdown after a match is finished.

### Implementation Requirements
Show a Result Breakdown section ONLY when `match.status === 'FINISHED'` AND user has a prediction for this match.

The section must display:

| Row | Label | Value |
|-----|-------|-------|
| 1 | Final Score | 2 - 1 |
| 2 | Your Prediction | 2 - 0 |
| 3 | Winner Correct | ✓ +5 pts |
| 4 | Home Score Correct | ✓ +2 pts |
| 5 | Away Score Correct | ✗ +0 pts |
| 6 | Exact Score Bonus | ✗ +0 pts |
| 7 | **Total Earned** | **7 pts** |

### Data Source
Query `public.points` table:
```typescript
const { data: pointsRecord } = await supabase
  .from('points')
  .select('winner_points, home_goal_points, away_goal_points, exact_bonus, total_points')
  .eq('user_id', userId)
  .eq('match_id', matchId)
  .single();
```

### States Required
- **Loading**: skeleton rows while fetching
- **Has points record**: show full breakdown
- **No points record + FINISHED**: show "Points not yet calculated"
- **No prediction**: show "You did not predict this match"
- **Match not finished**: hide this section entirely

### Acceptance Criteria
- [ ] Result breakdown section visible only for FINISHED matches
- [ ] Result breakdown hidden for SCHEDULED and LIVE matches
- [ ] All 4 point components displayed (winner, home goal, away goal, exact bonus)
- [ ] Total points matches `points.total_points` in database exactly
- [ ] "You did not predict this match" shown when no prediction exists
- [ ] Section hidden completely for non-finished matches

---

## ISSUE 10 — Layout Regressions From Responsive Refactor

### Context
The responsive refactor introduced layout issues across multiple screens.

### Screens to Audit (ALL required)

For each screen, check against this checklist:

| Check | Pass Criteria |
|-------|--------------|
| No horizontal scroll | User cannot scroll left/right |
| No clipped content | All text and cards fully visible |
| No overlapping elements | Nothing renders on top of another |
| No broken card grid | Cards aligned and equal width |
| Correct padding | 16px horizontal padding minimum |
| Max-width respected | Content centered on desktop ≥ 1280px |
| ScrollView present | Long content scrollable vertically |
| Safe area respected | Content not behind notch or tab bar |

### Screens List
- [ ] Home
- [ ] Matches
- [ ] Match Details
- [ ] Predictions
- [ ] Notifications
- [ ] Profile
- [ ] Leaderboard
- [ ] Admin
- [ ] Login
- [ ] Register

### Breakpoints to Test
- Mobile: 375px width
- Tablet: 768px width
- Desktop: 1280px width

### Acceptance Criteria
- [ ] Zero horizontal scroll on any screen at 375px
- [ ] Zero clipped cards at any breakpoint
- [ ] Zero overlapping elements at any breakpoint
- [ ] All screens pass the full checklist above
- [ ] Mobile layout (375px) identical to pre-refactor behavior

---

# MEDIUM PRIORITY — EMOJI REPLACEMENT POLICY

---

## ISSUE 11 — Replace All Emojis With Flat Icons

### Context
The application uses emoji characters (🏆, 📈, 🎯, ⚽, 🔔, ⭐) in various screens.
These must be replaced with consistent Flat 2 style icons from the existing icon system.

### Audit Requirement — Do This First
Scan the ENTIRE codebase for emoji usage:
- Search for Unicode emoji ranges in all `.tsx` and `.ts` files
- Search for emoji in string literals, template strings, and JSX text nodes
- Document every emoji found with: file path, line number, emoji character, context

Output the audit as a table:
```
| File | Line | Emoji | Context | Replacement Icon |
|------|------|-------|---------|-----------------|
| screens/Home.tsx | 45 | 🏆 | KPI card title | Trophy Icon |
```

### Replacement Map

| Emoji | Replacement | Icon Name in Kit |
|-------|-------------|-----------------|
| 🏆 | Trophy Icon | `trophy` or nearest equivalent |
| 📈 | Chart/Trend Icon | `trending-up` or nearest equivalent |
| 🎯 | Target Icon | `target` or nearest equivalent |
| ⚽ | Football Icon | `football` or nearest equivalent |
| 🔔 | Bell/Notification Icon | `bell` or nearest equivalent |
| ⭐ | Star Icon | `star` or nearest equivalent |
| 🔥 | Flame Icon | `flame` or nearest equivalent |
| ❄️ | Snowflake/Cold Icon | `snowflake` or nearest equivalent |
| 📊 | Chart Icon | `bar-chart` or nearest equivalent |
| ⚡ | Lightning Icon | `zap` or nearest equivalent |

### Implementation Rules
1. Check existing icon system FIRST — reuse any existing icon before creating new
2. Do NOT create duplicate icon concepts
3. Do NOT remove existing non-emoji icons
4. Do NOT replace icons that are already proper icon components
5. Only replace emoji characters — nothing else

### Icon Implementation Pattern
```typescript
// BEFORE
<Text>🏆 Total Points</Text>

// AFTER
import { TrophyIcon } from '@/components/ui/icons'; // or equivalent

<View style={styles.row}>
  <TrophyIcon size={20} color={colors.accent} accessibilityLabel="Trophy" />
  <Text>Total Points</Text>
</View>
```

### Consistency Requirements
All replaced icons must use:
- Size: consistent with surrounding UI (typically 20px or 24px)
- Color: follow existing design tokens — use accent `#C9DF6A` for highlights
- Spacing: 8px gap between icon and label text
- Accessibility label: always present (`accessibilityLabel` prop)
- Touch target: minimum 44×44px if the icon is interactive

### Acceptance Criteria
- [ ] Zero emoji characters remain in any user-facing screen
- [ ] All replacements use icons from the existing icon system where possible
- [ ] All icons have `accessibilityLabel` set
- [ ] Icon sizes consistent across all screens (no mixed sizing)
- [ ] Icon colors follow design token system
- [ ] No visual regression — layouts unchanged after emoji replacement

---

# PHASE 3 — RISK ASSESSMENT

Before implementing, the agent must identify and document:

### High-Risk Files
Files that are shared across multiple screens and carry high regression risk:
- Navigation configuration (tab bar, stack routes)
- Global state store (if Zustand/Context is used)
- Supabase client configuration
- Custom UI Kit components (modifying internals breaks all consumers)
- `score_match()` PostgreSQL function (scoring logic must not change)

### Shared Component Risk
If fixing a shared component (e.g. KPI Card, Notification Item):
- List every screen that imports it
- Verify fix does not break any consumer screen
- Test at all breakpoints after change

### Navigation Risk
- Deep link changes must not break existing navigation flows
- Tab bar must remain functional after any screen modification
- Back navigation must work correctly on all modified screens

### State Management Risk
- Identify all state that is shared between leaderboard and home KPI cards
- Ensure cache invalidation does not cause infinite re-fetch loops
- Ensure `useFocusEffect` does not cause performance issues on low-end devices

---

# PHASE 4 — VERIFICATION CHECKLIST

After ALL fixes are applied, verify every item:

### Data Integrity
- [ ] `users.total_points` in database matches what Home KPI card displays
- [ ] Leaderboard rank matches `RANK() OVER (ORDER BY total_points DESC)`
- [ ] Points breakdown in Match Details matches `points` table exactly
- [ ] No prediction is shown for a FINISHED match in My Predictions

### Functionality
- [ ] Submitting a prediction saves correctly (no permission denied error)
- [ ] Scoring still runs after admin sets match result
- [ ] Notifications sent after scoring with full content
- [ ] Tapping notification navigates to correct Match Details screen

### UI
- [ ] Home KPI card shows correct total points
- [ ] Rank KPI card shows only rank number — no trend indicator
- [ ] Today's Matches sorted by kickoff_time ASC
- [ ] No emoji characters visible in any screen
- [ ] All icons have accessibilityLabel

### Responsive
- [ ] All 10 screens pass layout checklist at 375px
- [ ] All 10 screens pass layout checklist at 768px
- [ ] All 10 screens pass layout checklist at 1280px

---

# PHASE 5 — REGRESSION TESTING

After all fixes, explicitly verify these flows have NOT broken:

| Flow | How to Verify |
|------|--------------|
| User submits prediction | Submit prediction → confirm row in `predictions` table |
| Admin finalizes match | Set status=FINISHED + scores → confirm `points` table row created |
| Points calculation | Verify `points.total_points` matches manual calculation |
| User performance KPI | Navigate to `/user-performance` → verify all 5 KPI cards |
| Leaderboard accuracy | Compare leaderboard rank with raw `ORDER BY total_points DESC` |
| Notification delivery | Finalize match → confirm notification received |
| Notification deep link | Tap notification → confirm Match Details opens |
| Responsive layout | Test all 10 screens at 375px, 768px, 1280px |
| Auth flow | Login → confirm user session and role |

---

# DELIVERABLES

The agent must output the following at the end:

### 1. Root Cause Analysis Report
One entry per issue — file paths, data flow, root cause, risk level.

### 2. Implementation Summary
```
| Issue | Status | Files Modified | DB Changes | Notes |
|-------|--------|---------------|------------|-------|
| 1     | FIXED  | home.tsx, usePoints.ts | NO | useFocusEffect added |
| 2     | FIXED  | leaderboard.tsx | YES — view created | |
...
```

### 3. Emoji Audit Table
Full list of every emoji found and its replacement.

### 4. Regression Test Results
Pass/Fail for every item in Phase 5.

### 5. Before/After for each screen
Screenshot description or code diff summary showing the change.

---

# GLOBAL RULES — ENFORCED ACROSS ALL PHASES

- Do NOT implement before completing Root Cause Analysis
- Do NOT modify `score_match()` scoring logic — only the notification INSERT
- Do NOT modify auth configuration
- Do NOT modify UI Kit component internals — only usage
- Do NOT change design tokens (colors, fonts, spacing scale)
- Do NOT introduce new state management libraries
- Do NOT break mobile layout — 375px must work perfectly at all times
- TypeScript strict mode — zero type errors after all changes
- One issue at a time — verify before moving to next
- If root cause is unclear — scan codebase further, do not guess

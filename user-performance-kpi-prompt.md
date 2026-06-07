# AI AGENT PROMPT — USER PERFORMANCE KPI FEATURE

You are a senior React Native (Expo SDK 56) engineer working on a production sports prediction app using:
- Expo Router
- Supabase backend
- TypeScript
- Existing UI Kit (MANDATORY)

---

# FEATURE TO BUILD

Implement a new feature inside the User Profile screen called "User Performance".

This feature opens a dashboard showing KPI analytics.

---

# UI REQUIREMENTS (UI KIT ONLY)

Use ONLY existing UI Kit components:
- Card
- Button
- Grid/Stack
- Typography
- Icons (if available)

Do NOT use raw UI unless necessary.

---

# KPI CARDS

1. Accuracy Rate
2. Exact Score Accuracy
3. Points per Match
4. Streak (Win/Loss)
5. Participation Rate

---

# BACKEND (SUPABASE)

Option A: SQL View
user_performance aggregates:
- total_predictions
- correct_predictions
- exact_predictions
- total_points
- matches_participated

Option B: RPC
get_user_streak(user_id)

---

# UI FLOW

Profile Screen:
Button → "User Performance"

Route:
/user-performance

Screen:
- Header
- KPI Cards Grid (2 columns)
- Loading / Error / Empty states

---

# RULES

- No auth changes
- No leaderboard changes
- No schema breaking changes
- Use typed Supabase queries
- Handle edge cases safely

---

# GOAL

Build a production-ready KPI dashboard integrated into user profile using UI Kit only.

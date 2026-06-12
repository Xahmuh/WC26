# World Cup 2026 Prediction Platform

Predict scorelines before kickoff, earn points when matches finish, climb the
leaderboard. Near-live scores are synced server-side from football-data.org
while matches are running, and prediction points are still calculated only after
a match is officially `FINISHED`.

## Stack

| Layer    | Tech                                                                 |
| -------- | -------------------------------------------------------------------- |
| Mobile   | React Native · Expo SDK 52 · Expo Router v4 · React Query v5 · Zustand · NativeWind v4 |
| Backend  | Supabase — Auth · Postgres · Realtime · Edge Functions · Cron        |
| Data API | football-data.org v4 (free plan, 10 req/min) — called **only** from Edge Functions |

## How scoring works

The database scoring function is the source of truth. Local helpers mirror the
same simplified rules for tests/UI:

| Reward                         | Points |
| ------------------------------ | ------ |
| Correct result / qualifier     | configurable (+3 default) |
| Exact 90-minute score bonus    | configurable (+5 default) |
| Home/away partial goal points  | not awarded |

Wrong predictions score 0 — never negative.

## Project layout

```
app/                 Expo Router screens (auth stack, tab group, match detail)
components/           ui / match / prediction components
hooks/               React Query hooks (matches, predictions, points, leaderboard)
lib/                 supabase client, scoring, dates, mappers, constants
stores/              Zustand stores (auth, app UI state)
types/               shared domain + Database types
supabase/
  migrations/        001_initial_schema.sql
                     002_leaderboard_tiebreaker.sql  (exact-score tie-breaker)
  functions/
    _shared/         scoring, cors, admin client, football-api wrapper
    sync-fixtures/   seed/refresh teams + schedule (also runs daily via cron)
    sync-live-matches/ near-live score/status sync inside match windows
    poll-results/    cron every 5 min → ONE bulk call → detect FINISHED → score
    calculate-points/ score one match's predictions
```

### Leaderboard ranking

Rank is by `total_points` desc, then — to break ties — by the number of
**exact-score** predictions (`exact_predictions`) desc. A keep-warm cron
refreshes the materialized view every 10 minutes so newly-registered users show
up without waiting for a match to finish (scoring still refreshes it instantly).

## Setup

### 1. Install

```bash
npm install
```

### 2. Configure the mobile app

Copy `.env.example` → `.env` and fill in your project's **public** values:

```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

> The anon key is public by design — every table is protected by Row Level
> Security. The football-data token and service-role key **never** ship in the app.

### 3. Database

```bash
supabase db push        # applies migrations 001_* and 002_*
```

This creates the enums, tables, indexes, the `leaderboard` materialized view
(with its exact-score tie-breaker), RLS policies, the auth-signup trigger, and
the helper functions (`lock_predictions_at_kickoff`, `refresh_leaderboard`, …).

### 4. Edge Functions

```bash
supabase secrets set FOOTBALL_API_TOKEN=your_football_data_token
supabase secrets set SYNC_LIVE_MATCHES_SECRET=your_random_sync_secret
supabase functions deploy sync-fixtures
supabase functions deploy sync-live-matches
supabase functions deploy calculate-points
supabase functions deploy poll-results
```

> `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected into functions
> automatically — do not set them yourself.

### 5. Seed the schedule

```bash
supabase functions invoke sync-fixtures
```

### 6. Schedule the cron jobs (run once in the SQL editor)

Requires `pg_cron` + `pg_net` (`create extension if not exists pg_cron; create
extension if not exists pg_net;`). The anon key is public, but
`sync-live-matches` should also include `x-sync-secret` so outsiders cannot burn
the football-data.org rate limit.

```sql
-- a) Near-live status/score sync. Safe to run every minute because the function
--    checks local match windows first and enforces a server-side 60s provider
--    throttle before calling football-data.org.
select cron.schedule(
  'sync-live-matches-every-min', '* * * * *',
  $$ select net.http_post(
       url := 'https://YOUR_PROJECT.supabase.co/functions/v1/sync-live-matches',
       headers := jsonb_build_object('Content-Type','application/json',
         'Authorization','Bearer YOUR_ANON_KEY',
         'x-sync-secret','YOUR_SYNC_LIVE_MATCHES_SECRET'),
       body := '{}'::jsonb) $$
);

-- b) Poll for finished matches every 5 minutes (ONE bulk API call per run).
select cron.schedule(
  'poll-results-every-5-min', '*/5 * * * *',
  $$ select net.http_post(
       url := 'https://YOUR_PROJECT.supabase.co/functions/v1/poll-results',
       headers := jsonb_build_object('Content-Type','application/json',
         'Authorization','Bearer YOUR_ANON_KEY'),
       body := '{}'::jsonb) $$
);

-- c) Daily re-sync so knockout fixtures (R16/QF/SF/Final) auto-populate once the
--    API allocates the TBD teams.
select cron.schedule(
  'sync-fixtures-daily', '0 3 * * *',
  $$ select net.http_post(
       url := 'https://YOUR_PROJECT.supabase.co/functions/v1/sync-fixtures',
       headers := jsonb_build_object('Content-Type','application/json',
         'Authorization','Bearer YOUR_ANON_KEY'),
       body := '{}'::jsonb) $$
);

-- d) Keep the leaderboard warm (migration 002 also installs this).
select cron.schedule(
  'refresh-leaderboard-every-10-min', '*/10 * * * *',
  $$ select public.refresh_leaderboard(); $$
);
```

### 7. Run

```bash
npx expo start
```

## Tests

```bash
npm test        # Jest suite for the scoring engine (lib/scoring.test.ts)
npm run typecheck
```

## Data flow

```
User submits prediction (before kickoff)
        ↓  (RLS blocks edits once is_locked = true)
Match plays
        ↓
Cron every min → sync-live-matches
        ↓  update IN_PLAY/PAUSED score/status only
App updates from Supabase Realtime
        ↓
Cron every 5 min → poll-results
        ↓  match status = FINISHED?
Persist final score → DB trigger score_match
        ↓
Upsert points → refresh leaderboard view
        ↓
App sees points + new ranking (Realtime invalidation)
```

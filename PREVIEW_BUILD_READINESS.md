# Preview Build Readiness

Audit date: 2026-06-10

Scope: prepare a safe Android preview build for the Expo + Supabase World Cup
prediction app. This document intentionally avoids changing scoring,
prediction, auth, or UI business flows.

## Validation Baseline

Run before every preview build:

```powershell
npm run typecheck
npm run lint
npm test -- --runInBand
npx expo export --platform android
npx expo-doctor
```

## Migration History Cleanup Plan

Local migrations currently contain duplicated version prefixes:

- `021_richer_points_notification.sql`
- `021_user_performance_and_rls_fixes.sql`
- `022_leaderboard_live_on_points.sql`
- `022_predictions_insert_rls_fix.sql`

Do not delete any of these blindly. They may already be represented in the
remote database history or may contain schema changes that are required by the
current app.

Recommended safe cleanup path:

1. Confirm the production database migration history with:
   `supabase migration list`.
2. Dump or pull the current remote schema into a review branch.
3. Create a clean baseline migration for the current remote schema only after
   confirming it matches the app.
4. Archive the old numeric migration chain outside the active migration folder
   only after the baseline has been verified locally and against preview.
5. Keep all new migrations timestamped, unique, and generated with
   `supabase migration new <name>`.
6. Do not run `supabase db reset` against production.

Remote comparison status: blocked in the current audit because the provided
database password failed authentication for direct Postgres migration-list
access. Supabase project API access is working for non-secret metadata. No
destructive database commands were run.

## Safe Advisor Fixes Added

New migration:

- `supabase/migrations/20260610024322_preview_readiness_security_cleanup.sql`

It performs only non-destructive hardening:

- Adds an owner-only `SELECT` RLS policy for `public.user_rank_snapshot`.
- Drops broad public storage `SELECT` policies that allow object listing for
  public image buckets while preserving public URL rendering.
- Drops old duplicate `idx_uq_pred_*` indexes if they exist, keeping the active
  `idx_uqp_*` indexes.

## Advisor Items Intentionally Not Changed

`public.leaderboard` is a materialized view exposed to authenticated users.
The app currently reads it for leaderboard screens, so revoking access without
adding a replacement RPC/view would break behavior. Leave this for the
production-readiness phase.

Admin `SECURITY DEFINER` RPCs remain callable by `authenticated` where the app
needs them, but they must keep explicit `public.is_admin()` guards. Do not
remove these grants until the admin surface is moved to a private schema or
server-only API.

RLS performance warnings should be handled in a dedicated migration by changing
policy predicates from `auth.uid()` to `(select auth.uid())`. This is safe, but
wide enough to review separately.

## Required Edge Function Secrets

Do not commit secret values.

Required for Supabase Edge Functions:

- `SUPABASE_SERVICE_ROLE_KEY`
- `FOOTBALL_API_TOKEN`, unless `public.api_providers.token_secret_name` points
  to a different active provider token name.

Current audit status: both required secret names are present in Supabase secret
metadata. Values were not printed or stored.

Useful commands:

```powershell
supabase secrets list
supabase secrets set FOOTBALL_API_TOKEN=...
```

## Expo Native Readiness

`npx expo-doctor` reports that `android/` exists while native configuration is
also present in `app.json`. In this workflow, EAS will not automatically sync
native fields from `app.json` into `android/`.

Preview recommendation:

1. Keep `android/`.
2. Run a controlled prebuild sync before preview if any native config changed:
   `npx expo prebuild --platform android --no-install`.
3. Review the generated native diff before committing.

Do not delete `android/` unless the project intentionally moves back to fully
managed/CNG workflow.

Current audit status: the Android project was malformed and missing core Gradle
files, so a controlled Android prebuild sync was run. `expo-system-ui` was added
because `app.json` uses `userInterfaceStyle`.

## Asset Performance Notes

Mobile bundle currently includes oversized visual assets:

- `assets/Hero-banner.png` around 2.6 MB, used by home/matches hero UI.
- `assets/neosplash.png` around 2.3 MB, bundled by the app.
- `assets/worldcup_ball_trionda_fab.png` around 375 KB, acceptable but can be
  compressed later.

For preview, do not replace critical artwork automatically. For production,
target hero/splash assets at mobile-appropriate dimensions and WebP/JPEG
quality settings, then verify the Android device visuals.

## Preview Build Command

```powershell
eas build -p android --profile preview
```

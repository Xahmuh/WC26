# Project Audit

Audit date: 2026-06-10  
Project: Expo + React Native + Supabase World Cup prediction app

## Validation Results

| Command | Result | Notes |
| --- | --- | --- |
| `npm install` | Passed | Dependencies were already up to date. npm reported 10 moderate vulnerabilities in Expo transitive tooling. |
| `npm run typecheck` | Passed | `tsc --noEmit` completed with no TypeScript errors. |
| `npm test` | Passed | 1 Jest suite passed: `lib/scoring.test.ts`, 21 tests total. |
| `npx expo-doctor` | Failed | 20/21 checks passed. Expo Doctor flags native config drift because `android/` exists while native config also lives in `app.json`. |
| `npm run lint` | Passed | Extra validation run during audit; ESLint completed with no reported warnings or errors. |
| `npm audit --audit-level=moderate` | Failed | 10 moderate advisories from transitive `uuid` via Expo config tooling. The suggested automatic fix is breaking and unsafe. |

## Safe Fixes Applied

- Created this `PROJECT_AUDIT.md`.
- No source-code changes were applied automatically. The issues found are either deployment-policy decisions, security model changes, or UX/navigation choices that could alter product behavior.

## Critical Issues

None confirmed by local validation. TypeScript, Jest, and lint are currently green.

## High Priority Issues

### Expo native config drift

`npx expo-doctor` fails because the project has a checked-in `android/` directory and also keeps native config in `app.json` (`scheme`, `orientation`, `userInterfaceStyle`, `icon`, `ios`, `android`, and `plugins`). In a non-CNG/native-folder build, EAS Build will not sync those fields into the native project.

Evidence:
- `app.json` defines native fields at lines 3-49.
- `android/` is present in the repo.

Risk:
- App icon, notification sound/color, package identifiers, permissions, schemes, and plugin-generated native changes can drift between `app.json` and Android native files.
- Future builds may not include expected Expo plugin changes unless `expo prebuild` is intentionally rerun and committed.

Proposed patch, approval required:
- Option A: Commit to CNG by removing generated native folders after confirming no custom native edits are required.
- Option B: Commit to a bare/prebuilt workflow by documenting it and syncing all active `app.json` native/plugin changes into `android/`, then treat `app.json` native fields as source-of-truth only when prebuild is run.

### Center tab route bypasses the Cards screen

The Expo Router tab is named `cards`, but the custom tab bar treats that center tab as `Predict` and routes to pending predictions instead of the cards tab.

Evidence:
- `app/(tabs)/_layout.tsx` registers `<Tabs.Screen name="cards" options={{ title: 'Cards' }} />`.
- `components/ui/FloatingTabBar.tsx:296-304` detects `route.name === 'cards'` and pushes `/profile/predictions?tab=PENDING`.

Risk:
- Users cannot reach the `CardsScreen` from the visible Cards tab.
- The tab title, screen, and interaction model disagree, which can confuse navigation state and product expectations.

Proposed patch, approval required:
- If the center tab should be Cards: remove the special-case push and let `navigation.navigate(route.name)` run.
- If the center action should be Predict: rename/restructure the route and expose `CardsScreen` through an explicit profile/home entry only.

### Client-side hardcoded admin override

The auth store promotes one email address to admin client-side even if the database role is not admin.

Evidence:
- `stores/auth.store.ts:210-220` checks a literal email and sets `role: 'admin'` if it matches.

Risk:
- UI gating can expose admin screens for that email independent of database state.
- Supabase RLS/RPC checks should still be the real authorization boundary, but client-only role overrides are brittle and easy to misunderstand.

Proposed patch, approval required:
- Remove the client-side override and rely only on the `users.role` value returned by Supabase.
- If a permanent super-admin is required, enforce it in a server-side SQL function/RLS policy or managed `app_metadata`, not in the mobile client.

## Medium Priority Issues

### Supabase generated types lag behind migrations

Several newer tables/RPCs are accessed through `(supabase as any)` and mapper `any` types, especially cards, auth content, banners, API providers, and admin settings.

Evidence:
- `services/cards.service.ts:31-99` maps `card_definitions` and `user_cards` from `any`.
- `services/admin.service.ts` and `services/auth-content.service.ts` contain many `(supabase as any)` calls for newer schema objects.

Risk:
- TypeScript is green because the type system is bypassed around new Supabase features.
- Column renames, nullability changes, or RPC signature drift may fail at runtime instead of compile time.

Proposed patch:
- Regenerate `types/database.types.ts` from the linked/local Supabase schema.
- Replace casts for current tables/RPCs with typed `.from()`/`.rpc()` calls in focused batches.

### Supabase local project configuration is missing

The repo contains migrations and Edge Functions, but no `supabase/config.toml` was found.

Evidence:
- `rg --files supabase | rg "config\.toml|seed\.sql|deno\.json"` found only `supabase/functions/deno.json`.

Risk:
- Local `supabase start`, migration testing, function settings, auth URLs, and storage config are harder to reproduce.
- New contributors may rely only on the linked remote project, increasing migration risk.

Proposed patch:
- Run `supabase init` or add a reviewed `supabase/config.toml` matching the project, then validate migrations locally.

### Dependency security advisories are blocked by Expo transitive tooling

`npm audit` reports 10 moderate vulnerabilities through `uuid <11.1.1` used by `xcode`, `@expo/config-plugins`, and Expo CLI internals. The suggested `npm audit fix --force` would install `expo@46.0.21`, which is a breaking downgrade from Expo 56 and is not safe.

Risk:
- The advisory is in build/config tooling, not direct app runtime code, but it still affects the development supply chain.

Proposed patch:
- Do not run `npm audit fix --force`.
- Track an Expo SDK/tooling update that bumps the affected transitive dependency.
- Re-run `npm audit` after Expo releases a compatible fix.

### Admin screen is a large monolithic component

`app/admin/index.tsx` is a multi-thousand-line screen containing many unrelated admin workflows in one module.

Evidence:
- Imports begin at `app/admin/index.tsx:1`.
- Main tabbed admin content is still rendering near `app/admin/index.tsx:3503-3511`.

Risk:
- Slower iteration, harder review, and higher regression risk when editing admin functions.
- Render work can grow as more admin panels are added.

Proposed patch:
- Split each admin tab into its own component file without changing behavior.
- Keep the existing hooks/service contracts and move only presentation blocks first.

### Heavy data fan-out on Cards screen

The Cards screen fetches catalog, user cards, matches, points, scoring rules, stage settings, and stage multipliers, then derives collection state on the client.

Risk:
- More network round-trips and client compute than needed on lower-end devices.
- The screen may become sluggish as match/card volume grows.

Proposed patch:
- Add a Supabase view/RPC for derived card progress, or cache the less volatile admin settings longer.
- Keep current client calculation as a fallback until server output is validated.

## Low Priority Issues

### Hardcoded Supabase URL and anon key in `app.json`

`app.json:53-55` contains the public Supabase URL and anon key. The anon key is public by design, but storing environment-specific values in committed app config makes staging/production separation easier to get wrong.

Proposed patch:
- Prefer `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` from environment-specific build profiles.
- Keep `app.json` fallback values only if this is intentionally a single-environment app.

### ESLint intentionally allows `any` and console calls

`eslint.config.mjs` disables `@typescript-eslint/no-explicit-any`, `no-console`, and `no-undef`.

Risk:
- Fine for rapid Expo work, but it hides the type coverage gaps noted above.

Proposed patch:
- Re-enable `no-explicit-any` only for new/low-risk folders first, or add targeted overrides for generated/Supabase transition files.

### Web shell is capped at 480px

`app/_layout.tsx` wraps web content in a max-width mobile shell when width is greater than 480px.

Risk:
- This is good for mobile parity, but tablet/desktop web will not use wider responsive layouts even where screens support them.

Proposed patch:
- Treat this as a product decision. If web/tablet is a target, audit each screen at tablet widths before lifting the cap.

## Notes On Preserved Functionality

- World Cup prediction scoring logic was not changed.
- Existing Supabase migrations and Edge Functions were not modified.
- No features were removed.
- Risky changes are listed as proposed patches only.

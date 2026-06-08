# WC26 — Home Screen Redesign Spec
**Project:** No Budget World Cup 26  
**Target File:** Home screen (`app/(tabs)/index.tsx` or equivalent)  
**Stack:** React Native · Expo SDK 56 · Expo Router · React Query · Zustand · NativeWind v4 · Supabase  
**TypeScript:** Strict mode enforced — no `any` types allowed in any new component

---

## ⚠️ Critical Rules Before Starting

1. **Do NOT break** existing screens, auth flow, scoring logic, leaderboard, predictions, or Supabase queries.
2. **Inspect the full file structure first** before writing any code.
3. **Reuse existing hooks and components** wherever possible.
4. **Do not remove any existing feature** — only add or replace UI.
5. **Tournament Predictions is an existing feature** — preserve it fully (see Section 13).
6. **No fake database writes** — mock data must be clearly marked with `// TODO` comments.
7. **Never nest a vertical FlatList inside a ScrollView** — use horizontal FlatList/ScrollView only for inner horizontal sections.
8. Main screen container must be a single `ScrollView` with enough `paddingBottom` to clear the floating bottom nav.
9. All new components must handle: **loading state**, **empty state**, and **error/fallback state**.
10. Use `MotiView` from the `moti` library (already available in Expo) for skeleton loading animations.

---

## 🎨 Visual Design System

| Token | Value |
|---|---|
| Background | `#0D0D0D` (near black) |
| Card Background | `#141414` or `#1A1A1A` |
| Primary Accent | `#C9DF6A` (neon lime green) |
| Gold Accent | `#FFD700` |
| Red Accent | `#E03030` |
| Blue Accent | `#1A3A8F` |
| Text Primary | `#FFFFFF` |
| Text Secondary | `#888888` |
| Border | `rgba(201, 223, 106, 0.3)` |
| Border Active | `#C9DF6A` |
| Card Radius | `16px` |
| Section Spacing | `16px` horizontal padding, `24px` between sections |
| Font Style | Bold/sporty for titles, clean readable for body |

**Card style:** Dark glassmorphism — dark background + subtle neon-lime border + slight inner glow.

**Flags:** Use `https://flagcdn.com/w40/{countryCode}.png` (ISO 3166-1 alpha-2 lowercase).  
Example: `https://flagcdn.com/w40/eg.png` for Egypt.  
Render as circular `Image` with `borderRadius: 999`.

---

## 📐 Home Screen Section Order (Top → Bottom)

This is the **exact vertical order** to follow:

```
1.  Header
2.  KPI Summary Bar
3.  Hero Banner Carousel
4.  [Row] My Cards  |  Next Match Countdown  |  Next Reward   ← 3 cards in one flex row
5.  My Teams Matches
6.  Pending Predictions
7.  Today's Matches
8.  [Row] Performance Preview  |  Mini Leaderboard            ← 2 cards side by side
9.  Tournament Predictions   ← EXISTING FEATURE — preserve fully
```

---

## Section 1 — Header

**Component:** Inline in Home screen (not a separate component)

Layout: `flex-row` with `justify-between` and `align-center`

- **Left:** Avatar button — circular, shows user's first initial or avatar image. Tapping navigates to Profile screen.
- **Center:** App logo image — use the existing logo asset from the project. Below the logo, show subtitle text `"BEAT THE KEEPER"` in `#C9DF6A`, small caps, bold.
- **Right:** Notification bell button — outline bell icon. Show a small `#C9DF6A` dot badge if there are unread notifications. If notification system doesn't exist yet, render the bell without a badge and add `// TODO: wire up notification badge`.

**Greeting (below avatar, left-aligned):**
```
⭐ Good Morning,
Ahmed!
```
- Use `⭐` as a flat icon (or replace with a star SVG icon if available in the icon kit).
- Dynamically use the current user's `display_name` from Supabase auth or user profile.
- Greeting changes based on time of day: Good Morning / Good Afternoon / Good Evening.
- If user name not yet loaded, show a short skeleton placeholder.

---

## Section 2 — KPI Summary Bar

**Component:** `HomeKpiBar`

A single full-width dark glass card with `#C9DF6A` border.  
Four stats separated by subtle vertical dividers:

| Stat | Icon | Value | Subtitle |
|---|---|---|---|
| Total Points | ⭐ star icon | number | `TOTAL POINTS` |
| Rank | 🏆 trophy icon | number | `RANK` + `"Top 1%"` if available |
| Predictions | 🎯 target icon | number | `PREDICTIONS` |
| Day Streak | 🔥 flame icon | number | `DAY STREAK` |

- Icons should be flat 2D SVG icons (not emoji) — use the project's existing icon kit.
- Number should be large and bold (`fontSize: 28`, `fontWeight: 800`).
- Label should be small and secondary (`fontSize: 10`, uppercase, `color: #888`).
- "Top 1%" subtitle under Rank — only show if rank percentile data is available.
- Use existing `useUserStats` hook or equivalent. If not found, add `// TODO: connect to user stats hook`.

---

## Section 3 — Hero Banner Carousel

**Component:** `HeroBannerCarousel`

- Full-width carousel with `borderRadius: 16` and `#C9DF6A` border.
- Use existing asset: `@Hero-banner.png` (locate in `assets/` folder).
- If more banner assets exist, show all. Otherwise repeat the single banner for 3–4 slides as placeholder.
- Add pagination dots below the banner: filled dot = `#C9DF6A`, empty dot = `rgba(255,255,255,0.3)`.
- Auto-scroll every 4 seconds.
- Banner height: `200px` on standard phones, use `height: screenHeight * 0.25` for responsiveness — do not exceed `240px`.
- Rounded corners, neon lime border.

---

## Section 4 — Three-Card Row: My Cards · Next Match Countdown · Next Reward

This entire section is a **single `flex-row`** with `gap: 10` and equal-width cards (`flex: 1` each).  
On narrow screens (width < 375), allow this row to wrap or reduce padding.

---

### 4a — My Cards Preview

**Component:** `MyCardsPreview`

Header row: `MY CARDS` label (bold, white) + count badge in `#C9DF6A` + `View All >` button.

Show 3 mini collectible cards in a row:

| Card | Icon | Count |
|---|---|---|
| JOKER | Joker/diamond icon | x0 / x1 / x2 |
| SNIPER | Target/crosshair icon | x0 / x1 / x2 |
| SHIELD | Shield icon | x0 / x1 / x2 |

Each mini card:
- Dark background (`#1A1A1A`)
- `#C9DF6A` neon border
- Flat 2D icon (not emoji)
- Card name below icon (small, white)
- Count badge `xN` in bottom-right corner

Below the cards: small helper text `"Use cards to boost your points!"` in secondary color.

> **TODO:** Connect to card inventory from Supabase (`user_cards` table or equivalent).  
> If table/hook doesn't exist, use mock values `{ joker: 1, sniper: 1, shield: 0 }` and mark clearly.  
> Do NOT write any fake database data.

---

### 4b — Next Match Countdown

**Component:** `NextMatchCountdown`

- Header: clock icon + `"NEXT MATCH STARTS IN"` label
- Large countdown display: `HH : MM : SS` with labels `HRS`, `MINS`, `SECS` below each unit
- Progress bar below — fills `#C9DF6A` from left, background `rgba(255,255,255,0.1)`
- CTA text: `"Make your prediction now!"`

Logic:
- Use the nearest upcoming (scheduled) match from existing match data hook.
- Calculate time difference from `match.match_time` to `Date.now()`.
- Update every second using `setInterval` inside a `useEffect`. Clear on unmount.
- If no upcoming match: show `"No upcoming matches"` and hide the countdown.
- Progress bar: represents time elapsed as a fraction of the total time window (e.g., last 24h before match).

---

### 4c — Next Reward Card

**Component:** `NextRewardCard`

> ⚠️ This component is **not in the original spec** but is clearly visible in the reference UI. It must be implemented.

Layout:
- Header: `"NEXT REWARD"` label (bold, white, center)
- Reward image: mystery box / gift icon — use a flat 2D illustration or emoji-free icon
- Progress text: `"84 / 100 POINTS"` — dynamically use user's current points / next reward threshold
- Progress bar: fills `#C9DF6A`, background dark
- Reward name: `"Mystery Pack"` in `#C9DF6A`, bold
- Subtitle: `"Unlocks at 100 points"` in secondary color

> **TODO:** Connect to rewards system. If `user_rewards` or `reward_milestones` table doesn't exist,  
> use mock threshold of 100 points and mark with `// TODO: connect to rewards hook`.  
> Do NOT create fake DB writes.

---

## Section 5 — My Teams Matches

**Component:** `MyTeamsMatches`

Header row: `"MY TEAMS MATCHES"` + star icon + `"Edit Teams"` button (right-aligned, `#C9DF6A`).

Show **horizontal scrollable row** of match cards (3 visible, scroll for more).

Each card:
- Left team: flag image (circular, 40×40) + country name below
- `VS` text in center
- Right team: flag image + country name
- Below: date/time text (`"Tomorrow · 21:00"`)
- Bottom-right: multiplier badge (`x2`, `x3`) — dark background, `#C9DF6A` border and text
- Favorite star indicator (filled `#C9DF6A` if favorite)

Arrow `>` button at the end of the row to scroll/view more.

> **TODO:** Check for `useFavoriteTeams` hook.  
> If found, use it to filter matches for the user's favorite teams.  
> If NOT found, render placeholder cards with mock teams and add:  
> `// TODO: implement favorite teams — needs user_favorite_teams table + hook`  
> Do NOT create the backend table or write DB queries unless it already exists.

**Reusable component:** Create `MatchCard` component used here and in Today's Matches.

---

## Section 6 — Pending Predictions

**Component:** `PendingPredictions`

**Priority:** This section should appear **above** Today's Matches. It is high-priority for user action.

Header row: `"PENDING PREDICTIONS"` + count badge (e.g., `3`) + `"View All >"` button.

Show **maximum 3 rows** on home screen.

Each row (list item):
- Left: team A flag (circular, 32×32) + team A name
- Center: `"VS"` text
- Right: team B flag + team B name
- Far right: date/time (`"Today · 17:00"`)
- Multiplier badge (`x2`)
- Chevron `>` icon

Logic:
- Query matches that are `status = 'scheduled'` or `status = 'upcoming'`
- Cross-reference with current user's predictions
- Show only matches where the user has **not yet submitted a prediction**
- Use existing matches + predictions hooks — do not create new DB queries unless needed

Tapping a row navigates to the prediction screen for that match.

---

## Section 7 — Today's Matches

**Component:** `TodayMatchesSection`

Header row: `"TODAY'S MATCHES"` + `"View All >"` button.

**Horizontal scrollable row** of match cards.

Each match card:
- If `match.is_golden = true` OR `match.is_match_of_day = true`: show gold badge `"⭐ MATCH OF THE DAY"` at top of card
- Left team: flag (circular) + name
- `VS` center
- Right team: flag + name
- Date/time: `"Today · 17:00"`
- Multiplier badge: `x2` / `x3` etc.
- Favorite star icon (top-right, outline or filled)

Sorting: **oldest to newest** by `match_time`.  
Filtering: **hide finished matches** — only show `status !== 'finished'` and `status !== 'completed'`.

> **Golden Match / Match of the Day:**  
> This is an **admin-assigned** match with a custom multiplier (e.g., `x2` or `x3` even in Group Stage).  
> It is **NOT a separate screen section** — it is a highlighted card within Today's Matches.  
> **TODO:** This requires the following schema fields on the `matches` table:  
> - `is_golden: boolean` (or `is_match_of_day: boolean`)  
> - `golden_multiplier: number` (overrides the stage multiplier)  
> - Admin panel support to toggle this per match  
> Until these fields exist, check for them safely with optional chaining and hide the badge if undefined.

Reuse the `MatchCard` component created in Section 5.

---

## Section 8 — Two-Card Row: Performance Preview · Mini Leaderboard

This row is a **`flex-row`** with `gap: 12`.  
Left card takes `flex: 1`, right card takes `flex: 1.4` (leaderboard slightly wider).

---

### 8a — User Performance Preview

**Component:** `PerformancePreview`

- Header: `"YOUR PERFORMANCE"` in `#C9DF6A`, bold, center
- Icon: trending-up chart icon (flat 2D)
- Three stats in a row:
  - `82%` Accuracy
  - `31%` Exact Score
  - `7+` Best Streak
- Button: `"View Details >"` — navigates to existing User Performance screen if available

> **TODO:** If no User Performance screen exists, disable the button and add:  
> `// TODO: create UserPerformanceScreen and wire navigation`  
> Use existing user stats hook for accuracy/streak data if available.

---

### 8b — Mini Leaderboard

**Component:** `MiniLeaderboard`

- Header: `"TOP 3 LEADERBOARD"` bold + `"View All >"` button
- Trophy illustration (flat 2D gold trophy icon) on the right side
- Three rows:

| Rank | Name | Points |
|---|---|---|
| 🥇 1 | Ahmed | 84 pts |
| 🥈 2 | Ali | 81 pts |
| 🥉 3 | Omar | 80 pts |

- Rank badge: colored circles (gold, silver, bronze) with rank number
- Points in `#C9DF6A`
- Use existing leaderboard hook/data
- Show skeleton placeholders while loading

> **TODO:** Use existing `useLeaderboard` hook (or equivalent).  
> If not found, mock the data and add `// TODO: connect to leaderboard hook`.

---

## Section 9 — Tournament Predictions

**Component:** `TournamentPredictions` (or reuse existing component name)

> ✅ **This is an EXISTING FEATURE — do NOT remove or break it.**  
> The Tournament Predictions system is already implemented in the app.  
> This section should be **preserved fully** — all existing logic, hooks, DB queries, and navigation must remain intact.

**Changes in this redesign:**
- **Move this section lower** on the Home screen (was previously higher — now it's last).
- Reason: Daily match actions (Pending Predictions, Today's Matches) are higher priority than long-term tournament questions.
- **Do not change any business logic, scoring, or data queries** — only reposition the section on the home screen.

Visual updates (apply only if they don't break existing logic):
- Each Tournament Prediction card should show:
  - Question title
  - Points value
  - Countdown to deadline
  - Status badge: `Open` (lime) / `Answered` (gray) / `Closed` (red)
- Cards should follow the same dark glass card style as the rest of the screen.
- If the existing card component is already styled, preserve it as-is.
- If the existing section has a `"View All"` or navigation button, keep it.

---

## Section 10 — Bottom Navigation

Keep existing navigation logic completely intact.

Visual improvements only:

- **Active tab:** icon and label both `#C9DF6A` (neon lime)
- **Inactive tabs:** icon and label `#555555` (gray)
- **Style:** floating glass bar — dark semi-transparent background (`rgba(13,13,13,0.95)`), subtle top border `rgba(201,223,106,0.2)`, `borderTopLeftRadius: 20`, `borderTopRightRadius: 20`
- **Elevation:** use `shadow` or `elevation` so it floats above content
- **Bottom padding:** ensure main `ScrollView` has enough `paddingBottom` to prevent content hiding behind the nav bar — use `useSafeAreaInsets` bottom value + nav height

Tabs: **Home · Matches · Predictions · Leaderboard · Profile**

---

## New Reusable Components Checklist

Create these as separate files in `components/home/` (or `components/` if that's the existing pattern):

| Component | File | Notes |
|---|---|---|
| `HomeKpiBar` | `HomeKpiBar.tsx` | 4-stat glass bar |
| `HeroBannerCarousel` | `HeroBannerCarousel.tsx` | Auto-scroll, pagination dots |
| `MyCardsPreview` | `MyCardsPreview.tsx` | 3 card types, mock data if needed |
| `NextMatchCountdown` | `NextMatchCountdown.tsx` | Live countdown, progress bar |
| `NextRewardCard` | `NextRewardCard.tsx` | Points progress, reward milestone |
| `MyTeamsMatches` | `MyTeamsMatches.tsx` | Horizontal scroll, mock if needed |
| `PendingPredictions` | `PendingPredictions.tsx` | Unpredicted upcoming matches |
| `TodayMatchesSection` | `TodayMatchesSection.tsx` | Horizontal scroll, badges |
| `PerformancePreview` | `PerformancePreview.tsx` | 3 stats + view details |
| `MiniLeaderboard` | `MiniLeaderboard.tsx` | Top 3, skeleton loading |
| `MatchCard` | `MatchCard.tsx` | Reused in Teams, Today, Pending |
| `MultiplierBadge` | `MultiplierBadge.tsx` | `x2`/`x3` badge, reused everywhere |
| `SectionHeader` | `SectionHeader.tsx` | Title + optional View All button |

> `TournamentPredictions` component already exists — **do not recreate it**.

---

## Flag Images

Use `flagcdn.com` for all team flags. Do not use emoji flags.

```typescript
// Flag image helper
const getFlagUrl = (countryCode: string) =>
  `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;

// Usage in Image component
<Image
  source={{ uri: getFlagUrl('eg') }}
  style={{ width: 40, height: 40, borderRadius: 999 }}
/>
```

Country codes follow ISO 3166-1 alpha-2 standard.  
Map team names to country codes in a `constants/countryCodes.ts` file if one doesn't already exist.

---

## TypeScript Requirements

- All new components must have fully typed `Props` interfaces.
- No `any` types.
- Use `FC<Props>` or typed function declarations.
- Supabase query results must be typed against existing DB types.

Example:
```typescript
interface HomeKpiBarProps {
  totalPoints: number;
  rank: number;
  rankPercentile?: string; // e.g. "Top 1%"
  predictions: number;
  dayStreak: number;
  isLoading?: boolean;
}
```

---

## Scrolling Strategy

```
Main container: <ScrollView>          ← single vertical scroll
  ├── Header
  ├── KPI Bar
  ├── Hero Carousel (ScrollView horizontal, pagingEnabled)
  ├── Three-card Row (flex-row, no scroll)
  ├── My Teams Matches (ScrollView horizontal)
  ├── Pending Predictions (plain View, max 3 rows)
  ├── Today's Matches (ScrollView horizontal)
  ├── Performance + Leaderboard Row (flex-row, no scroll)
  └── Tournament Predictions (existing component)
</ScrollView>
```

**Never** nest a vertical `FlatList` inside a `ScrollView`.  
Horizontal inner scrolls are fine and expected.

---

## Loading / Empty / Error States

Every new component must implement all three states:

```typescript
// Pattern to follow in every new component:

if (isLoading) {
  return <SkeletonPlaceholder />;  // Use MotiView from 'moti'
}

if (error) {
  return <ErrorFallback message="Could not load data" />;
}

if (!data || data.length === 0) {
  return <EmptyState message="No data available" />;
}

return <ActualComponent data={data} />;
```

---

## Summary of TODOs for Backend Integration

| # | Feature | TODO |
|---|---------|------|
| 1 | My Cards | `user_cards` table + `useUserCards` hook |
| 2 | Next Reward | `reward_milestones` table + `useRewards` hook |
| 3 | Favorite Teams | `user_favorite_teams` table + `useFavoriteTeams` hook |
| 4 | Golden Match | `is_golden` + `golden_multiplier` fields on `matches` table + admin toggle |
| 5 | Notifications | Notification system + unread badge count |
| 6 | User Performance Screen | Dedicated screen if not yet created |

All TODOs must be written as inline comments in the code:
```typescript
// TODO: [WC26] Connect to user_cards table — see HomeScreen Redesign Spec Section 4a
```

---

## Deliverables Expected from Codex

1. Updated Home screen file with all sections in correct order
2. All new component files listed in the checklist above
3. `MultiplierBadge`, `SectionHeader`, `MatchCard` shared components
4. `getFlagUrl` helper in constants or utils
5. No broken existing features
6. TypeScript passing with no new errors
7. Short summary comment at top of each new file listing what it does

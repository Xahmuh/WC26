# Codex Task — WC26 Home Screen Redesign

## Your Role
You are a senior React Native engineer working on the **No Budget World Cup 26** app.
Your task is to implement a full Home screen redesign based on two reference documents provided below.
Read everything carefully before writing a single line of code.

---

## Reference Documents
You have been given two MD files. Treat them as your single source of truth:

1. **WC26_HomeScreen_Redesign.md** — Full feature spec, section order, logic, TODOs
2. **WC26_UIKit.md** — Complete design system: colors, typography, spacing, components, code examples

Do NOT deviate from these documents. If something is unclear, follow the closest matching pattern in the UI Kit.

---

## Step 1 — Explore First, Code Second

Before writing any code, run the following and read the output carefully:

```bash
# Full project structure
find . -type f -name "*.tsx" -o -name "*.ts" | grep -v node_modules | grep -v .expo | sort

# Current home screen
find . -type f -name "*.tsx" | xargs grep -l "home\|Home\|index" | grep -v node_modules

# Existing components
ls components/ 2>/dev/null || find . -type d -name "components" | grep -v node_modules

# Existing hooks
find . -type f -name "use*.ts" -o -name "use*.tsx" | grep -v node_modules

# Existing constants
find . -type d -name "constants" | grep -v node_modules

# Check for existing UI Kit
find . -path "*/components/ui*" | grep -v node_modules

# Check for existing home components
find . -path "*/components/home*" | grep -v node_modules

# Check for existing assets
find . -path "*/assets/*" -name "*.png" | grep -v node_modules

# Check NativeWind config
cat tailwind.config.js 2>/dev/null || cat tailwind.config.ts 2>/dev/null

# Check existing types
find . -type f -name "*.types.ts" -o -name "types.ts" | grep -v node_modules | head -20

# Check Supabase tables referenced in hooks
grep -r "supabase\|from(" --include="*.ts" --include="*.tsx" -l | grep -v node_modules | head -20
```

---

## Step 2 — Identify Before Creating

After exploring, answer these questions internally before coding:

| Question | Action |
|---|---|
| Does `constants/colors.ts` exist? | If yes, extend it. If no, create it from UI Kit Section 1.1 |
| Does `constants/typography.ts` exist? | Same — extend or create |
| Does `components/ui/` folder exist? | If yes, check what's already there before creating |
| Does `MatchCard` component exist? | Reuse if yes, create from UI Kit Section 2.5 if no |
| Does `SectionHeader` exist? | Reuse if yes, create from UI Kit Section 2.2 if no |
| Does `TournamentPredictions` component exist? | **DO NOT recreate** — find it and reuse |
| What is the current home screen file path? | That's your main file to edit |
| Does `useUserStats` or similar hook exist? | Use it. If not, mock + TODO |
| Does `useLeaderboard` hook exist? | Use it. If not, mock + TODO |
| Does `useMatches` or match data hook exist? | Use it for countdown + today's matches |

---

## Step 3 — Implementation Order

Implement in this exact order. Complete each step fully before moving to the next.

### 3.1 — Constants & Tokens
Create or update:
- `constants/colors.ts` — from UI Kit Section 1.1
- `constants/typography.ts` — from UI Kit Section 1.2
- `constants/spacing.ts` — from UI Kit Section 1.3
- `constants/shadows.ts` — from UI Kit Section 1.4
- `constants/countryCodes.ts` — from UI Kit Section 4

Export everything from `constants/index.ts`.

---

### 3.2 — Base UI Components
Create in `components/ui/` (skip any that already exist):

| File | Source |
|---|---|
| `Card.tsx` | UI Kit Section 2.1 |
| `SectionHeader.tsx` | UI Kit Section 2.2 |
| `MultiplierBadge.tsx` | UI Kit Section 2.3 |
| `TeamFlag.tsx` | UI Kit Section 2.4 |
| `MatchCard.tsx` | UI Kit Section 2.5 |
| `ProgressBar.tsx` | UI Kit Section 2.6 |
| `StatusBadge.tsx` | UI Kit Section 2.7 |
| `SkeletonBox.tsx` | UI Kit Section 2.8 |
| `AvatarButton.tsx` | UI Kit Section 2.9 |
| `NotificationBell.tsx` | UI Kit Section 2.10 |

Also create:
- `ScrollArrowButton.tsx` — circular button with `›` arrow, used at end of horizontal scroll sections
- `CardTypeConfig.ts` — Joker/Sniper/Shield visual config (border colors, icon colors per card type)

Export all from `components/ui/index.ts`.

---

### 3.3 — Home Section Components
Create in `components/home/`:

#### `HomeKpiBar.tsx`
- 4 stats: Total Points, Rank, Predictions, Day Streak
- Dark glass card, lime border
- Vertical dividers between stats (height 40px, not full height)
- "Top 1%" sub-label under Rank only if percentile data exists
- Connect to existing user stats hook or mock + TODO
- Loading: 4 SkeletonBox items

#### `HeroBannerCarousel.tsx`
- Load `Hero-banner.png` from assets — find the actual path first
- Auto-scroll every 4 seconds
- Pagination dots: active = wider pill (20×8px) in lime, inactive = circle (8×8px) dimmed
- Height = `screenHeight * 0.25`, max 240px
- Lime border, borderRadius 16

#### `MyCardsPreview.tsx`
- 3 mini cards: JOKER (brown/gold border), SNIPER (lime border), SHIELD (blue border)
- Use `CardTypeConfig` for per-card styling
- Count badge `xN` bottom-right of each card
- "View All ›" button → navigate to cards screen (or TODO if screen doesn't exist)
- Helper text: "Use cards to boost your points!"
- `// TODO: [WC26] connect to user_cards table`

#### `NextMatchCountdown.tsx`
- Find nearest upcoming match from existing match hook
- Live countdown HH:MM:SS using `setInterval` — clear on unmount
- Progress bar (lime fill)
- CTA: "Make your prediction now!"
- Empty state: "No upcoming matches"

#### `NextRewardCard.tsx`
- Points progress: user current points / next milestone
- Lime progress bar
- Reward name in lime, subtitle in secondary
- `// TODO: [WC26] connect to reward_milestones table`

#### `MyTeamsMatches.tsx`
- Horizontal ScrollView of MatchCards
- `ScrollArrowButton` at end
- "Edit Teams" button in header
- Check for `useFavoriteTeams` hook — use if exists, mock + TODO if not
- `// TODO: [WC26] needs user_favorite_teams table`

#### `PendingPredictions.tsx`
- List rows (max 3 on home)
- Each row: flag + name · VS · flag + name · time · MultiplierBadge · chevron
- Subtle dividers between rows (not card backgrounds)
- Tap → navigate to prediction screen for that match
- Cross-reference matches (scheduled) with user's existing predictions
- Empty state: "You're all caught up! ✓" in lime

#### `TodayMatchesSection.tsx`
- Horizontal ScrollView of MatchCards
- Filter: only `status !== 'finished'` and `status !== 'completed'`
- Sort: oldest to newest by match_time
- Match of the Day card: gold border + gold badge
- Check `match.is_golden` and `match.is_match_of_day` with optional chaining
- `// TODO: [WC26] is_golden + golden_multiplier fields needed on matches table`

#### `PerformancePreview.tsx`
- Dark circle icon (52×52) with trending-up icon in lime
- 3 stats: Accuracy %, Exact Score %, Best Streak
- "YOUR PERFORMANCE" title in gold (`#FFD700`)
- "View Details ›" → navigate to performance screen or disable + TODO

#### `MiniLeaderboard.tsx`
- Top 3 rows with gold/silver/bronze circle badges
- Points in lime
- Trophy icon on right (with sparkle if animated is feasible)
- "View All ›" button
- Skeleton rows while loading
- Use existing leaderboard hook

---

### 3.4 — Update Home Screen File

Find the current home screen file and replace its content with the new layout.
**Preserve** any existing logic, hooks, and imports that are still needed.

Layout structure (strictly follow this order):

```tsx
<SafeAreaView style={{ flex: 1, backgroundColor: '#0D0D0D' }}>
  <ScrollView
    showsVerticalScrollIndicator={false}
    contentContainerStyle={{
      paddingHorizontal: 16,
      paddingBottom: bottomInset + 80, // clear floating nav
      gap: 24,
    }}
  >
    {/* 1. Header */}
    <HomeHeader />

    {/* 2. KPI Bar */}
    <HomeKpiBar />

    {/* 3. Hero Banner */}
    <HeroBannerCarousel />

    {/* 4. Three-card row */}
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <MyCardsPreview />
      <NextMatchCountdown />
      <NextRewardCard />
    </View>

    {/* 5. My Teams Matches */}
    <MyTeamsMatches />

    {/* 6. Pending Predictions */}
    <PendingPredictions />

    {/* 7. Today's Matches */}
    <TodayMatchesSection />

    {/* 8. Performance + Leaderboard row */}
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <PerformancePreview style={{ flex: 1 }} />
      <MiniLeaderboard style={{ flex: 1.4 }} />
    </View>

    {/* 9. Tournament Predictions — EXISTING FEATURE, DO NOT BREAK */}
    <TournamentPredictions />

  </ScrollView>
</SafeAreaView>
```

---

### 3.5 — Header Component (inline or separate)

```
Left:   AvatarButton → onPress navigate to profile
        Below: "⭐ Good Morning,"  (14px, #888)
               "Ahmed!"            (28px, white, weight 900)
               — use display_name from auth

Center: App logo image (find existing logo asset)
        Below: "BEAT THE KEEPER" (lime, 11px, bold, uppercase)

Right:  NotificationBell (44×44, dark card, lime dot if unread)
        // TODO: [WC26] wire up notification unread count
```

---

### 3.6 — Bottom Navigation

Find existing bottom nav / tab bar config.
Apply these style changes only — do NOT change navigation logic:

```
Background:          rgba(13, 13, 13, 0.97)
Border top:          1px solid rgba(201, 223, 106, 0.15)
borderTopLeftRadius: 20
borderTopRightRadius: 20
Active icon+label:   #C9DF6A
Inactive icon+label: #555555
```

---

## Step 4 — Quality Checks

After implementation, run:

```bash
# TypeScript check
npx tsc --noEmit

# If using Expo
npx expo export --dev 2>&1 | head -50
```

Fix any TypeScript errors introduced by your changes.
Do NOT fix pre-existing unrelated errors unless they block compilation.

---

## Step 5 — Deliver a Summary

After completing all changes, output a summary in this format:

```
## Changes Summary

### Modified Files
- [file path] — what changed

### New Files Created
- [file path] — what it does

### Hooks Used
- [hook name] — which component uses it

### TODOs Left (Backend Required)
- [TODO description] — which file + line

### Known Limitations
- [anything that couldn't be implemented and why]
```

---

## Absolute Rules — Never Break These

1. **Tournament Predictions** — existing feature, DO NOT touch its logic or data layer
2. **Auth flow** — DO NOT modify any auth-related files
3. **Scoring logic** — DO NOT modify points calculation
4. **Supabase queries** — DO NOT modify existing working queries
5. **No `any` types** — TypeScript strict mode throughout
6. **No vertical FlatList inside ScrollView** — causes React Native warnings
7. **No fake DB writes** — mock UI only, clearly marked TODO
8. **No emoji in UI** — use icon components or SVG icons only
9. **Flags from flagcdn.com only** — `https://flagcdn.com/w80/{code}.png`
10. **`useSafeAreaInsets`** — always use for bottom padding, never hardcode

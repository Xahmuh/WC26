# ClutchTime — Design System Documentation
**Version:** 1.0.0  
**Platform:** React Native  
**Style:** Dark Athletic Premium  
**Reverse-engineered from:** ClutchTime Sports Calendar Mobile App

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [File Structure](#file-structure)
3. [Color System](#color-system)
4. [Typography](#typography)
5. [Spacing System](#spacing-system)
6. [Border & Radius](#border--radius)
7. [Shadow & Elevation](#shadow--elevation)
8. [Components](#components)
9. [Bottom Navigation Bar](#bottom-navigation-bar)
10. [Animation](#animation)
11. [Setup & Installation](#setup--installation)
12. [Usage Examples](#usage-examples)

---

## Design Philosophy

**Dark Athletic Premium** — The UI language is built on deep black surfaces, restrained typography hierarchy, and a single electric accent (lime `#C8FF00`) that fires only at points of action and focus.

| Principle | Application |
|-----------|-------------|
| **Contrast-first** | All content sits on near-black backgrounds; legibility is never compromised |
| **Monochromatic with a single pop** | Everything is achromatic except `#C8FF00` (active) and `#E03030` (live) |
| **Data density** | Cards pack league, teams, scores, and time with no wasted whitespace |
| **Floating nav** | Bottom bar is a pill — not a full-width bar — giving content breathing room |
| **Live state** | Red border + pulsing dot + glow shadow = unmistakeable live signal |

---

## File Structure

```
clutchtime-ui-kit/
├── tokens/
│   ├── tokens.json        ← Design tokens (W3C format)
│   └── theme.ts           ← TypeScript theme (import in RN)
├── components/
│   ├── index.ts           ← Barrel export
│   ├── TopAppBar.tsx
│   ├── SportFilterTabs.tsx
│   ├── LeaguePillRow.tsx
│   ├── LiveScoreCard.tsx
│   ├── GameRowCard.tsx
│   ├── TimelineTabBar.tsx
│   └── FloatingBottomNav.tsx
└── DESIGN_SYSTEM.md       ← This file
```

---

## Color System

### Backgrounds (layered from deepest to highest)

| Token | HEX | Usage |
|-------|-----|-------|
| `bgDeep` | `#0D0D0D` | Status bar area, absolute deepest |
| `bgPrimary` | `#111111` | Main screen background |
| `bgSecondary` | `#1A1A1A` | Section backgrounds |
| `bgSurface` | `#222222` | Card and row surfaces |
| `bgElevated` | `#2A2A2A` | Elevated elements, badges |
| `bgHover` | `#333333` | Pressed / active states |

> **Rule:** Each layer is ~8-10 points lighter than the one below. Never jump more than 2 steps in a single UI region.

### Text

| Token | HEX | Usage |
|-------|-----|-------|
| `textPrimary` | `#FFFFFF` | Scores, times, main headlines |
| `textSecondary` | `#CCCCCC` | Team names, section labels |
| `textMuted` | `#888888` | Records, metadata, captions |
| `textDisabled` | `#555555` | Inactive tabs, placeholders |

### Accent Colors

| Token | HEX | When to use |
|-------|-----|-------------|
| `accentLime` | `#C8FF00` | Active pill, active nav dot, primary CTA |
| `accentLimeDark` | `#A0CC00` | Pressed state of lime elements |
| `liveRed` | `#E03030` | Live indicator dot, live card border |
| `liveRedBg` | `rgba(224,48,48,0.1)` | Live card tinted background |

> **Rule:** Lime appears ONLY on active/selected states. If something is not active, it gets no lime. This makes the accent feel deliberate and premium.

### Borders

| Token | HEX | Width | Usage |
|-------|-----|-------|-------|
| `borderSubtle` | `#2A2A2A` | 1px | Floating nav, very quiet dividers |
| `borderDefault` | `#3A3A3A` | 1px | Standard cards |
| `borderLive` | `#E03030` | 1.5px | Live score card |
| `borderActive` | `#FFFFFF` | 2px | Active timeline tab underline |

---

## Typography

### Font Family

- **iOS:** `-apple-system` resolves to **SF Pro Display** automatically — use as-is.
- **Android:** Add **DM Sans** (Google Fonts) as a custom font, or fall back to `Roboto`.

```ts
// iOS: no setup needed
// Android: add to android/app/src/main/assets/fonts/
// and wrap app with <Text> fontFamily override
```

### Scale

| Name | Size | Weight | Letter Spacing | Used for |
|------|------|--------|---------------|----------|
| `appName` | 24px | 800 | -0.5 | CLUTCHTIME wordmark |
| `score` | 28px | 800 | +0.05em | Live score digits |
| `time` | 18px | 800 | 0 | Upcoming game time |
| `h1` | 20px | 700 | 0 | Screen titles |
| `h2` | 16px | 700 | 0 | Section titles |
| `tab` | 13px | 600 | 0 | Sport filter, timeline tabs |
| `teamAbbr` | 13px | 700 | +0.02em | GSW, BOS, etc. |
| `body` | 14px | 400 | 0 | General text |
| `label` | 12px | 600 | 0 | Badges, chips |
| `caption` | 10px | 500 | 0 | League names, metadata |
| `micro` | 9px | 500 | 0 | Win-loss records |

> **Hierarchy rule:** Use weight (400 → 800) and color (disabled → primary) to create hierarchy — NOT font size changes. Most of the app lives between 9px–14px.

---

## Spacing System

Base unit: **4px**

| Token | Value | Primary use |
|-------|-------|-------------|
| `spacing[1]` | 4px | Icon gaps |
| `spacing[2]` | 8px | Tight inline gaps |
| `spacing[3]` | 12px | Component internal padding |
| `spacing[4]` | 16px | Card padding |
| `spacing[5]` | 20px | Section gap |
| `spacing[6]` | 24px | Horizontal screen gutters |
| `spacing[8]` | 32px | Section spacing |
| `spacing[12]` | 48px | Large layout gaps |

> **Screen horizontal gutter:** always `24px` (spacing[6]) on both sides.

---

## Border & Radius

### Radius Tokens

| Token | Value | Component |
|-------|-------|-----------|
| `xs` | 4px | Quarter badge, micro labels |
| `sm` | 8px | Input fields |
| `md` | 12px | Game row cards |
| `lg` | 14px | Live score card |
| `xl` | 16px | Large section cards |
| `pill` | 9999 | Sport tabs, nav bar, league pills |
| `full` | 50% | Avatar circles |

### Border Widths

| Context | Width |
|---------|-------|
| Default cards | 1px |
| Live card | 1.5px |
| Active tab underline | 2px |

---

## Shadow & Elevation

### Card Shadow
```js
shadowColor:   '#000000'
shadowOffset:  { width: 0, height: 2 }
shadowOpacity: 0.6
shadowRadius:  8
elevation:     6   // Android
```

### Floating Nav Shadow
```js
shadowColor:   '#000000'
shadowOffset:  { width: 0, height: 4 }
shadowOpacity: 0.8
shadowRadius:  24
elevation:     20  // Android
```

### Live Card Glow (iOS only)
```js
shadowColor:   '#E03030'
shadowOffset:  { width: 0, height: 0 }
shadowOpacity: 0.3
shadowRadius:  16
elevation:     8   // Android (no glow, just elevation)
```

> **Note:** Android `elevation` does not support colored shadows. On Android, the live card distinction relies on the red `borderColor` alone.

---

## Components

### 1. TopAppBar
- Logo: uppercase wordmark left, 24px/800
- Actions: search + bell icons right, 22px, `textSecondary`
- Notification dot: 8px red circle on bell, 2px white border
- Background: `bgPrimary` — no border, no shadow

### 2. SportFilterTabs
- Horizontal `ScrollView`, no scrollbar
- Pills: `borderRadius: pill`
- **Active:** bg `#C8FF00`, text `#111111`
- **Inactive:** bg `#252525`, border `#333`, text `#777`
- Padding: `16px horizontal / 6px vertical`

### 3. LeaguePillRow
- Horizontal `ScrollView`, 48×48 circles
- Logo image OR abbreviation text as fallback
- Border: 1px `#333`
- Label below: 9px, `textDisabled`

### 4. LiveScoreCard
- Border: **1.5px `#E03030`**
- Background: `#1E1E1E`
- Live dot: 6px red circle with `Animated.loop` opacity pulse
- Score: 28px/800, letterSpacing 0.05em
- Period badge: dark `#333` background, `xs` radius
- Horizontally swipeable via `FlatList` with `snapToInterval`

### 5. GameRowCard
- Background: `bgSurface`
- Three columns: home team | time + league | away team
- Time: 18px/800
- Team badge: 36px circle, team brand color bg
- Win-loss record: 9px/`textDisabled`

### 6. TimelineTabBar
- Flat text tabs, no background
- **Active:** white text + 2px white `borderBottomColor`
- **Inactive:** `textDisabled`, no border
- Full-width 1px `borderSubtle` bottom divider behind tabs

### 7. FloatingBottomNav ← See next section

---

## Bottom Navigation Bar

### Type: **Floating Pill** (NOT full-width)

```
┌────────────────────────────┐
│  [home] [cal] [♥] [user]   │   ← pill shape
└────────────────────────────┘
         centered, floating
```

### Exact Spec

| Property | Value |
|----------|-------|
| Type | Floating pill (position: absolute) |
| Background | `#1C1C1C` |
| Border | 1px `#2A2A2A` |
| Border radius | 32px |
| Shadow | 0 4px 24px rgba(0,0,0,0.8) |
| Padding H | 24px |
| Padding V | 10px |
| Icon gap | 28px |
| Icon size | 20px |
| Active icon color | `#FFFFFF` |
| Inactive icon color | `#555555` |
| Active indicator | 4px lime dot below icon |
| Bottom offset | safeAreaInsets.bottom + 16px |
| Blur | ❌ None — solid background |
| Labels | ❌ None visible |

### Active State
- Icon becomes white (filled variant)
- 4px `#C8FF00` dot appears below icon
- No background highlight on the icon itself

### Icons (L → R)
1. Home (home-outline / home)
2. Calendar (calendar-outline / calendar)
3. Favorites / Heart (heart-outline / heart)
4. Profile (person-outline / person)

---

## Animation

| Duration | Value | Use case |
|----------|-------|----------|
| `fast` | 150ms | Micro interactions, tab switches |
| `normal` | 250ms | Card transitions |
| `slow` | 400ms | Screen transitions |

### Recommended: Live dot pulse
```js
Animated.loop(
  Animated.sequence([
    Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
    Animated.timing(opacity, { toValue: 1.0, duration: 800, useNativeDriver: true }),
  ])
).start();
```

### Recommended: Nav icon press
```js
Animated.spring(scale, {
  toValue: 0.85,   // press in
  speed: 40,
  bounciness: 8,
  useNativeDriver: true,
}).start();
```

---

## Setup & Installation

### Dependencies
```bash
npm install react-native-safe-area-context
npm install react-native-vector-icons
# OR if using Expo:
npx expo install @expo/vector-icons
```

### Wrap your app
```tsx
// App.tsx
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  return (
    <SafeAreaProvider>
      {/* your navigator */}
    </SafeAreaProvider>
  );
}
```

### Android font (DM Sans)
```
android/app/src/main/assets/fonts/
  DMSans-Regular.ttf
  DMSans-SemiBold.ttf
  DMSans-Bold.ttf
  DMSans-ExtraBold.ttf
```
Then in `android/app/build.gradle`:
```gradle
apply from: "../../node_modules/react-native-vector-icons/fonts.gradle"
```

---

## Usage Examples

### Minimal screen using the full kit
```tsx
import React from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  TopAppBar,
  SportFilterTabs,
  LeaguePillRow,
  LiveScoreCard,
  TimelineTabBar,
  GameRowCard,
  FloatingBottomNav,
} from './components';
import theme from './tokens/theme';

const SPORTS    = [{ id: 'bball', label: 'Basketball' }, { id: 'football', label: 'Football' }];
const LEAGUES   = [{ id: 'ncaa', name: 'NCAA', abbreviation: 'NCAA', bgColor: '#1a3a6e', textColor: '#7ab0ff' }];
const LIVE_GAME = {
  id: '1', league: 'NBA Regular Season',
  homeTeam: { abbreviation: 'GSW', score: 1, wins: 30, losses: 10 },
  awayTeam: { abbreviation: 'BOS', score: 3, wins: 35, losses: 5 },
  period: '1st Quarter', clock: '08:34',
};
const GAMES = [
  { id: '2', league: 'NBA Regular Season', time: '7:30 AM',
    homeTeam: { abbreviation: 'MIL', wins: 24, losses: 36, bgColor: '#1E3A2A', textColor: '#4ADE80' },
    awayTeam: { abbreviation: 'BKN', wins: 20, losses: 41, bgColor: '#1A2A50', textColor: '#7EB0FF' } },
];

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <TopAppBar />
      <SportFilterTabs sports={SPORTS} />
      <LeaguePillRow items={LEAGUES} />

      <View style={styles.liveSection}>
        <LiveScoreCard game={LIVE_GAME} />
      </View>

      <TimelineTabBar />

      <FlatList
        data={GAMES}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => <GameRowCard game={item} />}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 120 }}
      />

      <FloatingBottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bgPrimary },
  liveSection: { marginVertical: theme.spacing[4] },
});
```

---

*Generated by ClutchTime Design System Extractor — v1.0.0*

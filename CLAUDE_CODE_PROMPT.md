# CLAUDE CODE — UI Kit Integration Prompt
# ClutchTime Design System → Your React Native App
# ================================================================
# INSTRUCTIONS FOR USE:
# 1. Copy everything between the === START === and === END === markers
# 2. Paste it as your first message to Claude Code
# 3. Replace the [PLACEHOLDERS] with your actual project info
# 4. Attach or reference the UI kit files when prompted
# ================================================================


=== START PROMPT ===

You are a senior React Native engineer performing a **non-breaking UI redesign** on an existing production app. Your task is to integrate a pre-built Design System UI Kit into the existing codebase — replacing styling and UI components screen by screen, without breaking any business logic, navigation, data fetching, or state management.

---

## CONTEXT

I have a React Native app at:
**Project root:** `[YOUR_PROJECT_ROOT_PATH]`
**Framework:** [Expo / React Native CLI]
**Navigation:** [React Navigation v6 / Expo Router]
**State management:** [Redux / Zustand / Context / None]
**Package manager:** [npm / yarn / bun]

I have a UI Kit already built. The files are located at:
```
[PATH_TO_UI_KIT]/
├── tokens/
│   ├── tokens.json       ← W3C design tokens
│   └── theme.ts          ← TypeScript theme (source of truth)
├── components/
│   ├── index.ts
│   ├── TopAppBar.tsx
│   ├── SportFilterTabs.tsx
│   ├── LeaguePillRow.tsx
│   ├── LiveScoreCard.tsx
│   ├── GameRowCard.tsx
│   ├── TimelineTabBar.tsx
│   └── FloatingBottomNav.tsx
└── DESIGN_SYSTEM.md      ← Full spec + rules
```

---

## YOUR MISSION

Integrate this design system into my app following these exact rules:

---

## RULE 1 — READ BEFORE TOUCHING ANYTHING

Before writing a single line of code:

1. Read `DESIGN_SYSTEM.md` completely
2. Read `tokens/theme.ts` completely
3. Run `find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | grep -v .git` to map all screens and components
4. Run `cat package.json` to understand current dependencies
5. List every screen and component you found, grouped by: screens / shared components / navigation
6. Identify which existing components overlap with the UI kit components
7. Report your findings to me BEFORE doing anything else

Do not proceed past step 7 until I confirm.

---

## RULE 2 — COPY UI KIT FILES FIRST (DO NOT MODIFY ORIGINALS)

Copy the entire UI kit into the project:

```bash
# Create design system directory
mkdir -p src/design-system/tokens
mkdir -p src/design-system/components

# Copy tokens
cp [PATH_TO_UI_KIT]/tokens/theme.ts    src/design-system/tokens/theme.ts
cp [PATH_TO_UI_KIT]/tokens/tokens.json src/design-system/tokens/tokens.json

# Copy all components
cp [PATH_TO_UI_KIT]/components/*.tsx src/design-system/components/
cp [PATH_TO_UI_KIT]/components/index.ts src/design-system/components/index.ts
```

Do NOT modify any of these copied files. Treat them as read-only source files.
All customizations happen in the consuming screens — never in the design system files.

---

## RULE 3 — INSTALL MISSING DEPENDENCIES SAFELY

Check what's missing before installing:

```bash
cat package.json | grep -E "safe-area|vector-icons|reanimated|gesture-handler"
```

Only install what is NOT already present:

```bash
# If using Expo:
npx expo install react-native-safe-area-context react-native-reanimated

# If using bare React Native:
npm install react-native-safe-area-context react-native-reanimated react-native-gesture-handler
npx react-native link react-native-vector-icons
```

For icons — check what icon library already exists in the project:
```bash
cat package.json | grep -i icon
```
- If `@expo/vector-icons` exists → use it, do NOT install another
- If `react-native-vector-icons` exists → use it
- If neither → install `@expo/vector-icons` for Expo, `react-native-vector-icons` for bare RN

After installing, verify the app still compiles before continuing:
```bash
# Expo:
npx expo start --clear
# Bare RN:
npx react-native start --reset-cache
```

---

## RULE 4 — INTEGRATION STRATEGY (SCREEN BY SCREEN)

Apply changes ONE SCREEN AT A TIME. Do not touch multiple screens in a single step.

For each screen follow this exact sequence:

### Step A — Audit the screen
Read the entire screen file. List:
- Current colors used (hardcoded hex, StyleSheet values)
- Current font sizes and weights
- Current spacing values
- Navigation structure (headers, tabs, bottom bar)
- Data props flowing into UI components
- Any inline styles vs StyleSheet.create

### Step B — Map to design system
Match every existing visual element to a token or component:
- Colors → `theme.colors.*`
- Spacing → `theme.spacing[n]`
- Font size → `theme.fontSize.*`
- Font weight → `theme.fontWeight.*`
- Border radius → `theme.radius.*`
- Shadows → `theme.shadow.*`

Create this mapping table in a comment block at the top of your changes:
```
// DESIGN SYSTEM MIGRATION
// Old color #1A1A2E → theme.colors.bgPrimary (#111111)
// Old fontSize 16 → theme.fontSize.h2
// Old borderRadius 10 → theme.radius.md (12)
```

### Step C — Replace components (non-breaking)
When replacing a UI component with a design system component:

1. Keep ALL existing props flowing through — never drop data props
2. Keep ALL existing event handlers (onPress, onScroll, etc.)
3. Keep ALL existing navigation calls untouched
4. Only change the visual/styling layer
5. If a design system component doesn't accept the exact same props as the original, create a WRAPPER component that adapts the props — never modify the design system file

Example wrapper pattern:
```tsx
// src/screens/HomeScreen/components/HomeGameCard.tsx
// Wrapper that adapts existing app props to GameRowCard design system component

import GameRowCard from '@/design-system/components/GameRowCard';
import { Match } from '@/types/Match'; // your existing types

interface HomeGameCardProps {
  match: Match; // your existing data shape
  onPress: (matchId: string) => void;
}

export default function HomeGameCard({ match, onPress }: HomeGameCardProps) {
  // Adapt your data shape → design system shape
  const gameData = {
    id: match.id,
    league: match.competition.name,
    time: match.kickoffTime,
    homeTeam: {
      abbreviation: match.homeTeam.shortName,
      wins: match.homeTeam.wins,
      losses: match.homeTeam.losses,
      bgColor: match.homeTeam.primaryColor,
      textColor: match.homeTeam.textColor,
    },
    awayTeam: {
      abbreviation: match.awayTeam.shortName,
      wins: match.awayTeam.wins,
      losses: match.awayTeam.losses,
      bgColor: match.awayTeam.primaryColor,
      textColor: match.awayTeam.textColor,
    },
  };

  return <GameRowCard game={gameData} onPress={onPress} />;
}
```

### Step D — Update StyleSheet only
For elements NOT covered by design system components, update their StyleSheet values using theme tokens. Replace hardcoded values:

```tsx
// BEFORE
const styles = StyleSheet.create({
  container: { backgroundColor: '#0f0f1a', padding: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff' },
});

// AFTER
import theme from '@/design-system/tokens/theme';
const styles = StyleSheet.create({
  container: { backgroundColor: theme.colors.bgPrimary, padding: theme.spacing[5] },
  title: { fontSize: theme.fontSize.h1, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
});
```

### Step E — Verify after each screen
After changing each screen:
```bash
# Check TypeScript errors
npx tsc --noEmit

# Check for runtime errors (Expo)
npx expo start --clear

# Confirm no import errors
grep -r "from '@/design-system'" src/ --include="*.tsx"
```

Only move to the next screen when the current screen compiles clean.

---

## RULE 5 — BOTTOM NAVIGATION (CRITICAL — READ CAREFULLY)

The existing bottom navigation must be replaced with FloatingBottomNav. This is the most sensitive change.

### Before changing navigation:
```bash
# Find ALL navigation-related files
find . -name "*.tsx" | xargs grep -l "TabNavigator\|BottomTab\|tabBarStyle\|tabBar" | grep -v node_modules
```

### Replacement strategy:
1. In the Tab.Navigator, set `tabBar={() => null}` to hide the existing bar
2. Wrap the root screen in a `View` with `flex: 1`
3. Render `FloatingBottomNav` OUTSIDE the navigator, in the root layout
4. Pass the navigation object to `FloatingBottomNav` via `onTabPress`

```tsx
// PATTERN for React Navigation v6
function RootLayout() {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        tabBar={() => null}              // ← hides default bar
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="home" component={HomeScreen} />
        <Tab.Screen name="calendar" component={CalendarScreen} />
        <Tab.Screen name="favorites" component={FavoritesScreen} />
        <Tab.Screen name="profile" component={ProfileScreen} />
      </Tab.Navigator>
      <FloatingBottomNav
        activeTab={activeTab}
        onTabPress={(id) => {
          setActiveTab(id);
          // navigation.navigate(id); ← wire to your navigator
        }}
      />
    </View>
  );
}
```

5. Add `paddingBottom: 90` to every screen's ScrollView/FlatList contentContainerStyle so content isn't hidden behind the nav

---

## RULE 6 — DO NOT BREAK THESE (NON-NEGOTIABLE)

These must never be touched:
- ❌ API calls / fetch / axios / service files
- ❌ State management (Redux slices, Zustand stores, Context providers)
- ❌ Custom hooks (`use*`)
- ❌ Type definitions / interfaces
- ❌ Navigation route names and params
- ❌ Authentication / auth flow
- ❌ Any `useEffect` that fetches data
- ❌ Permission handling (camera, location, notifications)
- ❌ Push notification setup
- ❌ Deep linking configuration

If a file contains ONLY styling (no logic), it is safe to fully replace.
If a file contains MIXED logic and styling, only change the StyleSheet values — never the logic.

---

## RULE 7 — PATH ALIASES

Set up path aliases so imports are clean:

Add to `tsconfig.json`:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/design-system/*": ["src/design-system/*"],
      "@/design-system/tokens": ["src/design-system/tokens/theme.ts"],
      "@/design-system/components": ["src/design-system/components/index.ts"]
    }
  }
}
```

If using Expo, also add to `babel.config.js`:
```js
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module-resolver', {
        root: ['./'],
        alias: {
          '@/design-system': './src/design-system',
        }
      }]
    ]
  };
};
```

Install `babel-plugin-module-resolver` if not present:
```bash
npm install --save-dev babel-plugin-module-resolver
```

---

## RULE 8 — DARK THEME GLOBAL SETUP

Set the app background color globally so no white flash appears during navigation:

```tsx
// In your root _layout.tsx or App.tsx
import { View, StatusBar } from 'react-native';
import theme from '@/design-system/tokens/theme';

// Wrap everything:
<View style={{ flex: 1, backgroundColor: theme.colors.bgPrimary }}>
  <StatusBar barStyle="light-content" backgroundColor={theme.colors.bgDeep} />
  {/* your navigator */}
</View>
```

---

## RULE 9 — ICON LIBRARY ADAPTER

After you identify the existing icon library, create ONE adapter file so all components use a unified icon interface:

```tsx
// src/design-system/components/Icon.tsx
// Adapter — edit this file to match your icon library

import React from 'react';
// Option A — Expo:
import { Ionicons } from '@expo/vector-icons';
// Option B — react-native-vector-icons:
// import Ionicons from 'react-native-vector-icons/Ionicons';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
}

export default function Icon({ name, size = 20, color = '#fff' }: IconProps) {
  return <Ionicons name={name as any} size={size} color={color} />;
}
```

Then update `FloatingBottomNav.tsx` and `TopAppBar.tsx` to use this adapter.

---

## EXECUTION ORDER

Apply changes in this exact order — do NOT skip steps:

1. ✅ Read all files + audit (Rule 1)
2. ✅ Copy UI kit files (Rule 2)
3. ✅ Install dependencies (Rule 3)
4. ✅ Set up path aliases (Rule 7)
5. ✅ Set up icon adapter (Rule 9)
6. ✅ Apply global dark theme (Rule 8)
7. ✅ Compile check — fix any TypeScript errors before continuing
8. ✅ Replace bottom navigation (Rule 5)
9. ✅ Compile check
10. ✅ Apply design system to HomeScreen (Rule 4)
11. ✅ Compile check
12. ✅ Apply to remaining screens one by one (Rule 4)
13. ✅ Final compile + full TypeScript check

After completing all steps, give me:
- A summary of every file changed
- A list of any hardcoded values you could NOT replace (and why)
- Any warnings or potential runtime issues
- The final `npx tsc --noEmit` output

---

## FINAL REMINDER

- Read first, code second
- One screen at a time
- Never break logic to fix styling
- When in doubt, wrap — don't modify
- Ask me before making any structural/architecture change

=== END PROMPT ===

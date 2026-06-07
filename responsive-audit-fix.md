# CURSOR PROMPT — RESPONSIVE LAYOUT AUDIT & FIX

You are a senior React Native Web engineer.
Your job is to audit ALL screens in this project for responsive layout issues
and fix every problem you find — without breaking mobile layout.

---

## CONTEXT

- Framework: React Native (with Web support via Expo)
- Styling: Custom UI Kit (scan components folder to understand it)
- Target: The app must work correctly on:
  - Mobile: 375px – 430px
  - Tablet: 768px – 1024px
  - Desktop Web: 1280px – 1920px

---

## PHASE 1 — DISCOVERY (read before touching anything)

### 1A — Scan project structure
Locate and list all screen files. They are typically in:
- `app/` (Expo Router)
- `screens/`
- `src/screens/`

List every screen file you find.

### 1B — Scan UI Kit
Locate the custom UI Kit components in:
- `components/ui/`
- `components/`
- `src/components/`

Understand how these are used: Card, Grid, Stack, Text, Button, etc.

### 1C — Understand current layout primitives
Check how the project currently handles layout:
- Is `useWindowDimensions()` used anywhere?
- Is there a `breakpoints` utility or hook?
- Is `Platform.OS === 'web'` used anywhere?
- Is there a `maxWidth` container pattern?

Document what you find before making any changes.

---

## PHASE 2 — AUDIT

Go through EVERY screen file one by one.
For each screen, check for these issues:

### Issue Checklist per Screen

| # | Issue | What to look for |
|---|-------|-----------------|
| 1 | **Fixed widths** | `width: 360`, `width: '100%'` without maxWidth |
| 2 | **Fixed heights on cards** | `height: 120` that causes overflow on web |
| 3 | **No max-width container** | Full-bleed layouts that stretch to 1920px |
| 4 | **Hardcoded columns** | `numColumns={2}` in FlatList without web adaptation |
| 5 | **Font sizes not scaling** | Fixed `fontSize: 14` with no web variant |
| 6 | **Horizontal overflow** | Row layouts that don't wrap on small screens |
| 7 | **Missing scroll** | Screens without `ScrollView` on web |
| 8 | **Touch targets too small** | Buttons/pressables under 44px height |
| 9 | **Images not responsive** | `width: 100, height: 100` fixed instead of aspect ratio |
| 10 | **Absolute positioning breaking** | Elements positioned off-screen on web |

Create a report in this format before fixing:

```
SCREEN: MatchListScreen
FILE: app/(tabs)/matches.tsx
ISSUES FOUND:
  - Fixed width 360 on card container (line 45)
  - numColumns={2} hardcoded in FlatList (line 78)
  - No maxWidth container (entire screen)
SEVERITY: HIGH
```

---

## PHASE 3 — FIX STRATEGY

Apply fixes using this approach:

### 3A — Create a responsive hook (if not already exists)

Create `hooks/useResponsive.ts`:

```typescript
import { useWindowDimensions } from 'react-native';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export function useResponsive() {
  const { width } = useWindowDimensions();

  const breakpoint: Breakpoint =
    width >= 1280 ? 'desktop' :
    width >= 768  ? 'tablet'  :
                    'mobile';

  const isMobile  = breakpoint === 'mobile';
  const isTablet  = breakpoint === 'tablet';
  const isDesktop = breakpoint === 'desktop';

  const columns = isDesktop ? 4 : isTablet ? 3 : 2;

  const containerMaxWidth = isDesktop ? 1200 : isTablet ? 768 : width;

  return {
    width,
    breakpoint,
    isMobile,
    isTablet,
    isDesktop,
    columns,
    containerMaxWidth,
  };
}
```

### 3B — Create a centered container component (if not already exists)

Create `components/ui/Container.tsx`:

```typescript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useResponsive } from '@/hooks/useResponsive';

interface ContainerProps {
  children: React.ReactNode;
  style?: object;
}

export function Container({ children, style }: ContainerProps) {
  const { containerMaxWidth } = useResponsive();

  return (
    <View style={[styles.wrapper, style]}>
      <View style={[styles.inner, { maxWidth: containerMaxWidth }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },
  inner: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 16,
  },
});
```

### 3C — Fix FlatList column counts

Replace hardcoded `numColumns` with responsive value:

```typescript
// BEFORE
<FlatList numColumns={2} ... />

// AFTER
const { columns } = useResponsive();
<FlatList
  key={columns} // required when numColumns changes
  numColumns={columns}
  ...
/>
```

### 3D — Fix card widths

Replace fixed widths with flex-based responsive widths:

```typescript
// BEFORE
const styles = StyleSheet.create({
  card: { width: 160, height: 120 }
});

// AFTER
const { columns, width: windowWidth } = useResponsive();
const cardWidth = (windowWidth - 32 - (columns - 1) * 12) / columns;

// In StyleSheet:
card: {
  flex: 1,
  minHeight: 100,
}
```

### 3E — Wrap screens with Container

For every screen that lacks a max-width container:

```typescript
// BEFORE
<ScrollView>
  <View style={styles.content}>
    ...
  </View>
</ScrollView>

// AFTER
import { Container } from '@/components/ui/Container';

<ScrollView>
  <Container>
    ...
  </Container>
</ScrollView>
```

### 3F — Fix font sizes for web

```typescript
import { Platform } from 'react-native';

// Instead of fixed fontSize
fontSize: Platform.select({ web: 16, default: 14 })

// Or use the responsive hook
const { isDesktop } = useResponsive();
fontSize: isDesktop ? 16 : 14
```

---

## PHASE 4 — VERIFICATION CHECKLIST

After all fixes, verify each screen:

- [ ] No horizontal scroll on any screen at 375px width
- [ ] No elements cut off or overflowing at 768px
- [ ] Cards are evenly sized in grid at all breakpoints
- [ ] Text is readable (min 14px) at all sizes
- [ ] Buttons are tappable (min 44px height) at all sizes
- [ ] Max-width container centers content on desktop
- [ ] FlatList reflows correctly when columns change
- [ ] No broken images (all use aspectRatio or responsive dimensions)
- [ ] ScrollView present on all long screens on web

---

## RULES

- Do NOT break existing mobile layout — 375px must still work perfectly
- Do NOT change any business logic, data fetching, or state management
- Do NOT modify Supabase queries or authentication
- Do NOT change the UI Kit component internals — only how they are used
- Do NOT change colors, fonts, or design tokens
- Use `useWindowDimensions()` for all dynamic sizing — NOT hardcoded breakpoints
- If a screen already handles responsive correctly — leave it untouched
- One fix at a time per screen — do not batch multiple screens in one edit

---

## DELIVERABLE

After all fixes are applied, output a summary table:

```
| Screen          | Issues Found | Fixed | Notes                        |
|-----------------|-------------|-------|------------------------------|
| HomeScreen      | 3           | 3     | Added Container, fixed cols  |
| ProfileScreen   | 1           | 1     | Added maxWidth               |
| MatchListScreen | 4           | 4     | Responsive FlatList + cards  |
| KpiScreen       | 2           | 2     | Fixed card widths            |
```

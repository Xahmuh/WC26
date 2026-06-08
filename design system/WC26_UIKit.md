# WC26 — UI Kit & Design System
**Project:** No Budget World Cup 26  
**Extracted from:** Home Screen Reference Design  
**Stack:** React Native · NativeWind v4 · Expo SDK 56

---

## 1. Design Tokens

### 1.1 Color Palette

```typescript
// constants/colors.ts

export const Colors = {
  // Backgrounds
  background: {
    primary:   '#0D0D0D',   // Main screen background — near black
    card:      '#141414',   // Default card background
    cardAlt:   '#1A1A1A',   // Slightly lighter card (mini cards, rows)
    elevated:  '#1E1E1E',   // Elevated surfaces (modals, bottom sheet)
    overlay:   'rgba(0, 0, 0, 0.6)',
  },

  // Accent — Primary
  accent: {
    lime:      '#C9DF6A',   // Primary neon lime — CTA, active, borders, badges
    limeLight: 'rgba(201, 223, 106, 0.15)', // Lime fill (glass tint)
    limeBorder:'rgba(201, 223, 106, 0.3)',  // Lime border (cards)
    limeDim:   'rgba(201, 223, 106, 0.6)',  // Lime dimmed (inactive dots)
  },

  // Accent — Secondary
  gold:        '#FFD700',   // Trophy, rank, match-of-day badge
  goldDim:     '#C8A800',   // Darker gold
  red:         '#E03030',   // Live badge, error, closed status
  redDim:      '#991F1F',   // Darker red
  blue:        '#1A3A8F',   // Royal blue — secondary accent, flags bg
  blueDim:     '#0E2260',

  // Text
  text: {
    primary:   '#FFFFFF',   // Main text
    secondary: '#888888',   // Subtitles, labels, captions
    tertiary:  '#555555',   // Inactive nav, placeholders
    accent:    '#C9DF6A',   // Lime text — links, values, CTA
    gold:      '#FFD700',   // Gold text — performance section title
    muted:     '#444444',   // Disabled state
  },

  // Borders
  border: {
    default:   'rgba(201, 223, 106, 0.25)', // Standard card border
    active:    '#C9DF6A',                   // Active / highlighted border
    subtle:    'rgba(255, 255, 255, 0.07)', // Very subtle divider
    divider:   'rgba(255, 255, 255, 0.1)',  // Section divider
  },

  // Status
  status: {
    open:      '#C9DF6A',   // Open prediction — lime
    answered:  '#888888',   // Answered — gray
    closed:    '#E03030',   // Closed — red
    live:      '#E03030',   // Live match — red
    upcoming:  '#C9DF6A',   // Upcoming — lime
    finished:  '#555555',   // Finished — dark gray
  },

  // Multiplier Badges
  multiplier: {
    background: '#0D0D0D',
    border:     '#C9DF6A',
    text:       '#C9DF6A',
  },
} as const;
```

---

### 1.2 Typography

```typescript
// constants/typography.ts

export const Typography = {
  // Font families
  // Use your project's loaded fonts — map to these roles:
  fontFamily: {
    heading:  'System',       // Bold/Black weight — replace with project heading font
    body:     'System',       // Regular weight — replace with project body font
    mono:     'monospace',    // Countdown numbers
  },

  // Font sizes
  size: {
    xs:   10,   // Labels, badges, tiny captions
    sm:   12,   // Secondary labels, subtitles
    base: 14,   // Body text, card content
    md:   16,   // Section headers, card titles
    lg:   18,   // Large labels
    xl:   24,   // KPI values (points, predictions)
    xxl:  28,   // Primary KPI number (total points)
    hero: 36,   // Countdown numbers
  },

  // Font weights
  weight: {
    regular: '400',
    medium:  '500',
    bold:    '700',
    black:   '900',
  },

  // Line heights
  lineHeight: {
    tight:  1.1,
    normal: 1.4,
    loose:  1.7,
  },
} as const;
```

---

### 1.3 Spacing & Layout

```typescript
// constants/spacing.ts

export const Spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  base: 16,   // Standard horizontal screen padding
  lg:   20,
  xl:   24,   // Standard between-section gap
  xxl:  32,
  xxxl: 48,
} as const;

export const Layout = {
  screenPaddingH:   16,   // Horizontal screen padding
  sectionGap:       24,   // Gap between home sections
  cardPaddingH:     16,   // Card internal horizontal padding
  cardPaddingV:     14,   // Card internal vertical padding
  cardGap:          10,   // Gap between cards in a row
  borderRadius: {
    sm:   8,
    md:   12,
    lg:   16,   // Standard card radius
    xl:   20,   // Large cards, bottom nav
    full: 999,  // Pills, circular elements
  },
} as const;
```

---

### 1.4 Shadows & Elevation

```typescript
// constants/shadows.ts
import { Platform } from 'react-native';

export const Shadows = {
  card: Platform.select({
    ios: {
      shadowColor: '#C9DF6A',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    android: {
      elevation: 4,
    },
  }),

  cardStrong: Platform.select({
    ios: {
      shadowColor: '#C9DF6A',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
    },
    android: {
      elevation: 8,
    },
  }),

  bottomNav: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
    },
    android: {
      elevation: 16,
    },
  }),
} as const;
```

---

## 2. Base Components

### 2.1 Card — Base Glass Card

```typescript
// components/ui/Card.tsx

import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { Colors, Layout } from '@/constants';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'accent';
  padding?: number;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'default',
  padding = Layout.cardPaddingH,
}) => {
  return (
    <View style={[styles.base, styles[variant], { padding }, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.background.card,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border.default,
    overflow: 'hidden',
  },
  default: {},
  elevated: {
    backgroundColor: Colors.background.elevated,
    borderColor: Colors.border.active,
  },
  accent: {
    backgroundColor: Colors.background.card,
    borderColor: Colors.accent.lime,
    borderWidth: 1.5,
  },
});
```

---

### 2.2 SectionHeader

```typescript
// components/ui/SectionHeader.tsx

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Typography } from '@/constants';

interface SectionHeaderProps {
  title: string;
  badge?: number;           // Count badge e.g. "3"
  onViewAll?: () => void;
  rightContent?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  badge,
  onViewAll,
  rightContent,
}) => (
  <View style={styles.container}>
    <View style={styles.left}>
      <Text style={styles.title}>{title}</Text>
      {badge !== undefined && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </View>
    {rightContent ?? (
      onViewAll && (
        <TouchableOpacity onPress={onViewAll} style={styles.viewAll}>
          <Text style={styles.viewAllText}>View All ›</Text>
        </TouchableOpacity>
      )
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: Colors.text.primary,
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  badge: {
    backgroundColor: Colors.accent.lime,
    borderRadius: Layout.borderRadius.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#000',
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
  },
  viewAll: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  viewAllText: {
    color: Colors.accent.lime,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.medium,
  },
});
```

---

### 2.3 MultiplierBadge

```typescript
// components/ui/MultiplierBadge.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Layout } from '@/constants';

interface MultiplierBadgeProps {
  value: number;   // e.g. 2 → shows "x2"
  size?: 'sm' | 'md';
}

export const MultiplierBadge: React.FC<MultiplierBadgeProps> = ({
  value,
  size = 'md',
}) => (
  <View style={[styles.container, size === 'sm' && styles.sm]}>
    <Text style={[styles.text, size === 'sm' && styles.textSm]}>
      x{value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    borderWidth: 1.5,
    borderColor: Colors.accent.lime,
    borderRadius: Layout.borderRadius.sm,
    backgroundColor: Colors.background.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sm: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  text: {
    color: Colors.accent.lime,
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.5,
  },
  textSm: {
    fontSize: Typography.size.xs,
  },
});
```

---

### 2.4 TeamFlag

```typescript
// components/ui/TeamFlag.tsx

import React from 'react';
import { Image, View, StyleSheet } from 'react-native';

interface TeamFlagProps {
  countryCode: string;   // ISO 3166-1 alpha-2 e.g. 'eg', 'br', 'de'
  size?: number;         // Default 40
}

export const TeamFlag: React.FC<TeamFlagProps> = ({
  countryCode,
  size = 40,
}) => (
  <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
    <Image
      source={{ uri: `https://flagcdn.com/w80/${countryCode.toLowerCase()}.png` }}
      style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
      resizeMode="cover"
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
```

---

### 2.5 MatchCard

```typescript
// components/ui/MatchCard.tsx

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { TeamFlag } from './TeamFlag';
import { MultiplierBadge } from './MultiplierBadge';
import { Colors, Typography, Layout } from '@/constants';

interface MatchCardProps {
  homeTeam: { name: string; countryCode: string };
  awayTeam: { name: string; countryCode: string };
  matchTime: string;          // Formatted string e.g. "Today · 17:00"
  multiplier?: number;        // e.g. 2
  isMatchOfDay?: boolean;
  isGolden?: boolean;
  isFavorite?: boolean;
  onPress?: () => void;
  onFavoritePress?: () => void;
  width?: number;             // Fixed width for horizontal scroll cards
}

export const MatchCard: React.FC<MatchCardProps> = ({
  homeTeam,
  awayTeam,
  matchTime,
  multiplier,
  isMatchOfDay,
  isGolden,
  isFavorite,
  onPress,
  onFavoritePress,
  width = 200,
}) => {
  const showGoldenBadge = isMatchOfDay || isGolden;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.container,
        { width },
        showGoldenBadge && styles.goldenBorder,
      ]}
      activeOpacity={0.8}
    >
      {showGoldenBadge && (
        <View style={styles.goldenBadge}>
          <Text style={styles.goldenBadgeText}>⭐ MATCH OF THE DAY</Text>
        </View>
      )}

      {/* Favorite star */}
      <TouchableOpacity style={styles.favoriteBtn} onPress={onFavoritePress}>
        <Text style={{ color: isFavorite ? Colors.gold : Colors.text.tertiary, fontSize: 16 }}>
          {isFavorite ? '★' : '☆'}
        </Text>
      </TouchableOpacity>

      {/* Teams row */}
      <View style={styles.teamsRow}>
        <View style={styles.team}>
          <TeamFlag countryCode={homeTeam.countryCode} size={44} />
          <Text style={styles.teamName} numberOfLines={1}>{homeTeam.name}</Text>
        </View>
        <Text style={styles.vs}>VS</Text>
        <View style={styles.team}>
          <TeamFlag countryCode={awayTeam.countryCode} size={44} />
          <Text style={styles.teamName} numberOfLines={1}>{awayTeam.name}</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.matchTime}>{matchTime}</Text>
        {multiplier && <MultiplierBadge value={multiplier} size="sm" />}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background.card,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: 12,
    marginRight: 10,
  },
  goldenBorder: {
    borderColor: Colors.gold,
    borderWidth: 1.5,
  },
  goldenBadge: {
    backgroundColor: Colors.gold,
    borderRadius: Layout.borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  goldenBadgeText: {
    color: '#000',
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
  },
  favoriteBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingTop: 4,
  },
  team: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  teamName: {
    color: Colors.text.primary,
    fontSize: Typography.size.sm,
    textAlign: 'center',
    fontWeight: Typography.weight.medium,
  },
  vs: {
    color: Colors.text.secondary,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    marginHorizontal: 6,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  matchTime: {
    color: Colors.text.secondary,
    fontSize: Typography.size.xs,
  },
});
```

---

### 2.6 ProgressBar

```typescript
// components/ui/ProgressBar.tsx

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Layout } from '@/constants';

interface ProgressBarProps {
  progress: number;      // 0 to 1
  height?: number;
  color?: string;
  backgroundColor?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height = 6,
  color = Colors.accent.lime,
  backgroundColor = 'rgba(255,255,255,0.1)',
}) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 1);

  return (
    <View style={[styles.track, { height, backgroundColor, borderRadius: height / 2 }]}>
      <View
        style={[
          styles.fill,
          {
            width: `${clampedProgress * 100}%`,
            height,
            backgroundColor: color,
            borderRadius: height / 2,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {},
});
```

---

### 2.7 StatusBadge

```typescript
// components/ui/StatusBadge.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Layout } from '@/constants';

type StatusType = 'open' | 'answered' | 'closed' | 'live' | 'upcoming' | 'finished';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
}

const STATUS_CONFIG: Record<StatusType, { bg: string; text: string; label: string }> = {
  open:     { bg: Colors.accent.limeLight, text: Colors.accent.lime, label: 'Open' },
  answered: { bg: 'rgba(136,136,136,0.15)', text: Colors.text.secondary, label: 'Answered' },
  closed:   { bg: 'rgba(224,48,48,0.15)',   text: Colors.red,          label: 'Closed' },
  live:     { bg: 'rgba(224,48,48,0.15)',   text: Colors.red,          label: 'LIVE' },
  upcoming: { bg: Colors.accent.limeLight,  text: Colors.accent.lime,  label: 'Upcoming' },
  finished: { bg: 'rgba(85,85,85,0.2)',     text: Colors.text.tertiary,label: 'Finished' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const config = STATUS_CONFIG[status];
  return (
    <View style={[styles.container, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.text }]}>
        {label ?? config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Layout.borderRadius.sm,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
```

---

### 2.8 SkeletonBox

```typescript
// components/ui/SkeletonBox.tsx
// Uses MotiView from 'moti' — already available in Expo

import React from 'react';
import { MotiView } from 'moti';
import { ViewStyle } from 'react-native';

interface SkeletonBoxProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const SkeletonBox: React.FC<SkeletonBoxProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}) => (
  <MotiView
    from={{ opacity: 0.3 }}
    animate={{ opacity: 0.7 }}
    transition={{ type: 'timing', duration: 800, loop: true }}
    style={[
      {
        width,
        height,
        borderRadius,
        backgroundColor: '#2A2A2A',
      },
      style,
    ]}
  />
);
```

---

### 2.9 AvatarButton

```typescript
// components/ui/AvatarButton.tsx

import React from 'react';
import { TouchableOpacity, Text, Image, StyleSheet } from 'react-native';
import { Colors, Typography } from '@/constants';

interface AvatarButtonProps {
  displayName?: string;
  avatarUrl?: string;
  size?: number;
  onPress?: () => void;
}

export const AvatarButton: React.FC<AvatarButtonProps> = ({
  displayName,
  avatarUrl,
  size = 40,
  onPress,
}) => {
  const initial = displayName?.charAt(0).toUpperCase() ?? '?';

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
      activeOpacity={0.8}
    >
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      ) : (
        <Text style={styles.initial}>{initial}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.accent.lime,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initial: {
    color: '#000',
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.black,
  },
});
```

---

### 2.10 NotificationBell

```typescript
// components/ui/NotificationBell.tsx

import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Colors, Layout } from '@/constants';
// Use your project's icon library — replace with actual icon component

interface NotificationBellProps {
  hasUnread?: boolean;
  onPress?: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  hasUnread = false,
  onPress,
}) => (
  <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
    {/* Replace with your icon component: e.g. <Ionicons name="notifications-outline" /> */}
    {/* Icon: bell outline, color white, size 22 */}
    {hasUnread && <View style={styles.dot} />}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 44,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent.lime,
    borderWidth: 1.5,
    borderColor: Colors.background.primary,
  },
});
```

---

## 3. Section Components Spec

### 3.1 KPI Bar — Visual Breakdown

```
┌─────────────────────────────────────────────────────────────┐  ← lime border
│  ★ 84        │  🏆 1         │  ◎ 5          │  🔥 4        │
│              │  RANK         │               │              │
│  TOTAL       │  Top 1%       │  PREDICTIONS  │  DAY STREAK  │
│  POINTS      │               │               │              │
└─────────────────────────────────────────────────────────────┘

• 4 equal columns (flex: 1 each)
• Separated by vertical dividers: height 40px, width 1px, rgba(255,255,255,0.1)
• Icon: 20px, accent lime color
• Number: 28px, weight 900, white
• Label: 10px, uppercase, #888, letter-spacing 0.5
• Sub-label (Rank only): 11px, accent lime, "Top 1%"
```

---

### 3.2 Hero Banner Carousel — Visual Breakdown

```
┌──────────────────────────────────────────────────────────┐  ← lime border, radius 16
│                                                          │
│              [Banner Image Full Width]                   │  ← height: screenH * 0.25
│                                                          │
└──────────────────────────────────────────────────────────┘
               ●  ○  ○  ○                                     ← pagination dots
               filled = #C9DF6A, empty = rgba(255,255,255,0.3)
               dot size 8px, gap 6px
```

---

### 3.3 Three-Card Row — Layout

```
┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│  MY CARDS  [2] │ │ NEXT MATCH     │ │  NEXT REWARD   │
│  View All >    │ │ STARTS IN      │ │                │
│                │ │                │ │   [gift icon]  │
│ [JKR][SNP][SHL]│ │  02 : 14 : 36  │ │  84/100 PTS   │
│  x1   x1   x0  │ │  HRS  MIN  SEC │ │  ══════════╌  │
│                │ │  ══════════╌   │ │  Mystery Pack  │
│ Use cards...   │ │  Make pred...  │ │  Unlocks @100  │
└────────────────┘ └────────────────┘ └────────────────┘
     flex: 1              flex: 1              flex: 1
     gap between cards = 10px
```

---

### 3.4 Pending Predictions Row — Visual Breakdown

```
┌─────────────────────────────────────────────────────────────────────┐
│  [🏴󠁧󠁢󠁥󠁮󠁧󠁿 flag] England    VS    [🇳🇱 flag] Netherlands     Today · 17:00  [x2]  › │
├─────────────────────────────────────────────────────────────────────┤
│  [🇲🇦 flag] Morocco     VS    [🇭🇷 flag] Croatia        Today · 20:00  [x2]  › │
├─────────────────────────────────────────────────────────────────────┤
│  [🇮🇹 flag] Italy        VS    [🇺🇸 flag] USA          Tomorrow · 22:00 [x3]  › │
└─────────────────────────────────────────────────────────────────────┘

• Row height: 52px
• Flag: circular, 32×32
• Team name: 14px, white, bold
• VS: 11px, #888
• Time: 12px, #888
• Multiplier badge: right side
• Chevron: #888, 16px, rightmost
• Divider between rows: 1px, rgba(255,255,255,0.07)
```

---

### 3.5 Bottom Navigation — Visual Breakdown

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   [🏠]        [⚽]       [📋]       [🏆]       [👤]               │
│   Home      Matches  Predictions  Leaderboard  Profile             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

Background:  rgba(13, 13, 13, 0.97)
Border top:  1px solid rgba(201, 223, 106, 0.15)
Border radius top: 20px (borderTopLeftRadius + borderTopRightRadius)
Height: 64px + safeArea.bottom
Position: absolute bottom 0

Active tab:  icon + label = #C9DF6A
Inactive:    icon + label = #555555

No border/indicator line under active tab — color change only
```

---

## 4. Flag Country Code Map

```typescript
// constants/countryCodes.ts
// Map team names to ISO 3166-1 alpha-2 codes for flagcdn.com

export const COUNTRY_CODES: Record<string, string> = {
  // Group A & common teams
  'Argentina':    'ar',
  'Australia':    'au',
  'Belgium':      'be',
  'Brazil':       'br',
  'Canada':       'ca',
  'Croatia':      'hr',
  'Denmark':      'dk',
  'Ecuador':      'ec',
  'England':      'gb-eng',
  'France':       'fr',
  'Germany':      'de',
  'Ghana':        'gh',
  'Iran':         'ir',
  'Italy':        'it',
  'Japan':        'jp',
  'Mexico':       'mx',
  'Morocco':      'ma',
  'Netherlands':  'nl',
  'Poland':       'pl',
  'Portugal':     'pt',
  'Qatar':        'qa',
  'Saudi Arabia': 'sa',
  'Senegal':      'sn',
  'Serbia':       'rs',
  'South Korea':  'kr',
  'Spain':        'es',
  'Switzerland':  'ch',
  'Tunisia':      'tn',
  'Uruguay':      'uy',
  'USA':          'us',
  'Wales':        'gb-wls',
  'Cameroon':     'cm',
  // Add all WC26 qualified teams
};

export const getFlagUrl = (teamNameOrCode: string): string => {
  const code = COUNTRY_CODES[teamNameOrCode] ?? teamNameOrCode.toLowerCase();
  return `https://flagcdn.com/w80/${code}.png`;
};
```

---

## 5. NativeWind v4 Utility Classes Reference

Common class combinations used throughout the app:

```
// Screen background
bg-[#0D0D0D]

// Card
bg-[#141414] rounded-2xl border border-[rgba(201,223,106,0.25)]

// Accent border card
bg-[#141414] rounded-2xl border border-[#C9DF6A]

// Primary text
text-white font-bold

// Secondary text
text-[#888888] text-xs

// Accent text
text-[#C9DF6A] font-bold

// Section title
text-white font-black text-base uppercase tracking-wide

// KPI number
text-white font-black text-3xl

// Multiplier badge
border border-[#C9DF6A] rounded-lg px-3 py-1

// Bottom nav active
text-[#C9DF6A]

// Bottom nav inactive
text-[#555555]
```

---

## 6. Component File Structure

```
components/
├── ui/                          ← Base reusable primitives
│   ├── Card.tsx
│   ├── SectionHeader.tsx
│   ├── MultiplierBadge.tsx
│   ├── TeamFlag.tsx
│   ├── MatchCard.tsx
│   ├── ProgressBar.tsx
│   ├── StatusBadge.tsx
│   ├── SkeletonBox.tsx
│   ├── AvatarButton.tsx
│   └── NotificationBell.tsx
│
├── home/                        ← Home screen section components
│   ├── HomeKpiBar.tsx
│   ├── HeroBannerCarousel.tsx
│   ├── MyCardsPreview.tsx
│   ├── NextMatchCountdown.tsx
│   ├── NextRewardCard.tsx
│   ├── MyTeamsMatches.tsx
│   ├── PendingPredictions.tsx
│   ├── TodayMatchesSection.tsx
│   ├── PerformancePreview.tsx
│   └── MiniLeaderboard.tsx
│
constants/
│   ├── colors.ts
│   ├── typography.ts
│   ├── spacing.ts
│   ├── shadows.ts
│   └── countryCodes.ts
```

---

## 7. Do's and Don'ts

| ✅ Do | ❌ Don't |
|---|---|
| Use `Colors.accent.lime` for all primary CTAs | Hardcode `#C9DF6A` inline in components |
| Use `flagcdn.com` for all team flags | Use emoji flags (🇧🇷) in UI |
| Use `MotiView` for skeleton loading | Use `ActivityIndicator` for loading cards |
| Use `borderRadius: Layout.borderRadius.lg` for cards | Mix random border radius values |
| Use `MultiplierBadge` component everywhere | Recreate the multiplier style per component |
| Use `SectionHeader` for every section title | Write custom header per section |
| Use `MatchCard` for all match displays | Build custom match rows per section |
| Keep `ScrollView` as main container | Nest vertical `FlatList` in `ScrollView` |
| Add `// TODO: [WC26]` for backend hooks | Leave undocumented placeholders |
| Use `useSafeAreaInsets` for bottom padding | Use fixed `paddingBottom` values |

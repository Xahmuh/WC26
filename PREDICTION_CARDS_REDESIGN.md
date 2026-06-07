# Tournament Predictions Cards — Premium Vertical Carousel Redesign

## Context

World Cup 2026 prediction app · Expo SDK 56 · Expo Router v4 · NativeWind · TypeScript strict mode  
Design system: dark stadium aesthetic (`#0D0D0D` bg · `#C9DF6A` accent · existing `Theme.colors`)  
**Rule:** Zero hardcoded colors. Every color token must come from `Theme.colors`, NativeWind utility classes, or the existing accent system.

---

## 1 — Files to Create / Modify

```
src/
├── components/
│   ├── predictions/
│   │   ├── PredictionCard.tsx          ← NEW  (vertical premium card)
│   │   ├── PredictionCarousel.tsx      ← NEW  (horizontal scroll container)
│   │   ├── PredictionCardBadge.tsx     ← NEW  (points circle badge)
│   │   ├── PredictionStatusChip.tsx    ← NEW  (countdown / locked chip)
│   │   └── PredictionWatermark.tsx     ← NEW  (faded background icon)
│   └── index.ts                        ← MODIFY (re-export new components)
└── screens/ (or app/)
    └── [tournament-predictions screen] ← MODIFY (swap old cards with carousel)
```

---

## 2 — Design Tokens to Use

Pull from the project's existing theme. Do **not** hardcode values.

```typescript
// Reference only — adapt to wherever Theme is exported in THIS project
import { useTheme } from '@/hooks/useTheme'          // or however theme is accessed
import { colors } from '@/constants/theme'           // adapt path as needed

// Expected tokens (verify against actual theme file):
// colors.background.primary    → #0D0D0D  (card bg)
// colors.background.elevated   → card surface, slightly lighter
// colors.accent.primary        → #C9DF6A  (lime green accent)
// colors.accent.muted          → accent at ~15% opacity (badge bg)
// colors.text.primary          → main text
// colors.text.secondary        → subtitle / meta text
// colors.text.disabled         → locked state text
// colors.border.subtle         → card border
// colors.status.success        → submitted checkmark
```

---

## 3 — Card Dimensions & Layout

```typescript
// PredictionCard.tsx constants
const CARD_WIDTH  = moderateScale(200)   // fixed width — snap-able
const CARD_HEIGHT = moderateScale(280)   // consistent height
const CARD_GAP    = moderateScale(12)    // spacing between cards
const CARD_RADIUS = moderateScale(16)    // border-radius
```

> Use the project's existing `moderateScale` / `safeScale` / `isTablet` utilities.  
> On tablets: increase `CARD_WIDTH` to `moderateScale(240)`.

---

## 4 — PredictionCarousel.tsx

```typescript
import React from 'react'
import { ScrollView, View } from 'react-native'
import { PredictionCard } from './PredictionCard'
import { moderateScale } from '@/utils/responsive'   // adapt path
import type { Prediction } from '@/types/prediction'   // adapt type

interface Props {
  predictions: Prediction[]
  onCardPress: (prediction: Prediction) => void
}

export const PredictionCarousel: React.FC<Props> = ({ predictions, onCardPress }) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={CARD_WIDTH + CARD_GAP}   // snap feel
      decelerationRate="fast"
      contentContainerStyle={{
        paddingHorizontal: moderateScale(16),
        gap: CARD_GAP,
      }}
      accessibilityLabel="Tournament predictions carousel"
    >
      {predictions.map((prediction) => (
        <PredictionCard
          key={prediction.id}
          prediction={prediction}
          onPress={() => onCardPress(prediction)}
        />
      ))}
    </ScrollView>
  )
}
```

---

## 5 — PredictionCard.tsx

Full vertical card component:

```typescript
import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { PredictionCardBadge }   from './PredictionCardBadge'
import { PredictionStatusChip }  from './PredictionStatusChip'
import { PredictionWatermark }   from './PredictionWatermark'
import { useTheme }              from '@/hooks/useTheme'
import { moderateScale, isTablet } from '@/utils/responsive'
import type { Prediction }       from '@/types/prediction'

interface Props {
  prediction: Prediction
  onPress: () => void
}

export const PredictionCard: React.FC<Props> = ({ prediction, onPress }) => {
  const { colors } = useTheme()

  const cardWidth  = isTablet ? moderateScale(240) : moderateScale(200)
  const cardHeight = moderateScale(280)

  const isLocked    = prediction.status === 'closed'
  const isSubmitted = prediction.status === 'submitted'

  return (
    <Pressable
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${prediction.title}. ${prediction.points} points. ${isLocked ? 'Locked' : 'Open for prediction'}`}
      style={({ pressed }) => [
        styles.card,
        {
          width: cardWidth,
          height: cardHeight,
          backgroundColor: colors.background.elevated,
          borderColor: isLocked
            ? colors.border.subtle
            : colors.accent.primary + '33',   // 20% opacity border on open cards
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      {/* ── Watermark (bottom layer) ─────────────────────────── */}
      <PredictionWatermark questionType={prediction.questionType} />

      {/* ── Top Row: Points Badge + Status Chip ──────────────── */}
      <View style={styles.topRow}>
        <PredictionCardBadge points={prediction.points} isLocked={isLocked} />
        <PredictionStatusChip
          status={prediction.status}
          closesAt={prediction.closesAt}
        />
      </View>

      {/* ── Spacer ───────────────────────────────────────────── */}
      <View style={{ flex: 1 }} />

      {/* ── Main Content ─────────────────────────────────────── */}
      <View style={styles.bottomContent}>
        <Text
          style={[
            styles.title,
            {
              color: isLocked ? colors.text.disabled : colors.text.primary,
            },
          ]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {prediction.title}
        </Text>

        {/* Submitted indicator */}
        {isSubmitted && (
          <View style={styles.submittedRow}>
            {/* Use project icon system */}
            <CheckIcon
              size={moderateScale(12)}
              color={colors.status.success}
              accessibilityLabel="Prediction submitted"
            />
            <Text
              style={[styles.submittedText, { color: colors.status.success }]}
              accessibilityLiveRegion="polite"
            >
              Your prediction submitted
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: moderateScale(16),
    borderWidth: 1,
    padding: moderateScale(14),
    overflow: 'hidden',
    justifyContent: 'flex-start',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomContent: {
    gap: moderateScale(6),
  },
  title: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    lineHeight: moderateScale(24),
    letterSpacing: -0.3,
  },
  submittedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
    marginTop: moderateScale(4),
  },
  submittedText: {
    fontSize: moderateScale(11),
    fontWeight: '500',
  },
})
```

---

## 6 — PredictionCardBadge.tsx (Points Circle)

```typescript
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '@/hooks/useTheme'
import { moderateScale } from '@/utils/responsive'

interface Props {
  points: number
  isLocked: boolean
}

export const PredictionCardBadge: React.FC<Props> = ({ points, isLocked }) => {
  const { colors } = useTheme()

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: isLocked
            ? colors.background.elevated
            : colors.accent.primary + '1A',   // accent at 10% opacity
          borderColor: isLocked
            ? colors.border.subtle
            : colors.accent.primary + '4D',   // accent at 30% opacity
        },
      ]}
      accessible
      accessibilityLabel={`${points} points reward`}
    >
      <Text
        style={[
          styles.pointsText,
          {
            color: isLocked ? colors.text.disabled : colors.accent.primary,
          },
        ]}
      >
        +{points}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    width: moderateScale(52),
    height: moderateScale(52),
    borderRadius: moderateScale(26),
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsText: {
    fontSize: moderateScale(15),
    fontWeight: '800',
    letterSpacing: -0.5,
  },
})
```

---

## 7 — PredictionStatusChip.tsx (Countdown / Locked)

```typescript
import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '@/hooks/useTheme'
import { moderateScale } from '@/utils/responsive'
import { LockClosedIcon } from '@/components/icons'   // adapt to project's icon system

type PredictionStatus = 'open' | 'submitted' | 'closed'

interface Props {
  status: PredictionStatus
  closesAt?: Date | string
}

// Helper: format countdown from now → closesAt
function useCountdown(closesAt?: Date | string) {
  const [label, setLabel] = useState('')

  useEffect(() => {
    if (!closesAt) return
    const target = new Date(closesAt).getTime()

    const tick = () => {
      const diff = target - Date.now()
      if (diff <= 0) { setLabel('Closing'); return }

      const days    = Math.floor(diff / 86_400_000)
      const hours   = Math.floor((diff % 86_400_000) / 3_600_000)
      const minutes = Math.floor((diff % 3_600_000) / 60_000)

      if (days > 0)        setLabel(`${days}d ${hours}h`)
      else if (hours > 0)  setLabel(`${hours}h ${minutes}m`)
      else                 setLabel(`${minutes}m`)
    }

    tick()
    const interval = setInterval(tick, 60_000)
    return () => clearInterval(interval)
  }, [closesAt])

  return label
}

export const PredictionStatusChip: React.FC<Props> = ({ status, closesAt }) => {
  const { colors } = useTheme()
  const countdown = useCountdown(status !== 'closed' ? closesAt : undefined)

  if (status === 'closed') {
    return (
      <View
        style={[
          styles.chip,
          { backgroundColor: colors.background.primary, borderColor: colors.border.subtle },
        ]}
        accessible
        accessibilityLabel="Prediction locked"
      >
        <LockClosedIcon
          size={moderateScale(11)}
          color={colors.text.disabled}
          accessibilityLabel=""   // label on parent View
        />
        <Text style={[styles.chipText, { color: colors.text.disabled }]}>
          Locked
        </Text>
      </View>
    )
  }

  // Open or submitted — show countdown or closing date
  const displayLabel = countdown
    ? `${countdown}`
    : closesAt
      ? `Closes ${new Date(closesAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
      : 'Open'

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: colors.accent.primary + '14',
          borderColor: colors.accent.primary + '33',
        },
      ]}
      accessible
      accessibilityLabel={`Closes in ${displayLabel}`}
    >
      <Text style={[styles.chipText, { color: colors.accent.primary }]}>
        {displayLabel}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(3),
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(4),
    borderRadius: moderateScale(20),
    borderWidth: 1,
  },
  chipText: {
    fontSize: moderateScale(10),
    fontWeight: '600',
    letterSpacing: 0.2,
  },
})
```

---

## 8 — PredictionWatermark.tsx (Background Icon)

```typescript
import React from 'react'
import { View, StyleSheet } from 'react-native'
import { useTheme } from '@/hooks/useTheme'
import { moderateScale } from '@/utils/responsive'

// Map question types → icon components from project's icon system
// Adapt icon imports to wherever the project keeps its SVG/icon library
import {
  TrophyIcon,
  PlayerStarIcon,
  GoalkeeperGlovesIcon,
  GoalNetIcon,
  QuestionMarkIcon,
} from '@/components/icons'   // ← adapt this import

type QuestionType = 'champion' | 'best_player' | 'best_goalkeeper' | 'top_scorer' | string

interface Props {
  questionType: QuestionType
}

const WATERMARK_SIZE = moderateScale(120)

function getWatermarkIcon(type: QuestionType) {
  switch (type) {
    case 'champion':         return TrophyIcon
    case 'best_player':      return PlayerStarIcon
    case 'best_goalkeeper':  return GoalkeeperGlovesIcon
    case 'top_scorer':       return GoalNetIcon
    default:                 return QuestionMarkIcon   // auto-fallback for any new admin category
  }
}

export const PredictionWatermark: React.FC<Props> = ({ questionType }) => {
  const { colors } = useTheme()
  const WatermarkIcon = getWatermarkIcon(questionType)

  return (
    <View
      style={styles.container}
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <WatermarkIcon
        size={WATERMARK_SIZE}
        color={colors.text.primary}   // token-based — opacity handles fading
        accessibilityLabel=""
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: moderateScale(-16),
    right: moderateScale(-16),
    opacity: 0.07,    // 7% — visible but never intrusive
    transform: [{ rotate: '-10deg' }],
    zIndex: 0,
  },
})
```

---

## 9 — Screen Integration

Replace the old horizontal cards section with the carousel:

```typescript
// In your predictions screen / section component

// BEFORE (remove this):
// <FlatList horizontal={false} renderItem={renderWideCard} ... />

// AFTER:
import { PredictionCarousel } from '@/components/predictions/PredictionCarousel'

// Inside render:
<View>
  {/* Section header — keep existing style */}
  <SectionHeader title="Tournament Predictions" />

  <PredictionCarousel
    predictions={predictions}
    onCardPress={handlePredictionPress}
  />
</View>
```

---

## 10 — Type Definitions

Add or extend your existing prediction types:

```typescript
// src/types/prediction.ts  (adapt to existing types)

export type PredictionStatus = 'open' | 'submitted' | 'closed'

export type QuestionType =
  | 'champion'
  | 'best_player'
  | 'best_goalkeeper'
  | 'top_scorer'
  | string   // ← keeps it open for admin-created categories

export interface Prediction {
  id: string
  title: string
  points: number
  status: PredictionStatus
  questionType: QuestionType
  closesAt?: string | Date
  userPrediction?: string | null
}
```

---

## 11 — Checklist Before Shipping

- [ ] All colors reference `Theme.colors` — no hex literals anywhere in new files
- [ ] `moderateScale` applied to all numeric dimensions
- [ ] `isTablet` guard on `CARD_WIDTH`
- [ ] `snapToInterval` = `CARD_WIDTH + CARD_GAP` so scroll snaps correctly
- [ ] `PredictionWatermark` has `accessible={false}` and `importantForAccessibility="no-hide-descendants"`
- [ ] `PredictionStatusChip` reads countdown via `accessibilityLabel` (not just visual text)
- [ ] `LockClosedIcon` uses project's icon system — **not** an emoji or external lib
- [ ] `getWatermarkIcon` default case returns `QuestionMarkIcon` — verified it exists in icon lib
- [ ] Countdown interval cleared on unmount (useEffect cleanup)
- [ ] Tested on: iPhone SE viewport, mid-size Android, tablet breakpoint

---

## 12 — Visual Hierarchy Summary

```
┌─────────────────────────┐
│  [+50 badge]  [2d 5h ↓] │  ← topRow
│                          │
│                          │  ← spacer (flex: 1)
│                          │
│  Champion                │  ← title (bold, 2 lines max)
│  ✓ Your prediction...    │  ← submitted indicator (conditional)
│                          │
│              [🏆 120px] │  ← watermark (absolute, bottom-right, 7% opacity)
└─────────────────────────┘
```

Points badge → highest visual weight (accent color, circle frame)  
Title → second (bold, large, left-aligned)  
Status chip → top-right, compact  
Watermark → purely atmospheric, never competes with content

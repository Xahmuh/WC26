// ============================================================
// WC2026 PREDICTION APP — DESIGN SYSTEM
// React Native + Expo — Production Ready
// Extracted from UI reference (dark stadium aesthetic)
// ============================================================

import { StyleSheet, Platform } from 'react-native'

// ─────────────────────────────────────────
// 1. COLOR TOKENS
// ─────────────────────────────────────────
export const Colors = {

  // Core Backgrounds (dark-first)
  bgDeep:      '#0D0F0E',   // App root background / Splash bg
  bgSurface1:  '#141A13',   // Screen background
  bgSurface2:  '#1A2A1A',   // Cards, match tiles
  bgSurface3:  '#222E1F',   // Elevated cards, modals
  bgBorder:    '#2A3A20',   // Borders, dividers, input outlines

  // Accent (the lime-green from the UI)
  accent:         '#C9DF6A',  // Primary CTA, active state, highlights
  accentDim:      'rgba(201,223,106,0.15)', // Accent backgrounds
  accentBorder:   'rgba(201,223,106,0.30)', // Accent borders
  accentDark:     '#0D1A00',  // Text ON accent button

  // Text
  textPrimary:    '#FFFFFF',  // Headings, names, scores
  textSecondary:  '#8A9A7A',  // Subtitles, time, muted
  textTertiary:   '#4A5A40',  // Placeholders, disabled

  // Semantic
  live:           '#FF6B6B',  // Live match badge
  liveDim:        'rgba(255,107,107,0.15)',
  success:        '#5DCA8A',  // Points earned, correct prediction
  successDim:     'rgba(93,202,138,0.15)',
  warning:        '#F0C040',  // Deadline warning
  warningDim:     'rgba(240,192,64,0.15)',

  // Leaderboard rank colors
  gold:           '#FFD700',
  silver:         '#C0C0C0',
  bronze:         '#CD7F32',

  // Overlay
  overlay:        'rgba(0,0,0,0.65)',
  overlayLight:   'rgba(0,0,0,0.35)',
} as const

// ─────────────────────────────────────────
// 2. GRADIENTS (for LinearGradient)
// ─────────────────────────────────────────
export const Gradients = {
  // Splash screen / home screen
  stadium:    ['#0D2A1A', '#0A1A0A', '#0D0F0E'] as string[],
  // Score banner
  scoreBg:    ['#1A2A1A', '#0D1A0D'] as string[],
  // Card overlay (bottom fade)
  cardFade:   ['transparent', 'rgba(13,15,14,0.9)'] as string[],
  // Accent glow
  accentGlow: ['rgba(201,223,106,0.25)', 'rgba(201,223,106,0)'] as string[],
} as const

// ─────────────────────────────────────────
// 3. SPACING SCALE
// ─────────────────────────────────────────
export const Spacing = {
  xxs:  2,
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  xxxl: 32,
  huge: 48,
  // Semantic aliases
  screenPadding:   20,
  cardPadding:     16,
  sectionGap:      24,
  itemGap:         12,
  iconGap:         8,
} as const

// ─────────────────────────────────────────
// 4. BORDER RADIUS
// ─────────────────────────────────────────
export const Radius = {
  xs:     4,    // Tiny badges
  sm:     6,    // Input fields
  md:     10,   // Badges, chips
  lg:     14,   // Cards, match tiles
  xl:     20,   // Modal bottom sheet
  xxl:    28,   // Large feature cards
  pill:   999,  // CTA buttons (pill shape)
  circle: 9999, // Avatars, flag circles
} as const

// ─────────────────────────────────────────
// 5. TYPOGRAPHY
// ─────────────────────────────────────────
export const FontSize = {
  xs:    10,
  sm:    11,
  base:  13,
  md:    15,
  lg:    17,
  xl:    20,
  xxl:   24,
  xxxl:  28,
  hero:  36,
} as const

export const FontWeight = {
  regular:   '400' as const,
  medium:    '500' as const,
  semibold:  '600' as const,
  bold:      '700' as const,
} as const

export const LineHeight = {
  tight:  1.2,
  normal: 1.5,
  loose:  1.7,
} as const

export const LetterSpacing = {
  tight:  -0.5,
  normal:  0,
  wide:    0.5,
  wider:   1.0,
  widest:  1.5,
} as const

// Ready-made text style presets
export const TextStyles = StyleSheet.create({
  hero: {
    fontSize: FontSize.hero,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    letterSpacing: LetterSpacing.tight,
    lineHeight: FontSize.hero * LineHeight.tight,
  },
  display: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    letterSpacing: LetterSpacing.tight,
  },
  screenTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  cardTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  body: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.regular,
    color: Colors.textSecondary,
    lineHeight: FontSize.base * LineHeight.normal,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    letterSpacing: LetterSpacing.wider,
    textTransform: 'uppercase',
  },
  caption: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.regular,
    color: Colors.textTertiary,
  },
  accent: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.accent,
    letterSpacing: LetterSpacing.wide,
    textTransform: 'uppercase',
  },
  score: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  rank: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },
})

// ─────────────────────────────────────────
// 6. SHADOW / ELEVATION
// ─────────────────────────────────────────
export const Shadows = {
  none: {},

  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    },
    android: { elevation: 2 },
  }),

  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
    },
    android: { elevation: 6 },
  }),

  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
    },
    android: { elevation: 12 },
  }),

  // Accent glow (iOS only — for highlighted cards)
  accentGlow: Platform.select({
    ios: {
      shadowColor: Colors.accent,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
    },
    android: { elevation: 8 },
  }),
} as const

// ─────────────────────────────────────────
// 7. BORDERS
// ─────────────────────────────────────────
export const Borders = {
  default:  { borderWidth: 1,   borderColor: Colors.bgBorder },
  subtle:   { borderWidth: 0.5, borderColor: Colors.bgBorder },
  accent:   { borderWidth: 1.5, borderColor: Colors.accent },
  accentDim:{ borderWidth: 1,   borderColor: Colors.accentBorder },
  live:     { borderWidth: 1,   borderColor: Colors.live },
} as const

// ─────────────────────────────────────────
// 8. COMPONENT STYLE PRESETS
// ─────────────────────────────────────────

// Card base
export const CardStyles = StyleSheet.create({
  base: {
    backgroundColor: Colors.bgSurface2,
    borderRadius: Radius.lg,
    padding: Spacing.cardPadding,
    ...Borders.default,
  },
  elevated: {
    backgroundColor: Colors.bgSurface3,
    borderRadius: Radius.lg,
    padding: Spacing.cardPadding,
    ...Borders.default,
    ...(Shadows.md ?? {}),
  },
  accentHighlight: {
    backgroundColor: Colors.bgSurface2,
    borderRadius: Radius.lg,
    padding: Spacing.cardPadding,
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  flat: {
    backgroundColor: Colors.bgSurface1,
    borderRadius: Radius.lg,
    padding: Spacing.cardPadding,
  },
})

// Button presets
export const ButtonStyles = StyleSheet.create({
  // Primary CTA — lime pill
  primary: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  primaryText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.accentDark,
    letterSpacing: LetterSpacing.wide,
    textTransform: 'uppercase',
  },

  // Secondary — outline pill
  secondary: {
    backgroundColor: 'transparent',
    borderRadius: Radius.pill,
    paddingVertical: 13,
    paddingHorizontal: 28,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  secondaryText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.accent,
    letterSpacing: LetterSpacing.wide,
  },

  // Ghost — dim background
  ghost: {
    backgroundColor: Colors.accentDim,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
  },
  ghostText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
    color: Colors.accent,
  },

  // Danger
  danger: {
    backgroundColor: Colors.liveDim,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.3)',
  },
  dangerText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
    color: Colors.live,
  },
})

// Badge presets
export const BadgeStyles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start' as const,
  },
  live: {
    backgroundColor: Colors.liveDim,
    borderWidth: 0.5,
    borderColor: 'rgba(255,107,107,0.3)',
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  liveText: { color: Colors.live, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },

  upcoming: {
    backgroundColor: Colors.accentDim,
    borderWidth: 0.5,
    borderColor: Colors.accentBorder,
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  upcomingText: { color: Colors.accent, fontSize: FontSize.sm, fontWeight: FontWeight.medium },

  finished: {
    backgroundColor: 'rgba(138,154,122,0.12)',
    borderWidth: 0.5,
    borderColor: 'rgba(138,154,122,0.25)',
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  finishedText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },

  points: {
    backgroundColor: Colors.successDim,
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pointsText: { color: Colors.success, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },

  groupLabel: {
    backgroundColor: Colors.accentDim,
    borderRadius: Radius.xs,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  groupLabelText: { color: Colors.accent, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
})

// Input field
export const InputStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bgSurface1,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.bgBorder,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing.sm,
  },
  containerFocused: {
    borderColor: Colors.accent,
  },
  text: {
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    flex: 1,
  },
  placeholder: {
    color: Colors.textTertiary,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },

  // Score input (big number boxes)
  scoreBox: {
    backgroundColor: Colors.bgSurface2,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.bgBorder,
    width: 72,
    height: 72,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  scoreBoxFocused: {
    borderColor: Colors.accent,
  },
  scoreText: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
})

// Avatar circle
export const AvatarStyles = StyleSheet.create({
  sm: {
    width: 28, height: 28,
    borderRadius: Radius.circle,
    backgroundColor: Colors.bgSurface3,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  md: {
    width: 40, height: 40,
    borderRadius: Radius.circle,
    backgroundColor: Colors.bgSurface3,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  lg: {
    width: 56, height: 56,
    borderRadius: Radius.circle,
    backgroundColor: Colors.bgSurface3,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  xl: {
    width: 80, height: 80,
    borderRadius: Radius.circle,
    backgroundColor: Colors.bgSurface3,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  // Flag circle
  flag: {
    width: 44, height: 44,
    borderRadius: Radius.circle,
    backgroundColor: Colors.bgSurface2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    overflow: 'hidden' as const,
  },
  flagLg: {
    width: 60, height: 60,
    borderRadius: Radius.circle,
    backgroundColor: Colors.bgSurface2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    overflow: 'hidden' as const,
  },
})

// Tab bar
export const TabBarStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bgSurface2,
    borderTopWidth: 0.5,
    borderTopColor: Colors.bgBorder,
    paddingBottom: 28, // iOS safe area handled separately
    paddingTop: 10,
    paddingHorizontal: Spacing.xl,
  },
  item: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flex: 1,
    gap: 4,
  },
  labelActive: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.accent,
  },
  labelInactive: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.regular,
    color: Colors.textTertiary,
  },
  activeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.accent,
    marginBottom: 2,
  },
})

// Screen layout helpers
export const LayoutStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bgDeep,
  },
  screenPadded: {
    flex: 1,
    backgroundColor: Colors.bgDeep,
    paddingHorizontal: Spacing.screenPadding,
  },
  section: {
    marginBottom: Spacing.sectionGap,
  },
  sectionHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  rowBetween: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  center: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  divider: {
    height: 0.5,
    backgroundColor: Colors.bgBorder,
    marginVertical: Spacing.md,
  },
})

// ─────────────────────────────────────────
// 9. ANIMATION CONSTANTS
// ─────────────────────────────────────────
export const Animation = {
  // Duration (ms)
  fast:    150,
  normal:  250,
  slow:    400,
  // Spring config (react-native Animated)
  spring: {
    press: {
      toValue: 0.96,
      useNativeDriver: true,
    },
  },
  // Easing hints (use with Easing from react-native)
  easing: {
    in:    'easeIn',
    out:   'easeOut',
    inOut: 'easeInOut',
  },
} as const

// ─────────────────────────────────────────
// 10. SCREEN SIZES / BREAKPOINTS
// ─────────────────────────────────────────
export const Breakpoints = {
  smallPhone:   375,  // iPhone SE
  normalPhone:  390,  // iPhone 14
  largePhone:   430,  // iPhone 14 Plus / Pro Max
} as const

// ─────────────────────────────────────────
// 11. SPLASH SCREEN CONFIG
// (reference for app.json)
// ─────────────────────────────────────────
/*
app.json:
{
  "expo": {
    "splash": {
      "image": "./assets/images/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#0D0F0E"
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#0D0F0E"
      }
    }
  }
}
*/

// ─────────────────────────────────────────
// 12. THEME OBJECT (single export)
// ─────────────────────────────────────────
export const Theme = {
  colors:     Colors,
  gradients:  Gradients,
  spacing:    Spacing,
  radius:     Radius,
  fontSize:   FontSize,
  fontWeight: FontWeight,
  lineHeight: LineHeight,
  letterSpacing: LetterSpacing,
  textStyles: TextStyles,
  shadows:    Shadows,
  borders:    Borders,
  cards:      CardStyles,
  buttons:    ButtonStyles,
  badges:     BadgeStyles,
  inputs:     InputStyles,
  avatars:    AvatarStyles,
  tabBar:     TabBarStyles,
  layout:     LayoutStyles,
  animation:  Animation,
  breakpoints: Breakpoints,
} as const

export default Theme

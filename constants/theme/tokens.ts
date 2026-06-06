// ============================================================================
// Design tokens — PURE DATA (no react-native import).
// ----------------------------------------------------------------------------
// Source of truth for the WC2026 dark-stadium / lime-accent design system.
// Safe to require from tailwind.config.js (runs under Node/jiti, where
// react-native cannot be evaluated). The runtime Theme in design-system.ts and
// the NativeWind color/spacing scales both consume these tokens.
// ============================================================================

// ── 1. COLOR TOKENS ────────────────────────────────────────────────────────
// Palette: ClutchTime "Dark Athletic Premium" — neutral near-black surfaces
// with a single electric-lime accent. Token NAMES are preserved so every
// existing `bg-bgDeep` / `text-accent` / `Theme.colors.*` reference inherits
// the new look automatically. (Source: ui kit/DESIGN_SYSTEM.md)
export const Colors = {
  // Core backgrounds (dark-first, neutral — each ~8-10pt lighter than below)
  bgDeep: '#0D0D0D', // App root / status-bar / deepest layer
  bgSurface1: '#1A1A1A', // Screen / section background
  bgSurface2: '#222222', // Cards, match tiles (card surface)
  bgSurface3: '#2A2A2A', // Elevated cards, modals, badges
  bgBorder: '#2A2A2A', // Borders, dividers, input outlines (subtle)

  // Accent (electric lime — fires only on active / focus / primary action)
  accent: '#C8FF00', // Primary CTA, active state, highlights
  accentDim: 'rgba(200,255,0,0.12)', // Accent backgrounds
  accentBorder: 'rgba(200,255,0,0.30)', // Accent borders
  accentDark: '#0D0D0D', // Text ON accent button

  // Text
  textPrimary: '#FFFFFF', // Headings, names, scores
  textSecondary: '#CCCCCC', // Subtitles, team names, labels
  textTertiary: '#888888', // Placeholders, records, muted metadata

  // Semantic
  live: '#E03030', // Live match / danger
  liveDim: 'rgba(224,48,48,0.12)',
  success: '#4ADE80', // Points earned, correct prediction
  successDim: 'rgba(74,222,128,0.15)',
  warning: '#FACC15', // Deadline warning
  warningDim: 'rgba(250,204,21,0.15)',

  // Leaderboard rank colors
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',

  // Overlays
  overlay: 'rgba(0,0,0,0.65)',
  overlayLight: 'rgba(0,0,0,0.35)',
} as const;

// ── 2. GRADIENTS (for LinearGradient) ──────────────────────────────────────
export const Gradients = {
  stadium: ['#1F1F1F', '#161616', '#0D0D0D'] as string[],
  scoreBg: ['#222222', '#111111'] as string[],
  cardFade: ['transparent', 'rgba(13,13,13,0.9)'] as string[],
  accentGlow: ['rgba(200,255,0,0.25)', 'rgba(200,255,0,0)'] as string[],
} as const;

// ── 3. SPACING SCALE ───────────────────────────────────────────────────────
export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
  // Semantic aliases
  screenPadding: 20,
  cardPadding: 16,
  sectionGap: 24,
  itemGap: 12,
  iconGap: 8,
} as const;

// ── 4. BORDER RADIUS ───────────────────────────────────────────────────────
export const Radius = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  xxl: 28,
  pill: 999,
  circle: 9999,
} as const;

// ── 5. TYPOGRAPHY ──────────────────────────────────────────────────────────
export const FontSize = {
  xs: 10,
  sm: 11,
  base: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  hero: 36,
} as const;

export const FontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const LineHeight = {
  tight: 1.2,
  normal: 1.5,
  loose: 1.7,
} as const;

export const LetterSpacing = {
  tight: -0.5,
  normal: 0,
  wide: 0.5,
  wider: 1.0,
  widest: 1.5,
} as const;

// ── 9. ANIMATION CONSTANTS ─────────────────────────────────────────────────
export const Animation = {
  fast: 150,
  normal: 250,
  slow: 400,
  spring: {
    press: { toValue: 0.96, useNativeDriver: false },
  },
  easing: { in: 'easeIn', out: 'easeOut', inOut: 'easeInOut' },
} as const;

// ── 10. BREAKPOINTS ────────────────────────────────────────────────────────
export const Breakpoints = {
  smallPhone: 375,
  normalPhone: 390,
  largePhone: 430,
} as const;

export type AppColor = keyof typeof Colors;

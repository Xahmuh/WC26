// ============================================================================
// WC2026 PREDICTION APP — DESIGN SYSTEM (canonical runtime Theme)
// React Native + Expo — dark stadium aesthetic, lime accent.
// ----------------------------------------------------------------------------
// THE single styling source of truth. Import in components as:
//   import Theme from '@/constants/theme/design-system';
// Pure data tokens live in ./tokens (also consumed by tailwind.config.js);
// this file layers the react-native StyleSheet presets on top.
// ============================================================================

import { Platform, StyleSheet } from 'react-native';

import {
  Animation,
  Breakpoints,
  Colors,
  FontSize,
  FontWeight,
  Gradients,
  LetterSpacing,
  LineHeight,
  Radius,
  Spacing,
} from './tokens';

export {
  Animation,
  Breakpoints,
  Colors,
  FontSize,
  FontWeight,
  Gradients,
  LetterSpacing,
  LineHeight,
  Radius,
  Spacing,
};

// ── 5. TEXT STYLE PRESETS ──────────────────────────────────────────────────
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
});

// ── 6. SHADOW / ELEVATION ──────────────────────────────────────────────────
export const Shadows = {
  none: {},
  sm: Platform.select({
    ios: { shadowColor: Colors.overlay, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 4 },
    android: { elevation: 2 },
  }),
  md: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },
    android: { elevation: 6 },
  }),
  lg: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 16 },
    android: { elevation: 12 },
  }),
  accentGlow: Platform.select({
    ios: { shadowColor: Colors.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 12 },
    android: { elevation: 8 },
  }),
} as const;

// ── 7. BORDERS ─────────────────────────────────────────────────────────────
export const Borders = {
  default: { borderWidth: 1, borderColor: Colors.bgBorder },
  subtle: { borderWidth: 0.5, borderColor: Colors.bgBorder },
  accent: { borderWidth: 1.5, borderColor: Colors.accent },
  accentDim: { borderWidth: 1, borderColor: Colors.accentBorder },
  live: { borderWidth: 1, borderColor: Colors.live },
} as const;

// ── 8. COMPONENT STYLE PRESETS ─────────────────────────────────────────────
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
});

export const ButtonStyles = StyleSheet.create({
  primary: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.accentDark,
    letterSpacing: LetterSpacing.wide,
    textTransform: 'uppercase',
  },
  secondary: {
    backgroundColor: 'transparent',
    borderRadius: Radius.pill,
    paddingVertical: 13,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  secondaryText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.accent,
    letterSpacing: LetterSpacing.wide,
  },
  ghost: {
    backgroundColor: Colors.accentDim,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.accentBorder,
  },
  ghostText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
    color: Colors.accent,
  },
  danger: {
    backgroundColor: Colors.liveDim,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.3)',
  },
  dangerText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
    color: Colors.live,
  },
});

export const BadgeStyles = StyleSheet.create({
  base: { borderRadius: Radius.md, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  live: { backgroundColor: Colors.liveDim, borderWidth: 0.5, borderColor: 'rgba(255,107,107,0.3)', borderRadius: Radius.md, paddingHorizontal: 10, paddingVertical: 3 },
  liveText: { color: Colors.live, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  upcoming: { backgroundColor: Colors.accentDim, borderWidth: 0.5, borderColor: Colors.accentBorder, borderRadius: Radius.md, paddingHorizontal: 10, paddingVertical: 3 },
  upcomingText: { color: Colors.accent, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  finished: { backgroundColor: 'rgba(136,136,136,0.12)', borderWidth: 0.5, borderColor: 'rgba(136,136,136,0.25)', borderRadius: Radius.md, paddingHorizontal: 10, paddingVertical: 3 },
  finishedText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  points: { backgroundColor: Colors.successDim, borderRadius: Radius.md, paddingHorizontal: 10, paddingVertical: 3 },
  pointsText: { color: Colors.success, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  groupLabel: { backgroundColor: Colors.accentDim, borderRadius: Radius.xs, paddingHorizontal: 8, paddingVertical: 2 },
  groupLabelText: { color: Colors.accent, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
});

export const InputStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bgSurface1,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.bgBorder,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  containerFocused: { borderColor: Colors.accent },
  text: { fontSize: FontSize.base, color: Colors.textPrimary, flex: 1 },
  placeholder: { color: Colors.textTertiary },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textSecondary, marginBottom: Spacing.xs },
  scoreBox: {
    backgroundColor: Colors.bgSurface2,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.bgBorder,
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBoxFocused: { borderColor: Colors.accent },
  scoreText: { fontSize: FontSize.xxxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
});

export const AvatarStyles = StyleSheet.create({
  sm: { width: 28, height: 28, borderRadius: Radius.circle, backgroundColor: Colors.bgSurface3, alignItems: 'center', justifyContent: 'center' },
  md: { width: 40, height: 40, borderRadius: Radius.circle, backgroundColor: Colors.bgSurface3, alignItems: 'center', justifyContent: 'center' },
  lg: { width: 56, height: 56, borderRadius: Radius.circle, backgroundColor: Colors.bgSurface3, alignItems: 'center', justifyContent: 'center' },
  xl: { width: 80, height: 80, borderRadius: Radius.circle, backgroundColor: Colors.bgSurface3, alignItems: 'center', justifyContent: 'center' },
  flag: { width: 44, height: 44, borderRadius: Radius.circle, backgroundColor: Colors.bgSurface2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  flagLg: { width: 60, height: 60, borderRadius: Radius.circle, backgroundColor: Colors.bgSurface2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});

export const TabBarStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bgSurface2,
    borderTopWidth: 0.5,
    borderTopColor: Colors.bgBorder,
    paddingBottom: 28,
    paddingTop: 10,
    paddingHorizontal: Spacing.xl,
  },
  item: { alignItems: 'center', justifyContent: 'center', flex: 1, gap: 4 },
  labelActive: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.accent },
  labelInactive: { fontSize: FontSize.xs, fontWeight: FontWeight.regular, color: Colors.textTertiary },
  activeIndicator: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.accent, marginBottom: 2 },
});

export const LayoutStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bgDeep },
  screenPadded: { flex: 1, backgroundColor: Colors.bgDeep, paddingHorizontal: Spacing.screenPadding },
  section: { marginBottom: Spacing.sectionGap },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  center: { alignItems: 'center', justifyContent: 'center' },
  divider: { height: 0.5, backgroundColor: Colors.bgBorder, marginVertical: Spacing.md },
});

// ── 12. THEME OBJECT (single export) ───────────────────────────────────────
export const Theme = {
  colors: Colors,
  gradients: Gradients,
  spacing: Spacing,
  radius: Radius,
  fontSize: FontSize,
  fontWeight: FontWeight,
  lineHeight: LineHeight,
  letterSpacing: LetterSpacing,
  textStyles: TextStyles,
  shadows: Shadows,
  borders: Borders,
  cards: CardStyles,
  buttons: ButtonStyles,
  badges: BadgeStyles,
  inputs: InputStyles,
  avatars: AvatarStyles,
  tabBar: TabBarStyles,
  layout: LayoutStyles,
  animation: Animation,
  breakpoints: Breakpoints,
} as const;

export type AppTheme = typeof Theme;
export default Theme;

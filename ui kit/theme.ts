// ============================================================
// ClutchTime Design System — theme.ts
// Dark Athletic Premium | React Native
// ============================================================

export const Colors = {
  // ── Backgrounds ──────────────────────────────────────────
  bgDeep:      '#0D0D0D',   // Status bar / deepest layer
  bgPrimary:   '#111111',   // Main screen background
  bgSecondary: '#1A1A1A',   // Section backgrounds
  bgSurface:   '#222222',   // Card / row surfaces
  bgElevated:  '#2A2A2A',   // Elevated components
  bgHover:     '#333333',   // Pressed / hover states

  // ── Text ─────────────────────────────────────────────────
  textPrimary:   '#FFFFFF',  // Headlines, scores, times
  textSecondary: '#CCCCCC',  // Team names, labels
  textMuted:     '#888888',  // Records, metadata
  textDisabled:  '#555555',  // Inactive tabs, placeholders

  // ── Accent ───────────────────────────────────────────────
  accentLime:      '#d7d95e',              // Primary accent — active states
  accentLimeDark:  '#b3b54f',              // Pressed lime
  accentLimeAlpha: 'rgba(215,217,94,0.12)', // Lime tinted bg
  liveRed:         '#E03030',              // Live indicator
  liveRedBg:       'rgba(224,48,48,0.1)',  // Live card tinted bg
  liveRedGlow:     'rgba(224,48,48,0.3)',  // Live card shadow glow

  // ── Borders ──────────────────────────────────────────────
  borderSubtle:  '#2A2A2A',  // Very subtle dividers
  borderDefault: '#3A3A3A',  // Default card borders
  borderStrong:  '#555555',  // Emphasized borders
  borderLive:    '#E03030',  // Live card border
  borderActive:  '#FFFFFF',  // Active tab underline

  // ── Semantic ─────────────────────────────────────────────
  success: '#4ADE80',
  warning: '#FACC15',
  error:   '#F87171',
  info:    '#60A5FA',
} as const;

// ── Spacing (base 4px grid) ───────────────────────────────
export const Spacing = {
  px:  1,
  0.5: 2,
  1:   4,
  2:   8,
  3:   12,
  4:   16,
  5:   20,
  6:   24,
  8:   32,
  10:  40,
  12:  48,
  16:  64,
} as const;

// ── Border Radius ─────────────────────────────────────────
export const Radius = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   14,
  xl:   16,
  '2xl': 24,
  pill: 9999,
} as const;

// ── Border Width ─────────────────────────────────────────
export const BorderWidth = {
  default: 1,
  live:    1.5,
  active:  2,
} as const;

// ── Typography ───────────────────────────────────────────
export const FontSize = {
  micro:   9,    // Wins-Losses record
  caption: 10,   // League name, metadata
  label:   12,
  tab:     13,   // Sport filter tabs
  teamAbbr:13,   // Team abbreviations (GSW, BOS)
  body:    14,
  h2:      16,
  h1:      20,
  time:    18,   // Upcoming game time
  score:   28,   // Live score digits
  appName: 24,   // CLUTCHTIME wordmark
} as const;

export const FontWeight = {
  regular:  '400' as const,
  semibold: '600' as const,
  bold:     '700' as const,
  black:    '800' as const,
} as const;

export const LetterSpacing = {
  tight:  -0.5,  // App name
  normal:  0,
  score:   0.05, // Score digits (em → multiply by fontSize)
  wide:    0.08, // Uppercase labels
} as const;

export const LineHeight = {
  tight:   1.1,
  normal:  1.4,
  relaxed: 1.6,
} as const;

// ── Shadow / Elevation ───────────────────────────────────
export const Shadow = {
  card: {
    shadowColor:   '#000000',
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius:  8,
    elevation:     6,
  },
  nav: {
    shadowColor:   '#000000',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius:  24,
    elevation:     20,
  },
  liveGlow: {
    shadowColor:   '#E03030',
    shadowOffset:  { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius:  16,
    elevation:     8,
  },
} as const;

// ── Animation ────────────────────────────────────────────
export const Duration = {
  fast:   150,
  normal: 250,
  slow:   400,
} as const;

// ── Component Presets ────────────────────────────────────
export const ComponentTokens = {
  leaguePill: {
    size:         48,
    borderRadius: Radius.pill,
    borderWidth:  BorderWidth.default,
    borderColor:  '#333333',
  },
  sportTab: {
    paddingHorizontal: Spacing[4],
    paddingVertical:   Spacing[1] + 2, // 6px
    borderRadius:      Radius.pill,
    active:   { bg: Colors.accentLime,  text: '#111111' },
    inactive: { bg: '#252525', text: Colors.textDisabled, border: '#333333' },
  },
  liveCard: {
    bg:           '#1E1E1E',
    borderWidth:  BorderWidth.live,
    borderColor:  Colors.liveRed,
    borderRadius: Radius.lg,
    padding:      Spacing[4] - 2, // 14px
  },
  gameRow: {
    bg:             Colors.bgSurface,
    borderRadius:   Radius.md,
    paddingVertical:   Spacing[3],
    paddingHorizontal: Spacing[4],
  },
  bottomNav: {
    bg:                Colors.bgElevated,
    borderRadius:      32,
    borderWidth:       BorderWidth.default,
    borderColor:       Colors.borderSubtle,
    paddingHorizontal: Spacing[6],
    paddingVertical:   Spacing[2] + 2, // 10px
    gap:               28,
    iconSize:          20,
    iconActive:        Colors.textPrimary,
    iconInactive:      Colors.textDisabled,
    dotColor:          Colors.accentLime,
    dotSize:           4,
    bottomOffset:      16,
  },
  timelineTab: {
    active:   { color: Colors.textPrimary,  fontWeight: FontWeight.bold,    borderBottomWidth: 2, borderBottomColor: Colors.textPrimary },
    inactive: { color: Colors.textDisabled, fontWeight: FontWeight.semibold, borderBottomWidth: 0 },
  },
} as const;

// ── Full Theme Export ────────────────────────────────────
const theme = {
  colors:     Colors,
  spacing:    Spacing,
  radius:     Radius,
  borderWidth:BorderWidth,
  fontSize:   FontSize,
  fontWeight: FontWeight,
  letterSpacing: LetterSpacing,
  lineHeight: LineHeight,
  shadow:     Shadow,
  duration:   Duration,
  components: ComponentTokens,
} as const;

export type Theme = typeof theme;
export default theme;

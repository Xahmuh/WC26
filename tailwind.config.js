// NativeWind tokens are sourced from the design system's PURE token module so
// the utility classes (bg-accent, border-bgBorder, text-textSecondary …) can
// never drift from constants/theme/design-system.ts. We require ./tokens (not
// the design-system entry) because tailwind loads this config under Node/jiti,
// where react-native — imported by design-system.ts — cannot be evaluated.
const { Colors, Spacing } = require('./constants/theme/tokens');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Brand colors come from the design system (bg-accent, border-bgBorder,
      // text-textSecondary, …). Named spacing tokens (p-lg, gap-md) are added
      // alongside Tailwind's numeric scale, which is kept intact for p-4 etc.
      // The kit's font-size / radius scales stay available via `Theme` for the
      // few inline style props that can't be expressed as a className.
      colors: Colors,
      spacing: Spacing,
    },
  },
  plugins: [],
};

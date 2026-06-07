// ============================================================================
// Responsive scaling helpers.
// ----------------------------------------------------------------------------
// Sizes in the design are authored against a 375pt-wide baseline (standard
// phone). `scale`/`ms` adapt them to the actual device width so the UI is
// proportional on small phones and large phones/tablets without hardcoding
// breakpoints everywhere. Use the `useResponsive` hook in components so layout
// reacts to rotation / split-screen.
// ============================================================================

import { Dimensions, PixelRatio, useWindowDimensions } from 'react-native';

const BASE_WIDTH = 375;
// Clamp so tablets don't blow sizes up and tiny devices stay legible.
const MIN_FACTOR = 0.85;
const MAX_FACTOR = 1.35;

function factorFor(width: number): number {
  return Math.min(MAX_FACTOR, Math.max(MIN_FACTOR, width / BASE_WIDTH));
}

/** Linear scale against the current (static) screen width. */
export function scale(size: number, width = Dimensions.get('window').width): number {
  return PixelRatio.roundToNearestPixel(size * factorFor(width));
}

/**
 * Moderate scale — only applies a fraction of the scaling so fonts/spacing grow
 * gently. `factor` 0 = no scaling, 1 = full linear scaling.
 */
export function ms(size: number, factor = 0.5, width = Dimensions.get('window').width): number {
  return PixelRatio.roundToNearestPixel(size + (scale(size, width) - size) * factor);
}

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export interface Responsive {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isMobile: boolean;
  isSmall: boolean; // narrow phones (<360)
  isLarge: boolean; // large phones / small tablets (>=600)
  isTablet: boolean; // >=768
  isDesktop: boolean; // >=1280
  isLandscape: boolean;
  /** Grid column count for card layouts. */
  columns: number;
  /** Max content width for centered layouts. */
  containerMaxWidth: number;
  /** Linear scale bound to the live window width. */
  scale: (size: number) => number;
  /** Moderate scale bound to the live window width. */
  ms: (size: number, factor?: number) => number;
}

/** Live, rotation-aware responsive info + bound scalers. */
export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();
  const breakpoint: Breakpoint =
    width >= 1280 ? 'desktop' : width >= 768 ? 'tablet' : 'mobile';
  const isTablet = width >= 768;
  const isDesktop = breakpoint === 'desktop';

  return {
    width,
    height,
    breakpoint,
    isMobile: breakpoint === 'mobile',
    isSmall: width < 360,
    isLarge: width >= 600,
    isTablet,
    isDesktop,
    isLandscape: width > height,
    columns: isDesktop ? 4 : isTablet ? 3 : 2,
    containerMaxWidth: isDesktop ? 1200 : isTablet ? 768 : width,
    scale: (size: number) => scale(size, width),
    ms: (size: number, factor = 0.5) => ms(size, factor, width),
  };
}

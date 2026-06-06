// ============================================================================
// TrophyBadge — the tier icon that sits above a podium avatar.
// ----------------------------------------------------------------------------
// Renders a coloured trophy (gold by default) with a subtle, continuous
// "floating" loop (gentle vertical bob). Animation is driven by the React
// Native Animated API with the native driver — matching the rest of the app
// (see app/(auth)/splash.tsx, components/ui/FloatingTabBar.tsx).
// ============================================================================

import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import Theme from '@/constants/theme/design-system';

export interface TrophyBadgeProps {
  /** Tier colour (e.g. gold / silver / bronze). Defaults to gold. */
  color?: string;
  /** Baseline icon size in pt (responsively scaled by Icon). Default 26. */
  size?: number;
  /** Disable the floating loop (e.g. for reduced-motion). Default true. */
  animated?: boolean;
}

export function TrophyBadge({
  color = Theme.colors.gold,
  size = 26,
  animated = true,
}: TrophyBadgeProps): React.JSX.Element {
  const offset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(offset, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(offset, { toValue: 0, duration: 1100, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animated, offset]);

  const translateY = offset.interpolate({ inputRange: [0, 1], outputRange: [0, -4] });

  return (
    <Animated.View style={{ transform: [{ translateY }] }}>
      <Icon name="trophy" size={size} color={color} />
    </Animated.View>
  );
}

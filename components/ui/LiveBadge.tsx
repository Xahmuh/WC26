import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import Theme from '@/constants/theme/design-system';

interface LiveBadgeProps {
  label?: string;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function LiveBadge({
  label = 'LIVE',
  compact = false,
  style,
}: LiveBadgeProps): React.JSX.Element {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 750,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 750,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const dotScale = pulse.interpolate({
    inputRange: [0.45, 1],
    outputRange: [0.75, 1.18],
  });

  return (
    <Animated.View style={[styles.badge, compact && styles.compactBadge, style]}>
      <Animated.View
        style={[
          styles.dot,
          compact && styles.compactDot,
          { opacity: pulse, transform: [{ scale: dotScale }] },
        ]}
      />
      <Text style={[styles.label, compact && styles.compactLabel]}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 76, 76, 0.38)',
    backgroundColor: 'rgba(255, 76, 76, 0.15)',
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  compactBadge: {
    minHeight: 20,
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Theme.colors.live,
  },
  compactDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  label: {
    color: Theme.colors.live,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  compactLabel: {
    fontSize: 9,
    letterSpacing: 0.5,
  },
});

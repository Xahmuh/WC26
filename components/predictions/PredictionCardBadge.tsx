import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import Theme from '@/constants/theme/design-system';
import { ms } from '@/lib/responsive';

interface Props {
  points: number;
  isLocked: boolean;
  large?: boolean;
  sizeOverride?: number;
}

export function PredictionCardBadge({
  points,
  isLocked,
  large = false,
  sizeOverride,
}: Props): React.JSX.Element {
  const size     = sizeOverride ?? (large ? ms(90) : ms(62));
  const fontSize = large ? ms(26) : ms(17);
  const label    = points > 0 ? `+${points}` : `${points}`;

  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: large ? 2.5 : 1.5,
          backgroundColor: isLocked ? '#0A0F18' : '#121E36', // solid dark backgrounds
          borderColor: isLocked ? '#1A2C4C' : Theme.colors.accent, // solid borders
          // lime glow when open
          shadowColor: isLocked ? 'transparent' : Theme.colors.accent,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: isLocked ? 0 : 0.45,
          shadowRadius: 12,
          elevation: isLocked ? 0 : 8,
        },
      ]}
    >
      <Text
        style={[
          styles.pointsText,
          {
            fontSize,
            lineHeight: fontSize * 1.2,
            color: isLocked ? Theme.colors.textTertiary : Theme.colors.accent, // lime text when open
          },
        ]}
        accessibilityLabel={`${points} points reward`}
        accessibilityRole="text"
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pointsText: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
});
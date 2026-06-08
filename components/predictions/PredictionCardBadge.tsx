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
}: Props): React.JSX.Element {
  const fontSize = large ? ms(28) : ms(20);
  const label    = points > 0 ? `+${points}` : `${points}`;
  const accentColor = isLocked ? Theme.colors.textSecondary : Theme.colors.accent;

  return (
    <View
      style={[
        styles.pointsPlate,
        large ? styles.pointsPlateLarge : null,
        isLocked ? styles.pointsPlateLocked : styles.pointsPlateOpen,
      ]}
    >
      <View style={styles.sideRail} />
      <View style={styles.textStack}>
        <Text style={[styles.eyebrow, { color: isLocked ? Theme.colors.textTertiary : 'rgba(255,255,255,0.72)' }]}>
          POINTS
        </Text>
        <Text
          style={[
            styles.pointsText,
            {
              fontSize,
              lineHeight: fontSize * 1.05,
              color: accentColor,
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
    </View>
  );
}

const styles = StyleSheet.create({
  pointsPlate: {
    minWidth: ms(92),
    minHeight: ms(48),
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(8),
    paddingHorizontal: ms(12),
    paddingVertical: ms(8),
    borderRadius: ms(16),
    borderWidth: 1,
    overflow: 'hidden',
  },
  pointsPlateLarge: {
    minWidth: ms(126),
    minHeight: ms(58),
    borderRadius: ms(18),
  },
  pointsPlateOpen: {
    backgroundColor: 'rgba(0,0,0,0.54)',
    borderColor: 'rgba(215,217,94,0.34)',
  },
  pointsPlateLocked: {
    backgroundColor: 'rgba(0,0,0,0.42)',
    borderColor: 'rgba(255,255,255,0.14)',
  },
  sideRail: {
    width: ms(3),
    alignSelf: 'stretch',
    borderRadius: ms(3),
    backgroundColor: Theme.colors.accent,
    opacity: 0.9,
  },
  textStack: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: ms(8),
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  pointsText: {
    fontWeight: '900',
    letterSpacing: -0.8,
  },
});

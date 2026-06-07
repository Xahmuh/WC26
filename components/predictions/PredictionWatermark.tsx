import React from 'react';
import { View, StyleSheet } from 'react-native';

import Theme from '@/constants/theme/design-system';
import { Icon, type IconName } from '@/components/ui/Icon';
import { ms } from '@/lib/responsive';

const ICON_SIZE = 72;

function inferWatermarkIcon(questionText: string): IconName {
  const text = questionText.toLowerCase();
  if (text.includes('campion') || text.includes('champion') || text.includes('بطل') || text.includes('winner') || text.includes('win the')) return 'trophy';
  if (text.includes('scorer') || text.includes('هداف') || text.includes('top scorer') || text.includes('golden boot') || text.includes('goals')) return 'football';
  if (text.includes('gk') || text.includes('حارس') || text.includes('goalkeeper') || text.includes('keeper')) return 'glove';
  if (text.includes('player') || text.includes('لاعب') || text.includes('best ') || text.includes('mvp')) return 'shirt'; // Note: Ionicons doesn't have a football boot, so 'shirt' is used for players.
  if (text.includes('stage') || text.includes('group') || text.includes('round') || text.includes('qualify')) return 'layersIcon';
  if (text.includes('stadium') || text.includes('venue') || text.includes('place') || text.includes('match')) return 'compassIcon';
  return 'shieldHalf';
}

interface Props {
  questionText: string;
}

export function PredictionWatermark({ questionText }: Props): React.JSX.Element {
  const iconName = inferWatermarkIcon(questionText);

  return (
    <View
      style={styles.container}
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {/* Geometric accent — thin cross lines behind icon */}
      <View style={styles.crossHorizontal} />
      <View style={styles.crossVertical} />

      {/* Main icon */}
      <Icon name={iconName} size={ICON_SIZE} color={Theme.colors.textPrimary} fixed />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: -ms(10),
    right: -ms(10),
    opacity: 0.07,
    transform: [{ rotate: '-15deg' }],
    zIndex: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crossHorizontal: {
    position: 'absolute',
    width: ICON_SIZE * 1.6,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  crossVertical: {
    position: 'absolute',
    width: 1,
    height: ICON_SIZE * 1.6,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
});
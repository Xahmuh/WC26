import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import Theme from '@/constants/theme/design-system';
import { Icon } from '@/components/ui/Icon';
import { ms } from '@/lib/responsive';
import { useCountdown } from '@/hooks/useCountdown';

export type PredictionCardStatus = 'open' | 'submitted' | 'closed';

interface Props {
  status: PredictionCardStatus;
  closesAt?: string;
}

export function PredictionStatusChip({ status, closesAt }: Props): React.JSX.Element {
  const countdown = useCountdown(status !== 'closed' ? closesAt || '' : '');

  if (status === 'closed') {
    return (
      <View
        style={[styles.chip, styles.chipLocked]}
        accessible
        accessibilityLabel="Prediction locked"
      >
        <Icon name="lock" size={11} color={Theme.colors.textTertiary} fixed />
        <Text style={[styles.chipText, { color: Theme.colors.textTertiary }]}>Locked</Text>
      </View>
    );
  }

  let countdownLabel = '';
  if (closesAt && !countdown.isElapsed) {
    if (countdown.days > 0)       countdownLabel = `${countdown.days}d ${countdown.hours}h`;
    else if (countdown.hours > 0) countdownLabel = `${countdown.hours}h ${countdown.minutes}m`;
    else                          countdownLabel = `${countdown.minutes}m`;
  }

  const displayLabel = countdownLabel || (closesAt ? 'Closing' : 'Open');

  return (
    <View
      style={[styles.chip, styles.chipOpen]}
      accessible
      accessibilityLabel={`Closes in ${displayLabel}`}
    >
      <Text style={[styles.chipText, { color: Theme.colors.accent }]}>{displayLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(3),
    paddingHorizontal: ms(8),
    paddingVertical: ms(4),
    borderRadius: ms(20),
    borderWidth: 1,
  },
  chipOpen: {
    backgroundColor: Theme.colors.accentDim,
    borderColor: Theme.colors.accentBorder,
  },
  chipLocked: {
    backgroundColor: '#0A1324',
    borderColor: '#1A2C4C',
  },
  chipText: {
    fontSize: ms(10),
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
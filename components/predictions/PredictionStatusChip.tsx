import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import Theme from '@/constants/theme/design-system';
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
        <Text style={[styles.chipText, { color: '#CBD5E1' }]}>Locked</Text>
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
      style={[styles.chip, status === 'submitted' ? styles.chipSubmitted : styles.chipOpen]}
      accessible
      accessibilityLabel={`Closes in ${displayLabel}`}
    >
      <Text style={[styles.chipText, { color: Theme.colors.accent }]}>
        {displayLabel}
      </Text>
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
    backgroundColor: 'rgba(0,0,0,0.58)',
    borderColor: 'rgba(215,217,94,0.38)',
  },
  chipSubmitted: {
    backgroundColor: 'rgba(0,0,0,0.58)',
    borderColor: 'rgba(215,217,94,0.38)',
  },
  chipLocked: {
    backgroundColor: 'rgba(15,23,42,0.58)',
    borderColor: 'rgba(203,213,225,0.24)',
  },
  chipText: {
    fontSize: ms(10),
    fontWeight: '800',
    letterSpacing: 0.35,
  },
});

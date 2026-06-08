import { StyleSheet, Text, View } from 'react-native';

import { Colors, Layout, Typography } from '@/constants';

type StatusType = 'open' | 'answered' | 'closed' | 'live' | 'upcoming' | 'finished';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
}

const STATUS_CONFIG: Record<StatusType, { bg: string; text: string; label: string }> = {
  open: { bg: Colors.accent.limeLight, text: Colors.accent.lime, label: 'Open' },
  answered: { bg: 'rgba(136,136,136,0.15)', text: Colors.text.secondary, label: 'Answered' },
  closed: { bg: 'rgba(224,48,48,0.15)', text: Colors.red, label: 'Closed' },
  live: { bg: 'rgba(224,48,48,0.15)', text: Colors.red, label: 'LIVE' },
  upcoming: { bg: Colors.accent.limeLight, text: Colors.accent.lime, label: 'Upcoming' },
  finished: { bg: 'rgba(85,85,85,0.2)', text: Colors.text.tertiary, label: 'Finished' },
};

export function StatusBadge({ status, label }: StatusBadgeProps): React.JSX.Element {
  const config = STATUS_CONFIG[status];
  return (
    <View style={[styles.container, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.text }]}>{label ?? config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Layout.borderRadius.sm,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});


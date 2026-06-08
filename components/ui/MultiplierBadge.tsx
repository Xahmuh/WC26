import { StyleSheet, Text, View } from 'react-native';

import { Colors, Layout, Typography } from '@/constants';

interface MultiplierBadgeProps {
  value: number;
  size?: 'sm' | 'md';
}

export function MultiplierBadge({ value, size = 'md' }: MultiplierBadgeProps): React.JSX.Element {
  return (
    <View style={[styles.container, size === 'sm' && styles.containerSm]}>
      <Text style={[styles.text, size === 'sm' && styles.textSm]}>X{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1.5,
    borderColor: Colors.multiplier.border,
    borderRadius: Layout.borderRadius.sm,
    backgroundColor: Colors.multiplier.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    writingDirection: 'ltr',
  },
  containerSm: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  text: {
    color: Colors.multiplier.text,
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.5,
  },
  textSm: {
    fontSize: Typography.size.xs,
  },
});

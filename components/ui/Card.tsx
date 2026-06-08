import { View, type ViewProps, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';

import { Colors, Layout, Shadows } from '@/constants';

type CardVariant = 'default' | 'elevated' | 'accent';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: number;
  style?: StyleProp<ViewStyle>;
}

export function Card({
  children,
  className,
  variant = 'default',
  padding = Layout.cardPaddingH,
  style,
  ...rest
}: CardProps): React.JSX.Element {
  return (
    <View
      className={['overflow-hidden', className ?? ''].join(' ').trim()}
      style={[
        styles.base,
        variant === 'elevated' && styles.elevated,
        variant === 'accent' && styles.accent,
        { padding },
        Shadows.card,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: 'rgba(16, 20, 20, 0.86)',
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(215, 217, 94, 0.22)',
  },
  elevated: {
    backgroundColor: 'rgba(22, 27, 27, 0.94)',
    borderColor: Colors.border.active,
  },
  accent: {
    backgroundColor: Colors.background.card,
    borderColor: Colors.accent.lime,
    borderWidth: 1.5,
  },
});

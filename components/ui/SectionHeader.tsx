import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Colors, Layout, Typography } from '@/constants';
import { Icon } from '@/components/ui/Icon';
import { useResponsive } from '@/lib/responsive';

interface SectionHeaderProps {
  title: string;
  badge?: number;
  onViewAll?: () => void;
  rightContent?: React.ReactNode;
  style?: ViewStyle;
}

export function SectionHeader({
  title,
  badge,
  onViewAll,
  rightContent,
  style,
}: SectionHeaderProps): React.JSX.Element {
  const { isSmall } = useResponsive();
  const viewAllLabel = isSmall ? 'All' : 'View All';

  return (
    <View style={[styles.container, style]}>
      <View style={styles.left}>
        <Text style={[styles.title, isSmall && styles.titleSmall]} numberOfLines={1}>
          {title}
        </Text>
        {typeof badge === 'number' && badge >= 0 ? (
          <View style={[styles.badge, isSmall && styles.badgeSmall]}>
            <Text style={[styles.badgeText, isSmall && styles.badgeTextSmall]}>{badge}</Text>
          </View>
        ) : null}
      </View>
      {rightContent ??
        (onViewAll ? (
          <Pressable
            onPress={onViewAll}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="View all"
            style={({ pressed }) => [
              styles.viewAllButton,
              isSmall && styles.viewAllButtonSmall,
              pressed && styles.viewAllButtonPressed,
            ]}
          >
            <Text
              style={[styles.viewAllText, isSmall && styles.viewAllTextSmall]}
              numberOfLines={1}
            >
              {viewAllLabel}
            </Text>
            <View style={styles.viewAllIcon}>
              <Icon name="forward" size={12} color={Colors.background.primary} fixed />
            </View>
          </Pressable>
        ) : null)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  title: {
    color: Colors.text.primary,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0,
    flexShrink: 1,
  },
  titleSmall: {
    fontSize: Typography.size.lg,
  },
  badge: {
    backgroundColor: Colors.accent.lime,
    borderRadius: Layout.borderRadius.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeSmall: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
  },
  badgeText: {
    color: Colors.background.primary,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
  },
  badgeTextSmall: {
    fontSize: 9,
  },
  viewAllButton: {
    minHeight: 36,
    minWidth: 92,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: Layout.borderRadius.full,
    borderWidth: 1,
    borderColor: Colors.accent.limeBorder,
    backgroundColor: Colors.accent.limeLight,
    paddingLeft: 12,
    paddingRight: 6,
    flexShrink: 0,
  },
  viewAllButtonSmall: {
    minHeight: 34,
    minWidth: 62,
    gap: 6,
    paddingLeft: 10,
    paddingRight: 5,
  },
  viewAllButtonPressed: {
    opacity: 0.82,
  },
  viewAllText: {
    color: Colors.accent.lime,
    fontSize: 12,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  viewAllTextSmall: {
    fontSize: 11,
  },
  viewAllIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent.lime,
  },
});

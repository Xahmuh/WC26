import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { Card, SkeletonBox } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { Colors, Layout, Typography } from '@/constants';
import { useResponsive } from '@/lib/responsive';
import { useUserPerformance } from '@/hooks/useUserPerformance';
import { useAuthStore } from '@/stores/auth.store';

interface PerformancePreviewProps {
  style?: ViewStyle;
}

export function PerformancePreview({ style }: PerformancePreviewProps): React.JSX.Element {
  const router = useRouter();
  const { isSmall } = useResponsive();
  const userId = useAuthStore((s) => s.session?.user.id);
  const { kpis, loading, error, reload } = useUserPerformance(userId);

  useFocusEffect(
    useCallback(() => {
      reload?.();
    }, [reload])
  );

  if (loading) {
    return (
      <Card style={[styles.card, style]} padding={16}>
        <SkeletonBox width="68%" height={12} style={{ alignSelf: 'center' }} />
        <SkeletonBox width={52} height={52} borderRadius={26} style={{ marginTop: 14, alignSelf: 'center' }} />
        <View style={styles.statsRow}>
          {[0, 1, 2].map((index) => (
            <View key={index} style={styles.loadingStat}>
              <SkeletonBox width="80%" height={10} />
              <SkeletonBox width="60%" height={16} style={{ marginTop: 8 }} />
            </View>
          ))}
        </View>
      </Card>
    );
  }

  if (error) {
    return (
      <Card style={[styles.card, style]} padding={16}>
        <Text style={styles.title}>YOUR PERFORMANCE</Text>
        <Text style={styles.errorText}>{error}</Text>
      </Card>
    );
  }

  const accuracy = kpis ? `${kpis.accuracyRate}%` : '-';
  const exactScore = kpis ? `${kpis.exactScoreAccuracy}%` : '-';
  const bestStreak = kpis?.streak.current_streak ? `${kpis.streak.current_streak}` : '0';

  return (
    <Card style={[styles.card, style]} padding={16}>
      <View style={styles.body}>
        <Text style={styles.title}>YOUR PERFORMANCE</Text>

        <View style={styles.iconWrap}>
          <Icon name="trendingUp" size={20} color={Colors.accent.lime} />
        </View>

        <View style={styles.statsRow}>
          <Stat label="Accuracy" value={accuracy} compact={isSmall} />
          <Stat label="Exact Score" value={exactScore} compact={isSmall} />
          <Stat label="Best Streak" value={bestStreak} compact={isSmall} />
        </View>
      </View>

      <Pressable
        onPress={() => router.push('/user-performance' as never)}
        accessibilityRole="button"
        style={styles.button}
      >
        <Text style={styles.buttonText}>{'View Details >'}</Text>
      </Pressable>
    </Card>
  );
}

function Stat({
  label,
  value,
  compact,
}: {
  label: string;
  value: string;
  compact: boolean;
}): React.JSX.Element {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, compact && styles.statValueCompact]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.background.card,
    borderColor: Colors.border.default,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  body: {
    width: '100%',
    alignItems: 'center',
  },
  title: {
    color: Colors.accent.lime,
    fontSize: 11,
    fontWeight: Typography.weight.black,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  iconWrap: {
    marginTop: 14,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.background.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  statsRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    alignSelf: 'stretch',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  statValue: {
    color: Colors.text.primary,
    fontSize: 18,
    fontWeight: Typography.weight.black,
    lineHeight: 22,
  },
  statValueCompact: {
    fontSize: 16,
    lineHeight: 20,
  },
  statLabel: {
    marginTop: 4,
    color: Colors.text.secondary,
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    textAlign: 'center',
    lineHeight: 14,
  },
  button: {
    marginTop: 14,
    minHeight: 44,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Layout.borderRadius.full,
    borderWidth: 1,
    borderColor: Colors.accent.limeBorder,
    paddingVertical: 12,
    backgroundColor: Colors.accent.limeLight,
  },
  buttonText: {
    color: Colors.accent.lime,
    fontSize: 12,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.4,
  },
  errorText: {
    marginTop: 10,
    color: Colors.text.secondary,
    fontSize: Typography.size.sm,
    textAlign: 'center',
  },
  loadingStat: {
    flex: 1,
    minWidth: 0,
  },
});

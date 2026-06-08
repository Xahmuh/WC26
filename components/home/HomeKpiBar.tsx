import { useCallback, useMemo, type ReactNode } from 'react';
import { Platform, Text, View, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { Card, SkeletonBox } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { Colors, Typography } from '@/constants';
import { useResponsive } from '@/lib/responsive';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useMyPredictions } from '@/hooks/usePredictions';
import { useUserPerformance } from '@/hooks/useUserPerformance';
import { useAuthStore } from '@/stores/auth.store';

interface KpiItemProps {
  icon: ReactNode;
  value: string | number;
  label: string;
  compact?: boolean;
}

function KpiItem({ icon, value, label, compact = false }: KpiItemProps): React.JSX.Element {
  return (
    <View style={styles.item}>
      <View style={[styles.iconBadge, compact && styles.iconBadgeCompact]}>{icon}</View>

      <View style={styles.metricRow}>
        <Text
          style={[styles.value, compact && styles.valueCompact]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.72}
        >
          {value}
        </Text>
      </View>

      <Text
        style={[styles.label, compact && styles.labelCompact]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
      >
        {label}
      </Text>
    </View>
  );
}

export function HomeKpiBar(): React.JSX.Element {
  const profile = useAuthStore((s) => s.profile);
  const userId = useAuthStore((s) => s.session?.user.id);
  const leaderboardQuery = useLeaderboard();
  const predictionsQuery = useMyPredictions();
  const performanceQuery = useUserPerformance(userId);
  const { isSmall } = useResponsive();
  const refetchLeaderboard = leaderboardQuery.refetch;
  const refetchPredictions = predictionsQuery.refetch;
  const reloadPerformance = performanceQuery.reload;

  const currentRank = useMemo(
    () => leaderboardQuery.data?.find((entry) => entry.user_id === userId)?.rank ?? null,
    [leaderboardQuery.data, userId]
  );

  const isLoading =
    leaderboardQuery.isLoading ||
    predictionsQuery.isLoading ||
    performanceQuery.loading ||
    !profile;

  const errorMessage = leaderboardQuery.error?.message ?? null;

  useFocusEffect(
    useCallback(() => {
      void refetchLeaderboard();
      void refetchPredictions();
      reloadPerformance();
    }, [refetchLeaderboard, refetchPredictions, reloadPerformance])
  );

  const totalPoints = profile?.total_points ?? 0;
  const predictions = predictionsQuery.data?.size ?? 0;
  const dayStreak = performanceQuery.kpis?.streak.current_streak ?? 0;

  const items = [
    {
      key: 'points',
      icon: <Icon name="star" size={18} color={Colors.accent.lime} />,
      value: totalPoints,
      label: 'Points',
    },
    {
      key: 'rank',
      icon: <Icon name="trophy" size={18} color={Colors.accent.lime} />,
      value: currentRank ?? '-',
      label: 'Rank',
    },
    {
      key: 'predictions',
      icon: <Icon name="target" size={18} color={Colors.accent.lime} />,
      value: predictions,
      label: 'Picks',
    },
    {
      key: 'streak',
      icon: <Icon name="flame" size={18} color={Colors.accent.lime} />,
      value: dayStreak,
      label: 'Streak',
    },
  ];

  if (isLoading) {
    return (
      <Card style={styles.card} padding={0}>
        <View style={styles.row}>
          {Array.from({ length: 4 }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.segment,
                isSmall && styles.segmentCompact,
                index !== 0 ? styles.segmentWithDivider : null,
              ]}
            >
              <View style={styles.skeletonItem}>
                <SkeletonBox width={24} height={24} borderRadius={12} />
                <View style={styles.metricRow}>
                  <SkeletonBox width="68%" height={28} />
                </View>
                <SkeletonBox width="58%" height={10} />
              </View>
            </View>
          ))}
        </View>
      </Card>
    );
  }

  if (errorMessage) {
    return (
      <Card style={styles.errorCard} padding={14}>
        <Text style={styles.errorTitle}>Stats unavailable</Text>
        <Text style={styles.errorBody}>{errorMessage}</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card} padding={0}>
      <View style={styles.row}>
        {items.map((item, index) => (
          <View
            key={item.key}
            style={[
              styles.segment,
              isSmall && styles.segmentCompact,
              index !== 0 ? styles.segmentWithDivider : null,
            ]}
          >
            <KpiItem icon={item.icon} value={item.value} label={item.label} compact={isSmall} />
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background.card,
    borderColor: Colors.accent.limeBorder,
    ...Platform.select({
      web: { boxShadow: '0 4px 8px rgba(0, 0, 0, 0.4)' },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
  row: {
    flexDirection: 'row',
  },
  segment: {
    flexGrow: 1,
    flexBasis: 0,
    width: 0,
    paddingHorizontal: 8,
    paddingVertical: 12,
    minWidth: 0,
  },
  segmentCompact: {
    paddingHorizontal: 5,
    paddingVertical: 10,
  },
  segmentWithDivider: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: 'rgba(215, 217, 94, 0.22)',
  },
  item: {
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadge: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconBadgeCompact: {
    width: 24,
    height: 24,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    width: '100%',
    marginTop: 5,
  },
  value: {
    flexShrink: 1,
    color: Colors.text.primary,
    fontSize: 25,
    fontWeight: Typography.weight.black,
    lineHeight: 28,
    textAlign: 'center',
    minWidth: 0,
  },
  valueCompact: {
    fontSize: 20,
    lineHeight: 23,
  },
  label: {
    minWidth: 0,
    width: '100%',
    marginTop: 3,
    color: Colors.text.secondary,
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    lineHeight: 12,
    textAlign: 'center',
  },
  labelCompact: {
    fontSize: 9,
    lineHeight: 11,
  },
  skeletonItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  errorCard: {
    backgroundColor: Colors.background.card,
    borderColor: Colors.accent.limeBorder,
    ...Platform.select({
      web: { boxShadow: '0 4px 8px rgba(0, 0, 0, 0.4)' },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
  errorTitle: {
    color: Colors.text.primary,
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
  },
  errorBody: {
    marginTop: 6,
    color: Colors.text.secondary,
    fontSize: Typography.size.sm,
  },
});

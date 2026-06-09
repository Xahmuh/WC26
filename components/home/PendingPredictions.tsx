import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';

import { Card, MultiplierBadge, ProgressBar, SectionHeader, SkeletonBox, TeamFlag } from '@/components/ui';
import { Colors, Layout, Typography } from '@/constants';
import { Icon } from '@/components/ui/Icon';
import { useMatches } from '@/hooks/useMatches';
import { useMyPredictions } from '@/hooks/usePredictions';
import { formatShortMatchTime, isNotStartedMatch } from '@/components/home/homeUtils';
import { useResponsive } from '@/lib/responsive';

const COMPACT_AWAY_NAME_LENGTH = 13;

function getCompactAwayTeamName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length <= COMPACT_AWAY_NAME_LENGTH) return trimmed;

  return trimmed.split(/[\s-]+/)[0] || trimmed;
}

function getLockProgress(kickoffTime: string): number {
  const kickoff = new Date(kickoffTime).getTime();
  if (Number.isNaN(kickoff)) return 0;

  const remaining = kickoff - Date.now();
  const windowMs = 36 * 60 * 60 * 1000;

  return Math.min(Math.max(1 - remaining / windowMs, 0), 1);
}

function getMultiplierProgress(multiplier?: number): number {
  if (typeof multiplier !== 'number') return 0;
  return Math.min(Math.max((multiplier - 1) / 5, 0), 1);
}

function BarRow({
  label,
  value,
  progress,
  color,
}: {
  label: string;
  value: string;
  progress: number;
  color: string;
}): React.JSX.Element {
  return (
    <View style={styles.barBlock}>
      <View style={styles.barHeader}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={styles.barValue}>{value}</Text>
      </View>
      <ProgressBar progress={progress} height={5} color={color} backgroundColor={Colors.border.subtle} />
    </View>
  );
}

export function PendingPredictions({ isLoading = false }: { isLoading?: boolean }): React.JSX.Element {
  const router = useRouter();
  const responsive = useResponsive();
  const matchesQuery = useMatches();
  const predictionsQuery = useMyPredictions();
  const refetchMatches = matchesQuery.refetch;
  const refetchPredictions = predictionsQuery.refetch;

  useFocusEffect(
    useCallback(() => {
      void refetchMatches();
      void refetchPredictions();
    }, [refetchMatches, refetchPredictions])
  );

  const pendingState = useMemo(() => {
    const predictionMap = predictionsQuery.data ?? new Map<string, unknown>();
    const nowMs = Date.now();

    const pendingMatches = (matchesQuery.data ?? [])
      .filter((match) => isNotStartedMatch(match.status, match.kickoff_time, nowMs))
      .filter((match) => !predictionMap.has(match.id));

    return {
      totalPending: pendingMatches.length,
      rows: pendingMatches.slice(0, 3),
    };
  }, [matchesQuery.data, predictionsQuery.data]);

  const loading = isLoading || matchesQuery.isLoading || predictionsQuery.isLoading;
  const { rows, totalPending } = pendingState;

  if (loading) {
    return (
      <Card style={styles.card} padding={12}>
        <SectionHeader title="PENDING PREDICTIONS" badge={3} />
        <View style={styles.rows}>
          {[0, 1, 2].map((index) => (
            <View key={index} style={styles.loadingCard}>
              <View style={styles.loadingTopRow}>
                <SkeletonBox width={68} height={16} borderRadius={999} />
                <SkeletonBox width={78} height={14} />
              </View>

              <View style={styles.loadingTeamsRow}>
                <View style={styles.loadingTeam}>
                  <SkeletonBox width={26} height={20} borderRadius={5} />
                  <View style={styles.loadingTeamText}>
                    <SkeletonBox width="84%" height={11} />
                  </View>
                </View>
                <SkeletonBox width={24} height={14} borderRadius={7} />
                <View style={styles.loadingTeam}>
                  <SkeletonBox width={26} height={20} borderRadius={5} />
                  <View style={styles.loadingTeamText}>
                    <SkeletonBox width="84%" height={11} />
                  </View>
                </View>
              </View>

              <View style={styles.loadingBars}>
                <SkeletonBox width="48%" height={14} borderRadius={7} />
                <SkeletonBox width="48%" height={14} borderRadius={7} />
              </View>
            </View>
          ))}
        </View>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card style={styles.card} padding={12}>
        <SectionHeader title="PENDING PREDICTIONS" badge={0} />
        <View style={styles.emptyState}>
          <Icon name="checkCircle" size={18} color={Colors.accent.lime} />
          <Text style={styles.emptyText}>You're all caught up!</Text>
        </View>
      </Card>
    );
  }

  return (
      <Card style={styles.card} padding={12}>
        <SectionHeader
          title="PENDING PREDICTIONS"
          badge={totalPending}
          onViewAll={() => router.push('/profile/predictions?tab=PENDING' as never)}
        />

      <View style={styles.rows}>
        {rows.map((match) => {
          const firstTeam = match.home_team;
          const secondTeam = match.away_team;
          const compactAwayTeamName = getCompactAwayTeamName(secondTeam.name);
          const lockProgress = getLockProgress(match.kickoff_time);
          const multiplierProgress = getMultiplierProgress(match.points_multiplier);
          const flagSize = responsive.isSmall ? 22 : responsive.isLarge ? 28 : 24;

          return (
            <Pressable
              key={match.id}
              onPress={() => router.push(`/match/${match.id}` as never)}
              accessibilityRole="button"
              accessibilityLabel={`${firstTeam.name} versus ${secondTeam.name}. ${formatShortMatchTime(match.kickoff_time)}. ${match.points_multiplier}x multiplier.`}
              style={({ pressed }) => [styles.matchCard, pressed && styles.matchCardPressed]}
            >
              <View style={styles.cardTop}>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>PREDICT</Text>
                </View>

                <View style={styles.cardMeta}>
                  <Text style={styles.time} numberOfLines={1}>
                    {formatShortMatchTime(match.kickoff_time)}
                  </Text>
                  <MultiplierBadge value={match.points_multiplier} size="sm" />
                </View>
              </View>

              <View style={styles.matchupRow}>
                <View style={[styles.teamBlock, styles.teamBlockHome]}>
                  <View style={styles.teamCluster}>
                    <TeamFlag team={firstTeam} size={flagSize} fixed />
                    <Text style={styles.teamName} numberOfLines={1} ellipsizeMode="tail">
                      {firstTeam.name}
                    </Text>
                  </View>
                </View>

                <View style={styles.matchupCenterSpacer} />

                <View style={[styles.teamBlock, styles.teamBlockAway]}>
                  <View style={[styles.teamCluster, styles.teamClusterAway]}>
                    <TeamFlag team={secondTeam} size={flagSize} fixed />
                    <Text
                      style={[styles.teamName, styles.teamNameAway]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {compactAwayTeamName}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.cardBottom}>
                <View style={styles.barGrid}>
                  <BarRow
                    label="Lock"
                    value={`${Math.round(lockProgress * 100)}%`}
                    progress={lockProgress}
                    color={Colors.accent.lime}
                  />
                  <View style={styles.vsBetweenBars}>
                    <View style={styles.vsWrap}>
                      <Text style={styles.vs}>VS</Text>
                    </View>
                  </View>
                  <BarRow
                    label="Boost"
                    value={`${match.points_multiplier}x`}
                    progress={multiplierProgress}
                    color={Colors.gold}
                  />
                </View>
                <Icon name="forward" size={16} color={Colors.text.secondary} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background.card,
    borderColor: Colors.border.default,
  },
  rows: {
    gap: 8,
  },
  matchCard: {
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    backgroundColor: Colors.background.cardAlt,
    paddingVertical: 9,
    paddingHorizontal: 10,
    gap: 9,
  },
  matchCardPressed: {
    opacity: 0.9,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    minWidth: 0,
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.accent.limeBorder,
    backgroundColor: Colors.accent.limeLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillText: {
    color: Colors.accent.lime,
    fontSize: 9,
    fontWeight: Typography.weight.black,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
    flexShrink: 1,
  },
  time: {
    color: Colors.text.secondary,
    fontSize: 10,
    fontWeight: Typography.weight.medium,
    flexShrink: 1,
    textAlign: 'right',
  },
  matchupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minWidth: 0,
  },
  teamBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    maxWidth: '42%',
    gap: 7,
    overflow: 'hidden',
  },
  teamBlockHome: {
    justifyContent: 'flex-start',
  },
  teamBlockAway: {
    justifyContent: 'flex-start',
  },
  teamCluster: {
    maxWidth: '100%',
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  matchupCenterSpacer: {
    width: 32,
  },
  teamClusterAway: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  teamName: {
    color: Colors.text.primary,
    fontSize: 12,
    fontWeight: Typography.weight.bold,
    lineHeight: 14,
    minWidth: 0,
    flexShrink: 1,
    overflow: 'hidden',
  },
  teamNameAway: {
    textAlign: 'left',
  },
  vs: {
    width: 24,
    textAlign: 'center',
    color: Colors.background.primary,
    fontSize: 10,
    fontWeight: Typography.weight.black,
    letterSpacing: 0.6,
  },
  vsWrap: {
    width: 32,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.accent.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barGrid: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  vsBetweenBars: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barBlock: {
    flexDirection: 'column',
    gap: 4,
    flex: 1,
    minWidth: 0,
  },
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  barLabel: {
    color: Colors.text.secondary,
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  barValue: {
    color: Colors.text.secondary,
    fontSize: 9,
    fontWeight: Typography.weight.medium,
    textAlign: 'right',
    flexShrink: 1,
  },
  emptyState: {
    marginTop: 12,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    color: Colors.accent.lime,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    textAlign: 'center',
  },
  loadingCard: {
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    backgroundColor: Colors.background.cardAlt,
    paddingVertical: 9,
    paddingHorizontal: 10,
    gap: 9,
  },
  loadingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  loadingTeamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  loadingTeam: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minWidth: 0,
  },
  loadingTeamText: {
    width: '100%',
    gap: 4,
  },
  loadingBars: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
});

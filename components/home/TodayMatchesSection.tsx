import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';

import { Card, MatchCard, SectionHeader, SkeletonBox } from '@/components/ui';
import { Colors, Layout, Typography } from '@/constants';
import { useResponsive } from '@/lib/responsive';
import { useMatches } from '@/hooks/useMatches';
import { useAuthStore } from '@/stores/auth.store';
import { formatShortMatchTime, isTodayLocal } from '@/components/home/homeUtils';
import { Icon } from '@/components/ui/Icon';

export function TodayMatchesSection({ isLoading = false }: { isLoading?: boolean }): React.JSX.Element {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const matchesQuery = useMatches();
  const responsive = useResponsive();
  const refetchMatches = matchesQuery.refetch;
  const openTodayMatches = useCallback(() => {
    router.push('/(tabs)/matches?filter=TODAY' as never);
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      void refetchMatches();
    }, [refetchMatches])
  );

  const rows = useMemo(() => {
    return (matchesQuery.data ?? [])
      .filter((match) => isTodayLocal(match.kickoff_time))
      .sort((a, b) => new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime());
  }, [matchesQuery.data]);

  const loading = isLoading || matchesQuery.isLoading;
  const cardWidth = responsive.isSmall ? 160 : responsive.isLarge ? 176 : 168;

  if (loading) {
    return (
      <Card style={styles.card} padding={14}>
        <SectionHeader title="TODAY'S MATCHES" onViewAll={openTodayMatches} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {[0, 1, 2].map((index) => (
            <View key={index} style={[styles.loadingCard, { width: cardWidth + 48 }]}>
              <SkeletonBox width="100%" height={18} />
              <SkeletonBox width="70%" height={12} style={{ marginTop: 12 }} />
              <SkeletonBox width="55%" height={10} style={{ marginTop: 18 }} />
            </View>
          ))}
        </ScrollView>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card style={styles.card} padding={14}>
        <SectionHeader title="TODAY'S MATCHES" badge={rows.length} onViewAll={openTodayMatches} />
        <View style={styles.emptyState}>
          <Icon name="calendar" size={18} color={Colors.text.secondary} />
          <Text style={styles.emptyText}>No matches today</Text>
        </View>
      </Card>
    );
  }

  const supportedTeams = profile?.supported_teams ?? [];

  return (
    <Card style={styles.card} padding={14}>
      <SectionHeader
        title="TODAY'S MATCHES"
        badge={rows.length}
        onViewAll={openTodayMatches}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {rows.map((match) => {
          const goldenMatch = match as typeof match & {
            is_golden?: boolean;
            is_match_of_day?: boolean;
            golden_multiplier?: number | null;
          };

          const isFavorite =
            supportedTeams.includes(match.home_team.id) || supportedTeams.includes(match.away_team.id);
          const multiplier = goldenMatch.golden_multiplier ?? match.points_multiplier;

          return (
            <MatchCard
              key={match.id}
              width={cardWidth}
              homeTeam={{ name: match.home_team.name, team: match.home_team }}
              awayTeam={{ name: match.away_team.name, team: match.away_team }}
              matchTime={formatShortMatchTime(match.kickoff_time)}
              multiplier={multiplier}
              isFavorite={isFavorite}
              isGolden={goldenMatch.is_golden}
              isMatchOfDay={goldenMatch.is_match_of_day}
              onPress={() => router.push(`/match/${match.id}` as never)}
            />
          );
        })}
      </ScrollView>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background.card,
    borderColor: Colors.border.default,
  },
  scrollContent: {
    gap: 10,
    paddingRight: 8,
  },
  loadingCard: {
    width: 216,
    borderRadius: Layout.borderRadius.lg,
    backgroundColor: Colors.background.cardAlt,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  emptyState: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    color: Colors.text.secondary,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.medium,
  },
});

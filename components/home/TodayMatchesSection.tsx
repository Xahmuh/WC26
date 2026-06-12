import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { Card, MatchCard, SectionHeader, SkeletonBox } from '@/components/ui';
import { Colors, Layout, Typography } from '@/constants';
import { useResponsive } from '@/lib/responsive';
import { useMatches } from '@/hooks/useMatches';
import { useAuthStore } from '@/stores/auth.store';
import { formatShortMatchTime, isNotStartedMatch, isTodayLocal } from '@/components/home/homeUtils';
import { Icon } from '@/components/ui/Icon';

const CARD_GAP = 10;
const MOBILE_VISIBLE_CARD_COUNT = 1.75;

export function TodayMatchesSection({ isLoading = false }: { isLoading?: boolean }): React.JSX.Element {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const matchesQuery = useMatches();
  const responsive = useResponsive();
  const [carouselWidth, setCarouselWidth] = useState(0);
  const refetchMatches = matchesQuery.refetch;
  const openTodayMatches = useCallback(() => {
    router.push('/(tabs)/matches?filter=TODAY' as never);
  }, [router]);
  const useMobilePager = responsive.isMobile;
  const fallbackPagerWidth = Math.max(0, responsive.width - 56);
  const mobileViewportWidth = carouselWidth || fallbackPagerWidth;
  const mobileCardWidth = Math.max(
    164,
    Math.floor((mobileViewportWidth - CARD_GAP) / MOBILE_VISIBLE_CARD_COUNT)
  );
  const cardWidth = useMobilePager
    ? mobileCardWidth
    : responsive.isLarge
      ? 176
      : 168;
  const handleCarouselLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = Math.floor(event.nativeEvent.layout.width);
    setCarouselWidth((currentWidth) => (Math.abs(currentWidth - nextWidth) > 1 ? nextWidth : currentWidth));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refetchMatches();
    }, [refetchMatches])
  );

  const rows = useMemo(() => {
    const nowMs = Date.now();

    return (matchesQuery.data ?? [])
      .filter((match) => isTodayLocal(match.kickoff_time))
      .filter((match) => isNotStartedMatch(match.status, match.kickoff_time, nowMs))
      .sort((a, b) => new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime());
  }, [matchesQuery.data]);

  const loading = isLoading || matchesQuery.isLoading;

  if (loading) {
    return (
      <Card style={styles.card} padding={14}>
        <SectionHeader title="TODAY'S MATCHES" onViewAll={openTodayMatches} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          disableIntervalMomentum={useMobilePager}
          snapToInterval={useMobilePager ? cardWidth + CARD_GAP : undefined}
          onLayout={handleCarouselLayout}
          contentContainerStyle={[
            styles.scrollContent,
            useMobilePager && styles.scrollContentPager,
          ]}
        >
          {Array.from({ length: useMobilePager ? 2 : 3 }).map((_, index) => (
            <View key={index} style={[styles.loadingCard, { width: cardWidth }]}>
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
          <Text style={styles.emptyText}>No upcoming matches today</Text>
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        disableIntervalMomentum={useMobilePager}
        snapToInterval={useMobilePager ? cardWidth + CARD_GAP : undefined}
        onLayout={handleCarouselLayout}
        contentContainerStyle={[
          styles.scrollContent,
          useMobilePager && styles.scrollContentPager,
        ]}
      >
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
              status={match.status}
              homeScore={match.home_score}
              awayScore={match.away_score}
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
    gap: CARD_GAP,
    paddingRight: 8,
  },
  scrollContentPager: {
    paddingRight: 0,
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

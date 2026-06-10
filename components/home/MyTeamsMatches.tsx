import { useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';

import { Card, ScrollArrowButton, SectionHeader, SkeletonBox, MatchCard } from '@/components/ui';
import { Colors, Layout, Typography } from '@/constants';
import { useMatches } from '@/hooks/useMatches';
import { useTeams } from '@/hooks/useTeams';
import { useAuthStore } from '@/stores/auth.store';
import { formatShortMatchTime } from '@/components/home/homeUtils';
import type { Match, Team } from '@/types';
import { useResponsive } from '@/lib/responsive';

function buildCardTeam(team: Team | undefined): { name: string; team: Team } {
  const safeTeam =
    team ?? {
      id: '',
      external_id: 0,
      name: 'TBD',
      short_name: null,
      code: null,
      flag_url: null,
      group_name: null,
    };

  return {
    name: safeTeam.name,
    team: safeTeam,
  };
}

interface MyTeamsMatchesProps {
  isLoading?: boolean;
  onEditTeams?: () => void;
}

export function MyTeamsMatches({
  isLoading = false,
  onEditTeams,
}: MyTeamsMatchesProps): React.JSX.Element {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const profile = useAuthStore((s) => s.profile);
  const matchesQuery = useMatches();
  const teamsQuery = useTeams();
  const responsive = useResponsive();
  const favoriteTeamIds = useMemo(() => profile?.supported_teams ?? [], [profile?.supported_teams]);
  const cardWidth = responsive.isSmall ? 160 : responsive.isLarge ? 180 : 170;
  const refetchMatches = matchesQuery.refetch;
  const refetchTeams = teamsQuery.refetch;

  useFocusEffect(
    useCallback(() => {
      void refetchMatches();
      void refetchTeams();
    }, [refetchMatches, refetchTeams])
  );

  const favoriteMatches = useMemo(() => {
    if (favoriteTeamIds.length === 0) return [];
    return (matchesQuery.data ?? []).filter((match) =>
      favoriteTeamIds.includes(match.home_team.id) || favoriteTeamIds.includes(match.away_team.id)
    );
  }, [favoriteTeamIds, matchesQuery.data]);

  const loading = isLoading || matchesQuery.isLoading || teamsQuery.isLoading;

  if (loading) {
    return (
      <Card style={styles.card} padding={14}>
        <SectionHeader
          title="MY TEAMS MATCHES"
          rightContent={
            <Pressable disabled accessibilityRole="button">
              <Text style={styles.viewAll}>Edit Teams</Text>
            </Pressable>
          }
        />
        <View style={styles.loadingRow}>
          {[0, 1].map((index) => (
            <View key={index} style={[styles.loadingCard, { width: cardWidth }]}>
              <SkeletonBox width="60%" height={12} />
              <SkeletonBox width="85%" height={16} style={{ marginTop: 10 }} />
              <SkeletonBox width="55%" height={10} style={{ marginTop: 10 }} />
            </View>
          ))}
        </View>
      </Card>
    );
  }

  const hasFavoriteTeams = favoriteTeamIds.length > 0;
  const hasFavoriteMatches = favoriteMatches.length > 0;

  return (
    <Card style={styles.card} padding={14}>
      <SectionHeader
        title="MY TEAMS MATCHES"
        rightContent={
          <Pressable
            onPress={onEditTeams ?? (() => router.push('/profile'))}
            accessibilityRole="button"
            style={styles.editButton}
          >
            <Text style={styles.editButtonText}>Edit Teams</Text>
          </Pressable>
        }
      />

      {hasFavoriteMatches ? (
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {favoriteMatches.map((match, index) => {
            const typedMatch = match as Match;
            const isFavorite = favoriteTeamIds.includes(typedMatch.home_team?.id) || favoriteTeamIds.includes(typedMatch.away_team?.id);
            const isGolden = Boolean((typedMatch as unknown as { is_golden?: boolean }).is_golden);
            const isMatchOfDay = Boolean((typedMatch as unknown as { is_match_of_day?: boolean }).is_match_of_day);

            return (
              <MatchCard
                key={typedMatch.id ?? `match-${index}`}
                width={cardWidth}
                homeTeam={buildCardTeam(typedMatch.home_team)}
                awayTeam={buildCardTeam(typedMatch.away_team)}
                matchTime={formatShortMatchTime(typedMatch.kickoff_time)}
                multiplier={typedMatch.points_multiplier}
                isFavorite={isFavorite}
                isGolden={isGolden}
                isMatchOfDay={isMatchOfDay}
                onPress={() => router.push(`/match/${typedMatch.id}` as never)}
              />
            );
          })}

          <ScrollArrowButton
            onPress={() => {
              scrollRef.current?.scrollToEnd({ animated: true });
            }}
          />
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.helper}>
            {hasFavoriteTeams
              ? 'No matches found for your favorite teams.'
              : 'No favorite teams yet. Pick some in your profile.'}
          </Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background.card,
    borderColor: Colors.border.default,
  },
  editButton: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  editButtonText: {
    color: Colors.accent.lime,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.medium,
  },
  scrollContent: {
    gap: 10,
    paddingRight: 8,
    alignItems: 'stretch',
  },
  helper: {
    color: Colors.text.secondary,
    fontSize: Typography.size.sm,
  },
  emptyState: {
    minHeight: 72,
    borderRadius: Layout.borderRadius.lg,
    backgroundColor: '#111513',
    borderWidth: 1,
    borderColor: Colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
  },
  loadingRow: {
    flexDirection: 'row',
    gap: 10,
  },
  loadingCard: {
    width: 216,
    borderRadius: Layout.borderRadius.lg,
    backgroundColor: '#1A1A1A',
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  viewAll: {
    color: Colors.accent.lime,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.medium,
  },
});

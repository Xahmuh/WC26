import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, Text, View, Pressable, Image, Animated, Platform, type ListRenderItemInfo } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';

import Theme from '@/constants/theme/design-system';
import { TAB_BAR_CLEARANCE } from '@/components/ui/FloatingTabBar';
import { PodiumSection } from '@/components/leaderboard/PodiumSection';
import { Icon } from '@/components/ui/Icon';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { TeamFlag } from '@/components/ui/TeamFlag';
import { PlayerProfileModal } from '@/components/ui/PlayerProfileModal';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useTeams } from '@/hooks/useTeams';
import { useAuthStore } from '@/stores/auth.store';
import type { LeaderboardEntry, Team } from '@/types';

export default function LeaderboardScreen(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.session?.user.id);
  const query = useLeaderboard();
  const { data: teams = [] } = useTeams();
  const [selectedPlayer, setSelectedPlayer] = useState<{ id: string; rank: number } | null>(null);

  // Issue 2 — always show fresh ranks when returning to this tab. refetch is a
  // stable react-query ref, so the focus callback never changes → no loop.
  const refetch = query.refetch;
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );

  const entries = useMemo(() => query.data ?? [], [query.data]);
  const hasEntries = entries.length > 0;

  // Track previous ranks for trend indicators (up/down/stable)
  const prevRanksRef = useRef<Map<string, number>>(new Map());

  const enrichedEntries = useMemo(() => {
    const prev = prevRanksRef.current;
    return entries.map((entry) => ({
      ...entry,
      previous_rank: prev.get(entry.user_id),
    }));
  }, [entries]);

  useEffect(() => {
    const nextMap = new Map<string, number>();
    entries.forEach((entry) => {
      nextMap.set(entry.user_id, entry.rank);
    });
    prevRanksRef.current = nextMap;
  }, [entries]);

  // Podium = top 3; list = rank #4 and below. A user is never in both sections.
  const podium = useMemo(() => enrichedEntries.slice(0, 3), [enrichedEntries]);
  const list = useMemo(() => enrichedEntries.slice(3), [enrichedEntries]);

  // Issue 2 — pin the current user so their position is ALWAYS visible. We only
  // pin when they're below the podium (rank ≥ 4); the podium already shows them
  // otherwise. Rank mirrors the database materialized-view rank.
  const currentUserIndex = useMemo(
    () => enrichedEntries.findIndex((e) => e.user_id === userId),
    [enrichedEntries, userId]
  );
  const currentUserEntry = currentUserIndex >= 0 ? enrichedEntries[currentUserIndex] : null;
  const currentUserRank = currentUserEntry?.rank ?? null;
  const showPinned = Boolean(currentUserEntry && currentUserRank && currentUserRank > 3);

  const openPlayer = useCallback(
    (entry: LeaderboardEntry, rank: number) => setSelectedPlayer({ id: entry.user_id, rank }),
    []
  );
  const openMiniLeagues = useCallback(() => router.push('/leagues' as never), [router]);

  // List rows continue after the visual podium and display the DB rank.
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<LeaderboardEntry>) => {
      const rank = item.rank;
      return (
        <LeaderboardRow
          entry={item}
          rank={rank}
          isCurrentUser={item.user_id === userId}
          teams={teams}
          onPress={() => openPlayer(item, rank)}
        />
      );
    },
    [userId, teams, openPlayer]
  );

  return (
    <SafeAreaView className="flex-1" edges={['top']}>
      {query.isLoading ? (
        <LoadingSpinner fullScreen label="Loading leaderboard…" />
      ) : query.isError ? (
        <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            data={list}
            keyExtractor={(item) => item.user_id}
            renderItem={renderItem}
            contentContainerClassName="gap-2 px-6 pt-2"
            contentContainerStyle={{
              // When the user is pinned below, the pinned row carries the tab-bar
              // clearance, so the list only needs a small bottom gap.
              paddingBottom: showPinned ? 12 : insets.bottom + TAB_BAR_CLEARANCE,
            }}
            ListHeaderComponent={
              <View className="gap-3">
                <MiniLeagueShortcut onPress={openMiniLeagues} />
                {podium.length > 0 ? (
                  <PodiumSection
                    entries={podium}
                    currentUserId={userId}
                    onSelect={(entry) => openPlayer(entry, entry.rank)}
                  />
                ) : null}
              </View>
            }
            ListEmptyComponent={
              // No rows means 0 players (show empty state) or ≤3 players (the
              // podium already covers everyone, so the list stays empty).
              hasEntries ? null : (
                <EmptyState
                  title="No rankings yet"
                  description="Scores appear here once matches finish."
                  icon="trophy"
                />
              )
            }
            refreshControl={
              <RefreshControl
                refreshing={query.isRefetching}
                onRefresh={() => void query.refetch()}
                tintColor={Theme.colors.accent}
              />
            }
          />

          {/* Issue 2 — pinned "your position" row, always visible above the tab
              bar when the current user ranks below the podium. */}
          {showPinned && currentUserEntry && currentUserRank && (
            <View
              className="border-t border-bgBorder bg-bgSurface1 px-6 pt-2"
              style={{ paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }}
            >
              <Text className="mb-1 text-[10px] font-bold uppercase tracking-widest text-textSecondary">
                Your position
              </Text>
              <LeaderboardRow
                entry={currentUserEntry}
                rank={currentUserRank}
                isCurrentUser
                teams={teams}
                onPress={() => openPlayer(currentUserEntry, currentUserRank)}
              />
            </View>
          )}
        </View>
      )}

      <PlayerProfileModal
        visible={selectedPlayer !== null}
        onClose={() => setSelectedPlayer(null)}
        playerId={selectedPlayer?.id}
        rank={selectedPlayer?.rank}
      />
    </SafeAreaView>
  );
}

function MiniLeagueShortcut({ onPress }: { onPress: () => void }): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Open mini leagues"
      className="min-h-14 flex-row items-center gap-3 rounded-2xl border border-bgBorder bg-bgSurface2 p-4 active:opacity-85"
    >
      <View className="h-11 w-11 items-center justify-center rounded-full border border-accentBorder bg-accentDim">
        <Icon name="group" size={20} color={Theme.colors.accent} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-black text-textPrimary">Mini Leagues</Text>
        <Text className="mt-0.5 text-xs text-textSecondary" numberOfLines={1}>
          Create or join private leaderboards
        </Text>
      </View>
      <Icon name="forward" size={17} color={Theme.colors.textTertiary} />
    </Pressable>
  );
}

// ── Ranked list row ─────────────────────────────────────────────────────────

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  /** Display rank — the position in the full deterministic ranking (4, 5, …). */
  rank: number;
  isCurrentUser: boolean;
  teams: Team[];
  onPress: () => void;
}

/**
 * Professional supported-team display: a tidy row of circular crests with a
 * "+N" overflow chip. Returns null when the player follows no teams.
 */
function SupportedTeamCrests({
  teamIds,
  teams,
  size = 20,
  max = 4,
}: {
  teamIds: string[] | null | undefined;
  teams: Team[];
  size?: number;
  max?: number;
}): React.JSX.Element | null {
  if (!teamIds || teamIds.length === 0) return null;
  const resolved = teamIds
    .map((id) => teams.find((t) => t.id === id))
    .filter((t): t is Team => Boolean(t));
  if (resolved.length === 0) return null;

  const shown = resolved.slice(0, max);
  const extra = resolved.length - shown.length;

  return (
    <View className="flex-row items-center gap-1">
      {shown.map((team) => (
        <View key={team.id} className="overflow-hidden rounded-md border border-bgBorder">
          <TeamFlag team={team} size={size} fixed />
        </View>
      ))}
      {extra > 0 && (
        <View
          style={{ height: size }}
          className="ml-0.5 items-center justify-center rounded-full bg-bgSurface3 border border-bgBorder px-1.5"
        >
          <Text className="text-[10px] font-bold text-textSecondary">+{extra}</Text>
        </View>
      )}
    </View>
  );
}

function LeaderboardRow({ entry, rank, isCurrentUser, teams, onPress }: LeaderboardRowProps): React.JSX.Element {
  const hasTeams = (entry.supported_teams?.length ?? 0) > 0;

  // Pulse animation for trend icon
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 1000, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: Platform.OS !== 'web' }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const trendIcon = entry.previous_rank !== undefined ? (
    entry.previous_rank > rank ? { name: 'trendingUp' as const, color: Theme.colors.success }
    : entry.previous_rank < rank ? { name: 'trendingDown' as const, color: Theme.colors.live }
    : { name: 'minus' as const, color: Theme.colors.textTertiary }
  ) : null;

  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-3 rounded-2xl border p-3 active:opacity-85 ${
        isCurrentUser ? 'border-accent bg-accentDim' : 'border-bgBorder bg-bgSurface2'
      }`}
    >
      {/* Numbered rank */}
      <View className="h-9 w-9 items-center justify-center rounded-full bg-bgSurface3 border border-bgBorder">
        <Text className="text-sm font-extrabold text-textSecondary">{rank}</Text>
      </View>

      {/* Avatar */}
      <View className="h-11 w-11 items-center justify-center rounded-full bg-bgSurface1 border border-bgBorder overflow-hidden">
        <Image
          source={entry.avatar_url ? { uri: entry.avatar_url } : require('@/assets/default_avatar.jpg')}
          style={{ width: '100%', height: '100%' }}
        />
      </View>

      {/* Identity + supported teams + stats */}
      <View className="flex-1 gap-1">
        <Text numberOfLines={1} className="text-sm font-bold text-textPrimary">
          {entry.display_name}
          {isCurrentUser ? ' (you)' : ''}
        </Text>

        {hasTeams && <SupportedTeamCrests teamIds={entry.supported_teams} teams={teams} />}

        <Text numberOfLines={1} className="text-[11px] text-textSecondary">
          {entry.predictions_made} preds · {entry.predictions_scored} scored
          {entry.exact_predictions > 0 ? (
            <>{` · ${entry.exact_predictions} exact `}<Icon name="target" size={11} color={Theme.colors.textSecondary} /></>
          ) : ''}
        </Text>
      </View>

      {/* Trend icon + Points */}
      <View className="flex-row items-center gap-1.5 pl-1">
        {trendIcon && (
          <Animated.View style={{ opacity: pulseAnim }}>
            <Icon name={trendIcon.name} size={14} color={trendIcon.color} />
          </Animated.View>
        )}
        <View className="items-center">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-accent">
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              className="text-sm font-extrabold text-accentDark"
            >
              {entry.total_points}
            </Text>
          </View>
          <Text className="mt-0.5 text-[9px] text-textTertiary uppercase">pts</Text>
        </View>
      </View>
    </Pressable>
  );
}

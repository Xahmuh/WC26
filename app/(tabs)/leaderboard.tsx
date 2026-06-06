import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, Text, View, Pressable, Image, type ListRenderItemInfo } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import Theme from '@/constants/theme/design-system';
import { TAB_BAR_CLEARANCE } from '@/components/ui/FloatingTabBar';
import { PodiumSection } from '@/components/leaderboard/PodiumSection';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { TeamFlag } from '@/components/ui/TeamFlag';
import { PlayerProfileModal } from '@/components/ui/PlayerProfileModal';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useTeams } from '@/hooks/useTeams';
import { useAuthStore } from '@/stores/auth.store';
import type { LeaderboardEntry, Team } from '@/types';

export default function LeaderboardScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.session?.user.id);
  const query = useLeaderboard();
  const { data: teams = [] } = useTeams();
  const [selectedPlayer, setSelectedPlayer] = useState<{ id: string; rank: number } | null>(null);

  const entries = query.data ?? [];
  const hasEntries = entries.length > 0;

  // Deterministic ranking: points DESC, then user_id as a stable tie-breaker so
  // the order never jitters even when every player shares the same score (e.g.
  // everyone on 0 points before any match finishes).
  const sorted = useMemo(
    () =>
      [...entries].sort((a, b) => {
        if (b.total_points !== a.total_points) {
          return b.total_points - a.total_points;
        }
        const aId = a.user_id || (a as any).id || '';
        const bId = b.user_id || (b as any).id || '';
        return aId.localeCompare(bId);
      }),
    [entries]
  );

  // Podium = top 3; list = rank #4 and below. A user is never in both sections.
  const podium = useMemo(() => sorted.slice(0, 3), [sorted]);
  const list = useMemo(() => sorted.slice(3), [sorted]);

  const openPlayer = useCallback(
    (entry: LeaderboardEntry, rank: number) => setSelectedPlayer({ id: entry.user_id, rank }),
    []
  );

  // List rows continue the ranking from #4 (position = sorted index + 1).
  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<LeaderboardEntry>) => {
      const rank = index + 4;
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
    <SafeAreaView className="flex-1 bg-bgDeep" edges={['top']}>
      <View className="px-6 pb-2 pt-2">
        <View className="flex-row items-center gap-2.5">
          <View style={{ width: 5, height: 24, borderRadius: 2, backgroundColor: Theme.colors.accent }} />
          <Text className="text-2xl font-extrabold uppercase tracking-tight text-textPrimary">
            Leaderboard
          </Text>
        </View>
        {entries.length > 0 && (
          <Text className="mt-0.5 text-xs text-textSecondary">
            {entries.length} {entries.length === 1 ? 'player' : 'players'} competing
          </Text>
        )}
      </View>

      {query.isLoading ? (
        <LoadingSpinner fullScreen label="Loading leaderboard…" />
      ) : query.isError ? (
        <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.user_id}
          renderItem={renderItem}
          contentContainerClassName="gap-2 px-6 pt-2"
          contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }}
          ListHeaderComponent={
            podium.length > 0 ? (
              <PodiumSection
                entries={podium}
                currentUserId={userId}
                onSelect={(entry, place) => openPlayer(entry, place)}
              />
            ) : null
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
          {entry.exact_predictions > 0 ? ` · ${entry.exact_predictions} exact 🎯` : ''}
        </Text>
      </View>

      {/* Points — lime circle, black number */}
      <View className="items-center pl-1">
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
    </Pressable>
  );
}

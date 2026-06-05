import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, Text, View, Pressable, type ListRenderItemInfo } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Theme from '@/constants/theme/design-system';
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
  const userId = useAuthStore((s) => s.session?.user.id);
  const query = useLeaderboard();
  const { data: teams = [] } = useTeams();
  const [selectedPlayer, setSelectedPlayer] = useState<{ id: string; rank: number } | null>(null);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<LeaderboardEntry>) => (
      <LeaderboardRow
        entry={item}
        isCurrentUser={item.user_id === userId}
        teams={teams}
        onPress={() => setSelectedPlayer({ id: item.user_id, rank: item.rank })}
      />
    ),
    [userId, teams]
  );

  return (
    <SafeAreaView className="flex-1 bg-bgDeep" edges={['top']}>
      <View className="px-4 pb-2 pt-2">
        <Text className="text-2xl font-bold text-textPrimary">Leaderboard</Text>
      </View>

      {query.isLoading ? (
        <LoadingSpinner fullScreen label="Loading leaderboard…" />
      ) : query.isError ? (
        <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />
      ) : (
        <FlatList
          data={query.data ?? []}
          keyExtractor={(item) => item.user_id}
          renderItem={renderItem}
          contentContainerClassName="gap-2 px-4 pb-8 pt-2"
          ListEmptyComponent={
            <EmptyState
              title="No rankings yet"
              description="Scores appear here once matches finish."
              icon="trophy"
            />
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

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
  teams: Team[];
  onPress: () => void;
}

const MEDAL_COLOR: Record<number, string> = {
  1: Theme.colors.gold,
  2: Theme.colors.silver,
  3: Theme.colors.bronze,
};

function RankBadge({ rank }: { rank: number }): React.JSX.Element {
  const medal = MEDAL_COLOR[rank];
  if (medal) return <Icon name="medal" size={20} color={medal} />;
  return <Text className="text-base font-bold text-textSecondary">#{rank}</Text>;
}

function LeaderboardRow({ entry, isCurrentUser, teams, onPress }: LeaderboardRowProps): React.JSX.Element {
  const initials = entry.display_name.slice(0, 2).toUpperCase();

  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-3 rounded-2xl border p-3 active:opacity-85 ${
        isCurrentUser ? 'border-accent bg-accentDim' : 'border-bgBorder bg-bgSurface2'
      }`}
    >
      <View className="w-9 items-center">
        <RankBadge rank={entry.rank} />
      </View>

      <View className="h-9 w-9 items-center justify-center rounded-full bg-bgSurface3">
        <Text className="text-xs font-bold text-textSecondary">{initials}</Text>
      </View>

      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text numberOfLines={1} className="text-sm font-semibold text-textPrimary">
            {entry.display_name}
            {isCurrentUser ? ' (you)' : ''}
          </Text>
          {entry.supported_teams && entry.supported_teams.length > 0 && (
            <View className="flex-row gap-1">
              {entry.supported_teams.map((teamId) => {
                const team = teams.find((t) => t.id === teamId);
                if (!team) return null;
                return <TeamFlag key={teamId} team={team} size={14} fixed />;
              })}
            </View>
          )}
        </View>
        <Text className="text-xs text-textSecondary">
          {entry.predictions_made} predictions · {entry.predictions_scored} scored
          {entry.exact_predictions > 0 ? ` · ${entry.exact_predictions} exact 🎯` : ''}
        </Text>
      </View>

      <Text className="text-base font-bold text-accent">{entry.total_points}</Text>
    </Pressable>
  );
}

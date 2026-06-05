import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, Text, View, Pressable, type ListRenderItemInfo } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import Theme from '@/constants/theme/design-system';
import { TAB_BAR_CLEARANCE } from '@/components/ui/FloatingTabBar';
import { Icon } from '@/components/ui/Icon';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { TeamFlag } from '@/components/ui/TeamFlag';
import { PlayerProfileModal } from '@/components/ui/PlayerProfileModal';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useTeams } from '@/hooks/useTeams';
import { useAuthStore } from '@/stores/auth.store';
import type { LeaderboardEntry, Team } from '@/types';

const RANK_COLOR: Record<number, string> = {
  1: Theme.colors.gold,
  2: Theme.colors.silver,
  3: Theme.colors.bronze,
};

export default function LeaderboardScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.session?.user.id);
  const query = useLeaderboard();
  const { data: teams = [] } = useTeams();
  const [selectedPlayer, setSelectedPlayer] = useState<{ id: string; rank: number } | null>(null);

  const entries = query.data ?? [];
  const hasPodium = entries.length >= 3;
  const podium = useMemo(() => (hasPodium ? entries.slice(0, 3) : []), [entries, hasPodium]);
  const listData = useMemo(() => (hasPodium ? entries.slice(3) : entries), [entries, hasPodium]);

  const openPlayer = useCallback(
    (entry: LeaderboardEntry) => setSelectedPlayer({ id: entry.user_id, rank: entry.rank }),
    []
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<LeaderboardEntry>) => (
      <LeaderboardRow
        entry={item}
        isCurrentUser={item.user_id === userId}
        teams={teams}
        onPress={() => openPlayer(item)}
      />
    ),
    [userId, teams, openPlayer]
  );

  return (
    <SafeAreaView className="flex-1 bg-bgDeep" edges={['top']}>
      <View className="px-6 pb-2 pt-2">
        <Text className="text-2xl font-extrabold uppercase tracking-tight text-textPrimary">
          Leaderboard
        </Text>
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
          data={listData}
          keyExtractor={(item) => item.user_id}
          renderItem={renderItem}
          contentContainerClassName="gap-2 px-6 pt-2"
          contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }}
          ListHeaderComponent={
            hasPodium ? (
              <Podium entries={podium} teams={teams} currentUserId={userId} onSelect={openPlayer} />
            ) : null
          }
          ListEmptyComponent={
            hasPodium ? null : (
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

// ── Podium (top 3) ──────────────────────────────────────────────────────────

interface PodiumProps {
  entries: LeaderboardEntry[];
  teams: Team[];
  currentUserId: string | undefined;
  onSelect: (entry: LeaderboardEntry) => void;
}

function Podium({ entries, teams, currentUserId, onSelect }: PodiumProps): React.JSX.Element {
  // Display order: 2nd, 1st, 3rd so the champion sits centre / tallest.
  const byRank = (r: number) => entries.find((e) => e.rank === r);
  const ordered = [byRank(2), byRank(1), byRank(3)].filter(Boolean) as LeaderboardEntry[];

  return (
    <View className="mb-4 flex-row items-end justify-center gap-3 px-1 pt-4">
      {ordered.map((entry) => (
        <PodiumColumn
          key={entry.user_id}
          entry={entry}
          teams={teams}
          isCurrentUser={entry.user_id === currentUserId}
          onPress={() => onSelect(entry)}
        />
      ))}
    </View>
  );
}

function PodiumColumn({
  entry,
  teams,
  isCurrentUser,
  onPress,
}: {
  entry: LeaderboardEntry;
  teams: Team[];
  isCurrentUser: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const color = RANK_COLOR[entry.rank] ?? Theme.colors.textSecondary;
  const isFirst = entry.rank === 1;
  const avatarSize = isFirst ? 76 : 60;
  const pedestalHeight = isFirst ? 78 : entry.rank === 2 ? 60 : 46;
  const initials = entry.display_name.slice(0, 2).toUpperCase();

  return (
    <Pressable onPress={onPress} className="flex-1 items-center active:opacity-85">
      {isFirst && (
        <View className="mb-1">
          <Icon name="trophy" size={22} color={Theme.colors.gold} />
        </View>
      )}

      {/* Avatar with colored ring + rank badge */}
      <View
        style={{
          width: avatarSize,
          height: avatarSize,
          borderRadius: avatarSize / 2,
          borderColor: color,
          borderWidth: 2.5,
        }}
        className="items-center justify-center bg-bgSurface3"
      >
        <Text className="font-extrabold text-textPrimary" style={{ fontSize: isFirst ? 24 : 19 }}>
          {initials}
        </Text>
        <View
          style={{ backgroundColor: color }}
          className="absolute -bottom-2.5 h-6 w-6 items-center justify-center rounded-full border-2 border-bgDeep"
        >
          <Text className="text-[11px] font-black text-bgDeep">{entry.rank}</Text>
        </View>
      </View>

      <Text numberOfLines={1} className="mt-4 max-w-[96px] text-xs font-bold text-textPrimary">
        {entry.display_name}
        {isCurrentUser ? ' (you)' : ''}
      </Text>
      <View className="mt-1 rounded-full bg-accent px-3 py-0.5">
        <Text numberOfLines={1} adjustsFontSizeToFit className="text-xs font-extrabold text-accentDark">
          {entry.total_points}
        </Text>
      </View>

      {/* Supported teams */}
      <View className="mt-1 h-5 items-center justify-center">
        <SupportedTeamCrests teamIds={entry.supported_teams} teams={teams} size={16} max={3} />
      </View>

      {/* Pedestal */}
      <View
        style={{ height: pedestalHeight, borderColor: color }}
        className={`mt-2 w-full items-center justify-start rounded-t-xl border border-b-0 pt-2 ${
          isCurrentUser ? 'bg-accentDim' : 'bg-bgSurface2'
        }`}
      >
        <Text style={{ color }} className="text-2xl font-black">
          {entry.rank}
        </Text>
      </View>
    </Pressable>
  );
}

// ── Ranked list row ─────────────────────────────────────────────────────────

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
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
        <View key={team.id} className="overflow-hidden rounded-full border border-bgBorder">
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

function LeaderboardRow({ entry, isCurrentUser, teams, onPress }: LeaderboardRowProps): React.JSX.Element {
  const initials = entry.display_name.slice(0, 2).toUpperCase();
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
        <Text className="text-sm font-extrabold text-textSecondary">{entry.rank}</Text>
      </View>

      {/* Avatar */}
      <View className="h-11 w-11 items-center justify-center rounded-full bg-bgSurface1 border border-bgBorder">
        <Text className="text-sm font-bold text-textSecondary">{initials}</Text>
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

// ============================================================================
// League Details — league info, invite sharing, member-scoped leaderboard
// (re-skin of the global leaderboard rows against `LeagueLeaderboardEntry`),
// and owner-only management (edit, regenerate code, remove members, delete).
// ============================================================================

import { useMemo, useState } from 'react';
import { Alert, FlatList, Image, Pressable, RefreshControl, Share, Text, View, type ListRenderItemInfo } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import Theme from '@/constants/theme/design-system';
import { Container } from '@/components/ui/Container';
import { TAB_BAR_CLEARANCE } from '@/components/ui/FloatingTabBar';
import { Icon } from '@/components/ui/Icon';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { EditLeagueModal } from '@/components/leagues/EditLeagueModal';
import { PlayerProfileModal } from '@/components/ui/PlayerProfileModal';
import {
  useDeleteLeague,
  useLeagueLeaderboard,
  useLeaveLeague,
  useMyLeagues,
  useRegenerateInviteCode,
  useRemoveLeagueMember,
} from '@/hooks/useLeagues';
import { useAuthStore } from '@/stores/auth.store';
import type { LeagueLeaderboardEntry, MyLeague } from '@/types';

export default function LeagueDetailsScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.session?.user.id);

  const myLeagues = useMyLeagues();
  const leaderboard = useLeagueLeaderboard(id);
  const leaveLeague = useLeaveLeague();
  const deleteLeague = useDeleteLeague();
  const regenerateCode = useRegenerateInviteCode();
  const removeMember = useRemoveLeagueMember();

  const [showEdit, setShowEdit] = useState(false);
  const [managingMembers, setManagingMembers] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<{ id: string; rank: number } | null>(null);

  const league: MyLeague | undefined = useMemo(
    () => myLeagues.data?.find((l) => l.id === id),
    [myLeagues.data, id]
  );
  const isOwner = league?.my_role === 'owner';

  const entries = leaderboard.data ?? [];
  const isLoading = myLeagues.isLoading || leaderboard.isLoading;
  const isError = myLeagues.isError || leaderboard.isError;
  const errorMsg = myLeagues.error?.message || leaderboard.error?.message;

  const goBackSafely = (fallback: '/leagues'): void => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(fallback);
  };

  const handleShare = () => {
    if (!league) return;
    const link = `wc26://league/join/${league.invite_code}`;
    void Share.share({
      message: `Join "${league.name}" on WC26 — use code ${league.invite_code} or open ${link}`,
    });
  };

  const handleRegenerate = () => {
    if (!league) return;
    Alert.alert('Regenerate invite code?', 'The old code will stop working immediately.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Regenerate',
        style: 'destructive',
        onPress: () => void regenerateCode.mutateAsync(league.id),
      },
    ]);
  };

  const handleLeave = () => {
    if (!league) return;
    Alert.alert('Leave league?', `You'll need a new invite to rejoin "${league.name}".`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          await leaveLeague.mutateAsync(league.id);
          goBackSafely('/leagues');
        },
      },
    ]);
  };

  const handleDelete = () => {
    if (!league) return;
    Alert.alert('Delete league?', `This permanently deletes "${league.name}" and removes all members. This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteLeague.mutateAsync(league.id);
          goBackSafely('/leagues');
        },
      },
    ]);
  };

  const handleRemoveMember = (member: LeagueLeaderboardEntry) => {
    if (!league) return;
    Alert.alert('Remove member?', `Remove ${member.display_name} from "${league.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => void removeMember.mutateAsync({ leagueId: league.id, userId: member.user_id }),
      },
    ]);
  };

  const renderItem = ({ item }: ListRenderItemInfo<LeagueLeaderboardEntry>) => (
    <LeagueLeaderboardRow
      entry={item}
      isCurrentUser={item.user_id === userId}
      manageable={managingMembers && isOwner && item.user_id !== userId}
      onPress={() => setSelectedPlayer({ id: item.user_id, rank: item.league_rank })}
      onRemove={() => handleRemoveMember(item)}
    />
  );

  return (
    <SafeAreaView className="flex-1" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <Container nested className="px-6 pb-2 pt-6">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => goBackSafely('/leagues')}
            className="h-9 w-9 items-center justify-center rounded-full border border-bgBorder bg-bgSurface2 active:opacity-80"
          >
            <Icon name="back" size={18} color={Theme.colors.textPrimary} />
          </Pressable>
          <View className="flex-1">
            <Text numberOfLines={1} className="text-xl font-extrabold text-textPrimary">
              {league?.name ?? 'League'}
            </Text>
            {league && (
              <Text className="text-[11px] font-medium text-textSecondary">
                {league.member_count} {league.member_count === 1 ? 'member' : 'members'}
                {league.max_members ? ` · max ${league.max_members}` : ''}
                {league.my_rank ? ` · you're #${league.my_rank}` : ''}
              </Text>
            )}
          </View>
          <Pressable
            onPress={handleShare}
            className="h-9 w-9 items-center justify-center rounded-full border border-bgBorder bg-bgSurface2 active:opacity-80"
          >
            <Icon name="share" size={16} color={Theme.colors.textPrimary} />
          </Pressable>
        </View>

        {league?.description ? (
          <Text className="mt-3 text-xs leading-5 text-textSecondary">{league.description}</Text>
        ) : null}

        {league && (
          <Pressable
            onPress={handleShare}
            className="mt-3 flex-row items-center justify-between rounded-xl border border-accentBorder bg-accentDim px-3.5 py-2.5"
          >
            <View className="flex-row items-center gap-2">
              <Icon name="key" size={14} color={Theme.colors.accent} />
              <Text className="text-xs font-semibold text-textSecondary">Invite code</Text>
              <Text className="text-sm font-extrabold tracking-[2px] text-accent">{league.invite_code}</Text>
            </View>
            <Icon name="share" size={14} color={Theme.colors.accent} />
          </Pressable>
        )}

        {isOwner && (
          <View className="mt-3 flex-row flex-wrap gap-2">
            <ActionChip icon="edit" label="Edit" onPress={() => setShowEdit(true)} />
            <ActionChip icon="refresh" label="New code" onPress={handleRegenerate} />
            <ActionChip
              icon="people"
              label={managingMembers ? 'Done managing' : 'Manage members'}
              onPress={() => setManagingMembers((m) => !m)}
              active={managingMembers}
            />
            <ActionChip icon="trash" label="Delete league" onPress={handleDelete} danger />
          </View>
        )}
        {league && !isOwner && (
          <View className="mt-3">
            <ActionChip icon="logout" label="Leave league" onPress={handleLeave} danger />
          </View>
        )}
      </Container>

      {isLoading ? (
        <LoadingSpinner fullScreen label="Loading league…" />
      ) : isError ? (
        <ErrorState message={errorMsg ?? 'Something went wrong'} onRetry={() => { void myLeagues.refetch(); void leaderboard.refetch(); }} />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.user_id}
          renderItem={renderItem}
          contentContainerClassName="gap-2 px-6 pt-3"
          contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }}
          ListHeaderComponent={
            <View className="mb-1 flex-row items-center gap-2.5">
              <View style={{ width: 5, height: 20, borderRadius: 2, backgroundColor: Theme.colors.accent }} />
              <Text className="text-base font-extrabold uppercase tracking-tight text-textPrimary">League ranking</Text>
            </View>
          }
          ListEmptyComponent={
            <EmptyState title="No members yet" description="Share the invite code to get this league started." icon="people" />
          }
          refreshControl={
            <RefreshControl refreshing={leaderboard.isRefetching} onRefresh={() => void leaderboard.refetch()} tintColor={Theme.colors.accent} />
          }
        />
      )}

      {league && (
        <EditLeagueModal visible={showEdit} league={league} onClose={() => setShowEdit(false)} />
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

// ── Action chip ──────────────────────────────────────────────────────────────

function ActionChip({
  icon,
  label,
  onPress,
  danger,
  active,
}: {
  icon: React.ComponentProps<typeof Icon>['name'];
  label: string;
  onPress: () => void;
  danger?: boolean;
  active?: boolean;
}): React.JSX.Element {
  const color = danger ? Theme.colors.live : active ? Theme.colors.accent : Theme.colors.textSecondary;
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-1.5 rounded-full border px-3 py-2 active:opacity-80 ${
        danger ? 'border-live/30 bg-liveDim' : active ? 'border-accent bg-accentDim' : 'border-bgBorder bg-bgSurface2'
      }`}
    >
      <Icon name={icon} size={13} color={color} />
      <Text className="text-[11px] font-bold" style={{ color }}>{label}</Text>
    </Pressable>
  );
}

// ── Ranked row ───────────────────────────────────────────────────────────────

function LeagueLeaderboardRow({
  entry,
  isCurrentUser,
  manageable,
  onPress,
  onRemove,
}: {
  entry: LeagueLeaderboardEntry;
  isCurrentUser: boolean;
  manageable: boolean;
  onPress: () => void;
  onRemove: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${entry.display_name}'s player profile`}
      className={`flex-row items-center gap-3 rounded-2xl border p-3 active:opacity-85 ${
        isCurrentUser ? 'border-accent bg-accentDim' : 'border-bgBorder bg-bgSurface2'
      }`}
    >
      <View className="h-9 w-9 items-center justify-center rounded-full bg-bgSurface3 border border-bgBorder">
        <Text className="text-sm font-extrabold text-textSecondary">{entry.league_rank}</Text>
      </View>

      <View className="h-11 w-11 items-center justify-center rounded-full bg-bgSurface1 border border-bgBorder overflow-hidden">
        <Image
          source={entry.avatar_url ? { uri: entry.avatar_url } : require('@/assets/default_avatar.jpg')}
          style={{ width: '100%', height: '100%' }}
        />
      </View>

      <View className="flex-1 gap-0.5">
        <Text numberOfLines={1} className="text-sm font-bold text-textPrimary">
          {entry.display_name}{isCurrentUser ? ' (you)' : ''}
        </Text>
        <Text numberOfLines={1} className="text-[11px] text-textSecondary">
          {entry.predictions_made} preds · {entry.predictions_scored} scored
          {entry.exact_predictions > 0 ? ` · ${entry.exact_predictions} exact` : ''}
        </Text>
      </View>

      {manageable ? (
        <Pressable
          onPress={onRemove}
          className="h-9 w-9 items-center justify-center rounded-full border border-live/30 bg-liveDim active:opacity-80"
        >
          <Icon name="trash" size={14} color={Theme.colors.live} />
        </Pressable>
      ) : (
        <View className="items-center">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-accent">
            <Text numberOfLines={1} adjustsFontSizeToFit className="text-sm font-extrabold text-accentDark">
              {entry.total_points}
            </Text>
          </View>
          <Text className="mt-0.5 text-[9px] text-textTertiary uppercase">pts</Text>
        </View>
      )}
    </Pressable>
  );
}

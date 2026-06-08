// ============================================================================
// My Leagues — entry point to private group leaderboards. Lists a "Global
// Leaderboard" shortcut plus every league the user belongs to, each annotated
// with their rank in that league (derived live from `league_leaderboard`,
// see services/leagues.service.ts — never recomputed client-side).
// ============================================================================

import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View, type ListRenderItemInfo } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';

import Theme from '@/constants/theme/design-system';
import { Container } from '@/components/ui/Container';
import { TAB_BAR_CLEARANCE } from '@/components/ui/FloatingTabBar';
import { Icon } from '@/components/ui/Icon';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { CreateLeagueModal } from '@/components/leagues/CreateLeagueModal';
import { JoinLeagueModal } from '@/components/leagues/JoinLeagueModal';
import { useMyLeagues } from '@/hooks/useLeagues';
import type { MyLeague } from '@/types';

export default function MyLeaguesScreen(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const query = useMyLeagues();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const leagues = query.data ?? [];

  const renderItem = ({ item }: ListRenderItemInfo<MyLeague>) => (
    <LeagueRow league={item} onPress={() => router.push(`/leagues/${item.id}`)} />
  );

  return (
    <SafeAreaView className="flex-1 bg-bgDeep" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title="My Leagues"
        subtitle="Private leaderboards with your people"
        fallback="/(tabs)/home"
      />

      <Container nested className="px-6 pb-2 pt-4">
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Pressable
              onPress={() => setShowCreate(true)}
              className="flex-row items-center justify-center gap-2 rounded-2xl border border-accent bg-accentDim py-3 active:opacity-80"
            >
              <Icon name="add" size={16} color={Theme.colors.accent} />
              <Text className="text-xs font-bold uppercase tracking-wide text-accent">Create league</Text>
            </Pressable>
          </View>
          <View className="flex-1">
            <Pressable
              onPress={() => setShowJoin(true)}
              className="flex-row items-center justify-center gap-2 rounded-2xl border border-bgBorder bg-bgSurface2 py-3 active:opacity-80"
            >
              <Icon name="key" size={16} color={Theme.colors.textPrimary} />
              <Text className="text-xs font-bold uppercase tracking-wide text-textPrimary">Join with code</Text>
            </Pressable>
          </View>
        </View>
      </Container>

      {query.isLoading ? (
        <LoadingSpinner fullScreen label="Loading your leagues…" />
      ) : query.isError ? (
        <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />
      ) : (
        <FlatList
          data={leagues}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerClassName="gap-2.5 px-6 pt-3"
          contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }}
          ListHeaderComponent={
            <Pressable
              onPress={() => router.push('/(tabs)/leaderboard')}
              className="mb-2.5 flex-row items-center gap-3 rounded-2xl border border-bgBorder bg-bgSurface2 p-3.5 active:opacity-85"
            >
              <View className="h-11 w-11 items-center justify-center rounded-full bg-accentDim border border-accentBorder">
                <Icon name="trophy" size={20} color={Theme.colors.accent} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-textPrimary">Global Leaderboard</Text>
                <Text className="text-[11px] text-textSecondary">Every player in WC26</Text>
              </View>
              <Icon name="forward" size={16} color={Theme.colors.textTertiary} />
            </Pressable>
          }
          ListEmptyComponent={
            <EmptyState
              title="No leagues yet"
              description="Create a private league for your friends or family, or join one with an invite code."
              icon="people"
            />
          }
          refreshControl={
            <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={Theme.colors.accent} />
          }
        />
      )}

      <CreateLeagueModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(leagueId) => router.push(`/leagues/${leagueId}`)}
      />
      <JoinLeagueModal
        visible={showJoin}
        onClose={() => setShowJoin(false)}
        onJoined={(leagueId) => router.push(`/leagues/${leagueId}`)}
      />
    </SafeAreaView>
  );
}

function LeagueRow({ league, onPress }: { league: MyLeague; onPress: () => void }): React.JSX.Element {
  const rankLabel = league.my_rank ? `#${league.my_rank} of ${league.member_count}` : 'Unranked';
  const memberLabel = `${league.member_count} ${league.member_count === 1 ? 'member' : 'members'}`;
  const cardClassName =
    'rounded-3xl border border-accent/35 bg-accent px-3.5 py-3 active:opacity-85';

  return (
    <Pressable
      onPress={onPress}
      className={cardClassName}
    >
      <View className="flex-row gap-3">
        <View className="flex-1 gap-2">
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-row items-center gap-2">
              <View className="h-10 w-10 items-center justify-center rounded-2xl border border-accentDark/15 bg-accentDark/10 overflow-hidden">
                <Icon name="group" size={20} color={Theme.colors.accentDark} />
              </View>
              <View className="min-w-0">
                <Text numberOfLines={1} className="text-sm font-bold text-accentDark">
                  {league.name}
                </Text>
                <Text className="text-[10px] uppercase tracking-[1.8px] text-accentDark/70">
                  private league
                </Text>
              </View>
            </View>

            <View className="items-end">
              <Text className="text-sm font-extrabold text-accentDark">{rankLabel}</Text>
              <Text className="text-[9px] uppercase text-accentDark/70">your rank</Text>
            </View>
          </View>

          <View className="flex-row flex-wrap items-center gap-2">
            <View className="rounded-full border border-accentDark/15 bg-accentDark/10 px-2.5 py-1">
              <Text className="text-[10px] font-bold text-accentDark">{memberLabel}</Text>
            </View>
            {league.max_members ? (
              <View className="rounded-full border border-accentDark/15 bg-accentDark/10 px-2.5 py-1">
                <Text className="text-[10px] font-bold text-accentDark">max {league.max_members}</Text>
              </View>
            ) : null}
            {league.my_role === 'owner' ? (
              <View className="flex-row items-center gap-1 rounded-full border border-accentDark/15 bg-accentDark/10 px-2.5 py-1">
                <Icon name="star" size={10} color={Theme.colors.accentDark} />
                <Text className="text-[10px] font-bold text-accentDark">owner</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

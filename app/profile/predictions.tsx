import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, Text, View, type ListRenderItemInfo } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { MatchCard } from '@/components/match/MatchCard';
import { Container } from '@/components/ui/Container';
import { FloatingTabBar, TAB_BAR_CLEARANCE } from '@/components/ui/FloatingTabBar';
import { Icon, type IconName } from '@/components/ui/Icon';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { isFinishedLike, isMissedPredictionMatch, isOpenPredictionMatch } from '@/components/home/homeUtils';
import Theme from '@/constants/theme/design-system';
import { useMatches } from '@/hooks/useMatches';
import { useMyPoints } from '@/hooks/usePoints';
import { useMyPredictions } from '@/hooks/usePredictions';
import { toTimestamp } from '@/lib/dates';
import type { Match } from '@/types';

type PredictionsTab = 'UPCOMING' | 'PENDING' | 'HISTORY' | 'MISSED';

const TABS: Array<{
  key: PredictionsTab;
  label: string;
  icon: IconName;
}> = [
  { key: 'UPCOMING', label: 'Saved', icon: 'lock' },
  { key: 'PENDING', label: 'To Pick', icon: 'edit' },
  { key: 'HISTORY', label: 'Done', icon: 'checkCircle' },
  { key: 'MISSED', label: 'Missed', icon: 'ban' },
];

const TAB_COPY: Record<
  PredictionsTab,
  {
    eyebrow: string;
    title: string;
    description: string;
    emptyTitle: string;
    emptyDescription: string;
    emptyIcon: IconName;
  }
> = {
  UPCOMING: {
    eyebrow: 'Saved predictions',
    title: 'Your upcoming predictions',
    description: 'Matches you already predicted and can track before the final result.',
    emptyTitle: 'No saved predictions yet',
    emptyDescription: 'Submit a scoreline from Matches and your saved picks will appear here.',
    emptyIcon: 'target',
  },
  PENDING: {
    eyebrow: 'Needs action',
    title: 'Matches waiting for your pick',
    description: 'Open matches that have not started yet and do not have your prediction.',
    emptyTitle: 'Nothing to pick right now',
    emptyDescription: 'You are caught up. New open matches will appear here before kickoff.',
    emptyIcon: 'checkCircle',
  },
  HISTORY: {
    eyebrow: 'Prediction history',
    title: 'Finished predictions',
    description: 'Your completed predictions with saved scorelines and points.',
    emptyTitle: 'No finished predictions yet',
    emptyDescription: 'Finished matches you predicted will appear here with their points.',
    emptyIcon: 'time',
  },
  MISSED: {
    eyebrow: 'Missed matches',
    title: 'Matches that passed without a prediction',
    description: 'Matches where the prediction window closed before you submitted a pick.',
    emptyTitle: 'No missed matches',
    emptyDescription: 'Nice. Matches you miss after kickoff will appear here.',
    emptyIcon: 'shield',
  },
};

const BOTTOM_NAV_ROUTES = [
  { key: 'predictions-home', name: 'home' },
  { key: 'predictions-matches', name: 'matches' },
  { key: 'predictions-cards', name: 'cards' },
  { key: 'predictions-leaderboard', name: 'leaderboard' },
  { key: 'predictions-profile', name: 'profile' },
];

const BOTTOM_NAV_DESCRIPTORS = {
  'predictions-home': { options: { title: 'Home' } },
  'predictions-matches': { options: { title: 'Matches' } },
  'predictions-cards': { options: { title: 'Predict', tabBarAccessibilityLabel: 'Pending Predictions' } },
  'predictions-leaderboard': { options: { title: 'Leaderboard' } },
  'predictions-profile': { options: { title: 'Profile' } },
};

const BOTTOM_NAV_PATHS: Record<string, string> = {
  home: '/(tabs)/home',
  matches: '/(tabs)/matches',
  cards: '/profile/predictions?tab=PENDING',
  leaderboard: '/(tabs)/leaderboard',
  profile: '/(tabs)/profile',
};

function PredictionsBottomNav(): React.JSX.Element {
  const router = useRouter();
  const state = useMemo(() => ({ index: 2, routes: BOTTOM_NAV_ROUTES }), []);
  const navigation = useMemo(
    () => ({
      emit: () => ({ defaultPrevented: false }),
      navigate: (routeName: string) => {
        const href = BOTTOM_NAV_PATHS[routeName] ?? '/(tabs)/home';
        router.replace(href as never);
      },
    }),
    [router]
  );

  return <FloatingTabBar state={state} descriptors={BOTTOM_NAV_DESCRIPTORS} navigation={navigation} />;
}

function normalizeTab(value: string | string[] | undefined): PredictionsTab | null {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const normalized = rawValue?.toUpperCase();
  if (normalized === 'UPCOMING' || normalized === 'PENDING' || normalized === 'HISTORY' || normalized === 'MISSED') {
    return normalized;
  }
  return null;
}

function byKickoffAsc(a: Match, b: Match): number {
  return toTimestamp(a.kickoff_time) - toTimestamp(b.kickoff_time);
}

function byKickoffDesc(a: Match, b: Match): number {
  return toTimestamp(b.kickoff_time) - toTimestamp(a.kickoff_time);
}

function SummaryStat({
  label,
  value,
  icon,
  active,
  onPress,
}: {
  label: string;
  value: number;
  icon: IconName;
  active: boolean;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`Show ${label.toLowerCase()} predictions`}
      style={{ flexBasis: '48%', flexGrow: 1 }}
      className={[
        'min-w-0 rounded-2xl border px-3 py-3 active:opacity-80',
        active ? 'border-accent bg-accentDim' : 'border-bgBorder bg-bgSurface1',
      ].join(' ')}
    >
      <View className={['mb-2 h-8 w-8 items-center justify-center rounded-full', active ? 'bg-accent' : 'bg-accentDim'].join(' ')}>
        <Icon name={icon} size={15} color={active ? Theme.colors.accentDark : Theme.colors.accent} />
      </View>
      <Text className={['text-xl font-black', active ? 'text-accent' : 'text-textPrimary'].join(' ')}>
        {value}
      </Text>
      <Text
        numberOfLines={1}
        className={['text-[11px] font-semibold uppercase tracking-wide', active ? 'text-textPrimary' : 'text-textTertiary'].join(' ')}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function PredictionsPageHeader(): React.JSX.Element {
  return (
    <View className="border-b border-bgBorder bg-bgDeep">
      <Container nested className="px-5 pb-3 pt-2">
        <Text className="text-3xl font-black text-textPrimary">My Predictions</Text>
        <Text className="mt-1 text-sm font-semibold text-textSecondary">Saved, open, and completed picks</Text>
      </Container>
    </View>
  );
}

export default function MyPredictionsScreen(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<PredictionsTab>(() => normalizeTab(params.tab) ?? 'UPCOMING');

  const matchesQuery = useMatches();
  const predictionsQuery = useMyPredictions();
  const pointsQuery = useMyPoints();

  useEffect(() => {
    const nextTab = normalizeTab(params.tab);
    if (nextTab) setActiveTab(nextTab);
  }, [params.tab]);

  const isLoading = matchesQuery.isLoading || predictionsQuery.isLoading || pointsQuery.isLoading;
  const isError = matchesQuery.isError || predictionsQuery.isError || pointsQuery.isError;
  const errorMsg = matchesQuery.error?.message || predictionsQuery.error?.message || pointsQuery.error?.message;

  const categorized = useMemo(() => {
    const matches = matchesQuery.data ?? [];
    const predictions = predictionsQuery.data ?? new Map();
    const nowMs = Date.now();

    const upcoming = matches
      .filter((match) => predictions.has(match.id))
      .filter((match) => !isFinishedLike(match.status))
      .filter((match) => match.status !== 'CANCELLED' && match.status !== 'POSTPONED')
      .sort(byKickoffAsc);

    const pending = matches
      .filter((match) => !predictions.has(match.id) && isOpenPredictionMatch(match, nowMs))
      .sort(byKickoffAsc);

    const history = matches
      .filter((match) => predictions.has(match.id) && isFinishedLike(match.status))
      .sort(byKickoffDesc);

    const missed = matches
      .filter((match) => !predictions.has(match.id) && isMissedPredictionMatch(match, nowMs))
      .sort(byKickoffDesc);

    return { UPCOMING: upcoming, PENDING: pending, HISTORY: history, MISSED: missed };
  }, [matchesQuery.data, predictionsQuery.data]);

  const activeMatches = categorized[activeTab];
  const activeCopy = TAB_COPY[activeTab];
  const predictions = predictionsQuery.data;
  const points = pointsQuery.data;
  const openMatch = useCallback(
    (id: string) => {
      router.push(`/match/${id}` as never);
    },
    [router]
  );

  const renderMatch = useCallback(
    ({ item }: ListRenderItemInfo<Match>) => (
      <Container nested className="px-5">
        <MatchCard
          match={item}
          prediction={predictions?.get(item.id)}
          points={points?.get(item.id)}
          onPress={openMatch}
        />
      </Container>
    ),
    [openMatch, points, predictions]
  );

  const listHeader = useMemo(
    () => (
      <Container nested className="px-5 pb-3">
        <View className="gap-4">
          <View className="rounded-3xl border border-bgBorder bg-bgSurface2 p-4">
            <View className="flex-row items-start justify-between gap-3">
              <View className="min-w-0 flex-1">
                <Text className="text-xs font-black uppercase tracking-[1.8px] text-accent">
                  My Predictions
                </Text>
                <Text className="mt-1 text-2xl font-black leading-7 text-textPrimary">
                  Your picks, cleanly tracked
                </Text>
                <Text className="mt-2 text-sm leading-5 text-textSecondary">
                  Review saved predictions, pick open matches, and check completed results.
                </Text>
              </View>

              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-accentDim">
                <Icon name="target" size={23} color={Theme.colors.accent} />
              </View>
            </View>

            <View className="mt-4 flex-row flex-wrap gap-2">
              {TABS.map((tab) => {
                const active = activeTab === tab.key;

                return (
                  <SummaryStat
                    key={tab.key}
                    label={tab.label}
                    value={categorized[tab.key].length}
                    icon={tab.icon}
                    active={active}
                    onPress={() => setActiveTab(tab.key)}
                  />
                );
              })}
            </View>
          </View>

          <View className="rounded-2xl border border-bgBorder bg-bgSurface2 px-4 py-3">
            <Text className="text-[11px] font-black uppercase tracking-[1.5px] text-accent">
              {activeCopy.eyebrow}
            </Text>
            <Text className="mt-1 text-lg font-black text-textPrimary">{activeCopy.title}</Text>
            <Text className="mt-1 text-sm leading-5 text-textSecondary">{activeCopy.description}</Text>
          </View>
        </View>
      </Container>
    ),
    [activeCopy.description, activeCopy.eyebrow, activeCopy.title, activeTab, categorized]
  );

  const emptyList = useMemo(
    () => (
      <Container nested className="px-5">
        <View className="rounded-2xl border border-bgBorder bg-bgSurface2">
          <EmptyState
            title={activeCopy.emptyTitle}
            description={activeCopy.emptyDescription}
            icon={activeCopy.emptyIcon}
          />
        </View>
      </Container>
    ),
    [activeCopy.emptyDescription, activeCopy.emptyIcon, activeCopy.emptyTitle]
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-bgDeep" edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <PredictionsPageHeader />
        <LoadingSpinner fullScreen label="Loading predictions..." />
        <PredictionsBottomNav />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-bgDeep" edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <PredictionsPageHeader />
        <ErrorState
          message={errorMsg || 'An error occurred.'}
          onRetry={() => {
            void matchesQuery.refetch();
            void predictionsQuery.refetch();
            void pointsQuery.refetch();
          }}
        />
        <PredictionsBottomNav />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bgDeep" edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <PredictionsPageHeader />

      <FlatList
        data={activeMatches}
        keyExtractor={(item) => item.id}
        renderItem={renderMatch}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={emptyList}
        ItemSeparatorComponent={() => <View className="h-3" />}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        updateCellsBatchingPeriod={60}
        windowSize={7}
        removeClippedSubviews={Platform.OS !== 'web'}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: TAB_BAR_CLEARANCE + 96 }}
        contentContainerClassName="pt-4"
        showsVerticalScrollIndicator={false}
      />
      <PredictionsBottomNav />
    </SafeAreaView>
  );
}

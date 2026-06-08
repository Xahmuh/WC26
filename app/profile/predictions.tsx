import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { MatchCard } from '@/components/match/MatchCard';
import { Container } from '@/components/ui/Container';
import { Icon, type IconName } from '@/components/ui/Icon';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { isFinishedLike, isNotStartedMatch, isPredictionClosedMatch } from '@/components/home/homeUtils';
import Theme from '@/constants/theme/design-system';
import { useMatches } from '@/hooks/useMatches';
import { useMyPoints } from '@/hooks/usePoints';
import { useMyPredictions } from '@/hooks/usePredictions';
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

function normalizeTab(value: string | string[] | undefined): PredictionsTab | null {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const normalized = rawValue?.toUpperCase();
  if (normalized === 'UPCOMING' || normalized === 'PENDING' || normalized === 'HISTORY' || normalized === 'MISSED') {
    return normalized;
  }
  return null;
}

function byKickoffAsc(a: Match, b: Match): number {
  return new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime();
}

function byKickoffDesc(a: Match, b: Match): number {
  return new Date(b.kickoff_time).getTime() - new Date(a.kickoff_time).getTime();
}

function CountPill({ value, active }: { value: number; active: boolean }): React.JSX.Element {
  return (
    <View className={['min-w-[24px] items-center rounded-full px-2 py-0.5', active ? 'bg-accent' : 'bg-bgSurface1'].join(' ')}>
      <Text className={['text-[11px] font-black', active ? 'text-accentDark' : 'text-textSecondary'].join(' ')}>
        {value}
      </Text>
    </View>
  );
}

function SummaryStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: IconName;
}): React.JSX.Element {
  return (
    <View
      style={{ flexBasis: '48%', flexGrow: 1 }}
      className="min-w-0 rounded-2xl border border-bgBorder bg-bgSurface1 px-3 py-3"
    >
      <View className="mb-2 h-8 w-8 items-center justify-center rounded-full bg-accentDim">
        <Icon name={icon} size={15} color={Theme.colors.accent} />
      </View>
      <Text className="text-xl font-black text-textPrimary">{value}</Text>
      <Text numberOfLines={1} className="text-[11px] font-semibold uppercase tracking-wide text-textTertiary">
        {label}
      </Text>
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
      .filter((match) => !predictions.has(match.id) && isNotStartedMatch(match.status, match.kickoff_time, nowMs))
      .sort(byKickoffAsc);

    const history = matches
      .filter((match) => predictions.has(match.id) && isFinishedLike(match.status))
      .sort(byKickoffDesc);

    const missed = matches
      .filter((match) => !predictions.has(match.id) && isPredictionClosedMatch(match.status, match.kickoff_time, nowMs))
      .sort(byKickoffDesc);

    return { UPCOMING: upcoming, PENDING: pending, HISTORY: history, MISSED: missed };
  }, [matchesQuery.data, predictionsQuery.data]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-bgDeep" edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader title="My Predictions" fallback="/(tabs)/profile" />
        <LoadingSpinner fullScreen label="Loading predictions..." />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-bgDeep" edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader title="My Predictions" fallback="/(tabs)/profile" />
        <ErrorState
          message={errorMsg || 'An error occurred.'}
          onRetry={() => {
            void matchesQuery.refetch();
            void predictionsQuery.refetch();
            void pointsQuery.refetch();
          }}
        />
      </SafeAreaView>
    );
  }

  const activeMatches = categorized[activeTab];
  const activeCopy = TAB_COPY[activeTab];
  const predictions = predictionsQuery.data;
  const points = pointsQuery.data;

  return (
    <SafeAreaView className="flex-1 bg-bgDeep" edges={['top', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <ScreenHeader title="My Predictions" subtitle="Saved, open, and completed picks" fallback="/(tabs)/profile" />

      <ScrollView contentContainerClassName="pb-10 pt-4" showsVerticalScrollIndicator={false}>
        <Container nested className="px-5">
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
                <SummaryStat label="Saved" value={categorized.UPCOMING.length} icon="lock" />
                <SummaryStat label="To Pick" value={categorized.PENDING.length} icon="edit" />
                <SummaryStat label="Done" value={categorized.HISTORY.length} icon="checkCircle" />
                <SummaryStat label="Missed" value={categorized.MISSED.length} icon="ban" />
              </View>
            </View>

            <View className="rounded-2xl border border-bgBorder bg-bgSurface3 p-1">
              <View className="flex-row flex-wrap gap-1">
                {TABS.map((tab) => {
                  const active = activeTab === tab.key;
                  const count = categorized[tab.key].length;

                  return (
                    <Pressable
                      key={tab.key}
                      onPress={() => setActiveTab(tab.key)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      style={{ flexBasis: '48%', flexGrow: 1 }}
                      className={[
                        'min-h-[48px] min-w-0 flex-row items-center justify-center gap-1.5 rounded-xl px-2',
                        active ? 'bg-bgSurface2' : '',
                      ].join(' ')}
                    >
                      <Icon name={tab.icon} size={14} color={active ? Theme.colors.accent : Theme.colors.textTertiary} />
                      <Text
                        numberOfLines={1}
                        className={[
                          'text-xs font-black uppercase tracking-wide',
                          active ? 'text-textPrimary' : 'text-textSecondary',
                        ].join(' ')}
                      >
                        {tab.label}
                      </Text>
                      <CountPill value={count} active={active} />
                    </Pressable>
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

            {activeMatches.length === 0 ? (
              <View className="rounded-2xl border border-bgBorder bg-bgSurface2">
                <EmptyState
                  title={activeCopy.emptyTitle}
                  description={activeCopy.emptyDescription}
                  icon={activeCopy.emptyIcon}
                />
              </View>
            ) : (
              <View className="gap-3">
                {activeMatches.map((match) => {
                  const pred = predictions?.get(match.id);
                  const pts = points?.get(match.id);

                  return (
                    <MatchCard
                      key={match.id}
                      match={match}
                      prediction={pred}
                      points={pts}
                      onPress={(id) => router.push(`/match/${id}`)}
                    />
                  );
                })}
              </View>
            )}
          </View>
        </Container>
      </ScrollView>
    </SafeAreaView>
  );
}

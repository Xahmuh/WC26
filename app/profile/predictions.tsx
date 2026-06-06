import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';

import Theme from '@/constants/theme/design-system';
import { MatchCard } from '@/components/match/MatchCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useMatches } from '@/hooks/useMatches';
import { useMyPredictions } from '@/hooks/usePredictions';
import { useMyPoints } from '@/hooks/usePoints';

export default function MyPredictionsScreen(): React.JSX.Element {
  const router = useRouter();
  
  const matchesQuery = useMatches();
  const predictionsQuery = useMyPredictions();
  const pointsQuery = useMyPoints();
  // NOTE: every hook must run before any conditional `return` below, or React's
  // hook order changes between the loading/error and loaded renders and crashes.
  const [activeTab, setActiveTab] = useState<'UPCOMING' | 'HISTORY'>('UPCOMING');

  const isLoading = matchesQuery.isLoading || predictionsQuery.isLoading || pointsQuery.isLoading;
  const isError = matchesQuery.isError || predictionsQuery.isError || pointsQuery.isError;
  const errorMsg = matchesQuery.error?.message || predictionsQuery.error?.message || pointsQuery.error?.message;

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-bgDeep" edges={['bottom']}>
        <Stack.Screen options={{ title: 'My Predictions', headerShown: true }} />
        <LoadingSpinner fullScreen label="Loading predictions…" />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-bgDeep" edges={['bottom']}>
        <Stack.Screen options={{ title: 'My Predictions', headerShown: true }} />
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

  const matches = matchesQuery.data || [];
  const predictions = predictionsQuery.data; // Map<string, Prediction>
  const points = pointsQuery.data; // Map<string, PointsRecord>

  const upcomingMatches = matches.filter((match) => predictions?.has(match.id) && match.status !== 'FINISHED');
  const historyMatches = matches.filter((match) => predictions?.has(match.id) && match.status === 'FINISHED');

  const displayMatches = activeTab === 'UPCOMING' ? upcomingMatches : historyMatches;

  return (
    <SafeAreaView className="flex-1 bg-bgDeep" edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'My Predictions',
          headerShown: true,
          headerStyle: { backgroundColor: Theme.colors.bgSurface2 },
          headerTintColor: Theme.colors.textPrimary,
        }}
      />
      <ScrollView contentContainerClassName="px-6 pb-10 pt-4 gap-4">
        {/* Custom Tabs */}
        <View className="flex-row rounded-lg bg-bgSurface3 p-1">
          <Pressable
            onPress={() => setActiveTab('UPCOMING')}
            className={`flex-1 items-center justify-center rounded-md py-2 ${
              activeTab === 'UPCOMING' ? 'bg-bgSurface2' : ''
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                activeTab === 'UPCOMING' ? 'text-textPrimary' : 'text-textSecondary'
              }`}
            >
              Upcoming
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('HISTORY')}
            className={`flex-1 items-center justify-center rounded-md py-2 ${
              activeTab === 'HISTORY' ? 'bg-bgSurface2' : ''
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                activeTab === 'HISTORY' ? 'text-textPrimary' : 'text-textSecondary'
              }`}
            >
              History
            </Text>
          </Pressable>
        </View>

        <Text className="text-xs text-textSecondary text-center mb-2">
          {activeTab === 'UPCOMING'
            ? 'These are your upcoming predictions.'
            : 'Your past predictions and points scored.'}
        </Text>

        {displayMatches.length === 0 ? (
          <View className="rounded-2xl border border-bgBorder bg-bgSurface2">
            <EmptyState
              title={activeTab === 'UPCOMING' ? "No upcoming predictions" : "No finished matches"}
              description={
                activeTab === 'UPCOMING'
                  ? "Head to the Matches tab to submit your first scoreline."
                  : "You don't have any finished predictions yet. Once a match ends, it will appear here."
              }
              icon={activeTab === 'UPCOMING' ? "edit" : "time"}
            />
          </View>
        ) : (
          displayMatches.map((match) => {
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
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

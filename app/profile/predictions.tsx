import { ScrollView, Text, View } from 'react-native';
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

  // Filter to matches where user has placed a prediction
  const predictedMatches = matches.filter((match) => predictions?.has(match.id));

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
        <Text className="text-xs text-textSecondary">
          Every match you've predicted. Tap a finished match to see the points breakdown.
        </Text>

        {predictedMatches.length === 0 ? (
          <View className="rounded-2xl border border-bgBorder bg-bgSurface2">
            <EmptyState
              title="No predictions yet"
              description="Head to the Matches tab to submit your first scoreline."
              icon="edit"
            />
          </View>
        ) : (
          predictedMatches.map((match) => {
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

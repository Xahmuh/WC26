import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';

import Theme from '@/constants/theme/design-system';
import { MatchCard } from '@/components/match/MatchCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorState } from '@/components/ui/States';
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
      <ScrollView contentContainerClassName="px-4 pb-10 pt-4 gap-4">
        <View className="mb-2">
          <Text className="text-xl font-bold text-textPrimary">My Predictions</Text>
          <Text className="text-xs text-textSecondary mt-1">
            Below are all the matches you have predicted. Tapping on a finished match card will show the points breakdown.
          </Text>
        </View>

        {predictedMatches.length === 0 ? (
          <View className="items-center justify-center py-12 px-6 bg-bgSurface2 rounded-2xl border border-bgBorder">
            <Text className="text-3xl mb-3">⚽</Text>
            <Text className="text-sm font-bold text-textPrimary text-center">No Predictions Yet</Text>
            <Text className="text-xs text-textSecondary text-center mt-1">
              You haven't predicted any matches. Go to the Matches tab to submit your predictions!
            </Text>
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

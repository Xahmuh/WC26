import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';

import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/States';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { KpiGrid } from '@/components/performance/KpiGrid';
import { KpiSkeletonGrid } from '@/components/performance/KpiSkeletonGrid';
import { PerformanceHeader } from '@/components/performance/PerformanceHeader';
import { PerformanceSummary } from '@/components/performance/PerformanceSummary';
import { useUserPerformance } from '@/hooks/useUserPerformance';
import { useAuthStore } from '@/stores/auth.store';

export default function UserPerformanceScreen(): React.JSX.Element {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const userId = useAuthStore((s) => s.session?.user.id);
  const { kpis, loading, error, reload } = useUserPerformance(userId);

  const displayName = profile?.username || profile?.display_name || 'Player';

  return (
    <SafeAreaView className="flex-1 bg-bgDeep" edges={['top', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <ScreenHeader title="My Performance" subtitle="Accuracy and scoring breakdown" fallback="/(tabs)/profile" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingTop: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Container nested className="px-4">
          <PerformanceHeader displayName={displayName} avatarUrl={profile?.avatar_url} />

          <View className="mt-3">
            {loading ? <KpiSkeletonGrid /> : null}

            {!loading && error ? (
              <ErrorState message={error} onRetry={reload} />
            ) : null}

            {!loading && !error && !kpis ? (
              <View className="items-center gap-4 py-8">
                <Text className="px-2 text-center text-base leading-6 font-semibold text-textPrimary">
                  No predictions yet. Start predicting to see your stats!
                </Text>
                <View className="w-full max-w-sm">
                  <Button
                    label="Browse Matches"
                    variant="primary"
                    onPress={() => router.push('/(tabs)/matches' as never)}
                  />
                </View>
              </View>
            ) : null}

            {!loading && !error && kpis ? (
              <View className="gap-5">
                <PerformanceSummary kpis={kpis} />

                <View className="gap-1">
                  <Text className="text-lg font-black text-textPrimary">Performance breakdown</Text>
                  <Text className="text-sm leading-5 text-textSecondary">
                    A closer look at accuracy, exact scores, points, streaks, and coverage.
                  </Text>
                </View>

                <KpiGrid kpis={kpis} />
              </View>
            ) : null}
          </View>
        </Container>
      </ScrollView>
    </SafeAreaView>
  );
}

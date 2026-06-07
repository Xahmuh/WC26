import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';

import Theme from '@/constants/theme/design-system';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/States';
import { KpiGrid } from '@/components/performance/KpiGrid';
import { KpiSkeletonGrid } from '@/components/performance/KpiSkeletonGrid';
import { PerformanceHeader } from '@/components/performance/PerformanceHeader';
import { useUserPerformance } from '@/hooks/useUserPerformance';
import { useAuthStore } from '@/stores/auth.store';

export default function UserPerformanceScreen(): React.JSX.Element {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const userId = useAuthStore((s) => s.session?.user.id);
  const { kpis, loading, error, reload } = useUserPerformance(userId);

  const displayName = profile?.username || profile?.display_name || 'Player';

  return (
    <SafeAreaView className="flex-1 bg-bgDeep" edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'My Performance',
          headerShown: true,
          headerStyle: { backgroundColor: Theme.colors.bgSurface2 },
          headerTintColor: Theme.colors.textPrimary,
        }}
      />

      <ScrollView contentContainerClassName="pb-10 pt-4">
        <Container nested className="px-6 gap-6">
        <PerformanceHeader displayName={displayName} avatarUrl={profile?.avatar_url} />

        {loading ? <KpiSkeletonGrid /> : null}

        {!loading && error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : null}

        {!loading && !error && !kpis ? (
          <View className="items-center gap-5 py-6">
            <Text className="text-center text-base font-semibold text-textPrimary px-4">
              No predictions yet. Start predicting to see your stats!
            </Text>
            <View className="w-full max-w-xs">
              <Button
                label="Browse Matches"
                variant="primary"
                onPress={() => router.push('/(tabs)/matches' as never)}
              />
            </View>
          </View>
        ) : null}

        {!loading && !error && kpis ? <KpiGrid kpis={kpis} /> : null}
        </Container>
      </ScrollView>
    </SafeAreaView>
  );
}

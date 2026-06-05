import '@/global.css';

import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';

import Theme from '@/constants/theme/design-system';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/auth.store';

function useProtectedRoute(): void {
  const session = useAuthStore((s) => s.session);
  const initializing = useAuthStore((s) => s.initializing);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/splash');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)/home');
    }
  }, [session, initializing, segments, router]);
}

function RootNavigator(): React.JSX.Element {
  const initialize = useAuthStore((s) => s.initialize);
  const initializing = useAuthStore((s) => s.initializing);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useProtectedRoute();

  if (initializing) {
    return (
      <View className="flex-1 bg-bgDeep">
        <LoadingSpinner fullScreen label="Loading…" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Theme.colors.bgDeep },
      }}
    >
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="match/[id]"
        options={{
          headerShown: true,
          title: 'Match',
          headerStyle: { backgroundColor: Theme.colors.bgSurface2 },
          headerTintColor: Theme.colors.textPrimary,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="profile/predictions"
        options={{
          headerShown: true,
          title: 'My Predictions',
          headerStyle: { backgroundColor: Theme.colors.bgSurface2 },
          headerTintColor: Theme.colors.textPrimary,
          presentation: 'card',
        }}
      />
    </Stack>
  );
}

export default function RootLayout(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <RootNavigator />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

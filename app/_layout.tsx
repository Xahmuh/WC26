import '@/global.css';

import { useEffect } from 'react';
import { View, Platform, useWindowDimensions } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
import { QueryClientProvider } from '@tanstack/react-query';

if (Platform.OS === 'web') {
  enableScreens(false);
}

import Theme from '@/constants/theme/design-system';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { createSessionFromUrl } from '@/services/auth.service';
import { addNotificationResponseListener, configureNotifications } from '@/lib/sound';
import { useAuthStore } from '@/stores/auth.store';

const APP_BACKGROUND_COLOR = Theme.gradients.carbonApp[0] ?? '#000000';

/**
 * Catches OAuth redirects that arrive as a deep link into the app (cold start or
 * Android) rather than being captured by the in-app browser. Completes the
 * Supabase session from the URL — guarded so an already-signed-in session is
 * never re-exchanged (a used PKCE code can only be exchanged once).
 */
function useOAuthDeepLink(): void {
  useEffect(() => {
    const handle = async (url: string | null): Promise<void> => {
      if (!url || (!url.includes('code=') && !url.includes('access_token='))) return;
      const { data } = await supabase.auth.getSession();
      if (data.session) return;
      try {
        await createSessionFromUrl(url);
      } catch (err) {
        console.warn('[Auth] deep-link session exchange failed:', err);
      }
    };

    void Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', ({ url }) => void handle(url));
    return () => sub.remove();
  }, []);
}

function useProtectedRoute(): boolean {
  const session = useAuthStore((s) => s.session);
  const initializing = useAuthStore((s) => s.initializing);
  const segments = useSegments();
  const router = useRouter();
  const inAuthGroup = segments[0] === '(auth)';
  const shouldGoToAuth = !session && !inAuthGroup;
  const shouldGoToHome = Boolean(session && inAuthGroup);

  useEffect(() => {
    if (initializing) return;

    if (shouldGoToAuth) {
      router.replace('/(auth)/splash');
    } else if (shouldGoToHome) {
      router.replace('/(tabs)/home');
    }
  }, [initializing, router, shouldGoToAuth, shouldGoToHome]);

  return !initializing && !shouldGoToAuth && !shouldGoToHome;
}

/**
 * Routes a tapped points/result notification straight to its Match Details
 * screen (foreground, background, or cold start). No-op in Expo Go / web.
 */
function useNotificationDeepLink(): void {
  const router = useRouter();
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    void addNotificationResponseListener((matchId) => {
      router.push(`/match/${matchId}`);
    }).then((fn) => {
      cleanup = fn;
    });
    return () => cleanup?.();
  }, [router]);
}

function RootNavigator(): React.JSX.Element {
  const { width } = useWindowDimensions();
  const initialize = useAuthStore((s) => s.initialize);
  const initializing = useAuthStore((s) => s.initializing);

  useEffect(() => {
    void initialize();
    void configureNotifications();
  }, [initialize]);

  useOAuthDeepLink();
  useNotificationDeepLink();
  const routeReady = useProtectedRoute();

  if (!routeReady && !initializing) {
    return (
      <LinearGradient colors={Theme.gradients.carbonApp as [string, string, string, string]} style={{ flex: 1 }} />
    );
  }

  if (initializing || !routeReady) {
    return (
      <LinearGradient colors={Theme.gradients.carbonApp as [string, string, string, string]} style={{ flex: 1 }}>
        <LoadingSpinner fullScreen label="Loading…" />
      </LinearGradient>
    );
  }

  const isWeb = Platform.OS === 'web';
  const useMaxContainer = isWeb && width > 480;

  const content = (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: APP_BACKGROUND_COLOR },
      }}
    >
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="match/[id]"
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="cards"
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="user-performance"
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
    </Stack>
  );

  if (useMaxContainer) {
    return (
      <LinearGradient
        colors={Theme.gradients.carbonApp as [string, string, string, string]}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
      >
        <View 
          style={{ 
            width: Math.min(480, width),
            maxWidth: '100%',
            height: '100%', 
            backgroundColor: APP_BACKGROUND_COLOR,
            ...(Platform.OS === 'web'
              ? { boxShadow: '0 0 15px rgba(0, 0, 0, 0.5)' }
              : {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.5,
                  shadowRadius: 15,
                  elevation: 10,
                }),
          }}
        >
          {content}
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={Theme.gradients.carbonApp as [string, string, string, string]} style={{ flex: 1 }}>
      {content}
    </LinearGradient>
  );
}

export default function RootLayout(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: APP_BACKGROUND_COLOR }}>
      <SafeAreaProvider style={{ flex: 1, backgroundColor: APP_BACKGROUND_COLOR }}>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <ErrorBoundary>
            <RootNavigator />
          </ErrorBoundary>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

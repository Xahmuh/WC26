// ============================================================================
// Typed Supabase client for the mobile app.
// ----------------------------------------------------------------------------
// Uses the PUBLIC anon key only. All privileged operations (writing points,
// calling football-data.org) happen in Edge Functions with the service role.
// ============================================================================

import 'react-native-url-polyfill/auto';
import {
  createClient,
  type RealtimeChannel,
  type Session,
  type User,
} from '@supabase/supabase-js';

import { AppState, Platform } from 'react-native';
import type { Database, LeaderboardRow } from '@/types';

import Constants from 'expo-constants';

const supabaseUrl = 
  process.env.EXPO_PUBLIC_SUPABASE_URL || 
  Constants.expoConfig?.extra?.supabaseUrl;

const supabaseAnonKey = 
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
  Constants.expoConfig?.extra?.supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail loud and early — a missing key produces confusing 401s otherwise.
  throw new Error(
    'Missing Supabase config. Set EXPO_PUBLIC_SUPABASE_URL and ' +
      'EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env (see .env.example) or extra in app.json.'
  );
}

const isWeb = Platform.OS === 'web';
const supabaseProjectRef = (() => {
  try {
    return new URL(supabaseUrl).hostname.split('.')[0] || 'wc26';
  } catch {
    return 'wc26';
  }
})();

export const SUPABASE_AUTH_STORAGE_KEY = `wc26-${supabaseProjectRef}-auth-token-v2`;

const LEGACY_AUTH_STORAGE_KEYS = [
  `sb-${supabaseProjectRef}-auth-token`,
  `sb-${supabaseProjectRef}-auth-token-code-verifier`,
  'supabase.auth.token',
];

function getNativeAsyncStorage() {
  return require('@react-native-async-storage/async-storage').default;
}

const customStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (isWeb) {
      if (typeof window === 'undefined') {
        return null;
      }
      return window.localStorage.getItem(key);
    }
    const AsyncStorage = getNativeAsyncStorage();
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (isWeb) {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, value);
      }
      return;
    }
    const AsyncStorage = getNativeAsyncStorage();
    return AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (isWeb) {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
      return;
    }
    const AsyncStorage = getNativeAsyncStorage();
    return AsyncStorage.removeItem(key);
  },
};

export function isInvalidRefreshTokenError(err: unknown): boolean {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
      ? err
      : typeof (err as { message?: unknown } | null)?.message === 'string'
      ? String((err as { message: string }).message)
      : '';

  return (
    message.includes('Invalid Refresh Token') ||
    message.includes('Refresh Token Not Found') ||
    message.includes('refresh_token_not_found')
  );
}

export async function clearSupabaseAuthStorage(): Promise<void> {
  const keys = [SUPABASE_AUTH_STORAGE_KEY, ...LEGACY_AUTH_STORAGE_KEYS];
  await Promise.all(keys.map((key) => customStorage.removeItem(key).catch(() => undefined)));
}

void Promise.all(
  LEGACY_AUTH_STORAGE_KEYS.map((key) => customStorage.removeItem(key).catch(() => undefined))
);

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    storageKey: SUPABASE_AUTH_STORAGE_KEY,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: isWeb,
  },
});

if (!isWeb) {
  const globalAuthState = globalThis as typeof globalThis & {
    __wc26SupabaseAppStateListener?: { remove: () => void };
  };

  globalAuthState.__wc26SupabaseAppStateListener?.remove();
  globalAuthState.__wc26SupabaseAppStateListener = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });

  if (AppState.currentState === 'active') {
    supabase.auth.startAutoRefresh();
  }
}

/**
 * Returns the currently authenticated user, or null if signed out.
 * Wraps getUser() so callers don't have to unpack the { data, error } shape.
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      // A missing session is an expected "not signed in" case, not a crash.
      return null;
    }
    return data.user;
  } catch {
    return null;
  }
}

export async function getCurrentSession(): Promise<Session | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return data.session;
  } catch {
    return null;
  }
}

/**
 * Subscribes to leaderboard refreshes. The materialized view cannot emit
 * realtime events, and ranks are now recalculated only once per match-day
 * (not per match) — so we listen to the single-row `leaderboard_state` table,
 * whose `version` is bumped by finalize_leaderboard() when ranks change. The
 * caller refetches the view on each tick.
 *
 * Returns an unsubscribe function — always call it on cleanup.
 */
export function subscribeToLeaderboard(
  onChange: () => void
): () => void {
  const channelId = Math.random().toString(36).substring(2, 9);
  const channel: RealtimeChannel = supabase
    .channel(`leaderboard-state-${channelId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'leaderboard_state' },
      () => onChange()
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export type { LeaderboardRow };

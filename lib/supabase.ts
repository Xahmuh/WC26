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

import { Platform } from 'react-native';
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

const customStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (isWeb) {
      if (typeof window === 'undefined') {
        return null;
      }
      return window.localStorage.getItem(key);
    }
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (isWeb) {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, value);
      }
      return;
    }
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (isWeb) {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
      return;
    }
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: isWeb,
  },
});

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
 * Subscribes to leaderboard-affecting changes. The materialized view itself
 * cannot emit realtime events, so we listen to the underlying `points` table
 * and let the caller refetch the view when anything changes.
 *
 * Returns an unsubscribe function — always call it on cleanup.
 */
export function subscribeToLeaderboard(
  onChange: () => void
): () => void {
  const channelId = Math.random().toString(36).substring(2, 9);
  const channel: RealtimeChannel = supabase
    .channel(`points-changes-${channelId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'points' },
      () => onChange()
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export type { LeaderboardRow };

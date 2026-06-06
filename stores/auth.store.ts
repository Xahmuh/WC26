// ============================================================================
// Auth store (Zustand) — owns the Supabase session + the user's profile row.
// A single onAuthStateChange subscription keeps this in sync; screens read
// `session`/`profile` and call the action helpers.
// ============================================================================

import { create } from 'zustand';
import type { Session, Subscription } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import type { UserProfile } from '@/types';

// Module-scoped guard so we only ever attach ONE onAuthStateChange listener,
// even if initialize() is called more than once.
let authListener: Subscription | null = null;

interface AuthState {
  session: Session | null;
  profile: UserProfile | null;
  /** True until the initial session restore completes. */
  initializing: boolean;
  /** True while a sign-in / sign-up request is in flight. */
  submitting: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

function toMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return fallback;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  initializing: true,
  submitting: false,
  error: null,

  initialize: async () => {
    try {
      const { data } = await supabase.auth.getSession();
      set({ session: data.session });
      if (data.session) {
        await get().refreshProfile();
      }

      // Keep the store in lock-step with Supabase auth events. Subscribe once.
      if (!authListener) {
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          set({ session });
          if (session) {
            void get().refreshProfile();
          } else {
            set({ profile: null });
          }
        });
        authListener = data.subscription;
      }
    } catch (err) {
      set({ error: toMessage(err, 'Failed to restore session.') });
    } finally {
      set({ initializing: false });
    }
  },

  signIn: async (email, password) => {
    set({ submitting: true, error: null });
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        set({ error: error.message });
        return false;
      }
      return true;
    } catch (err) {
      set({ error: toMessage(err, 'Sign-in failed.') });
      return false;
    } finally {
      set({ submitting: false });
    }
  },

  signUp: async (email, password, displayName) => {
    set({ submitting: true, error: null });
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          // Surfaced to the handle_new_user() trigger as raw_user_meta_data.
          data: { display_name: displayName.trim() },
        },
      });
      if (error) {
        set({ error: error.message });
        return false;
      }
      return true;
    } catch (err) {
      set({ error: toMessage(err, 'Sign-up failed.') });
      return false;
    } finally {
      set({ submitting: false });
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      set({ error: toMessage(err, 'Sign-out failed.') });
    } finally {
      set({ session: null, profile: null });
      // Drop all cached server data so the next user never sees the previous
      // account's groups / question answers (those queries use global keys).
      queryClient.clear();
    }
  },

  refreshProfile: async () => {
    const session = get().session;
    if (!session) {
      set({ profile: null });
      return;
    }
    try {
      // PII columns (email, last_login) are no longer client-readable after the
      // security hardening migration — they're revoked at the GRANT layer. Read
      // the user's own email from the auth session instead.
      const { data, error } = await supabase
        .from('users')
        .select('id, display_name, username, avatar_url, total_points, role, supported_teams')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error) {
        set({ error: error.message });
        return;
      }
      const sessionEmail = session.user?.email ?? null;
      const isAlwaysAdmin =
        sessionEmail?.toLowerCase() === 'ahmedelsherbiinii@gmail.com';

      set({
        profile: data
          ? {
              ...data,
              email: sessionEmail,
              last_login: null,
              role: (data.role === 'admin' || isAlwaysAdmin) ? 'admin' : 'user',
              supported_teams: data.supported_teams as string[] | null,
            }
          : null,
      });
    } catch (err) {
      set({ error: toMessage(err, 'Failed to load profile.') });
    }
  },

  clearError: () => set({ error: null }),
}));

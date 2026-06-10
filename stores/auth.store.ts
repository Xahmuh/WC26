// ============================================================================
// Auth store (Zustand) — owns the Supabase session + the user's profile row.
// A single onAuthStateChange subscription keeps this in sync; screens read
// `session`/`profile` and call the action helpers.
// ============================================================================

import { create } from 'zustand';
import type { Session, Subscription } from '@supabase/supabase-js';

import { clearSupabaseAuthStorage, isInvalidRefreshTokenError, supabase } from '@/lib/supabase';
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
  /**
   * True for the brief window right after a fresh sign-in (Supabase's
   * `SIGNED_IN` auth event) — NOT set when an existing session is silently
   * restored on app launch. Screens (e.g. Home) can watch this to trigger
   * "just logged in" UX such as the branding video popup, then call
   * `consumeJustSignedIn()` to reset it so it doesn't repeat.
   */
  justSignedIn: boolean;
  /** True once the branding video has been shown during the current login session. */
  hasSeenBrandingVideo: boolean;

  initialize: () => Promise<void>;
  /** Resets `justSignedIn` back to false once the consumer has reacted to it. */
  consumeJustSignedIn: () => void;
  /** Marks the branding video as already shown for the current session. */
  markBrandingVideoSeen: () => void;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setSupportedTeams: (teams: string[]) => void;
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
  justSignedIn: false,
  hasSeenBrandingVideo: false,

  consumeJustSignedIn: () => set({ justSignedIn: false }),
  markBrandingVideoSeen: () => set({ hasSeenBrandingVideo: true }),

  initialize: async () => {
    try {
      // Keep the store in lock-step with Supabase auth events. Subscribe once.
      if (!authListener) {
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
          const previousSession = get().session;
          set({ session });
          if (session) {
            const isNewSession =
              !previousSession || previousSession.user.id !== session.user.id;
            // Only a genuine fresh sign-in fires `SIGNED_IN`. Restoring a
            // persisted session can also emit SIGNED_IN in some clients, so
            // guard against replaying the popup when a session already exists.
            if (event === 'SIGNED_IN' && isNewSession && !get().initializing) {
              set({ justSignedIn: true, hasSeenBrandingVideo: false });
            }
            void get().refreshProfile();
          } else {
            set({ profile: null, hasSeenBrandingVideo: false });
          }
        });
        authListener = data.subscription;
      }

      const { data, error } = await supabase.auth.getSession();
      if (error) {
        if (isInvalidRefreshTokenError(error)) {
          await clearSupabaseAuthStorage();
          queryClient.clear();
          set({
            session: null,
            profile: null,
            justSignedIn: false,
            hasSeenBrandingVideo: false,
            error: null,
          });
        } else {
          set({ error: error.message });
        }
        return;
      }

      set({ session: data.session });
      if (data.session) {
        await get().refreshProfile();
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
      if (!isInvalidRefreshTokenError(err)) {
        set({ error: toMessage(err, 'Sign-out failed.') });
      }
    } finally {
      await clearSupabaseAuthStorage();
      set({ session: null, profile: null, justSignedIn: false, hasSeenBrandingVideo: false });
      // Drop all cached server data so the next user never sees the previous
      // account's groups / question answers (those queries use global keys).
      queryClient.clear();
    }
  },

  setSupportedTeams: (teams) =>
    set((state) => ({
      profile: state.profile ? { ...state.profile, supported_teams: teams } : state.profile,
    })),

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

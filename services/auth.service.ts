import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

// Required for Expo WebBrowser OAuth redirect on mobile devices
WebBrowser.maybeCompleteAuthSession();

/**
 * Initiates the Google OAuth login flow.
 * Opens the device browser to authenticate via Supabase, then redirects back to the app.
 */
export async function signInWithGoogle(): Promise<void> {
  try {
    const redirectUrl = Linking.createURL('(auth)/login');
    console.log('[AuthService] Generated Redirect URL:', redirectUrl);
    
    if (Platform.OS === 'web') {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
      return;
    }

    // Mobile/Native flow
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      throw error;
    }

    if (data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      if (result.type === 'success' && result.url) {
        // The Supabase client automatically detects the redirected session
        // via its onAuthStateChange handler.
      }
    }
  } catch (err) {
    console.error('Google Sign-in error:', err);
    throw err;
  }
}

/**
 * Simulates a Google Sign-in for local development and testing.
 * Uses a password-based account under the hood to trigger the exact same Supabase auth hooks.
 */
export async function simulateGoogleSignIn(
  email: string,
  name: string,
  avatarUrl: string,
  role: 'user' | 'admin' = 'user'
): Promise<boolean> {
  const mockEmail = email.toLowerCase().trim();
  const mockPassword = 'GoogleMockPassword123!';

  try {
    // 1. Try to sign in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: mockEmail,
      password: mockPassword,
    });

    if (signInError) {
      // 2. If user doesn't exist, sign up
      if (signInError.message.includes('Invalid login credentials')) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: mockEmail,
          password: mockPassword,
          options: {
            data: {
              display_name: name,
              avatar_url: avatarUrl,
              role: role,
            },
          },
        });

        if (signUpError) throw signUpError;
        return !!signUpData.session;
      }
      throw signInError;
    }

    // 3. Update metadata to simulate changing Google account properties
    await supabase.auth.updateUser({
      data: {
        display_name: name,
        avatar_url: avatarUrl,
        role: role,
      },
    });

    return !!signInData.session;
  } catch (err) {
    console.error('Simulated Google Sign-in error:', err);
    throw err;
  }
}

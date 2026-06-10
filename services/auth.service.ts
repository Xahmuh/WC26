import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

// Required for Expo WebBrowser OAuth redirect on mobile devices
WebBrowser.maybeCompleteAuthSession();

/**
 * Turns the OAuth redirect URL into a Supabase session.
 *
 * Supabase JS v2 uses the PKCE flow by default: the redirect comes back with an
 * authorization `code` in the QUERY string, which must be exchanged for a
 * session. We also accept the older implicit-flow format (`access_token` /
 * `refresh_token` in the URL hash) as a fallback so both configurations work.
 */
export async function createSessionFromUrl(url: string): Promise<void> {
  // Query params (PKCE: ?code=…) — parsed via expo-linking.
  const { queryParams } = Linking.parse(url);
  const qp = (key: string): string | undefined => {
    const v = queryParams?.[key];
    return typeof v === 'string' ? v : undefined;
  };

  // Hash params (implicit: #access_token=…) — parsed manually.
  const hash = url.includes('#') ? url.split('#')[1] ?? '' : '';
  const hp = (key: string): string | undefined =>
    hash.match(new RegExp(`${key}=([^&]+)`))?.[1];

  const errorDescription = qp('error_description') ?? hp('error_description');
  if (errorDescription) {
    throw new Error(decodeURIComponent(errorDescription.replace(/\+/g, ' ')));
  }

  // PKCE: exchange the authorization code for a session.
  const code = qp('code') ?? hp('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return;
  }

  // Implicit fallback: set the session directly from the returned tokens.
  const access_token = qp('access_token') ?? hp('access_token');
  const refresh_token = qp('refresh_token') ?? hp('refresh_token');
  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) throw error;
    return;
  }

  throw new Error('Google sign-in did not return a session. Please try again.');
}

/**
 * Initiates the Google OAuth login flow.
 * Opens the device browser to authenticate via Supabase, then redirects back to the app.
 */
export async function signInWithGoogle(): Promise<void> {
  try {
    const redirectUrl = Linking.createURL('login');

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
        // Handles both PKCE (?code=) and implicit (#access_token=) redirects.
        await createSessionFromUrl(result.url);
      }
      // result.type === 'cancel' / 'dismiss' → user closed the browser; no-op.
    }
  } catch (err) {
    console.error('Google Sign-in error:', err);
    throw err;
  }
}

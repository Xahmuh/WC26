import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
  Image,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import Theme from '@/constants/theme/design-system';
import { useResponsive } from '@/lib/responsive';
import { Button } from '@/components/ui/Button';
import { useAuthContent } from '@/hooks/useAuthContent';
import { useAuthStore } from '@/stores/auth.store';

const MIN_PASSWORD = 6;

export default function RegisterScreen(): React.JSX.Element {
  const router = useRouter();
  const { scale: rs } = useResponsive();
  const logoSize = rs(185);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const authContentQuery = useAuthContent();
  const quotes = authContentQuery.data?.quotes ?? [];
  const developerName = authContentQuery.data?.settings?.developer_name?.trim() ?? '';

  const quote = quotes.length > 0 ? quotes[quoteIndex % quotes.length] : null;

  useEffect(() => {
    if (quotes.length === 0) {
      setQuoteIndex(0);
      return;
    }
    setQuoteIndex((prev) => prev % quotes.length);
  }, [quotes.length]);

  const handleNextQuote = () => {
    if (quotes.length <= 1) return;
    setQuoteIndex((prev) => (prev + 1) % quotes.length);
  };

  const signUp = useAuthStore((s) => s.signUp);
  const submitting = useAuthStore((s) => s.submitting);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const trimmedName = displayName.trim();
  const passwordTooShort = password.length > 0 && password.length < MIN_PASSWORD;
  const canSubmit =
    trimmedName.length >= 2 &&
    email.trim().length > 0 &&
    password.length >= MIN_PASSWORD;

  // Static design, background animations removed to match login screen.

  const handleSubmit = async (): Promise<void> => {
    if (!canSubmit) return;
    clearError();
    setNotice(null);
    const ok = await signUp(email, password, trimmedName);
    if (ok) {
      setNotice(
        'Account created. If email confirmation is enabled, check your inbox to finish signing in.'
      );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Theme.colors.bgDeep }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'space-between',
            paddingHorizontal: 24,
            paddingVertical: 16,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
            {/* Top Section: Logo & Titles */}
            <View className="items-center relative w-full">
              {/* Back Button - absolute positioning so it doesn't push logo down */}
              <Pressable
                onPress={() => router.replace('/(auth)/login')}
                className="absolute left-0 top-0 min-h-11 justify-center flex-row items-center gap-1 active:opacity-75 z-10"
              >
                <Text className="text-accent text-lg">←</Text>
                <Text className="text-accent text-xs font-semibold uppercase tracking-wider">Back</Text>
              </Pressable>

              <View className="items-center justify-center pt-1">
                <Image
                  source={require('../../assets/worldcup.webp')}
                  style={{ width: logoSize, height: logoSize }}
                  resizeMode="contain"
                />
                <Text 
                  className="text-center text-xs uppercase tracking-[0.25em] text-textSecondary font-semibold"
                  style={{ marginTop: -4 }}
                >
                  Compete. Climb. Lead
                </Text>
              </View>
            </View>

            {/* Middle Section: Create Account Box */}
            <View
              className="rounded-2xl bg-black p-5 gap-3 shadow-xl shadow-black/40 max-w-md w-full align-self-center mx-auto"
              style={{ marginTop: -10, minHeight: 360 }}
            >
              <Text className="text-xs font-bold uppercase tracking-wider text-textPrimary text-center">
                Create Account
              </Text>

              <View className="gap-3">
                <View className="gap-1">
                  <Text className="text-[10px] font-semibold uppercase tracking-wide text-textSecondary">
                    Display Name
                  </Text>
                  <TextInput
                    value={displayName}
                    onChangeText={setDisplayName}
                    autoCapitalize="words"
                    placeholder="Your name"
                    placeholderTextColor={Theme.colors.textTertiary}
                    className="h-11 rounded-xl border border-bgSurface3 bg-bgSurface1 px-4 text-sm text-textPrimary focus:border-accent"
                  />
                </View>

                <View className="gap-1">
                  <Text className="text-[10px] font-semibold uppercase tracking-wide text-textSecondary">
                    Email Address
                  </Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    placeholder="you@example.com"
                    placeholderTextColor={Theme.colors.textTertiary}
                    className="h-11 rounded-xl border border-bgSurface3 bg-bgSurface1 px-4 text-sm text-textPrimary focus:border-accent"
                  />
                </View>

                <View className="gap-1">
                  <Text className="text-[10px] font-semibold uppercase tracking-wide text-textSecondary">
                    Password
                  </Text>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoComplete="password-new"
                    placeholder="At least 6 characters"
                    placeholderTextColor={Theme.colors.textTertiary}
                    className="h-11 rounded-xl border border-bgSurface3 bg-bgSurface1 px-4 text-sm text-textPrimary focus:border-accent"
                  />
                  {passwordTooShort ? (
                    <Text className="text-[10px] text-warning">
                      Password must be at least {MIN_PASSWORD} characters.
                    </Text>
                  ) : null}
                </View>

                {error ? <Text className="text-xs font-semibold text-live">{error}</Text> : null}
                {notice ? <Text className="text-xs font-semibold text-success">{notice}</Text> : null}

                <Button
                  label="Create Account"
                  onPress={handleSubmit}
                  loading={submitting}
                  disabled={!canSubmit}
                />

                <Button
                  label="Sign in"
                  variant="secondary"
                  onPress={() => router.replace('/(auth)/login')}
                />
              </View>
            </View>

            {/* Bottom Section: Quote Ticker & Footer Credit */}
            <View
              className="gap-3 w-full max-w-md mx-auto items-center"
              style={{ transform: [{ translateY: -28 }] }}
            >
              {/* Soccer Quote Card (Press to swap - fixed height for stable layout) */}
              {quote && (
                <Pressable
                  onPress={handleNextQuote}
                  className="h-24 px-5 py-2 justify-center overflow-hidden rounded-xl border border-bgBorder bg-bgSurface1 w-full max-w-sm active:opacity-75"
                >
                  <Text
                    numberOfLines={3}
                    adjustsFontSizeToFit
                    minimumFontScale={0.88}
                    className="text-center italic text-sm text-textSecondary font-light leading-relaxed"
                  >
                    " {quote.quote_text} "
                  </Text>
                  <Text
                    numberOfLines={1}
                    className="text-center text-[10px] font-bold uppercase tracking-widest text-accent mt-1"
                  >
                    - {quote.author}
                  </Text>
                </Pressable>
              )}

              {developerName ? (
                <View className="w-full items-center justify-center -mt-1 pt-1.5 border-t border-bgBorder/35">
                  <Text className="text-xs tracking-wide text-white font-normal">
                    Developed by {developerName}
                  </Text>
                </View>
              ) : null}
            </View>
          </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

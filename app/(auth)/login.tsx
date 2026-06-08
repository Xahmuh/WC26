import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
  Pressable,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import Theme from '@/constants/theme/design-system';
import { useResponsive } from '@/lib/responsive';
import { Button } from '@/components/ui/Button';
import { GoogleButton } from '@/components/ui/GoogleButton';
import { Icon } from '@/components/ui/Icon';
import { useAuthStore } from '@/stores/auth.store';
import { signInWithGoogle } from '@/services/auth.service';

const QUOTES = [
  { text: "Stop giving Arsenal set pieces… lower leagues await", author: "Ahmed Elsherbini" },
  { text: "All Barcelona’s trophies were just about referees", author: "Yusuf Salem" },
  { text: "Football is the ultimate drama.", author: "Pelé" },
  { text: "You have to fight to reach your dream.", author: "Lionel Messi" },
  { text: "Every game is a new opportunity to write history.", author: "World Cup 2026" },
  { text: "Predicting the future is easy. Getting it right is the hard part.", author: "Football Legends" },
  { text: "Some people think football is a matter of life and death. It's much more serious than that.", author: "Bill Shankly" }
];

export default function LoginScreen(): React.JSX.Element {
  const router = useRouter();
  const { scale: rs } = useResponsive();
  const logoSize = rs(185);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Math.random() * QUOTES.length));

  const quote = QUOTES[quoteIndex] || QUOTES[0];

  const handleNextQuote = () => {
    setQuoteIndex((prev) => (prev + 1) % QUOTES.length);
  };

  const signIn = useAuthStore((s) => s.signIn);
  const submitting = useAuthStore((s) => s.submitting);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const canSubmit = email.trim().length > 0 && password.length > 0;

  // Static design, background animations removed as requested.

  const handleSubmit = async (): Promise<void> => {
    if (!canSubmit) return;
    clearError();
    await signIn(email, password);
  };

  const handleGoogleLogin = async (): Promise<void> => {
    setGoogleLoading(true);
    clearError();
    try {
      await signInWithGoogle();
    } catch (err: any) {
      useAuthStore.setState({ error: err.message || 'Google Auth failed' });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Theme.colors.bgDeep }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Scrollable so the tall content (logo + form + Google + quote +
            footer) never overlaps on short screens. flexGrow:1 keeps the
            space-between layout on tall screens, scrolls on short ones. */}
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
              {/* Back Button */}
              <Pressable
                onPress={() => router.replace('/(auth)/splash')}
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

            {/* Middle Section: Sign-In Box & Google Option */}
            <View className="gap-3 max-w-md w-full align-self-center mx-auto" style={{ marginTop: -10 }}>
              {/* Option 1: Email Login Form */}
              <View
                className="rounded-2xl bg-black p-5 gap-3 shadow-xl shadow-black/40"
                style={{ minHeight: 360 }}
              >
                <Text className="text-xs font-bold uppercase tracking-wider text-textPrimary text-center">
                  Sign in with Email
                </Text>

                <View className="gap-3">
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
                    <View className="relative justify-center">
                      <TextInput
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        autoComplete="password"
                        placeholder="••••••••"
                        placeholderTextColor={Theme.colors.textTertiary}
                        className="h-11 rounded-xl border border-bgSurface3 bg-bgSurface1 px-4 pr-12 text-sm text-textPrimary focus:border-accent"
                      />
                      <Pressable
                        onPress={() => setShowPassword((s) => !s)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 h-11 justify-center"
                      >
                        <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} color={Theme.colors.textTertiary} />
                      </Pressable>
                    </View>
                  </View>

                  {error ? (
                    <Text className="text-xs font-semibold text-live">{error}</Text>
                  ) : null}

                  <Button
                    label="Sign in"
                    onPress={handleSubmit}
                    loading={submitting}
                    disabled={!canSubmit}
                  />

                  <Button
                    label="Create Account"
                    variant="secondary"
                    onPress={() => router.replace('/(auth)/register')}
                  />

                  <GoogleButton
                    onPress={handleGoogleLogin}
                    loading={googleLoading}
                    disabled={submitting}
                  />
                </View>
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
                    " {quote.text} "
                  </Text>
                  <Text
                    numberOfLines={1}
                    className="text-center text-[10px] font-bold uppercase tracking-widest text-accent mt-1"
                  >
                    — {quote.author}
                  </Text>
                </Pressable>
              )}

              <View className="w-full items-center justify-center -mt-1 pt-1.5 border-t border-bgBorder/35">
                <Text className="text-xs tracking-wide text-white font-normal">
                  Developed by Ahmed Elsherbini
                </Text>
              </View>
            </View>
          </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

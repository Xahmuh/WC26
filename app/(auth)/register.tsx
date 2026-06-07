import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
  Image,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Rect, Circle, Line, Path } from 'react-native-svg';

import Theme from '@/constants/theme/design-system';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth.store';

const MIN_PASSWORD = 6;

const QUOTES = [
  { text: "Stop giving Arsenal set pieces… lower leagues await", author: "Ahmed Elsherbini" },
  { text: "All Barcelona’s trophies were just about referees", author: "Yusuf Salem" },
  { text: "Football is the ultimate drama.", author: "Pelé" },
  { text: "You have to fight to reach your dream.", author: "Lionel Messi" },
  { text: "Every game is a new opportunity to write history.", author: "World Cup 2026" },
  { text: "Predicting the future is easy. Getting it right is the hard part.", author: "Football Legends" },
  { text: "Some people think football is a matter of life and death. It's much more serious than that.", author: "Bill Shankly" }
];

export default function RegisterScreen(): React.JSX.Element {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Math.random() * QUOTES.length));

  const quote = QUOTES[quoteIndex] || QUOTES[0];

  const handleNextQuote = () => {
    setQuoteIndex((prev) => (prev + 1) % QUOTES.length);
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
      <LinearGradient
        colors={['#1F1F1F', '#141414', '#0D0D0D']}
        locations={[0, 0.4, 1]}
        style={{ flex: 1 }}
      >
        {/* Tactical Pitch Grid Background (Glow splashes removed as requested) */}
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          {/* Tactical Pitch Grid Overlay */}
          <Svg
            width="100%"
            height="100%"
            viewBox="0 0 400 800"
            style={{ position: 'absolute', top: 0, left: 0 }}
          >
            {/* Outer Boundary */}
            <Rect x="20" y="20" width="360" height="760" rx="4" fill="none" stroke="#C8FF00" strokeWidth="1.2" opacity={0.06} />
            
            {/* Center Line & Center Circle */}
            <Line x1="20" y1="400" x2="380" y2="400" stroke="#C8FF00" strokeWidth="1.2" opacity={0.06} />
            <Circle cx="200" cy="400" r="55" fill="none" stroke="#C8FF00" strokeWidth="1.2" opacity={0.06} />
            <Circle cx="200" cy="400" r="2.5" fill="#C8FF00" opacity={0.06} />

            {/* Top Penalty Area */}
            <Rect x="100" y="20" width="200" height="110" fill="none" stroke="#C8FF00" strokeWidth="1.2" opacity={0.06} />
            <Rect x="145" y="20" width="110" height="35" fill="none" stroke="#C8FF00" strokeWidth="1.2" opacity={0.06} />
            <Circle cx="200" cy="95" r="2" fill="#C8FF00" opacity={0.06} />
            
            {/* Bottom Penalty Area */}
            <Rect x="100" y="670" width="200" height="110" fill="none" stroke="#C8FF00" strokeWidth="1.2" opacity={0.06} />
            <Rect x="145" y="745" width="110" height="35" fill="none" stroke="#C8FF00" strokeWidth="1.2" opacity={0.06} />
            <Circle cx="200" cy="705" r="2" fill="#C8FF00" opacity={0.06} />

            {/* Corner Arcs */}
            <Path d="M 20 28 A 8 8 0 0 0 28 20" fill="none" stroke="#C8FF00" strokeWidth="1.2" opacity={0.06} />
            <Path d="M 372 20 A 8 8 0 0 0 380 28" fill="none" stroke="#C8FF00" strokeWidth="1.2" opacity={0.06} />
            <Path d="M 20 772 A 8 8 0 0 0 28 780" fill="none" stroke="#C8FF00" strokeWidth="1.2" opacity={0.06} />
            <Path d="M 372 780 A 8 8 0 0 0 380 772" fill="none" stroke="#C8FF00" strokeWidth="1.2" opacity={0.06} />
          </Svg>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View className="flex-1 justify-between px-6 py-4">
            {/* Top Section: Logo & Titles */}
            <View className="items-center relative w-full">
              {/* Back Button - absolute positioning so it doesn't push logo down */}
              <Pressable
                onPress={() => router.back()}
                className="absolute left-0 top-1.5 flex-row items-center gap-1 active:opacity-75 z-10"
              >
                <Text className="text-accent text-lg">←</Text>
                <Text className="text-accent text-xs font-semibold uppercase tracking-wider">Back</Text>
              </Pressable>

              <View className="items-center justify-center pt-1">
                <Image
                  source={require('../../assets/worldcup.webp')}
                  style={{ width: 230, height: 230 }}
                  resizeMode="contain"
                />
                <Text 
                  className="text-center text-base uppercase tracking-[0.2em] text-textPrimary font-extrabold"
                  style={{ marginTop: -5 }}
                >
                  
                </Text>
                <Text 
                  className="text-center text-xs uppercase tracking-[0.25em] text-textSecondary font-semibold"
                  style={{ marginTop: 18 }}
                >
                  Compete. Climb. Lead
                </Text>
              </View>
            </View>

            {/* Middle Section: Create Account Box */}
            <View className="rounded-2xl border border-accent/20 bg-bgSurface2/80 p-5 gap-3 shadow-lg shadow-accent/5 max-w-md w-full align-self-center mx-auto">
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
                    className="h-11 rounded-xl border border-bgBorder bg-bgDeep/40 px-4 text-sm text-textPrimary focus:border-accent"
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
                    className="h-11 rounded-xl border border-bgBorder bg-bgDeep/40 px-4 text-sm text-textPrimary focus:border-accent"
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
                    className="h-11 rounded-xl border border-bgBorder bg-bgDeep/40 px-4 text-sm text-textPrimary focus:border-accent"
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
                  onPress={() => router.push('/(auth)/login')}
                />
              </View>
            </View>

            {/* Bottom Section: Quote Ticker & Footer Credit */}
            <View className="gap-3 mt-2 w-full max-w-md mx-auto items-center">
              {/* Soccer Quote Card (Press to swap - fixed height for stable layout) */}
              {quote && (
                <Pressable
                  onPress={handleNextQuote}
                  className="px-5 h-16 justify-center rounded-xl border border-bgBorder bg-bgSurface1 w-full max-w-sm active:opacity-75"
                >
                  <Text className="text-center italic text-xs text-textSecondary font-light leading-relaxed">
                    " {quote.text} "
                  </Text>
                  <Text className="text-center text-[9px] font-bold uppercase tracking-widest text-accent mt-1">
                    — {quote.author}
                  </Text>
                </Pressable>
              )}

              <View className="w-full items-center justify-center pt-2.5 border-t border-bgBorder/35">
                <Text className="text-[10px] tracking-widest uppercase text-textTertiary font-semibold opacity-70">
                  Developed by Ahmed Elsherbini
                </Text>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

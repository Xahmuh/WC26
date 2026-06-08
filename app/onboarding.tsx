import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView, type VideoSource } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/theme/design-system';

const VIDEO_SOURCE: VideoSource = require('../assets/Videos/vid.mp4');
const PLAYBACK_TIMEOUT_MS = 8000;
const FADE_MS = 300;

function IntroVideoLayer({
  onReady,
  onProgress,
  onComplete,
  onError,
}: {
  onReady: () => void;
  onProgress: (progress: number) => void;
  onComplete: () => void;
  onError: (error: unknown) => void;
}): React.JSX.Element {
  const player = useVideoPlayer(VIDEO_SOURCE, (p) => {
    p.muted = Platform.OS === 'web';
    p.play();
  });

  useEffect(() => {
    const subscription = player.addListener('statusChange', ({ status, error }) => {
      if (status === 'readyToPlay') {
        onReady();
      } else if (status === 'error') {
        onError(error);
      }
    });
    return () => subscription.remove();
  }, [player, onError, onReady]);

  useEffect(() => {
    const subscription = player.addListener('playToEnd', onComplete);
    return () => subscription.remove();
  }, [player, onComplete]);

  useEffect(() => {
    const interval = setInterval(() => {
      const duration = player.duration;
      if (duration > 0) {
        onProgress(Math.min(player.currentTime / duration, 1));
      }
    }, 100);

    return () => clearInterval(interval);
  }, [player, onProgress]);

  return (
    <VideoView
      player={player}
      style={styles.video}
      contentFit="contain"
      nativeControls={false}
    />
  );
}

export default function OnboardingScreen(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [mountVideo, setMountVideo] = useState(false);
  const hasNavigated = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleComplete = useCallback(async () => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const { data: { session } } = await supabase.auth.getSession();

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: FADE_MS,
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      if (session) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/(auth)/login');
      }
    });
  }, [fadeAnim, router]);

  const handleReady = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const handleProgress = useCallback(
    (progress: number) => {
      progressAnim.setValue(progress);
    },
    [progressAnim]
  );

  const handleError = useCallback(
    (error: unknown) => {
      console.warn('[Onboarding] video failed to load:', error);
      void handleComplete();
    },
    [handleComplete]
  );

  // Fade in on mount.
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: FADE_MS,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [fadeAnim]);

  // Mount the heavy video after the first frame so the shell paints first.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMountVideo(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Fail-safe: if playback hasn't started within PLAYBACK_TIMEOUT_MS, bail.
  useEffect(() => {
    timeoutRef.current = setTimeout(handleComplete, PLAYBACK_TIMEOUT_MS);
    return () => clearTimeout(timeoutRef.current);
  }, [handleComplete]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <StatusBar hidden />

      {mountVideo ? (
        <IntroVideoLayer
          onReady={handleReady}
          onProgress={handleProgress}
          onComplete={handleComplete}
          onError={handleError}
        />
      ) : (
        <View style={styles.videoPlaceholder}>
          <Text style={styles.loadingText}>Loading intro...</Text>
        </View>
      )}

      <View style={[styles.skipButton, { top: insets.top + 16, right: 16 }]}>
        <Pressable
          onPress={handleComplete}
          accessibilityLabel="Skip intro video"
          accessibilityRole="button"
          style={({ pressed }) => [styles.skipPressable, pressed && styles.skipPressed]}
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <View style={[styles.progressTrack, { bottom: insets.bottom + 16 }]}>
        <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgDeep,
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  videoPlaceholder: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bgDeep,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  skipButton: {
    position: 'absolute',
  },
  skipPressable: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.accent,
    backgroundColor: 'rgba(13,13,13,0.55)',
  },
  skipPressed: {
    opacity: 0.7,
  },
  skipText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  progressTrack: {
    position: 'absolute',
    left: 24,
    right: 24,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },
});

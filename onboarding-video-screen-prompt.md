# CLAUDE CODE PROMPT — Onboarding Video Screen

You are a senior React Native (Expo SDK 56) engineer.

Your task is to implement a professional onboarding video screen
that plays automatically between the Splash Screen and the Login Screen.

---

## CONTEXT

- Framework: React Native + Expo SDK 56
- Navigation: Expo Router v4
- Theme: Dark stadium aesthetic — background `#0D0D0D`, accent `#C9DF6A`
- Video file: `assets/videos/vid.mp4`
- This screen plays ONCE per app install, then never again

---

## PHASE 0 — DISCOVERY (mandatory before touching anything)

Scan the project and document:

1. The app entry point — is it `app/_layout.tsx` or `App.tsx`?
2. How the current Splash Screen works — Expo built-in or custom screen?
3. The exact route of the Login Screen (e.g. `/login`, `/(auth)/login`)
4. The exact route of the Home/Tabs Screen (e.g. `/(tabs)/home`)
5. Whether `expo-video` or `expo-av` is already installed
6. Whether `AsyncStorage` or any storage utility already exists in the project
7. Whether there is an existing auth flow / auth guard in `_layout.tsx`

Output your findings before writing any code.

---

## PHASE 1 — SETUP

### 1A — Copy video asset

Confirm `assets/videos/vid.mp4` exists at:
```
assets/videos/vid.mp4
```

If the folder does not exist, create it and instruct the user to place `vid.mp4` there.

### 1B — Install required packages (if not already installed)

```bash
npx expo install expo-video
npx expo install @react-native-async-storage/async-storage
```

> Use `expo-video` (not the deprecated `expo-av`) for Expo SDK 56.

### 1C — Register asset in app.json / app.config.ts

Confirm `assets/videos` is included in the bundler.
If using Metro bundler, add to `metro.config.js` if needed:

```javascript
resolver: {
  assetExts: [...assetExts, 'mp4'],
}
```

---

## PHASE 2 — CREATE THE VIDEO SCREEN

Create file: `app/onboarding.tsx`

### Full Requirements

**Playback Behavior:**
- Video plays automatically on mount (autoPlay)
- Video plays with sound
- Video does NOT loop
- When video ends → navigate automatically to Login Screen
- If video fails to load → navigate immediately to Login Screen (fail-safe)

**Skip Button:**
- Position: top-right corner
- Label: "Skip"
- Style: semi-transparent pill button, white text, accent border `#C9DF6A`
- Behavior: tapping Skip → navigate immediately to Login Screen
- Visible: always visible from the first frame (do not hide it)

**Progress Bar:**
- Position: bottom of screen, above safe area
- Style: thin bar (3px height), accent color `#C9DF6A`
- Behavior: animates from 0% to 100% in sync with video duration
- Do NOT use a timer — sync with actual video playback position

**Layout:**
- Video fills the entire screen (cover mode)
- No padding, no margins, no UI chrome
- Status bar hidden during this screen
- Safe area insets respected for Skip button and progress bar only

**One-Time Play Logic:**
- On mount, check AsyncStorage for key `'onboarding_seen'`
- If `'onboarding_seen' === 'true'` → skip this screen, navigate to Login immediately
- After video ends OR skip is tapped → set `'onboarding_seen'` to `'true'` in AsyncStorage
- This ensures the video only plays once per app install

**Transitions:**
- Entry: fade in from black (300ms)
- Exit to Login: fade out to black (300ms) then navigate

### Component Code Structure

```typescript
// app/onboarding.tsx

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  StatusBar,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ONBOARDING_KEY = 'onboarding_seen';
const VIDEO_SOURCE = require('../assets/videos/vid.mp4');

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [duration, setDuration] = useState<number>(0);
  const hasNavigated = useRef(false);

  const player = useVideoPlayer(VIDEO_SOURCE, (p) => {
    p.muted = true;
    p.play();
  });

  const navigateToLogin = useCallback(async () => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;

    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      // Replace with your actual login route
      router.replace('/(auth)/login');
    });
  }, []);

  useEffect(() => {
    // Check if already seen
    AsyncStorage.getItem(ONBOARDING_KEY).then((value) => {
      if (value === 'true') {
        router.replace('/(auth)/login');
        return;
      }
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  }, []);

  useEffect(() => {
    // Listen for video end
    const subscription = player.addListener('playToEnd', () => {
      navigateToLogin();
    });
    return () => subscription.remove();
  }, [player]);

  useEffect(() => {
    // Sync progress bar with video duration
    if (duration > 0) {
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: duration * 1000,
        useNativeDriver: false,
      }).start();
    }
  }, [duration]);

  useEffect(() => {
    // Get video duration when ready
    const subscription = player.addListener('statusChange', (status) => {
      if (status.duration) {
        setDuration(status.duration);
      }
    });
    return () => subscription.remove();
  }, [player]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <StatusBar hidden />

      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
      />

      {/* Skip Button */}
      <Pressable
        style={[styles.skipButton, { top: insets.top + 16, right: 16 }]}
        onPress={navigateToLogin}
        accessibilityLabel="Skip intro video"
        accessibilityRole="button"
      >
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

      {/* Progress Bar */}
      <View style={[styles.progressTrack, { bottom: insets.bottom + 16 }]}>
        <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  skipButton: {
    position: 'absolute',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C9DF6A',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  skipText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  progressTrack: {
    position: 'absolute',
    left: 24,
    right: 24,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#C9DF6A',
    borderRadius: 2,
  },
});
```

---

## PHASE 3 — WIRE THE NAVIGATION

### 3A — Find the app entry point

Open `app/_layout.tsx` (or `App.tsx`) and locate where initial routing happens.

### 3B — Add onboarding to the navigation flow

The flow must be:

```
App Launch
    └── Expo Splash Screen (auto)
            └── Check AsyncStorage for 'onboarding_seen'
                    ├── NOT seen → /onboarding → /(auth)/login
                    └── Already seen → /(auth)/login directly
```

### 3C — Register the route

In `app/_layout.tsx`, ensure `onboarding` is registered as a valid route:

```typescript
<Stack.Screen
  name="onboarding"
  options={{
    headerShown: false,
    animation: 'fade',
    gestureEnabled: false, // prevent swipe back
  }}
/>
```

### 3D — Set onboarding as the initial route

Modify the initial route logic so that on first launch,
the app navigates to `/onboarding` instead of directly to login.

```typescript
// In _layout.tsx, after SplashScreen hides:
const seen = await AsyncStorage.getItem('onboarding_seen');
if (!seen) {
  router.replace('/onboarding');
} else {
  router.replace('/(auth)/login');
}
```

> Adapt this to match the existing auth guard pattern in the project.
> Do NOT remove or break existing auth logic.

---

## PHASE 4 — IMPORTANT RULES

- Do NOT modify the Login Screen component
- Do NOT modify the auth flow or session logic
- Do NOT loop the video — it plays once then exits
- Do NOT add sound — video must be muted
- Do NOT use `expo-av` — use `expo-video` only (SDK 56 compatible)
- Do NOT block navigation if video fails — always fall through to Login
- gestureEnabled must be false on this screen — user cannot swipe back to it
- The screen must be unreachable after it has been seen (replace, not push)
- Update the login route `/(auth)/login` to match the actual login route in this project

---

## PHASE 5 — VERIFICATION CHECKLIST

After implementation, verify:

- [ ] First app launch → video plays automatically
- [ ] Video fills entire screen (no black bars, no letterbox)
- [ ] Skip button visible immediately in top-right corner
- [ ] Tapping Skip → navigates to Login Screen
- [ ] Video ends naturally → navigates to Login Screen automatically
- [ ] Progress bar animates left to right in sync with video
- [ ] Second app launch → video does NOT play, goes directly to Login
- [ ] After uninstalling and reinstalling → video plays again (AsyncStorage cleared)
- [ ] If video file missing or corrupt → navigates to Login (no crash)
- [ ] Status bar hidden during video
- [ ] Swipe-back gesture disabled on this screen
- [ ] No TypeScript errors
- [ ] Works on iOS and Android
- [ ] Works on Web (graceful fallback if video not supported)


1. Video Optimization قبل أي حاجة
MANDATORY PRE-STEP — Before implementing anything:

The source video is 3840x2160 (4K UHD).
This resolution is excessive for mobile playback and will cause:
- Large bundle size
- High memory usage on mid/low-end devices
- Slow loading and dropped frames

Required: Compress and resize the video BEFORE adding it to assets.

Target specs:
- Resolution: 1080x1920 (portrait 9:16) or 1920x1080 (landscape)
- Format: MP4 H.264
- Bitrate: 2–4 Mbps
- Frame rate: 30fps
- Audio: strip audio (video is muted anyway)
- Target file size: under 15MB ideally

Tool to use (ffmpeg):
ffmpeg -i vid.mp4 -vf scale=1080:1920 -c:v libx264 \
-b:v 3M -r 30 -an -preset fast output_compressed.mp4

Use output_compressed.mp4 as assets/videos/vid.mp4

2. Loading State إجباري
Because the video is large, loading time will be noticeable.

While video is loading/buffering:
- Show a static poster image (first frame of video as PNG)
- Show a subtle loading indicator (spinner or pulse animation)
- Do NOT show a blank black screen

Add poster image:
assets/videos/vid_poster.jpg  ← first frame, compressed JPEG

Implementation:
<VideoView
  player={player}
  style={styles.video}
  contentFit="cover"
  nativeControls={false}
/>

Show poster image underneath VideoView until video starts playing.
Hide poster when player status === 'playing'

3. Timeout Fallback
If video does not start playing within 5 seconds:
→ Navigate directly to Login Screen
→ Do not leave user stuck on a black/loading screen

Implementation:
const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

useEffect(() => {
  timeoutRef.current = setTimeout(() => {
    navigateToLogin();
  }, 5000);

  return () => clearTimeout(timeoutRef.current);
}, []);

// Clear timeout when video actually starts playing
player.addListener('statusChange', (status) => {
  if (status.status === 'playing') {
    clearTimeout(timeoutRef.current);
  }
});

4. Memory Management
After navigating away from the onboarding screen:
- Call player.release() to free memory
- Do this in the useEffect cleanup function

useEffect(() => {
  return () => {
    player.release();
  };
}, [player]);

5. Web Fallback
4K MP4 may not play in all browsers.

On Platform.OS === 'web':
- Check if video plays within 3 seconds
- If not → skip directly to Login
- Consider showing a static image instead of video on web

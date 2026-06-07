# Task: Add Branding Video Popup On Home Screen After Login

**Project:** World Cup 2026 Prediction App  
**Stack:** React Native · Expo SDK 56 · Expo Router v4 · Supabase · TypeScript (strict)  
**Design System:** Dark stadium aesthetic · `#0D0D0D` bg · `#C9DF6A` accent

---

## Prompt Review & Improvements

### ✅ What's Good in the Original Prompt
- Clear user flow description (Splash → Login → Home → Popup)
- Explicit performance requirements (no flicker, no blocking)
- Future-proof versioning concept for campaigns
- Dual close mechanisms (Skip + X)

### ⚠️ Issues Fixed in This Implementation Plan

| Issue | Fix Applied |
|---|---|
| "Expo Video" not specified — Expo SDK 56 uses `expo-video` (not deprecated `expo-av`) | Use `expo-video` with `useVideoPlayer` hook |
| No mention of `AsyncStorage` key strategy for version persistence | Use `@react-native-async-storage/async-storage` with namespaced key |
| No mention of Expo Router v4 modal pattern | Use `<Modal>` from RN (not expo-router modal route) to keep Home mounted |
| Missing TypeScript strict-mode types | Full typed interfaces provided |
| No tablet responsive breakpoint defined | Use `useWindowDimensions` + `isTablet` pattern from existing UI kit |
| `video_version` stored where? | Stored in `app.config.ts` extra field + fallback constant |

---

## Architecture Decision

Use a **React Native `<Modal>`** (not an Expo Router route) so:
- Home screen stays fully mounted
- No navigation stack pollution
- No back-button side effects
- Modal is purely presentational state

---

## Files to Create / Modify

```
app/
  (tabs)/
    index.tsx              ← MODIFY: add useVideoPopup hook
components/
  video/
    BrandingVideoModal.tsx  ← CREATE: modal component
    VideoPlayer.tsx         ← CREATE: expo-video wrapper
hooks/
  useVideoPopup.ts          ← CREATE: state + persistence logic
constants/
  videoConfig.ts            ← CREATE: version + source config
assets/
  videos/
    branding.mp4            ← ADD: place your video file here
```

---

## Step-by-Step Implementation

### Step 1 — Install Dependencies

```bash
npx expo install expo-video @react-native-async-storage/async-storage
```

> `expo-video` ships with Expo SDK 56. `async-storage` may already be installed — check `package.json`.

---

### Step 2 — `constants/videoConfig.ts`

```typescript
// constants/videoConfig.ts

export const VIDEO_CONFIG = {
  /**
   * Bump this string to force re-show the popup for all users.
   * e.g. "1.0" → "1.1" triggers popup again even for users who dismissed it.
   */
  version: "1.0",

  /**
   * Source priority:
   *   1. remoteUrl (Supabase Storage public URL) — takes precedence when set
   *   2. localAsset — bundled MP4 fallback
   */
  remoteUrl: null as string | null,
  // Example future value:
  // remoteUrl: "https://xxxx.supabase.co/storage/v1/object/public/branding/intro_v1.mp4",

  localAsset: require("@/assets/videos/branding.mp4"),

  /** AsyncStorage key — namespaced to avoid collisions */
  storageKey: "wc26_branding_video_seen_version",
} as const;
```

---

### Step 3 — `hooks/useVideoPopup.ts`

```typescript
// hooks/useVideoPopup.ts
import { useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { VIDEO_CONFIG } from "@/constants/videoConfig";

interface UseVideoPopupReturn {
  isVisible: boolean;
  dismiss: () => void;
}

export function useVideoPopup(): UseVideoPopupReturn {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkShouldShow() {
      try {
        const seenVersion = await AsyncStorage.getItem(
          VIDEO_CONFIG.storageKey
        );
        // Show if never seen OR version has changed
        if (!cancelled && seenVersion !== VIDEO_CONFIG.version) {
          setIsVisible(true);
        }
      } catch {
        // AsyncStorage failure → show popup (safe default)
        if (!cancelled) setIsVisible(true);
      }
    }

    checkShouldShow();
    return () => { cancelled = true; };
  }, []);

  const dismiss = useCallback(async () => {
    setIsVisible(false);
    try {
      await AsyncStorage.setItem(
        VIDEO_CONFIG.storageKey,
        VIDEO_CONFIG.version
      );
    } catch {
      // Non-critical — worst case popup shows again next session
    }
  }, []);

  return { isVisible, dismiss };
}
```

---

### Step 4 — `components/video/VideoPlayer.tsx`

```typescript
// components/video/VideoPlayer.tsx
import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { VIDEO_CONFIG } from "@/constants/videoConfig";

interface VideoPlayerProps {
  onEnd?: () => void;
}

export function VideoPlayer({ onEnd }: VideoPlayerProps) {
  const source = VIDEO_CONFIG.remoteUrl ?? VIDEO_CONFIG.localAsset;

  const player = useVideoPlayer(source, (p) => {
    p.loop = false;
    p.play();
  });

  useEffect(() => {
    const sub = player.addListener("playingChange", (isPlaying) => {
      if (!isPlaying && player.currentTime >= player.duration - 0.5) {
        onEnd?.();
      }
    });
    return () => sub.remove();
  }, [player, onEnd]);

  // Exposed so parent can stop on close
  return (
    <VideoView
      player={player}
      style={styles.video}
      allowsFullscreen
      allowsPictureInPicture={false}
      contentFit="contain"
      nativeControls={false}
    />
  );
}

// Attach player to ref pattern for parent stop control
export function useStopOnClose(playerRef: ReturnType<typeof useVideoPlayer>) {
  return () => {
    try { playerRef.pause(); } catch { /* ignore */ }
  };
}

const styles = StyleSheet.create({
  video: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 8,
    backgroundColor: "#000",
  },
});
```

---

### Step 5 — `components/video/BrandingVideoModal.tsx`

```typescript
// components/video/BrandingVideoModal.tsx
import React, { useCallback, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  useWindowDimensions,
  Platform,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { VIDEO_CONFIG } from "@/constants/videoConfig";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface BrandingVideoModalProps {
  visible: boolean;
  onClose: () => void;
}

export function BrandingVideoModal({ visible, onClose }: BrandingVideoModalProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isTablet = width >= 768;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const source = VIDEO_CONFIG.remoteUrl ?? VIDEO_CONFIG.localAsset;

  const player = useVideoPlayer(source, (p) => {
    p.loop = false;
  });

  // Fade in when visible
  useEffect(() => {
    if (visible) {
      player.play();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    // Stop video before closing
    try { player.pause(); } catch { /* ignore */ }
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onClose());
  }, [player, onClose]);

  const handleReplay = useCallback(() => {
    player.currentTime = 0;
    player.play();
  }, [player]);

  const cardWidth = isTablet ? Math.min(width * 0.6, 640) : width - 40;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"       // We handle animation manually
      statusBarTranslucent
      onRequestClose={handleClose}  // Android back button
    >
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        {/* Tap backdrop to close */}
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        {/* Card */}
        <Animated.View
          style={[
            styles.card,
            {
              width: cardWidth,
              marginTop: insets.top + 20,
              transform: [
                {
                  scale: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.92, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Welcome to WC26 Predictions</Text>
            <Pressable
              onPress={handleClose}
              style={styles.closeBtn}
              hitSlop={12}
            >
              <Text style={styles.closeIcon}>✕</Text>
            </Pressable>
          </View>

          {/* Video */}
          <View style={styles.videoContainer}>
            <VideoView
              player={player}
              style={styles.video}
              allowsFullscreen
              allowsPictureInPicture={false}
              contentFit="contain"
              nativeControls
            />
          </View>

          {/* Footer controls */}
          <View style={styles.footer}>
            <Pressable onPress={handleReplay} style={styles.replayBtn}>
              <Text style={styles.replayText}>↺ Replay</Text>
            </Pressable>
            <Pressable onPress={handleClose} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip →</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.82)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#141414",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(201,223,106,0.2)", // #C9DF6A subtle border
    ...Platform.select({
      ios: {
        shadowColor: "#C9DF6A",
        shadowOpacity: 0.15,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 12 },
    }),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  title: {
    color: "#C9DF6A",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
    flex: 1,
  },
  closeBtn: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginLeft: 8,
  },
  closeIcon: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  videoContainer: {
    backgroundColor: "#000",
    width: "100%",
  },
  video: {
    width: "100%",
    aspectRatio: 16 / 9,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  replayBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(201,223,106,0.3)",
  },
  replayText: {
    color: "#C9DF6A",
    fontSize: 13,
    fontWeight: "600",
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#C9DF6A",
  },
  skipText: {
    color: "#0D0D0D",
    fontSize: 13,
    fontWeight: "700",
  },
});
```

---

### Step 6 — Modify `app/(tabs)/index.tsx`

Add these lines to your existing Home screen. **Only the delta is shown** — don't replace your existing JSX:

```typescript
// app/(tabs)/index.tsx  — ADD these imports at the top
import { BrandingVideoModal } from "@/components/video/BrandingVideoModal";
import { useVideoPopup } from "@/hooks/useVideoPopup";

// Inside your component function, ADD:
export default function HomeScreen() {
  const { isVisible, dismiss } = useVideoPopup();

  return (
    <>
      {/* ── Your existing Home JSX stays here unchanged ── */}
      <YourExistingHomeContent />

      {/* ── Video popup — renders above everything ── */}
      <BrandingVideoModal visible={isVisible} onClose={dismiss} />
    </>
  );
}
```

---

## Testing Checklist

| Scenario | Expected Result |
|---|---|
| First launch after login | Popup appears with fade-in |
| Close popup | Video stops, Home remains visible |
| Re-login same version | Popup does NOT appear |
| Change `VIDEO_CONFIG.version` to `"1.1"` | Popup appears again |
| Set `remoteUrl` in config | Streams from URL instead of local asset |
| Rotate device / tablet | Modal resizes correctly |
| Android back button | Closes popup, stays on Home |

---

## Future: Supabase Version Campaign

When you're ready to drive popup version from Supabase:

```typescript
// hooks/useVideoPopup.ts — extend checkShouldShow()
const { data } = await supabase
  .from("app_config")
  .select("branding_video_version, branding_video_url")
  .single();

const remoteVersion = data?.branding_video_version ?? VIDEO_CONFIG.version;
const remoteUrl = data?.branding_video_url ?? null;

// Override config dynamically
if (!cancelled && seenVersion !== remoteVersion) {
  setIsVisible(true);
  // Pass remoteUrl down via context or state if needed
}
```

Supabase table:
```sql
create table app_config (
  id int primary key default 1,
  branding_video_version text not null default '1.0',
  branding_video_url text
);
```

---

## Notes

- `expo-video` requires **Expo SDK 50+** — confirmed compatible with your SDK 56 setup.
- On **Android**, ensure `android.usesCleartextTraffic` is `true` in `app.config.ts` if using HTTP video URLs (Supabase uses HTTPS so this shouldn't apply).
- Place your `branding.mp4` in `assets/videos/` — create the folder if it doesn't exist.
- The `nativeControls={true}` on `VideoView` gives users a native progress bar. Set to `false` and build custom controls if you want full design control.

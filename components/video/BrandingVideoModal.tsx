import { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';

import Theme from '@/constants/theme/design-system';
import { Icon } from '@/components/ui/Icon';
import { VIDEO_CONFIG } from '@/constants/videoConfig';

interface BrandingVideoModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Full-screen branding video popup shown once per `VIDEO_CONFIG.version` on
 * the Home screen. Implemented as a plain RN <Modal> (not an Expo Router
 * route) so Home stays mounted underneath — no navigation stack pollution,
 * no back-button side effects.
 */
export function BrandingVideoModal({ visible, onClose }: BrandingVideoModalProps): React.JSX.Element {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isTablet = width >= 768;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const source = VIDEO_CONFIG.remoteUrl ?? VIDEO_CONFIG.localAsset;

  const player = useVideoPlayer(source, (p) => {
    p.loop = false;
  });

  // Fade in + autoplay when shown; reset when hidden.
  useEffect(() => {
    if (visible) {
      player.currentTime = 0;
      player.play();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible, player, fadeAnim]);

  // Auto-close once the video finishes playing.
  useEffect(() => {
    const sub = player.addListener('playToEnd', () => {
      onClose();
    });
    return () => sub.remove();
  }, [player, onClose]);

  const handleClose = useCallback(() => {
    try {
      player.pause();
    } catch {
      // ignore — player may already be released
    }
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onClose());
  }, [player, onClose, fadeAnim]);

  const handleReplay = useCallback(() => {
    player.currentTime = 0;
    player.play();
  }, [player]);

  const cardWidth = isTablet ? Math.min(width * 0.6, 640) : width - 40;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <Animated.View
        style={{ opacity: fadeAnim }}
        className="flex-1 items-center justify-center bg-black/85"
      >
        {/* Tap backdrop to close */}
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <Animated.View
          style={{
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
          }}
          className="overflow-hidden rounded-2xl border border-accentBorder bg-bgSurface2"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-bgBorder/60 px-4 py-3.5">
            <Text className="flex-1 text-[15px] font-bold tracking-wide text-accent" numberOfLines={1}>
              Welcome to WC26 Predictions
            </Text>
            <Pressable
              onPress={handleClose}
              hitSlop={12}
              className="ml-2 h-8 w-8 items-center justify-center rounded-full bg-bgSurface3 border border-bgBorder active:opacity-75"
            >
              <Icon name="close" size={14} color={Theme.colors.textSecondary} fixed />
            </Pressable>
          </View>

          {/* Video */}
          <View className="w-full bg-black">
            <VideoView
              player={player}
              style={{ width: '100%', aspectRatio: 16 / 9 }}
              fullscreenOptions={{ enable: true }}
              allowsPictureInPicture={false}
              contentFit="contain"
              nativeControls
            />
          </View>

          {/* Footer controls */}
          <View className="flex-row items-center justify-between border-t border-bgBorder/60 px-4 py-3">
            <Pressable
              onPress={handleReplay}
              className="rounded-lg border border-accentBorder px-3.5 py-2 active:opacity-75"
            >
              <Text className="text-[13px] font-semibold text-accent">↺ Replay</Text>
            </Pressable>
            <Pressable
              onPress={handleClose}
              className="rounded-lg bg-accent px-4 py-2 active:opacity-90"
            >
              <Text className="text-[13px] font-bold text-accentDark">Skip →</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

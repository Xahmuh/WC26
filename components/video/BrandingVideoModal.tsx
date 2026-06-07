import { useCallback, useEffect, useMemo, useRef } from 'react';
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
import { Asset } from 'expo-asset';

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
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isTablet = width >= 768;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // `require(...)` resolves to a numeric asset id on native and to an
  // arbitrary module shape on web depending on the bundler — neither is a
  // reliable cross-platform `useVideoPlayer` source on its own. Resolving it
  // through `expo-asset` always yields a plain string URI (a `file://`/local
  // path on native, an http(s) path on web), which `useVideoPlayer` accepts
  // uniformly everywhere. This is what fixed the video not loading on web.
  const localAssetUri = useMemo(
    () => Asset.fromModule(VIDEO_CONFIG.localAsset).uri,
    []
  );
  const source = VIDEO_CONFIG.remoteUrl ?? localAssetUri;

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

  // Fully responsive sizing — works for phones, tablets, and any browser
  // viewport (incl. mobile-web, where the window can be narrower or shorter
  // than a native phone screen). We size the card by BOTH available width
  // and available height so the video (locked to a 16:9 box) always fits
  // entirely on screen without being cropped or overflowing, then center it.
  const HEADER_HEIGHT = 52;
  const FOOTER_HEIGHT = 56;
  const CHROME_HEIGHT = HEADER_HEIGHT + FOOTER_HEIGHT;
  const SCREEN_MARGIN = 24;

  const availableWidth = Math.min(width - 24, 800);
  const availableHeight = Math.min(height - 60, 700);

  // We want a 16:9 aspect ratio for the video, plus some padding for header and footer.
  // Header is roughly 54px, footer is roughly 66px -> total 120px non-video height
  const nonVideoHeight = 120;
  
  // Calculate max width that fits inside the available height while maintaining 16:9 for the video
  const maxVideoHeight = availableHeight - nonVideoHeight;
  const targetWidthForHeight = maxVideoHeight * (16 / 9);

  // Card width is the smaller of the available width, or the width that perfectly fits the max height
  const cardWidth = Math.min(availableWidth, targetWidthForHeight);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={[StyleSheet.absoluteFill, { backgroundColor: Theme.colors.overlayLight, justifyContent: 'center', alignItems: 'center' }]}>
        {/* Tap backdrop to close */}
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <Animated.View
          style={[
            Theme.cards.elevated,
            {
              padding: 0,
              width: cardWidth,
              maxWidth: availableWidth,
              maxHeight: availableHeight,
              alignSelf: 'center',
              borderRadius: 36,
              borderWidth: 1.5,
              borderColor: Theme.colors.accentBorder,
              ...Theme.shadows.lg,
              transform: [
                {
                  scale: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.95, 1],
                  }),
                },
              ],
            }
          ]}
          className="overflow-hidden bg-bgDeep"
        >
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottomWidth: 1,
            borderBottomColor: Theme.colors.bgBorder,
            backgroundColor: Theme.colors.bgSurface1,
            paddingVertical: Theme.spacing.md,
            paddingHorizontal: Theme.spacing.xl,
          }}>
            <Text style={[Theme.textStyles.display, { fontSize: 15, textTransform: 'uppercase', letterSpacing: Theme.letterSpacing.widest }]} numberOfLines={1}>
              Welcome To the Game
            </Text>
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
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: Theme.spacing.md,
            borderTopWidth: 1,
            borderTopColor: Theme.colors.bgBorder,
            backgroundColor: Theme.colors.bgSurface1,
            padding: Theme.spacing.lg,
          }}>
            <Pressable
              onPress={handleReplay}
              style={[Theme.buttons.secondary, { flex: 1, flexDirection: 'row', gap: Theme.spacing.sm, paddingVertical: 12 }]}
              className="active:opacity-75"
            >
              <Icon name="refresh" size={16} color={Theme.colors.accent} />
              <Text style={Theme.buttons.secondaryText}>Replay</Text>
            </Pressable>
            <Pressable
              onPress={handleClose}
              style={[Theme.buttons.primary, { flex: 1, flexDirection: 'row', gap: Theme.spacing.sm, paddingVertical: 12 }, Theme.shadows.accentGlow]}
              className="active:opacity-90"
            >
              <Text style={Theme.buttons.primaryText}>Continue</Text>
              <Icon name="forward" size={16} color={Theme.colors.accentDark} />
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

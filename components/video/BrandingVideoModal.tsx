import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Asset } from 'expo-asset';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';

import Theme from '@/constants/theme/design-system';
import { Icon } from '@/components/ui/Icon';
import { VIDEO_CONFIG } from '@/constants/videoConfig';

interface BrandingVideoModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Full-screen branding video popup shown once per fresh login session.
 * Kept as a plain RN Modal so it does not pollute the navigation stack.
 */
export function BrandingVideoModal({ visible, onClose }: BrandingVideoModalProps): React.JSX.Element | null {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isTablet = width >= 768;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isClosingRef = useRef(false);

  const localAssetUri = useMemo(
    () => Asset.fromModule(VIDEO_CONFIG.localAsset).uri,
    []
  );
  const source = VIDEO_CONFIG.remoteUrl ?? localAssetUri;

  const player = useVideoPlayer(source, (p) => {
    p.loop = false;
  });

  const handleClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    try {
      player.pause();
    } catch {
      // Player may already be released when the modal is closing.
    }

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      onClose();
      isClosingRef.current = false;
    });
  }, [player, onClose, fadeAnim]);

  useEffect(() => {
    if (visible) {
      isClosingRef.current = false;
      player.currentTime = 0;
      player.play();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    } else {
      fadeAnim.setValue(0);
      isClosingRef.current = false;
    }
  }, [visible, player, fadeAnim]);

  useEffect(() => {
    const sub = player.addListener('playToEnd', () => {
      handleClose();
    });
    return () => sub.remove();
  }, [player, handleClose]);

  const screenMargin = isTablet ? 32 : 18;
  const safeTop = Math.max(insets.top, 16);
  const safeBottom = Math.max(insets.bottom, 16);
  const availableWidth = Math.min(width - screenMargin * 2, isTablet ? 720 : 520);
  const availableHeight = Math.min(height - safeTop - safeBottom - 28, isTablet ? 680 : 620);
  const nonVideoHeight = isTablet ? 176 : 166;
  const maxVideoHeight = Math.max(170, availableHeight - nonVideoHeight);
  const cardWidth = Math.min(availableWidth, maxVideoHeight * (16 / 9));

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.backdrop,
          {
            paddingTop: safeTop,
            paddingBottom: safeBottom,
            paddingHorizontal: screenMargin,
          },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <Animated.View
          style={[
            styles.card,
            {
              width: cardWidth,
              maxWidth: availableWidth,
              maxHeight: availableHeight,
              opacity: fadeAnim,
              transform: [
                {
                  scale: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.95, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={['rgba(215,217,94,0.16)', 'rgba(26,26,26,0.98)', '#050505']}
            locations={[0, 0.38, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <View style={styles.eyebrowRow}>
                <View style={styles.adBadge}>
                  <Text style={styles.adBadgeText}>AD</Text>
                </View>
                <Text style={styles.eyebrowText}>Featured spotlight</Text>
              </View>
              <Text style={styles.title} numberOfLines={1}>
                Welcome To the Game
              </Text>
              <Text style={styles.subtitle} numberOfLines={2}>
                Watch the latest drop before you jump into your predictions.
              </Text>
            </View>

            <Pressable
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="Close advertisement"
              hitSlop={10}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>x</Text>
            </Pressable>
          </View>

          <View style={styles.videoShell}>
            <VideoView
              player={player}
              style={styles.video}
              fullscreenOptions={{ enable: true }}
              allowsPictureInPicture={false}
              contentFit="contain"
            />
          </View>

          <View style={styles.footer}>
            <View style={styles.footerCopy}>
              <Text style={styles.footerTitle}>Ready when you are</Text>
              <Text style={styles.footerText}>Continue now or let the clip finish.</Text>
            </View>
            <Pressable
              onPress={handleClose}
              style={styles.continueButton}
              className="active:opacity-90"
            >
              <Text style={styles.continueText}>Continue</Text>
              <Icon name="forward" size={16} color={Theme.colors.accentDark} />
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    alignSelf: 'center',
    overflow: 'hidden',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(215,217,94,0.28)',
    backgroundColor: '#050505',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 22px 70px rgba(0,0,0,0.82), 0 0 34px rgba(215,217,94,0.12)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 18 },
          shadowOpacity: 0.52,
          shadowRadius: 30,
          elevation: 18,
        }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  headerCopy: {
    flex: 1,
    gap: 7,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adBadge: {
    borderRadius: 999,
    backgroundColor: Theme.colors.accent,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  adBadgeText: {
    color: Theme.colors.accentDark,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  eyebrowText: {
    color: Theme.colors.textTertiary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  title: {
    color: Theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  subtitle: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  closeButtonText: {
    color: Theme.colors.textPrimary,
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '300',
  },
  videoShell: {
    marginHorizontal: 14,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(215,217,94,0.22)',
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
  },
  footerCopy: {
    flex: 1,
    gap: 3,
  },
  footerTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  footerText: {
    color: Theme.colors.textTertiary,
    fontSize: 10,
    lineHeight: 14,
  },
  continueButton: {
    minWidth: 132,
    minHeight: 44,
    borderRadius: 999,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Theme.colors.accent,
  },
  continueText: {
    color: Theme.colors.accentDark,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { SkeletonBox } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { Colors, Layout, Typography } from '@/constants';
import { useHomeCardsTileSettings } from '@/hooks/useAdmin';
import { useCardCatalog, useMyCards } from '@/hooks/useUserCards';

const FLIP_INTERVAL_MS = 5000;
const FLIP_DURATION_MS = 760;
const MYSTERY_BOX_ICON = require('@/assets/mystery_box_icon.png');

type PreviewSlide = {
  key: string;
  imageUrl: string;
  name: string;
};

function formatCardPreviewName(name: string | null | undefined): string {
  const trimmed = name?.trim();
  if (!trimmed) return 'Wild Card';

  return trimmed
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function useLoopedAnimation(toValue: number, duration: number) {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(value, {
        toValue,
        duration,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      })
    );

    animation.start();
    return () => animation.stop();
  }, [duration, toValue, value]);

  return value;
}

function MysteryBoxAnimation(): React.JSX.Element {
  const glow = useLoopedAnimation(1, 2600);
  const float = useLoopedAnimation(1, 2800);

  const boxScale = glow.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.04, 1],
  });
  const translateY = float.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -5, 0],
  });
  const rotateZ = float.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['-2deg', '3deg', '-2deg'],
  });
  const shadowScale = float.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.82, 1],
  });

  return (
    <View pointerEvents="none" style={styles.mysteryStage}>
      <Animated.View style={[styles.boxShadow, { transform: [{ scaleX: shadowScale }] }]} />
      <Animated.Image
        source={MYSTERY_BOX_ICON}
        resizeMode="contain"
        style={[
          styles.mysteryBoxImage,
          {
            transform: [{ translateY }, { rotateZ }, { scale: boxScale }],
          },
        ]}
      />
    </View>
  );
}

export function MyCardsPreview({ isLoading = false }: { isLoading?: boolean }): React.JSX.Element {
  const router = useRouter();
  const cardsQuery = useMyCards();
  const catalogQuery = useCardCatalog();
  const tileSettingsQuery = useHomeCardsTileSettings();
  const flip = useRef(new Animated.Value(0)).current;
  const activeIndexRef = useRef(0);
  const flipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shine = useLoopedAnimation(1, 2600);
  const [activeIndex, setActiveIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(0);
  const refetchTileSettings = tileSettingsQuery.refetch;
  const refetchCards = cardsQuery.refetch;
  const refetchCatalog = catalogQuery.refetch;

  useFocusEffect(
    useCallback(() => {
      void refetchTileSettings();
      void refetchCards();
      void refetchCatalog();
    }, [refetchCards, refetchCatalog, refetchTileSettings])
  );

  const cards = useMemo(() => cardsQuery.data ?? [], [cardsQuery.data]);
  const availableCards = cards.filter(
    (card) => card.status === 'active' && card.uses_remaining > 0
  ).length;
  const backgroundColor = tileSettingsQuery.data?.background_color ?? Colors.background.card;

  const slides = useMemo(() => {
    const seen = new Set<string>();
    const nextSlides: PreviewSlide[] = [];

    const addSlide = (imageUrl: string | null | undefined, key: string, name: string | null | undefined) => {
      if (!imageUrl || seen.has(imageUrl)) return;
      seen.add(imageUrl);
      nextSlides.push({ key, imageUrl, name: formatCardPreviewName(name) });
    };

    cards.forEach((card) => {
      addSlide(card.definition?.image_url, card.id, card.definition?.name);
    });

    (catalogQuery.data ?? []).forEach((definition) => {
      addSlide(definition.image_url, definition.id, definition.name);
    });

    addSlide(tileSettingsQuery.data?.image_url, 'home-tile-fallback', 'Wild Cards');

    return nextSlides;
  }, [cards, catalogQuery.data, tileSettingsQuery.data?.image_url]);

  useEffect(() => {
    setActiveIndex((current) => {
      const next = current >= slides.length ? 0 : current;
      activeIndexRef.current = next;
      return next;
    });
    setNextIndex((current) => (current >= slides.length ? 0 : current));
  }, [slides.length]);

  useEffect(() => {
    slides.forEach((slide) => {
      void Image.prefetch(slide.imageUrl).catch(() => undefined);
    });
  }, [slides]);

  useEffect(() => {
    if (slides.length <= 1) return;
    let cancelled = false;

    const scheduleFlip = () => {
      flipTimerRef.current = setTimeout(() => {
        if (cancelled) return;
        const incomingIndex = (activeIndexRef.current + 1) % slides.length;
        setNextIndex(incomingIndex);
        flip.stopAnimation();
        flip.setValue(0);

        Animated.timing(flip, {
          toValue: 1,
          duration: FLIP_DURATION_MS,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: Platform.OS !== 'web',
        }).start(({ finished }) => {
          if (!finished || cancelled) return;
          activeIndexRef.current = incomingIndex;
          setActiveIndex(incomingIndex);
          requestAnimationFrame(() => {
            if (cancelled) return;
            flip.setValue(0);
            scheduleFlip();
          });
        });
      }, FLIP_INTERVAL_MS);
    };

    scheduleFlip();

    return () => {
      cancelled = true;
      if (flipTimerRef.current) {
        clearTimeout(flipTimerRef.current);
        flipTimerRef.current = null;
      }
      flip.stopAnimation();
    };
  }, [flip, slides.length]);

  const loading = isLoading || cardsQuery.isLoading || tileSettingsQuery.isLoading || catalogQuery.isLoading;
  const activeSlide = slides[activeIndex] ?? null;
  const incomingSlide = slides[nextIndex] ?? activeSlide;
  const hasImages = slides.length > 0;

  const frontRotation = flip.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '90deg', '90deg'],
  });
  const backRotation = flip.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['-90deg', '-90deg', '0deg'],
  });
  const frontOpacity = flip.interpolate({
    inputRange: [0, 0.49, 0.5, 1],
    outputRange: [1, 1, 0, 0],
  });
  const backOpacity = flip.interpolate({
    inputRange: [0, 0.49, 0.5, 1],
    outputRange: [0, 0, 1, 1],
  });
  const shineTranslate = shine.interpolate({
    inputRange: [0, 1],
    outputRange: [-150, 220],
  });

  const renderFace = (
    slide: PreviewSlide | null,
    animatedStyle: any
  ) => (
    <Animated.View
      renderToHardwareTextureAndroid
      shouldRasterizeIOS
      style={[styles.face, animatedStyle]}
    >
      {slide ? <Image source={{ uri: slide.imageUrl }} resizeMode="cover" style={styles.image} /> : null}
      {!slide ? (
        <LinearGradient
          colors={['#22291a', '#11170d', '#070a06']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
    </Animated.View>
  );

  if (loading) {
    return (
      <View style={styles.tile}>
        <SkeletonBox width="100%" height={214} borderRadius={Layout.borderRadius.lg} />
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => router.push('/cards' as never)}
      accessibilityRole="button"
      accessibilityLabel={`My cards, ${availableCards} available`}
      style={[styles.tile, { backgroundColor }]}
    >
      <View style={styles.stage}>
        {renderFace(activeSlide, {
          opacity: frontOpacity,
          transform: [{ perspective: 900 }, { rotateY: frontRotation }],
        })}
        {renderFace(incomingSlide, {
          opacity: backOpacity,
          transform: [{ perspective: 900 }, { rotateY: backRotation }],
        })}

        <LinearGradient
          colors={['rgba(4,6,5,0.1)', 'rgba(4,6,5,0.28)', 'rgba(4,6,5,0.78)']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(213,232,85,0.2)', 'rgba(213,232,85,0)', 'rgba(35,255,176,0.16)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <Animated.View
          pointerEvents="none"
          style={[styles.shine, { transform: [{ translateX: shineTranslate }, { rotateZ: '18deg' }] }]}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.26)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.shineGradient}
          />
        </Animated.View>

        <View style={styles.topRow}>
          <View style={styles.labelPill}>
            <Icon name="gift" size={13} color={Colors.accent.lime} />
            <Text style={styles.labelText}>MY CARDS</Text>
          </View>
          <View style={styles.countPill}>
            <Text style={styles.countText}>{availableCards}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerCopy}>
            <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.82}>
              {activeSlide?.name ?? 'Wild Cards'}
            </Text>
            <View style={styles.footerMeta}>
              <Icon name={hasImages ? 'sparkles' : 'lock'} size={13} color={Colors.accent.lime} />
              <Text style={styles.metaText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.9}>
                {hasImages ? 'WILD CARDS' : 'LOCKED'}
              </Text>
            </View>
          </View>
          <MysteryBoxAnimation />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 0,
    minHeight: 214,
    alignSelf: 'stretch',
    borderRadius: Layout.borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.accent.limeBorder,
    backgroundColor: Colors.background.card,
    ...Platform.select({
      web: { boxShadow: '0 10px 24px rgba(0, 0, 0, 0.34)' },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.34,
        shadowRadius: 18,
      },
      android: { elevation: 9 },
    }),
  },
  stage: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: Colors.background.card,
  },
  face: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  topRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  labelPill: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(213, 232, 85, 0.4)',
    backgroundColor: 'rgba(4, 7, 5, 0.62)',
  },
  labelText: {
    color: Colors.text.primary,
    fontSize: 10,
    fontWeight: Typography.weight.black,
    lineHeight: 12,
  },
  countPill: {
    minWidth: 34,
    height: 28,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.accent.limeBorder,
    backgroundColor: 'rgba(213, 232, 85, 0.16)',
  },
  countText: {
    color: Colors.accent.lime,
    fontSize: 14,
    fontWeight: Typography.weight.black,
    lineHeight: 16,
  },
  footer: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    zIndex: 5,
    minHeight: 62,
    alignItems: 'stretch',
    justifyContent: 'flex-end',
  },
  footerCopy: {
    width: '100%',
    minWidth: 0,
    position: 'relative',
    zIndex: 3,
  },
  title: {
    color: Colors.text.primary,
    fontSize: 17,
    fontWeight: Typography.weight.black,
    lineHeight: 20,
    textTransform: 'capitalize',
  },
  footerMeta: {
    marginTop: 7,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minWidth: 106,
    maxWidth: 122,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.46)',
    borderWidth: 1,
    borderColor: 'rgba(215, 217, 94, 0.18)',
    position: 'relative',
    zIndex: 4,
  },
  metaText: {
    color: Colors.accent.lime,
    flexShrink: 1,
    fontSize: 9,
    fontWeight: Typography.weight.black,
    lineHeight: 11,
    letterSpacing: 0.2,
  },
  mysteryStage: {
    position: 'absolute',
    right: -8,
    bottom: -4,
    width: 56,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.92,
    zIndex: 1,
  },
  boxShadow: {
    position: 'absolute',
    bottom: 1,
    width: 48,
    height: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.46)',
  },
  mysteryBoxImage: {
    width: 54,
    height: 50,
  },
  shine: {
    position: 'absolute',
    top: -40,
    bottom: -40,
    width: 74,
    zIndex: 3,
  },
  shineGradient: {
    flex: 1,
  },
});

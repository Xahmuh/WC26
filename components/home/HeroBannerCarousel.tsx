import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { Colors, Layout } from '@/constants';
import { SkeletonBox } from '@/components/ui';
import { useHeroSlides } from '@/hooks/useAdmin';
import { getHeroSlideImageUrl } from '@/services/admin.service';

type HeroBannerSlide = {
  key: string;
  source: ImageSourcePropType;
  backgroundColor?: string;
  linkUrl?: string | null;
};

const FALLBACK_SLIDES: HeroBannerSlide[] = [
  { key: 'hero-banner', source: require('@/assets/Hero-banner.png') },
  { key: 'herob', source: require('@/assets/herob.jpg') },
];
const HERO_ASPECT_RATIO = 9 / 4;

export function HeroBannerCarousel({ isLoading = false }: { isLoading?: boolean }): React.JSX.Element {
  const router = useRouter();
  const { height: screenHeight } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const slidesQuery = useHeroSlides();
  const refetchSlides = slidesQuery.refetch;

  const fallbackHeight = Math.min(screenHeight * 0.25, 240);
  const height = containerWidth > 0 ? Math.min(containerWidth / HERO_ASPECT_RATIO, 240) : fallbackHeight;

  useFocusEffect(
    useCallback(() => {
      void refetchSlides();
    }, [refetchSlides])
  );

  const slides = useMemo(() => {
    const activeSlides = (slidesQuery.data ?? [])
      .filter((slide) => slide.is_active)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((slide) => ({
        key: slide.id,
        source: { uri: getHeroSlideImageUrl(slide.image_path) },
        backgroundColor: slide.background_color,
        linkUrl: slide.link_url,
      }));

    return activeSlides.length > 0 ? activeSlides : FALLBACK_SLIDES;
  }, [slidesQuery.data]);

  useEffect(() => {
    setActiveIndex((current) => (current >= slides.length ? 0 : current));
  }, [slides.length]);

  useEffect(() => {
    if (containerWidth <= 0 || slides.length <= 1) return;

    const timer = setInterval(() => {
      const nextIndex = (activeIndex + 1) % slides.length;
      scrollRef.current?.scrollTo({ x: nextIndex * containerWidth, animated: true });
      setActiveIndex(nextIndex);
    }, 4000);

    return () => clearInterval(timer);
  }, [activeIndex, containerWidth, slides.length]);

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    if (containerWidth <= 0) return;
    const index = Math.round(event.nativeEvent.contentOffset.x / containerWidth);
    if (index >= 0 && index < slides.length && index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  const handleSlidePress = (linkUrl?: string | null): void => {
    if (!linkUrl) return;

    if (linkUrl.startsWith('/')) {
      router.push(linkUrl as never);
      return;
    }

    if (linkUrl.startsWith('http://') || linkUrl.startsWith('https://')) {
      void Linking.openURL(linkUrl);
    }
  };

  if (isLoading || slidesQuery.isLoading) {
    return <SkeletonBox height={height} borderRadius={16} />;
  }

  return (
    <View
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
      style={[styles.container, { height }]}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
        scrollEventThrottle={16}
        style={styles.scroll}
      >
        {slides.map((slide) => (
          <Pressable
            key={slide.key}
            onPress={() => handleSlidePress(slide.linkUrl)}
            disabled={!slide.linkUrl}
            accessibilityRole={slide.linkUrl ? 'button' : 'image'}
            style={[
              styles.slide,
              {
                width: containerWidth,
                height,
                backgroundColor: slide.backgroundColor ?? Colors.background.card,
              },
            ]}
          >
            <Image source={slide.source} style={styles.image} resizeMode="contain" />
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {slides.map((slide, index) => (
          <View
            key={slide.key}
            style={[
              styles.dot,
              index === activeIndex ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.accent.limeBorder,
    overflow: 'hidden',
    backgroundColor: Colors.background.card,
  },
  scroll: {
    width: '100%',
    height: '100%',
  },
  slide: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    borderRadius: 999,
  },
  dotActive: {
    width: 20,
    height: 8,
    backgroundColor: Colors.accent.lime,
  },
  dotInactive: {
    width: 8,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
});

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { Colors, Layout, Typography } from '@/constants';
import { SkeletonBox } from '@/components/ui';
import { useBannerCollections, useHeroSlides } from '@/hooks/useAdmin';
import { getHeroSlideImageUrl } from '@/services/admin.service';
import type { HomeBannerPosition } from '@/lib/bannerPositions';

type HeroBannerSlide = {
  key: string;
  source: ImageSourcePropType;
  backgroundColor?: string;
  linkUrl?: string | null;
};

type BannerSection = {
  key: string;
  title: string;
  homePosition: HomeBannerPosition;
  slides: HeroBannerSlide[];
};

const FALLBACK_SLIDES: HeroBannerSlide[] = [
  { key: 'hero-banner', source: require('@/assets/Hero-banner.png') },
  { key: 'herob', source: require('@/assets/herob.jpg') },
];

const HERO_ASPECT_RATIO = 9 / 4;

function BannerCarouselFrame({
  slides,
  isLoading,
}: {
  slides: HeroBannerSlide[];
  isLoading?: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

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

  const isScrollable = slides.length > 1;

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

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SkeletonBox height={1} borderRadius={16} style={styles.skeletonFill} />
      </View>
    );
  }

  return (
    <View
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
      style={styles.container}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled={isScrollable}
        scrollEnabled={isScrollable}
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
                width: containerWidth || 1,
                backgroundColor: slide.backgroundColor ?? Colors.background.card,
              },
            ]}
          >
            <Image source={slide.source} style={styles.image} resizeMode="contain" />
          </Pressable>
        ))}
      </ScrollView>

      {isScrollable ? (
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
      ) : null}
    </View>
  );
}

export function HeroBannerCarousel({ isLoading = false }: { isLoading?: boolean }): React.JSX.Element {
  const slidesQuery = useHeroSlides('top', null);
  const refetchSlides = slidesQuery.refetch;

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

    const firstActiveSlide = activeSlides[0];
    return firstActiveSlide ? [firstActiveSlide] : [FALLBACK_SLIDES[0]!];
  }, [slidesQuery.data]);

  return <BannerCarouselFrame slides={slides} isLoading={isLoading || slidesQuery.isLoading} />;
}

export function HomeBannerCollections({
  position,
}: {
  position: HomeBannerPosition;
}): React.JSX.Element | null {
  const collectionsQuery = useBannerCollections();
  const slidesQuery = useHeroSlides('bottom');
  const refetchCollections = collectionsQuery.refetch;
  const refetchSlides = slidesQuery.refetch;

  useFocusEffect(
    useCallback(() => {
      void refetchCollections();
      void refetchSlides();
    }, [refetchCollections, refetchSlides])
  );

  const sections = useMemo<BannerSection[]>(() => {
    const activeSlides = (slidesQuery.data ?? []).filter(
      (slide) => slide.is_active && slide.collection_id
    );

    return (collectionsQuery.data ?? [])
      .filter((collection) => collection.is_active)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((collection) => {
        const collectionSlides = activeSlides
          .filter((slide) => slide.collection_id === collection.id)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((slide) => ({
            key: slide.id,
            source: { uri: getHeroSlideImageUrl(slide.image_path) },
            backgroundColor: slide.background_color,
            linkUrl: slide.link_url,
          }));

        return {
          key: collection.id,
          title: collection.title,
          homePosition: collection.home_position,
          slides: collectionSlides,
        };
      })
      .filter((section) => section.slides.length > 0);
  }, [collectionsQuery.data, slidesQuery.data]);

  if (collectionsQuery.isLoading || slidesQuery.isLoading) return null;

  const displaySections = sections.filter((section) => section.homePosition === position);
  if (displaySections.length === 0) return null;

  return (
    <View style={styles.collectionsWrap}>
      {displaySections.map((section) => (
        <View key={section.key} style={styles.collectionSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLine} />
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
          <BannerCarouselFrame slides={section.slides} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: HERO_ASPECT_RATIO,
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
  skeletonFill: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  slide: {
    height: '100%',
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
  collectionsWrap: {
    gap: 16,
  },
  collectionSection: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionHeaderLine: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: Colors.accent.lime,
  },
  sectionTitle: {
    color: Colors.text.primary,
    fontSize: 18,
    fontWeight: Typography.weight.bold,
  },
});

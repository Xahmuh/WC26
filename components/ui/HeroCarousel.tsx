import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getHeroSlideImageUrl } from '@/services/admin.service';
import { supabase } from '@/lib/supabase';
import type { HeroSlide } from '@/types';

const FALLBACK_SLIDE = { source: require('../../assets/herob.jpg'), backgroundColor: '#13214a' };
const HERO_ASPECT_RATIO = 9 / 4;

async function getActiveHeroSlides(): Promise<HeroSlide[]> {
  const { data, error } = await supabase
    .from('hero_slides')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as HeroSlide[];
}

function openSlideLink(router: ReturnType<typeof useRouter>, linkUrl: string | null) {
  if (!linkUrl) return;
  if (linkUrl.startsWith('/')) {
    router.push(linkUrl as any);
  } else {
    void Linking.openURL(linkUrl);
  }
}

export function HeroCarousel(): React.JSX.Element {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(Dimensions.get('window').width - 32);

  const { data: slides, isLoading } = useQuery({
    queryKey: ['heroSlides', 'active'],
    queryFn: getActiveHeroSlides,
    staleTime: 5 * 60 * 1000,
  });

  const items = slides && slides.length > 0
    ? slides.map((slide) => ({
        key: slide.id,
        backgroundColor: slide.background_color,
        imageUri: getHeroSlideImageUrl(slide.image_path),
        title: slide.title,
        subtitle: slide.subtitle,
        linkUrl: slide.link_url,
      }))
    : [{
        key: 'fallback',
        backgroundColor: FALLBACK_SLIDE.backgroundColor,
        imageSource: FALLBACK_SLIDE.source,
        title: null,
        subtitle: null,
        linkUrl: null,
      }];

  const isScrollable = items.length > 1;

  // Auto-scroll effect (disabled for single slides)
  useEffect(() => {
    if (!isScrollable) return;

    const timer = setInterval(() => {
      const nextIndex = (activeIndex + 1) % items.length;
      scrollViewRef.current?.scrollTo({
        x: nextIndex * containerWidth,
        animated: true,
      });
      setActiveIndex(nextIndex);
    }, 4000);

    return () => clearInterval(timer);
  }, [activeIndex, containerWidth, isScrollable, items.length]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!isScrollable) return;
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / containerWidth);
    if (index >= 0 && index < items.length && index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  const onLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0) {
      setContainerWidth(width);
    }
  };

  return (
    <View
      onLayout={onLayout}
      className="overflow-hidden bg-bgSurface2"
      style={{ width: '100%', aspectRatio: HERO_ASPECT_RATIO, borderRadius: 16 }}
    >
      {isLoading ? (
        <View style={[styles.centered, { backgroundColor: FALLBACK_SLIDE.backgroundColor }]}>
          <ActivityIndicator color="#fff" />
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled={isScrollable}
          scrollEnabled={isScrollable}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          style={{ width: '100%', height: '100%' }}
        >
          {items.map((item) => (
            <Pressable
              key={item.key}
              disabled={!item.linkUrl}
              onPress={() => openSlideLink(router, item.linkUrl)}
              style={{
                width: containerWidth,
                height: '100%',
                backgroundColor: item.backgroundColor,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Image
                source={'imageUri' in item && item.imageUri ? { uri: item.imageUri } : (item as any).imageSource}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
              />
              {(item.title || item.subtitle) && (
                <View style={[styles.captionContainer, { pointerEvents: 'none' }]}>
                  {item.title && <Text style={styles.title}>{item.title}</Text>}
                  {item.subtitle && <Text style={styles.subtitle}>{item.subtitle}</Text>}
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Dots Indicator (Only show if multiple slides exist) */}
      {isScrollable && (
        <View style={styles.indicatorContainer}>
          {items.map((item, index) => (
            <View
              key={item.key}
              style={[
                styles.dot,
                {
                  backgroundColor: index === activeIndex ? '#fff' : 'rgba(255, 255, 255, 0.4)',
                  width: index === activeIndex ? 16 : 6,
                },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  captionContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    marginTop: 2,
  },
});

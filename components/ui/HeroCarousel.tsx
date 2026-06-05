import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

const SLIDES = [
  { source: require('../../assets/2.jpg'), backgroundColor: '#13214a' },
];

export function HeroCarousel(): React.JSX.Element {
  const scrollViewRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(Dimensions.get('window').width - 32);

  // Auto-scroll effect (disabled for single slides)
  useEffect(() => {
    if (SLIDES.length <= 1) return;

    const timer = setInterval(() => {
      const nextIndex = (activeIndex + 1) % SLIDES.length;
      scrollViewRef.current?.scrollTo({
        x: nextIndex * containerWidth,
        animated: true,
      });
      setActiveIndex(nextIndex);
    }, 4000);

    return () => clearInterval(timer);
  }, [activeIndex, containerWidth]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (SLIDES.length <= 1) return;
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / containerWidth);
    if (index >= 0 && index < SLIDES.length && index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  const onLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0) {
      setContainerWidth(width);
    }
  };

  const isScrollable = SLIDES.length > 1;

  return (
    <View 
      onLayout={onLayout}
      className="overflow-hidden bg-bgSurface2" 
      style={{ width: '100%', height: 160, borderRadius: 16 }}
    >
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled={isScrollable}
        scrollEnabled={isScrollable}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={{ width: '100%', height: '100%' }}
      >
        {SLIDES.map((slide, index) => (
          <View
            key={index}
            style={{
              width: containerWidth,
              height: '100%',
              backgroundColor: slide.backgroundColor,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Image
              source={slide.source}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
            />
          </View>
        ))}
      </ScrollView>

      {/* Dots Indicator (Only show if multiple slides exist) */}
      {isScrollable && (
        <View style={styles.indicatorContainer}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
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
});

import { useEffect, useRef } from 'react';
import { Animated, Platform, type DimensionValue, type ViewStyle } from 'react-native';

interface SkeletonBoxProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonBox({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}: SkeletonBoxProps): React.JSX.Element {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.75, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#2A2A2A',
          opacity,
        },
        style,
      ]}
    />
  );
}

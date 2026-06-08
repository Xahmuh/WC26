import React, { useEffect, useRef, useCallback } from 'react';
import { View, Image, Animated, Platform, StyleSheet, Pressable, Text, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CustomSplashScreen(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleGo = useCallback(() => {
    router.replace('/(auth)/login');
  }, [router]);
  
  // Animated values for button pulse and concentric ripples
  const scale = useRef(new Animated.Value(1)).current;
  const progress1 = useRef(new Animated.Value(0)).current;
  const progress2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Gentle pulse animation for the main button
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.04,
          duration: 1000,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    ).start();

    // Helper to run continuous looping animation for progress values
    const runRipple = (animatedValue: Animated.Value) => {
      animatedValue.setValue(0);
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 2200,
        useNativeDriver: Platform.OS !== 'web',
      }).start(() => runRipple(animatedValue));
    };

    // 2. Start Ripple 1 immediately
    runRipple(progress1);

    // 3. Start Ripple 2 with a 1100ms delay to stagger them perfectly
    const timer = setTimeout(() => {
      runRipple(progress2);
    }, 1100);

    return () => {
      clearTimeout(timer);
      progress1.stopAnimation();
      progress2.stopAnimation();
      scale.stopAnimation();
    };
  }, [scale, progress1, progress2]);

  // Interpolations for Ripple 1
  const scale1 = progress1.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.3],
  });
  const opacity1 = progress1.interpolate({
    inputRange: [0, 1],
    outputRange: [0.65, 0],
  });

  // Interpolations for Ripple 2
  const scale2 = progress2.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.3],
  });
  const opacity2 = progress2.interpolate({
    inputRange: [0, 1],
    outputRange: [0.65, 0],
  });

  const { width, height } = useWindowDimensions();

  const buttonSize = Math.max(64, Math.min(76, width * 0.19, height * 0.1));
  const rippleSize = buttonSize;
  const rippleRadius = rippleSize / 2;
  const buttonStageHeight = Math.max(150, buttonSize * 2.1);
  const safeButtonCenterFromBottom = insets.bottom + buttonSize / 2 + 12;
  const targetButtonCenterFromBottom = Math.max(112, Math.min(132, height * 0.14));
  const buttonBottom = Math.max(0, Math.max(safeButtonCenterFromBottom, targetButtonCenterFromBottom) - buttonStageHeight / 2);

  return (
    <View className="flex-1 bg-[#01102e] relative">
      <StatusBar style="light" />
      
      {/* Full-bleed Background Image */}
      <Image
        source={require('../../assets/splashscreen-compatible.png')}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width,
          height,
        }}
        resizeMode="contain"
      />

      {/* Subtle overlay to keep the UI premium and help the button read on all screens */}
      <View
        style={{
          ...StyleSheet.absoluteFill,
          backgroundColor: 'rgba(1, 16, 46, 0.10)',
          pointerEvents: 'none',
        }}
      />

      {/* Floating Animated Circular Button with Ripples */}
      <View 
        style={{ 
          position: 'absolute',
          bottom: buttonBottom,
          left: 0,
          right: 0,
          alignItems: 'center',
          justifyContent: 'center',
          height: buttonStageHeight,
          overflow: 'visible',
        }}
      >
        {/* Ripple Wave 1 (Behind the button) */}
        <Animated.View
          style={{
            position: 'absolute',
            width: rippleSize,
            height: rippleSize,
            borderRadius: rippleRadius,
            borderWidth: 1.5,
            borderColor: '#d7d95e',
            backgroundColor: 'rgba(215, 217, 94, 0.12)',
            opacity: opacity1,
            transform: [{ scale: scale1 }],
          }}
        />

        {/* Ripple Wave 2 (Behind the button, staggered) */}
        <Animated.View
          style={{
            position: 'absolute',
            width: rippleSize,
            height: rippleSize,
            borderRadius: rippleRadius,
            borderWidth: 1.5,
            borderColor: '#d7d95e',
            backgroundColor: 'rgba(215, 217, 94, 0.12)',
            opacity: opacity2,
            transform: [{ scale: scale2 }],
          }}
        />

        {/* Main GO Button */}
        <Animated.View 
          style={{ 
            transform: [{ scale }],
            zIndex: 10,
          }}
        >
          <Pressable
            onPress={handleGo}
            className="rounded-full items-center justify-center shadow-lg active:opacity-80"
            style={{
              width: buttonSize,
              height: buttonSize,
              elevation: 5,
              backgroundColor: '#d7d95e',
            }}
          >
            <Text
              className="text-[#001C3D] font-extrabold uppercase tracking-normal text-center leading-none"
              style={{ fontSize: Math.round(buttonSize * 0.42) }}
            >
              GO
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

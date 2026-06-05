import React, { useEffect, useRef } from 'react';
import { View, Image, Animated, StyleSheet, Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function CustomSplashScreen(): React.JSX.Element {
  const router = useRouter();
  
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
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Helper to run continuous looping animation for progress values
    const runRipple = (animatedValue: Animated.Value) => {
      animatedValue.setValue(0);
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 2200,
        useNativeDriver: true,
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

  return (
    <View className="flex-1 bg-[#F8F4D7] relative justify-center items-center">
      <StatusBar style="dark" />
      
      {/* Centralized Full Screen Image */}
      <View style={StyleSheet.absoluteFillObject} className="justify-center items-center">
        <Image
          source={require('../../assets/splashscreen.png')}
          style={{ width: '100%', height: '100%' }}
          resizeMode="contain"
        />
      </View>

      {/* Floating Animated Circular Button with Ripples (Raised slightly to top: 83% height) */}
      <View 
        style={{ 
          position: 'absolute',
          top: '83%',
          left: 0,
          right: 0,
          alignItems: 'center',
          justifyContent: 'center',
          height: 160,
        }}
      >
        {/* Ripple Wave 1 (Behind the button) */}
        <Animated.View
          style={{
            position: 'absolute',
            width: 80,
            height: 80,
            borderRadius: 40,
            borderWidth: 1.5,
            borderColor: '#C9DF6A', // Lime accent border
            backgroundColor: 'rgba(201, 223, 106, 0.12)', // Subtle translucent lime fill
            opacity: opacity1,
            transform: [{ scale: scale1 }],
          }}
        />

        {/* Ripple Wave 2 (Behind the button, staggered) */}
        <Animated.View
          style={{
            position: 'absolute',
            width: 80,
            height: 80,
            borderRadius: 40,
            borderWidth: 1.5,
            borderColor: '#C9DF6A',
            backgroundColor: 'rgba(201, 223, 106, 0.12)',
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
            onPress={() => router.push('/(auth)/login')}
            className="w-20 h-20 rounded-full items-center justify-center shadow-lg active:opacity-80"
            style={{ elevation: 5, backgroundColor: '#C9DF6A' }}
          >
            <Text className="text-[#001C3D] text-4xl font-extrabold uppercase tracking-normal text-center leading-none">
              GO
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

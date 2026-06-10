// ============================================================================
// FloatingTabBar — floating pill bottom navigation (Expo Router custom tabBar).
// ----------------------------------------------------------------------------
// Adapted from the ClutchTime UI kit's FloatingBottomNav design (floating pill,
// press-spring, lime active dot) and wired into Expo Router's <Tabs> via the
// `tabBar` prop. Icons come from the app's semantic <Icon> system; colours from
// the design-system Theme. Spec: ui kit/DESIGN_SYSTEM.md → "Bottom Navigation".
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  Keyboard,
  Text,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Colors } from '@/constants';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useNotifications } from '@/hooks/useNotifications';

type FloatingTabBarProps = {
  state: {
    index: number;
    routes: Array<{ key: string; name: string }>;
  };
  descriptors: Record<
    string,
    {
      options?: {
        tabBarAccessibilityLabel?: string;
        title?: string;
      };
    }
  >;
  navigation: {
    emit: (...args: any[]) => any;
    navigate: (...args: any[]) => void;
  };
};

const WORLD_CUP_BALL_SOURCE = require('@/assets/worldcup_ball_trionda_fab.png');

// route name → semantic icon (outline + filled active variant)
const TAB_ICONS: Record<string, { base: IconName; active: IconName }> = {
  home: { base: 'home', active: 'homeActive' },
  matches: { base: 'matches', active: 'matchesActive' },
  cards: { base: 'gift', active: 'gift' },
  leaderboard: { base: 'leaderboard', active: 'leaderboardActive' },
  profile: { base: 'profile', active: 'profileActive' },
};

const NAV = {
  bg: 'rgba(8,12,12,0.96)',
  borderTopWidth: 1,
  borderTopColor: 'rgba(201,223,106,0.2)',
  borderRadius: 20,
  paddingHorizontal: 10,
  paddingVertical: 8,
  iconSize: 21,
  iconActive: Colors.accent.lime,
  iconInactive: 'rgba(226,230,211,0.68)',
  bottomOffset: 12,
};

// Vertical space the floating pill occupies above the screen's safe-area bottom.
// Screens add this (plus insets.bottom) as scroll padding so the last row never
// hides behind the pill or the system navigation bar.
export const TAB_BAR_CLEARANCE = 132;

function NavItem({
  routeName,
  isActive,
  onPress,
  onLongPress,
  accessibilityLabel,
  badgeCount,
  label,
  isCenter = false,
  pulse = false,
  compact = false,
}: {
  routeName: string;
  isActive: boolean;
  onPress: () => void;
  onLongPress: () => void;
  accessibilityLabel?: string;
  badgeCount?: number;
  label: string;
  isCenter?: boolean;
  pulse?: boolean;
  compact?: boolean;
}): React.JSX.Element {
  const scale = useRef(new Animated.Value(1)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;
  const floatValue = useRef(new Animated.Value(0)).current;
  const shineValue = useRef(new Animated.Value(0)).current;
  const icons = TAB_ICONS[routeName] ?? { base: 'home', active: 'homeActive' };

  const spring = (toValue: number) =>
    Animated.spring(scale, { toValue, useNativeDriver: Platform.OS !== 'web', speed: 40, bounciness: 8 }).start();

  useEffect(() => {
    if (!isCenter || !pulse) {
      pulseValue.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1.08,
          duration: 820,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 820,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [isCenter, pulse, pulseValue]);

  useEffect(() => {
    if (!isCenter) return;

    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatValue, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(floatValue, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    const shineAnimation = Animated.loop(
      Animated.sequence([
        Animated.delay(700),
        Animated.timing(shineValue, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(shineValue, {
          toValue: 0,
          duration: 0,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );

    floatAnimation.start();
    shineAnimation.start();
    return () => {
      floatAnimation.stop();
      shineAnimation.stop();
    };
  }, [floatValue, isCenter, shineValue]);

  const ballTranslateY = floatValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -4],
  });
  const ballRotate = floatValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['-5deg', '5deg'],
  });
  const shineTranslate = shineValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-34, 48],
  });

  return (
    <TouchableOpacity
      onPressIn={() => spring(isCenter ? 0.92 : 0.86)}
      onPressOut={() => spring(1)}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={1}
      style={[
        styles.navItem,
        compact && styles.navItemCompact,
        isCenter && styles.navItemCenter,
        isCenter && compact && styles.navItemCenterCompact,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? routeName}
      accessibilityState={{ selected: isActive }}
    >
      <Animated.View
        style={[
          styles.navItemInner,
          isCenter && styles.centerItemInner,
          { transform: [{ scale }, { scale: pulseValue }] },
        ]}
      >
        {isCenter ? (
          <Animated.View
            style={[
              styles.ballFabWrap,
              compact && styles.ballFabWrapCompact,
              {
                transform: [
                  { translateY: ballTranslateY },
                  { rotateZ: ballRotate },
                  { scale: isActive ? 1.04 : 1 },
                ],
              },
            ]}
          >
            <View style={[styles.ballGlow, compact && styles.ballGlowCompact, isActive && styles.ballGlowActive]} />
            <View style={[styles.ballFrame, compact && styles.ballFrameCompact]}>
              <Image source={WORLD_CUP_BALL_SOURCE} style={[styles.ballImage, compact && styles.ballImageCompact]} resizeMode="contain" />
              <Animated.View
                pointerEvents="none"
                style={[styles.ballShine, { transform: [{ translateX: shineTranslate }, { rotateZ: '18deg' }] }]}
              />
            </View>
          </Animated.View>
        ) : (
          <View style={[styles.iconPlate, compact && styles.iconPlateCompact, isActive && styles.iconPlateActive]}>
            <Icon
              name={isActive ? icons.active : icons.base}
              size={NAV.iconSize}
              color={isActive ? NAV.iconActive : NAV.iconInactive}
            />
          </View>
        )}

        {isCenter ? (
          <Text style={[styles.centerLabel, compact && styles.centerLabelCompact]} numberOfLines={1}>
            {label}
          </Text>
        ) : (
          <Text
            style={[
              styles.label,
              compact && styles.labelCompact,
              { color: isActive ? NAV.iconActive : NAV.iconInactive, opacity: isActive ? 1 : 0.62 },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.82}
          >
            {label}
          </Text>
        )}
        {badgeCount != null && badgeCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

function useUnreadBadge(): number {
  const result = useNotifications();
  return result.unreadCount;
}

export function FloatingTabBar({ state, descriptors, navigation }: FloatingTabBarProps): React.JSX.Element | null {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const unreadBadge = useUnreadBadge();
  const compactWeb = Platform.OS === 'web' && width < 768;
  const sideInset = width < 360 ? 10 : compactWeb ? 14 : 18;
  const navPaddingHorizontal = width < 360 ? 6 : compactWeb ? 8 : NAV.paddingHorizontal;
  const navBottomOffset = compactWeb ? 6 : NAV.bottomOffset;

  // Hide the floating pill while the keyboard is up so it never overlaps inputs.
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, () => setKeyboardOpen(true));
    const hide = Keyboard.addListener(hideEvt, () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (keyboardOpen) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.container,
        Platform.OS === 'web' && styles.containerWeb,
        {
          left: sideInset,
          right: sideInset,
          bottom: insets.bottom + navBottomOffset,
        },
      ]}
    >
      <View style={[styles.nav, compactWeb && styles.navCompact, { paddingHorizontal: navPaddingHorizontal }]}>
        {state.routes.map((route, index) => {
          const options = descriptors[route.key]?.options;
          const isActive = state.index === index;
          const isCenter = route.name === 'cards';

          const onPress = () => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (event.defaultPrevented) return;
            if (route.name === 'cards') {
              router.push('/profile/predictions?tab=PENDING' as never);
              return;
            }
            if (!isActive) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <NavItem
              key={route.key}
              routeName={route.name}
              isActive={isActive}
              onPress={onPress}
              onLongPress={onLongPress}
              accessibilityLabel={isCenter ? 'Pending Predictions' : (options?.tabBarAccessibilityLabel ?? options?.title)}
              label={isCenter ? 'Predict' : (options?.title ?? route.name)}
              badgeCount={route.name === 'profile' ? unreadBadge : undefined}
              isCenter={isCenter}
              pulse={isCenter}
              compact={compactWeb}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 100,
  },
  containerWeb: {
    position: 'fixed' as 'absolute',
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: NAV.bg,
    borderWidth: NAV.borderTopWidth,
    borderColor: NAV.borderTopColor,
    borderRadius: NAV.borderRadius,
    paddingHorizontal: NAV.paddingHorizontal,
    paddingVertical: NAV.paddingVertical,
    overflow: 'visible',
    ...Platform.select({
      web: {
        boxShadow: '0 14px 36px rgba(0, 0, 0, 0.48), inset 0 1px 0 rgba(255,255,255,0.05)',
      },
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.42,
        shadowRadius: 22,
      },
      android: { elevation: 20 },
    }),
  },
  navCompact: {
    borderRadius: 18,
    paddingVertical: 6,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minWidth: 0,
    height: 54,
    paddingHorizontal: 2,
    paddingVertical: 3,
  },
  navItemCompact: {
    height: 46,
  },
  navItemCenter: {
    height: 64,
    marginTop: -24,
    flex: 1.18,
  },
  navItemCenterCompact: {
    height: 54,
    marginTop: -14,
  },
  navItemInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minWidth: 0,
    width: '100%',
  },
  centerItemInner: {
    gap: 2,
  },
  iconPlate: {
    width: 36,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPlateCompact: {
    width: 32,
    height: 26,
  },
  iconPlateActive: {
    backgroundColor: 'rgba(201,223,106,0.1)',
  },
  label: {
    maxWidth: '100%',
    minHeight: 12,
    fontSize: 8.5,
    lineHeight: 10,
    fontWeight: '800',
    letterSpacing: 0,
  },
  labelCompact: {
    fontSize: 8,
    lineHeight: 9,
  },
  centerLabel: {
    color: Colors.accent.lime,
    fontSize: 8.5,
    lineHeight: 10,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  centerLabelCompact: {
    fontSize: 8,
    lineHeight: 9,
  },
  ballFabWrap: {
    width: 58,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  ballFabWrapCompact: {
    width: 48,
    height: 44,
  },
  ballGlow: {
    position: 'absolute',
    top: 2,
    left: 4,
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: Colors.accent.lime,
    backgroundColor: 'transparent',
    ...Platform.select({
      web: { boxShadow: '0 0 18px rgba(201,223,106,0.34)' },
      ios: {
        shadowColor: Colors.accent.lime,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.34,
        shadowRadius: 12,
      },
      android: { elevation: 10 },
    }),
  },
  ballGlowCompact: {
    top: 2,
    left: 5,
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  ballGlowActive: {
    backgroundColor: 'transparent',
  },
  ballFrame: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'transparent',
    ...Platform.select({
      web: { boxShadow: '0 4px 10px rgba(0,0,0,0.18)' },
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 7,
      },
      android: { elevation: 6 },
    }),
  },
  ballFrameCompact: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  ballImage: {
    width: 46,
    height: 46,
  },
  ballImageCompact: {
    width: 38,
    height: 38,
  },
  ballShine: {
    position: 'absolute',
    top: -6,
    bottom: -6,
    width: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 14,
  },
});

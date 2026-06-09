// ============================================================================
// FloatingTabBar — floating pill bottom navigation (Expo Router custom tabBar).
// ----------------------------------------------------------------------------
// Adapted from the ClutchTime UI kit's FloatingBottomNav design (floating pill,
// press-spring, lime active dot) and wired into Expo Router's <Tabs> via the
// `tabBar` prop. Icons come from the app's semantic <Icon> system; colours from
// the design-system Theme. Spec: ui kit/DESIGN_SYSTEM.md → "Bottom Navigation".
// ============================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  Keyboard,
  Text,
  Image,
  type ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Colors } from '@/constants';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useNotifications } from '@/hooks/useNotifications';
import { useCardCatalog, useMyCards } from '@/hooks/useUserCards';

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

type CenterCardPreview = {
  key: string;
  source: ImageSourcePropType;
};

const JOKER_CARD_SOURCE = require('@/assets/Joker.png');
const CARD_FLIP_INTERVAL_MS = 3000;
const CARD_FLIP_DURATION_MS = 560;

// route name → semantic icon (outline + filled active variant)
const TAB_ICONS: Record<string, { base: IconName; active: IconName }> = {
  home: { base: 'home', active: 'homeActive' },
  matches: { base: 'matches', active: 'matchesActive' },
  cards: { base: 'gift', active: 'gift' },
  leaderboard: { base: 'leaderboard', active: 'leaderboardActive' },
  profile: { base: 'profile', active: 'profileActive' },
};

const NAV = {
  bg: 'rgba(8,12,12,0.9)',
  borderTopWidth: 1,
  borderTopColor: 'rgba(201,223,106,0.22)',
  borderRadius: 24,
  paddingHorizontal: 7,
  paddingVertical: 7,
  iconSize: 23,
  iconActive: Colors.accent.lime,
  iconInactive: 'rgba(226,230,211,0.58)',
  bottomOffset: 12,
};

// Vertical space the floating pill occupies above the screen's safe-area bottom.
// Screens add this (plus insets.bottom) as scroll padding so the last row never
// hides behind the pill or the system navigation bar.
export const TAB_BAR_CLEARANCE = 96;

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
  centerCardSources = [{ key: 'joker-fallback', source: JOKER_CARD_SOURCE }],
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
  centerCardSources?: CenterCardPreview[];
}): React.JSX.Element {
  const scale = useRef(new Animated.Value(1)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;
  const floatValue = useRef(new Animated.Value(0)).current;
  const shineValue = useRef(new Animated.Value(0)).current;
  const flipValue = useRef(new Animated.Value(0)).current;
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [nextCardIndex, setNextCardIndex] = useState(0);
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

  useEffect(() => {
    setActiveCardIndex((current) => (current >= centerCardSources.length ? 0 : current));
    setNextCardIndex((current) => (current >= centerCardSources.length ? 0 : current));
  }, [centerCardSources.length]);

  useEffect(() => {
    if (!isCenter || centerCardSources.length <= 1) return;

    const timer = setInterval(() => {
      const incomingIndex = (activeCardIndex + 1) % centerCardSources.length;
      setNextCardIndex(incomingIndex);
      flipValue.setValue(0);

      Animated.timing(flipValue, {
        toValue: 1,
        duration: CARD_FLIP_DURATION_MS,
        useNativeDriver: Platform.OS !== 'web',
      }).start(({ finished }) => {
        if (!finished) return;
        setActiveCardIndex(incomingIndex);
        flipValue.setValue(0);
      });
    }, CARD_FLIP_INTERVAL_MS);

    return () => {
      clearInterval(timer);
      flipValue.stopAnimation();
    };
  }, [activeCardIndex, centerCardSources.length, flipValue, isCenter]);

  const jokerTranslateY = floatValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -5],
  });
  const jokerRotate = floatValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['-6deg', '4deg'],
  });
  const shineTranslate = shineValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, 52],
  });
  const frontRotate = flipValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '90deg', '90deg'],
  });
  const backRotate = flipValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['-90deg', '-90deg', '0deg'],
  });
  const frontOpacity = flipValue.interpolate({
    inputRange: [0, 0.49, 0.5, 1],
    outputRange: [1, 1, 0, 0],
  });
  const backOpacity = flipValue.interpolate({
    inputRange: [0, 0.49, 0.5, 1],
    outputRange: [0, 0, 1, 1],
  });
  const activeCardSource = centerCardSources[activeCardIndex]?.source ?? JOKER_CARD_SOURCE;
  const nextCardSource = centerCardSources[nextCardIndex]?.source ?? activeCardSource;

  return (
    <TouchableOpacity
      onPressIn={() => spring(isCenter ? 0.92 : 0.86)}
      onPressOut={() => spring(1)}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={1}
      style={[styles.navItem, isCenter && styles.navItemCenter]}
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
              styles.jokerCardWrap,
              isActive && styles.jokerCardWrapActive,
              {
                transform: [
                  { translateY: jokerTranslateY },
                  { rotateZ: jokerRotate },
                  { scale: isActive ? 1.03 : 1 },
                ],
              },
            ]}
          >
            <View style={[styles.centerGlow, isActive && styles.centerGlowActive]} />
            <View style={styles.jokerCardFrame}>
              <Animated.View
                style={[
                  styles.jokerFace,
                  {
                    opacity: frontOpacity,
                    transform: [{ perspective: 700 }, { rotateY: frontRotate }],
                  },
                ]}
              >
                <Image source={activeCardSource} style={styles.jokerImage} resizeMode="cover" />
              </Animated.View>
              <Animated.View
                style={[
                  styles.jokerFace,
                  {
                    opacity: backOpacity,
                    transform: [{ perspective: 700 }, { rotateY: backRotate }],
                  },
                ]}
              >
                <Image source={nextCardSource} style={styles.jokerImage} resizeMode="cover" />
              </Animated.View>
              <Animated.View
                pointerEvents="none"
                style={[styles.jokerShine, { transform: [{ translateX: shineTranslate }, { rotateZ: '18deg' }] }]}
              />
            </View>
          </Animated.View>
        ) : (
          <View style={[styles.iconPlate, isActive && styles.iconPlateActive]}>
            {isActive ? <View style={styles.activeBeam} /> : null}
            <Icon
              name={isActive ? icons.active : icons.base}
              size={NAV.iconSize}
              color={isActive ? NAV.iconActive : NAV.iconInactive}
            />
          </View>
        )}

        {!isCenter ? (
          <Text
            style={[
              styles.label,
              { color: isActive ? NAV.iconActive : NAV.iconInactive, opacity: isActive ? 1 : 0.62 },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.82}
          >
            {isActive ? label : ''}
          </Text>
        ) : null}
        {badgeCount != null && badgeCount > 0 && (
          <View style={[styles.badge, isCenter && styles.centerBadge]}>
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

function useCardsNavData(): { availableCardsBadge: number; centerCardSources: CenterCardPreview[] } {
  const cardsResult = useMyCards();
  const catalogResult = useCardCatalog();

  return useMemo(() => {
    const seen = new Set<string>();
    const previews: CenterCardPreview[] = [];

    const addPreview = (key: string, imageUrl?: string | null) => {
      if (!imageUrl || seen.has(imageUrl)) return;
      seen.add(imageUrl);
      previews.push({ key, source: { uri: imageUrl } });
    };

    (cardsResult.data ?? []).forEach((card) => {
      addPreview(card.id, card.definition?.image_url);
    });

    (catalogResult.data ?? []).forEach((definition) => {
      addPreview(definition.id, definition.image_url);
    });

    return {
      availableCardsBadge: (cardsResult.data ?? []).filter(
        (card) => card.status === 'active' && card.uses_remaining > 0
      ).length,
      centerCardSources:
        previews.length > 0 ? previews : [{ key: 'joker-fallback', source: JOKER_CARD_SOURCE }],
    };
  }, [cardsResult.data, catalogResult.data]);
}

export function FloatingTabBar({ state, descriptors, navigation }: FloatingTabBarProps): React.JSX.Element | null {
  const insets = useSafeAreaInsets();
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const unreadBadge = useUnreadBadge();
  const { availableCardsBadge, centerCardSources } = useCardsNavData();

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
    <View style={[styles.container, { bottom: insets.bottom + NAV.bottomOffset, pointerEvents: 'box-none' }]}>
      <View style={styles.nav}>
        {state.routes.map((route, index) => {
          const options = descriptors[route.key]?.options;
          const isActive = state.index === index;
          const isCenter = route.name === 'cards';

          const onPress = () => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isActive && !event.defaultPrevented) {
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
              accessibilityLabel={options?.tabBarAccessibilityLabel ?? options?.title}
              label={options?.title ?? route.name}
              badgeCount={
                route.name === 'profile'
                  ? unreadBadge
                  : route.name === 'cards'
                    ? availableCardsBadge
                    : undefined
              }
              isCenter={isCenter}
              pulse={isCenter && availableCardsBadge > 0}
              centerCardSources={isCenter ? centerCardSources : undefined}
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
    left: 18,
    right: 18,
    alignItems: 'center',
    zIndex: 100,
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
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minWidth: 0,
    height: 50,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  navItemCenter: {
    height: 62,
    marginTop: -25,
    flex: 1.28,
  },
  navItemInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minWidth: 0,
    width: '100%',
  },
  centerItemInner: {
    gap: 0,
  },
  iconPlate: {
    width: 38,
    height: 31,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPlateActive: {
    backgroundColor: 'rgba(201,223,106,0.08)',
  },
  label: {
    maxWidth: '100%',
    minHeight: 11,
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '800',
  },
  activeBeam: {
    position: 'absolute',
    top: -8,
    width: 22,
    height: 3,
    borderRadius: 999,
    backgroundColor: Colors.accent.lime,
    ...Platform.select({
      web: { boxShadow: '0 0 12px rgba(201,223,106,0.75)' },
      ios: {
        shadowColor: Colors.accent.lime,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
    }),
  },
  centerGlow: {
    position: 'absolute',
    top: 10,
    width: 42,
    height: 52,
    borderRadius: 21,
    backgroundColor: 'rgba(201,223,106,0.22)',
  },
  centerGlowActive: {
    backgroundColor: 'rgba(201,223,106,0.34)',
  },
  jokerCardWrap: {
    width: 46,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  jokerCardWrapActive: {},
  jokerCardFrame: {
    width: 42,
    height: 58,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: 'rgba(201,223,106,0.72)',
    backgroundColor: 'rgba(12,14,10,0.98)',
    ...Platform.select({
      web: { boxShadow: '0 10px 24px rgba(201,223,106,0.22)' },
      ios: {
        shadowColor: Colors.accent.lime,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: { elevation: 12 },
    }),
  },
  jokerFace: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backfaceVisibility: 'hidden',
  },
  jokerImage: {
    width: '100%',
    height: '100%',
  },
  jokerShine: {
    position: 'absolute',
    top: -10,
    bottom: -10,
    width: 16,
    backgroundColor: 'rgba(255,255,255,0.22)',
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
  centerBadge: {
    top: -10,
    right: 14,
    backgroundColor: '#FF6B6B',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
  },
});

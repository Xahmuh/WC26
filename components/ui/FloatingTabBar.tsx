// ============================================================================
// FloatingTabBar — floating pill bottom navigation (Expo Router custom tabBar).
// ----------------------------------------------------------------------------
// Adapted from the ClutchTime UI kit's FloatingBottomNav design (floating pill,
// press-spring, lime active dot) and wired into Expo Router's <Tabs> via the
// `tabBar` prop. Icons come from the app's semantic <Icon> system; colours from
// the design-system Theme. Spec: ui kit/DESIGN_SYSTEM.md → "Bottom Navigation".
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Platform, Keyboard, Text } from 'react-native';
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

// route name → semantic icon (outline + filled active variant)
const TAB_ICONS: Record<string, { base: IconName; active: IconName }> = {
  home: { base: 'home', active: 'homeActive' },
  matches: { base: 'matches', active: 'matchesActive' },
  leaderboard: { base: 'leaderboard', active: 'leaderboardActive' },
  profile: { base: 'profile', active: 'profileActive' },
};

// Kit "Bottom Navigation" exact spec
const NAV = {
  bg: 'rgba(18,24,24,0.96)',
  borderTopWidth: 1,
  borderTopColor: 'rgba(201,223,106,0.24)',
  borderRadius: 26,
  paddingHorizontal: 10,
  paddingVertical: 10,
  iconSize: 26,
  iconActive: Colors.accent.lime,
  iconInactive: '#B8B8B8',
  bottomOffset: 14,
};

// Vertical space the floating pill occupies above the screen's safe-area bottom.
// Screens add this (plus insets.bottom) as scroll padding so the last row never
// hides behind the pill or the system navigation bar.
// pill height (~58: paddingVertical 20 + icon 22 + item padding 8 + breathing)
// + bottomOffset (16) + extra margin (22).
export const TAB_BAR_CLEARANCE = 96;

function NavItem({
  routeName,
  isActive,
  onPress,
  onLongPress,
  accessibilityLabel,
  badgeCount,
  label,
}: {
  routeName: string;
  isActive: boolean;
  onPress: () => void;
  onLongPress: () => void;
  accessibilityLabel?: string;
  badgeCount?: number;
  label: string;
}): React.JSX.Element {
  const scale = useRef(new Animated.Value(1)).current;
  const icons = TAB_ICONS[routeName] ?? { base: 'home', active: 'homeActive' };

  const spring = (toValue: number) =>
    Animated.spring(scale, { toValue, useNativeDriver: Platform.OS !== 'web', speed: 40, bounciness: 8 }).start();

  return (
    <TouchableOpacity
      onPressIn={() => spring(0.85)}
      onPressOut={() => spring(1)}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={1}
      style={styles.navItem}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? routeName}
      accessibilityState={{ selected: isActive }}
    >
      <Animated.View style={[styles.navItemInner, { transform: [{ scale }] }]}>
        <Icon
          name={isActive ? icons.active : icons.base}
          size={NAV.iconSize}
          color={isActive ? NAV.iconActive : NAV.iconInactive}
        />
        <Text style={[styles.label, { color: isActive ? NAV.iconActive : NAV.iconInactive }]}>
          {label}
        </Text>
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
  const insets = useSafeAreaInsets();
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const unreadBadge = useUnreadBadge();

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
              badgeCount={route.name === 'profile' ? unreadBadge : undefined}
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
    left: 14,
    right: 14,
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
    ...Platform.select({
      web: {
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.8)',
      },
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.8,
        shadowRadius: 24,
      },
      android: { elevation: 20 },
    }),
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  navItemInner: {
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
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

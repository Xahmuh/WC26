// ============================================================
// FloatingBottomNav.tsx
// Floating pill-shaped bottom navigation bar
// Requires: react-native-safe-area-context
//           react-native-vector-icons OR @expo/vector-icons
// ============================================================
import React, { useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// If using Expo:
// import { Ionicons } from '@expo/vector-icons';
// If using react-native-vector-icons:
// import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../tokens/theme';

export type NavTab = {
  id:       string;
  label:    string;
  icon:     string;          // Ionicons name (outline variant)
  iconActive?: string;       // Optional: different icon when active
};

const DEFAULT_TABS: NavTab[] = [
  { id: 'home',      label: 'Home',      icon: 'home-outline',         iconActive: 'home' },
  { id: 'calendar',  label: 'Calendar',  icon: 'calendar-outline',     iconActive: 'calendar' },
  { id: 'favorites', label: 'Favorites', icon: 'heart-outline',        iconActive: 'heart' },
  { id: 'profile',   label: 'Profile',   icon: 'person-outline',       iconActive: 'person' },
];

interface FloatingBottomNavProps {
  tabs?:          NavTab[];
  activeTab?:     string;
  onTabPress?:    (id: string) => void;
}

function NavItem({
  tab,
  isActive,
  onPress,
}: {
  tab: NavTab;
  isActive: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.85,
      useNativeDriver: true,
      speed: 40,
      bounciness: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 8,
    }).start();
    onPress();
  };

  const iconName = isActive
    ? (tab.iconActive ?? tab.icon)
    : tab.icon;

  return (
    <TouchableOpacity
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.navItem}
      accessibilityLabel={tab.label}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      activeOpacity={1}
    >
      <Animated.View style={[styles.navItemInner, { transform: [{ scale }] }]}>
        {/* Replace with your icon library */}
        {/* <Ionicons
          name={iconName as any}
          size={theme.components.bottomNav.iconSize}
          color={isActive ? theme.components.bottomNav.iconActive : theme.components.bottomNav.iconInactive}
        /> */}

        {/* Placeholder icon circle (remove when adding real icons) */}
        <View style={[
          styles.iconPlaceholder,
          { backgroundColor: isActive ? theme.colors.textPrimary : theme.colors.bgElevated }
        ]} />

        {/* Active dot indicator */}
        {isActive && <View style={styles.activeDot} />}
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function FloatingBottomNav({
  tabs       = DEFAULT_TABS,
  activeTab,
  onTabPress,
}: FloatingBottomNavProps) {
  const insets = useSafeAreaInsets();
  const [active, setActive] = React.useState(activeTab ?? tabs[0]?.id);

  const handlePress = (id: string) => {
    setActive(id);
    onTabPress?.(id);
  };

  return (
    <View
      style={[
        styles.container,
        { bottom: insets.bottom + theme.components.bottomNav.bottomOffset },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.nav}>
        {tabs.map((tab) => (
          <NavItem
            key={tab.id}
            tab={tab}
            isActive={tab.id === active}
            onPress={() => handlePress(tab.id)}
          />
        ))}
      </View>
    </View>
  );
}

const NAV = theme.components.bottomNav;

const styles = StyleSheet.create({
  container: {
    position:   'absolute',
    left:       0,
    right:      0,
    alignItems: 'center',
    zIndex:     100,
  },
  nav: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              NAV.gap,
    backgroundColor:  NAV.bg,
    borderRadius:     NAV.borderRadius,
    borderWidth:      NAV.borderWidth,
    borderColor:      NAV.borderColor,
    paddingHorizontal:NAV.paddingHorizontal,
    paddingVertical:  NAV.paddingVertical,
    // Shadow
    ...Platform.select({
      ios: theme.shadow.nav,
      android: { elevation: theme.shadow.nav.elevation },
    }),
  },
  navItem: {
    alignItems:  'center',
    justifyContent: 'center',
    padding: theme.spacing[1],
  },
  navItemInner: {
    alignItems: 'center',
    gap:        theme.spacing[1],
  },
  activeDot: {
    width:         NAV.dotSize,
    height:        NAV.dotSize,
    borderRadius:  NAV.dotSize / 2,
    backgroundColor: NAV.dotColor,
  },
  // Remove this when using real icons ↓
  iconPlaceholder: {
    width:        NAV.iconSize,
    height:       NAV.iconSize,
    borderRadius: NAV.iconSize / 2,
  },
});

// ── Integration with React Navigation ────────────────────
//
// In your Tab.Navigator, hide the default tab bar and render
// FloatingBottomNav manually:
//
// const Tab = createBottomTabNavigator();
//
// function AppNavigator() {
//   const [activeTab, setActiveTab] = useState('home');
//   return (
//     <Tab.Navigator
//       tabBar={() => null}              // <-- hide default bar
//       screenOptions={{ headerShown: false }}
//     >
//       <Tab.Screen name="home" component={HomeScreen} />
//       <Tab.Screen name="calendar" component={CalendarScreen} />
//       <Tab.Screen name="favorites" component={FavoritesScreen} />
//       <Tab.Screen name="profile" component={ProfileScreen} />
//     </Tab.Navigator>
//     // render FloatingBottomNav outside Tab.Navigator
//   );
// }

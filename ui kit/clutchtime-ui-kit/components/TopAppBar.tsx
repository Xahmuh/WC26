// ============================================================
// TopAppBar.tsx
// App header — logo left, icon actions right
// ============================================================
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../tokens/theme';

interface TopAppBarProps {
  title?:          string;
  onSearchPress?:  () => void;
  onBellPress?:    () => void;
  hasNotification?: boolean;
}

export default function TopAppBar({
  title           = 'CLUTCHTIME',
  onSearchPress,
  onBellPress,
  hasNotification = false,
}: TopAppBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.bgDeep} />
      <View style={[styles.container, { paddingTop: insets.top + theme.spacing[2] }]}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onSearchPress}
            accessibilityLabel="Search"
          >
            {/* <Ionicons name="search-outline" size={22} color={theme.colors.textSecondary} /> */}
            <View style={styles.iconDummy} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onBellPress}
            accessibilityLabel="Notifications"
          >
            {/* <Ionicons name="notifications-outline" size={22} color={theme.colors.textSecondary} /> */}
            <View style={styles.iconDummy} />
            {hasNotification && <View style={styles.notifDot} />}
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor:  theme.colors.bgPrimary,
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    paddingHorizontal:theme.spacing[6],
    paddingBottom:    theme.spacing[3],
  },
  title: {
    fontSize:      theme.fontSize.appName,
    fontWeight:    theme.fontWeight.black,
    color:         theme.colors.textPrimary,
    letterSpacing: theme.letterSpacing.tight,
  },
  actions: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           theme.spacing[4],
  },
  iconBtn: {
    position: 'relative',
    padding:  theme.spacing[1],
  },
  iconDummy: {
    width:           22,
    height:          22,
    borderRadius:    11,
    backgroundColor: theme.colors.bgElevated,
  },
  notifDot: {
    position:        'absolute',
    top:             0,
    right:           0,
    width:           8,
    height:          8,
    borderRadius:    4,
    backgroundColor: theme.colors.liveRed,
    borderWidth:     2,
    borderColor:     theme.colors.bgPrimary,
  },
});

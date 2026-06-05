// ============================================================
// TimelineTabBar.tsx
// Yesterday / Today / Upcoming / Archived flat text tabs
// ============================================================
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  LayoutChangeEvent,
} from 'react-native';
import theme from '../tokens/theme';

export type TimelineTab = {
  id:    string;
  label: string;
};

const DEFAULT_TABS: TimelineTab[] = [
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'today',     label: 'Today' },
  { id: 'upcoming',  label: 'Upcoming' },
  { id: 'archived',  label: 'Archived' },
];

interface TimelineTabBarProps {
  tabs?:          TimelineTab[];
  initialTab?:    string;
  onTabChange?:   (id: string) => void;
}

export default function TimelineTabBar({
  tabs          = DEFAULT_TABS,
  initialTab    = 'upcoming',
  onTabChange,
}: TimelineTabBarProps) {
  const [selected, setSelected] = useState(initialTab);

  const handlePress = (id: string) => {
    setSelected(id);
    onTabChange?.(id);
  };

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === selected;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => handlePress(tab.id)}
              activeOpacity={0.65}
            >
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {/* Full-width bottom divider */}
      <View style={styles.divider} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  container: {
    flexDirection:    'row',
    paddingHorizontal: theme.spacing[6],
    gap:              theme.spacing[4],
  },
  tab: {
    paddingVertical: theme.spacing[2] + 2, // 10px
    borderBottomWidth: theme.borderWidth.active,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: theme.colors.textPrimary,
  },
  label: {
    fontSize:   theme.fontSize.tab,
    fontWeight: theme.fontWeight.semibold,
    color:      theme.colors.textDisabled,
  },
  labelActive: {
    color:      theme.colors.textPrimary,
    fontWeight: theme.fontWeight.bold,
  },
  divider: {
    height:          1,
    backgroundColor: theme.colors.borderSubtle,
    marginHorizontal: 0,
  },
});

// ============================================================
// SportFilterTabs.tsx
// Horizontal scrollable sport category pill tabs
// ============================================================
import React, { useState } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
} from 'react-native';
import theme from '../tokens/theme';

export type Sport = {
  id: string;
  label: string;
};

interface SportFilterTabsProps {
  sports: Sport[];
  initialSelected?: string;
  onSelect?: (id: string) => void;
}

export default function SportFilterTabs({
  sports,
  initialSelected,
  onSelect,
}: SportFilterTabsProps) {
  const [selected, setSelected] = useState(initialSelected ?? sports[0]?.id);

  const handleSelect = (id: string) => {
    setSelected(id);
    onSelect?.(id);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {sports.map((sport) => {
        const isActive = sport.id === selected;
        return (
          <TouchableOpacity
            key={sport.id}
            style={[styles.pill, isActive ? styles.pillActive : styles.pillInactive]}
            onPress={() => handleSelect(sport.id)}
            activeOpacity={0.75}
          >
            <Text style={[styles.label, isActive ? styles.labelActive : styles.labelInactive]}>
              {sport.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[6],
    paddingVertical: theme.spacing[3],
  },
  pill: {
    paddingHorizontal: theme.components.sportTab.paddingHorizontal,
    paddingVertical: theme.components.sportTab.paddingVertical,
    borderRadius: theme.components.sportTab.borderRadius,
  },
  pillActive: {
    backgroundColor: theme.components.sportTab.active.bg,
  },
  pillInactive: {
    backgroundColor: theme.components.sportTab.inactive.bg,
    borderWidth: theme.borderWidth.default,
    borderColor: theme.components.sportTab.inactive.border,
  },
  label: {
    fontSize: theme.fontSize.tab,
    fontWeight: theme.fontWeight.semibold,
  },
  labelActive: {
    color: theme.components.sportTab.active.text,
  },
  labelInactive: {
    color: theme.components.sportTab.inactive.text,
  },
});

// ── Usage Example ────────────────────────────────────────
// const SPORTS = [
//   { id: 'basketball', label: 'Basketball' },
//   { id: 'football',   label: 'Football' },
//   { id: 'volleyball', label: 'Volleyball' },
//   { id: 'hockey',     label: 'Hockey' },
// ];
// <SportFilterTabs sports={SPORTS} onSelect={(id) => console.log(id)} />

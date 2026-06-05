// ============================================================
// LeaguePillRow.tsx
// Horizontal scrollable circular league / channel avatars
// ============================================================
import React from 'react';
import {
  ScrollView,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import theme from '../tokens/theme';

export type LeagueItem = {
  id: string;
  name: string;
  logoUrl?: string;
  /** Fallback text if no logo (e.g. "ESPN", "NCAA") */
  abbreviation?: string;
  /** Tint color for the pill background */
  bgColor?: string;
  /** Tint color for the abbreviation text */
  textColor?: string;
};

interface LeaguePillRowProps {
  items: LeagueItem[];
  onSelect?: (id: string) => void;
}

export default function LeaguePillRow({ items, onSelect }: LeaguePillRowProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {items.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.item}
          onPress={() => onSelect?.(item.id)}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.pill,
              item.bgColor ? { backgroundColor: item.bgColor } : {},
            ]}
          >
            {item.logoUrl ? (
              <Image
                source={{ uri: item.logoUrl }}
                style={styles.logo}
                resizeMode="contain"
              />
            ) : (
              <Text
                style={[
                  styles.abbreviation,
                  item.textColor ? { color: item.textColor } : {},
                ]}
                numberOfLines={1}
              >
                {item.abbreviation ?? item.name.slice(0, 4).toUpperCase()}
              </Text>
            )}
          </View>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const PILL_SIZE = theme.components.leaguePill.size;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: theme.spacing[3],
    paddingHorizontal: theme.spacing[6],
    paddingVertical: theme.spacing[2],
  },
  item: {
    alignItems: 'center',
    gap: theme.spacing[1],
    width: PILL_SIZE,
  },
  pill: {
    width: PILL_SIZE,
    height: PILL_SIZE,
    borderRadius: theme.radius.pill,
    borderWidth: theme.components.leaguePill.borderWidth,
    borderColor: theme.components.leaguePill.borderColor,
    backgroundColor: theme.colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: PILL_SIZE * 0.65,
    height: PILL_SIZE * 0.65,
  },
  abbreviation: {
    fontSize: theme.fontSize.micro,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  name: {
    fontSize: theme.fontSize.micro,
    color: theme.colors.textDisabled,
    textAlign: 'center',
    width: PILL_SIZE + 8,
  },
});

// ── Usage ─────────────────────────────────────────────────
// const LEAGUES: LeagueItem[] = [
//   { id: 'ncaa',      name: 'NCAA',      abbreviation: 'NCAA', bgColor: '#1a3a6e', textColor: '#7ab0ff' },
//   { id: 'euro',      name: 'Euroleague', abbreviation: '▶',   bgColor: '#8B1A1A', textColor: '#FF8888' },
//   { id: 'espn',      name: 'ESPN',       abbreviation: 'ESPN', bgColor: '#AA0000', textColor: '#FFFFFF' },
//   { id: 'lebron',    name: 'LeBron',     logoUrl: 'https://...' },
// ];
// <LeaguePillRow items={LEAGUES} onSelect={(id) => {}} />

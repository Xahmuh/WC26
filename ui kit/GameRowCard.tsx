// ============================================================
// GameRowCard.tsx
// Upcoming / scheduled game list item
// ============================================================
import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import theme from '../tokens/theme';

export type ScheduledGame = {
  id: string;
  league: string;
  homeTeam: {
    abbreviation: string;
    logoUrl?: string;
    bgColor?: string;
    textColor?: string;
    wins: number;
    losses: number;
  };
  awayTeam: {
    abbreviation: string;
    logoUrl?: string;
    bgColor?: string;
    textColor?: string;
    wins: number;
    losses: number;
  };
  time: string;        // e.g. "7:30 AM"
  date?: string;       // e.g. "Today"
};

interface GameRowCardProps {
  game: ScheduledGame;
  onPress?: (id: string) => void;
}

function TeamBadge({
  abbreviation,
  logoUrl,
  wins,
  losses,
  bgColor,
  textColor,
}: ScheduledGame['homeTeam']) {
  return (
    <View style={styles.teamCol}>
      <View style={[styles.teamBadge, bgColor ? { backgroundColor: bgColor } : {}]}>
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={styles.teamLogo} resizeMode="contain" />
        ) : (
          <Text style={[styles.teamBadgeText, textColor ? { color: textColor } : {}]}>
            {abbreviation}
          </Text>
        )}
      </View>
      <Text style={styles.teamAbbr}>{abbreviation}</Text>
      <Text style={styles.teamRecord}>{wins}-{losses}</Text>
    </View>
  );
}

export default function GameRowCard({ game, onPress }: GameRowCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(game.id)}
      activeOpacity={0.75}
    >
      <TeamBadge {...game.homeTeam} />

      <View style={styles.center}>
        <Text style={styles.league} numberOfLines={1}>
          {game.league}
        </Text>
        <Text style={styles.time}>{game.time}</Text>
        <Text style={styles.recordLabel}>Wins-Losses</Text>
      </View>

      <TeamBadge {...game.awayTeam} />
    </TouchableOpacity>
  );
}

const BADGE_SIZE = 36;

const styles = StyleSheet.create({
  card: {
    backgroundColor:  theme.components.gameRow.bg,
    borderRadius:     theme.components.gameRow.borderRadius,
    paddingVertical:  theme.components.gameRow.paddingVertical,
    paddingHorizontal:theme.components.gameRow.paddingHorizontal,
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    marginHorizontal: theme.spacing[6],
    marginBottom:     theme.spacing[2],
    ...theme.shadow.card,
  },
  teamCol: {
    alignItems: 'center',
    gap:        theme.spacing[1],
    width:      BADGE_SIZE + 16,
  },
  teamBadge: {
    width:           BADGE_SIZE,
    height:          BADGE_SIZE,
    borderRadius:    theme.radius.pill,
    backgroundColor: theme.colors.bgElevated,
    borderWidth:     1,
    borderColor:     theme.colors.borderSubtle,
    alignItems:      'center',
    justifyContent:  'center',
    overflow:        'hidden',
  },
  teamLogo: {
    width:  BADGE_SIZE * 0.7,
    height: BADGE_SIZE * 0.7,
  },
  teamBadgeText: {
    fontSize:   7,
    fontWeight: theme.fontWeight.black,
    color:      theme.colors.textMuted,
    textAlign:  'center',
  },
  teamAbbr: {
    fontSize:   theme.fontSize.teamAbbr,
    fontWeight: theme.fontWeight.bold,
    color:      theme.colors.textSecondary,
  },
  teamRecord: {
    fontSize: theme.fontSize.micro,
    color:    theme.colors.textDisabled,
  },
  center: {
    flex:       1,
    alignItems: 'center',
    gap:        2,
  },
  league: {
    fontSize: theme.fontSize.micro,
    color:    theme.colors.textDisabled,
    textAlign:'center',
  },
  time: {
    fontSize:   theme.fontSize.time,
    fontWeight: theme.fontWeight.black,
    color:      theme.colors.textPrimary,
  },
  recordLabel: {
    fontSize: theme.fontSize.micro,
    color:    theme.colors.textDisabled,
  },
});

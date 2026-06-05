// ============================================================
// LiveScoreCard.tsx
// Live game card with red border glow + score display
// Horizontally swipeable via FlatList
// ============================================================
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Image,
  TouchableOpacity,
} from 'react-native';
import theme from '../tokens/theme';

export type LiveGame = {
  id: string;
  league: string;
  homeTeam: {
    abbreviation: string;
    logoUrl?: string;
    score: number;
  };
  awayTeam: {
    abbreviation: string;
    logoUrl?: string;
    score: number;
  };
  period: string;    // e.g. "1st Quarter", "2nd Half"
  clock?: string;    // e.g. "08:34"
};

interface LiveScoreCardProps {
  game: LiveGame;
  onPress?: (id: string) => void;
}

export default function LiveScoreCard({ game, onPress }: LiveScoreCardProps) {
  // Pulsing animation for the live dot
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(game.id)}
      activeOpacity={0.85}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.liveIndicator}>
          <Animated.View style={[styles.liveDot, { opacity: pulse }]} />
          <Text style={styles.liveText}>Live</Text>
        </View>
        <Text style={styles.leagueName}>{game.league}</Text>
      </View>

      {/* Scoreboard */}
      <View style={styles.scoreboard}>
        {/* Home team */}
        <View style={styles.teamCol}>
          {game.homeTeam.logoUrl ? (
            <Image source={{ uri: game.homeTeam.logoUrl }} style={styles.teamLogo} />
          ) : (
            <View style={styles.teamLogoPlaceholder} />
          )}
          <Text style={styles.teamAbbr}>{game.homeTeam.abbreviation}</Text>
        </View>

        {/* Score + period */}
        <View style={styles.scoreCenter}>
          <Text style={styles.score}>
            {game.homeTeam.score}:{game.awayTeam.score}
          </Text>
          <View style={styles.periodBadge}>
            <Text style={styles.periodText}>{game.period}</Text>
          </View>
          {game.clock && (
            <Text style={styles.clock}>{game.clock}</Text>
          )}
        </View>

        {/* Away team */}
        <View style={styles.teamCol}>
          {game.awayTeam.logoUrl ? (
            <Image source={{ uri: game.awayTeam.logoUrl }} style={styles.teamLogo} />
          ) : (
            <View style={styles.teamLogoPlaceholder} />
          )}
          <Text style={styles.teamAbbr}>{game.awayTeam.abbreviation}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.components.liveCard.bg,
    borderWidth:     theme.components.liveCard.borderWidth,
    borderColor:     theme.components.liveCard.borderColor,
    borderRadius:    theme.components.liveCard.borderRadius,
    padding:         theme.components.liveCard.padding,
    marginHorizontal: theme.spacing[6],
    // iOS glow
    ...theme.shadow.liveGlow,
  },
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   theme.spacing[3],
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           theme.spacing[1] + 2, // 6px
  },
  liveDot: {
    width:         6,
    height:        6,
    borderRadius:  3,
    backgroundColor: theme.colors.liveRed,
  },
  liveText: {
    fontSize:   theme.fontSize.label,
    fontWeight: theme.fontWeight.bold,
    color:      theme.colors.liveRed,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  leagueName: {
    fontSize: theme.fontSize.caption,
    color:    theme.colors.textDisabled,
  },
  scoreboard: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  teamCol: {
    alignItems: 'center',
    gap: theme.spacing[1],
    flex: 1,
  },
  teamLogo: {
    width:  36,
    height: 36,
    borderRadius: theme.radius.pill,
  },
  teamLogoPlaceholder: {
    width:           36,
    height:          36,
    borderRadius:    theme.radius.pill,
    backgroundColor: theme.colors.bgElevated,
    borderWidth:     1,
    borderColor:     theme.colors.borderDefault,
  },
  teamAbbr: {
    fontSize:   theme.fontSize.teamAbbr,
    fontWeight: theme.fontWeight.bold,
    color:      theme.colors.textSecondary,
  },
  scoreCenter: {
    alignItems: 'center',
    flex:       2,
    gap:        theme.spacing[1],
  },
  score: {
    fontSize:      theme.fontSize.score,
    fontWeight:    theme.fontWeight.black,
    color:         theme.colors.textPrimary,
    letterSpacing: 0.05 * theme.fontSize.score,
  },
  periodBadge: {
    backgroundColor: theme.colors.bgHover,
    borderRadius:    theme.radius.xs,
    paddingHorizontal: theme.spacing[2],
    paddingVertical:   2,
  },
  periodText: {
    fontSize:   theme.fontSize.caption,
    color:      theme.colors.textSecondary,
    fontWeight: theme.fontWeight.semibold,
  },
  clock: {
    fontSize: theme.fontSize.micro,
    color:    theme.colors.textDisabled,
  },
});

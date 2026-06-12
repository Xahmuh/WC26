import type { MatchStatus, Team } from '@/types';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Layout, Typography } from '@/constants';
import { TeamFlag } from '@/components/ui/TeamFlag';
import { MultiplierBadge } from '@/components/ui/MultiplierBadge';
import { Icon } from '@/components/ui/Icon';
import { LiveBadge } from '@/components/ui/LiveBadge';
import { isLiveMatchStatus, shouldShowMatchScore } from '@/lib/matchStatus';

interface MatchCardTeam {
  name: string;
  team: Team;
}

interface MatchCardProps {
  homeTeam: MatchCardTeam;
  awayTeam: MatchCardTeam;
  matchTime: string;
  status?: MatchStatus;
  homeScore?: number | null;
  awayScore?: number | null;
  multiplier?: number;
  isMatchOfDay?: boolean;
  isGolden?: boolean;
  isFavorite?: boolean;
  onPress?: () => void;
  onFavoritePress?: () => void;
  width?: number;
}

export function MatchCard({
  homeTeam,
  awayTeam,
  matchTime,
  status,
  homeScore,
  awayScore,
  multiplier,
  isMatchOfDay,
  isGolden,
  isFavorite,
  onPress,
  onFavoritePress,
  width = 148,
}: MatchCardProps): React.JSX.Element {
  const showGoldenBadge = Boolean(isMatchOfDay || isGolden);
  const showFavorite = Boolean(isFavorite || onFavoritePress);
  const isLive = isLiveMatchStatus(status);
  const showScore =
    shouldShowMatchScore(status) &&
    homeScore !== null &&
    homeScore !== undefined &&
    awayScore !== null &&
    awayScore !== undefined;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.container, { width }, showGoldenBadge && styles.goldenBorder]}
    >
      <View style={styles.content}>
        <View>
          {(showGoldenBadge || isLive) ? (
            <View style={styles.badgesRow}>
              {isLive ? <LiveBadge compact /> : null}
              {showGoldenBadge ? (
                <View style={styles.goldenBadge}>
                  <Icon name="star" size={10} color={Colors.background.primary} />
                  <Text style={styles.goldenBadgeText} numberOfLines={1}>
                    MATCH OF THE DAY
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.teamsRow}>
            <View style={styles.team}>
              <TeamFlag team={homeTeam.team} size={34} fixed />
              <Text style={styles.teamName} numberOfLines={1} ellipsizeMode="tail">
                {homeTeam.name}
              </Text>
            </View>
            <View style={styles.vsSlot}>
              {showScore ? (
                <Text style={[styles.score, isLive && styles.liveScore]} numberOfLines={1}>
                  {homeScore}-{awayScore}
                </Text>
              ) : (
                <Text style={styles.vs}>VS</Text>
              )}
            </View>
            <View style={styles.team}>
              <TeamFlag team={awayTeam.team} size={34} fixed />
              <Text style={styles.teamName} numberOfLines={1} ellipsizeMode="tail">
                {awayTeam.name}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.matchTime} numberOfLines={1}>
            {matchTime}
          </Text>
          <View style={styles.footerActions}>
            {showFavorite ? (
              onFavoritePress ? (
                <Pressable
                  onPress={(event) => {
                    event.stopPropagation();
                    onFavoritePress();
                  }}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={isFavorite ? 'Remove favorite team' : 'Add favorite team'}
                  style={styles.favoriteBtn}
                >
                  <Icon name="star" size={8} color={isFavorite ? Colors.gold : Colors.text.tertiary} />
                </Pressable>
              ) : (
                <View style={styles.favoriteIndicator}>
                  <Icon name="star" size={8} color={Colors.gold} />
                </View>
              )
            ) : null}
            {typeof multiplier === 'number' ? <MultiplierBadge value={multiplier} size="sm" /> : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(18, 24, 24, 0.9)',
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    padding: 12,
    marginRight: 0,
    overflow: 'hidden',
    minHeight: 132,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  goldenBorder: {
    borderColor: Colors.gold,
    borderWidth: 1.5,
  },
  badgesRow: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  goldenBadge: {
    backgroundColor: Colors.gold,
    borderRadius: Layout.borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    alignSelf: 'flex-start',
    maxWidth: '74%',
  },
  goldenBadgeText: {
    color: Colors.background.primary,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    flexShrink: 1,
  },
  favoriteBtn: {
    width: 12,
    height: 12,
    borderRadius: Layout.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  favoriteIndicator: {
    width: 12,
    height: 12,
    borderRadius: Layout.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexShrink: 0,
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    marginBottom: 7,
    paddingTop: 4,
    gap: 6,
    minWidth: 0,
  },
  team: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  teamName: {
    color: Colors.text.primary,
    fontSize: 9.5,
    textAlign: 'center',
    fontWeight: Typography.weight.medium,
    lineHeight: 11,
    width: '100%',
    minWidth: 0,
    overflow: 'hidden',
  },
  vsSlot: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  vs: {
    color: Colors.text.secondary,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    textAlign: 'center',
  },
  score: {
    color: Colors.text.primary,
    fontSize: 15,
    fontWeight: Typography.weight.bold,
    textAlign: 'center',
  },
  liveScore: {
    color: Colors.red,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border.subtle,
    gap: 6,
  },
  matchTime: {
    color: Colors.text.secondary,
    fontSize: Typography.size.xs,
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    paddingRight: 4,
  },
});

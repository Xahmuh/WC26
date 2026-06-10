import { memo, useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, Text, View } from 'react-native';

import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { MultiplierBadge } from '@/components/ui/MultiplierBadge';
import { TeamFlag } from '@/components/ui/TeamFlag';
import Theme from '@/constants/theme/design-system';
import { STATUS_LABELS } from '@/lib/constants';
import { formatKickoff } from '@/lib/dates';
import type { Match, MatchStatus, PointsRecord, Prediction } from '@/types';

interface MatchCardProps {
  match: Match;
  prediction?: Prediction;
  points?: PointsRecord;
  onPress?: (matchId: string) => void;
}

const STATUS_TONE: Record<MatchStatus, BadgeTone> = {
  SCHEDULED: 'info',
  IN_PLAY: 'warning',
  FINISHED: 'success',
  POSTPONED: 'neutral',
  CANCELLED: 'danger',
};

function MatchCardComponent({
  match,
  prediction,
  points,
  onPress,
}: MatchCardProps): React.JSX.Element {
  const isFinished = match.status === 'FINISHED';
  const isLive = match.status === 'IN_PLAY';
  const hasScore = match.home_score !== null && match.away_score !== null;

  // ClutchTime "live state": pulse the red indicator dot while in play.
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!isLive) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isLive, pulse]);

  // Red border + glow (iOS) / elevation (Android) for live cards — kit spec.
  const liveCardStyle = isLive
    ? [
        { borderColor: Theme.colors.live, borderWidth: 1.5, backgroundColor: '#1E1E1E' },
        Platform.select({
          web: {
            boxShadow: '0 0 14px rgba(255, 107, 107, 0.35)',
          },
          ios: {
            shadowColor: Theme.colors.live,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.35,
            shadowRadius: 14,
          },
          android: { elevation: 8 },
        }),
      ]
    : undefined;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        match.is_placeholder
          ? `Knockout match, teams to be decided. ${match.points_multiplier}x multiplier.`
          : `${match.home_team.name} versus ${match.away_team.name}. ${match.points_multiplier}x multiplier.`
      }
      onPress={() => onPress?.(match.id)}
      className="rounded-2xl border border-bgBorder bg-bgSurface2 p-4 active:opacity-80"
      style={liveCardStyle}
    >
      <View className="mb-3 flex-row flex-wrap items-center justify-between gap-2">
        <View className="min-w-0 flex-1 flex-row flex-wrap items-center gap-1.5">
          {isLive ? (
            <View className="flex-row items-center gap-1.5">
              <Animated.View
                style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: Theme.colors.live, opacity: pulse }}
              />
              <Text className="text-xs font-bold uppercase tracking-wider text-live">Live</Text>
            </View>
          ) : (
            <Badge label={STATUS_LABELS[match.status]} tone={STATUS_TONE[match.status]} />
          )}
          {match.is_placeholder && (
            <View className="rounded bg-accentDim px-1.5 py-0.5 border border-accentBorder/50">
              <Text className="text-[9px] font-bold text-accent uppercase">TBD</Text>
            </View>
          )}
        </View>
        <View className="flex-row items-center justify-end gap-2">
          {match.group_name ? (
            <Text className="text-xs font-medium text-textTertiary" numberOfLines={1}>
              Group {match.group_name}
            </Text>
          ) : null}
          <MultiplierBadge value={match.points_multiplier} size="sm" />
        </View>
      </View>

      {/* Teams row */}
      <View className="flex-row items-center">
        <View className="min-w-0 flex-1 flex-row items-center gap-2">
          <TeamFlag team={match.home_team} />
          <Text
            numberOfLines={1}
            className="flex-shrink text-base font-semibold text-textPrimary"
          >
            {match.home_team.name}
          </Text>
        </View>

        <View className="px-3">
          {hasScore ? (
            <Text className={`text-lg font-bold ${isLive ? 'text-live' : 'text-textPrimary'}`}>
              {match.home_score} – {match.away_score}
            </Text>
          ) : (
            <Text className="text-sm font-semibold text-textTertiary">vs</Text>
          )}
        </View>

        <View className="min-w-0 flex-1 flex-row items-center justify-end gap-2">
          <Text
            numberOfLines={1}
            className="flex-shrink text-right text-base font-semibold text-textPrimary"
          >
            {match.away_team.name}
          </Text>
          <TeamFlag team={match.away_team} />
        </View>
      </View>

      {/* Meta row */}
      <View className="mt-3 min-w-0 flex-row items-center justify-between gap-3 border-t border-bgBorder pt-3">
        {isLive ? (
          <Text className="text-xs font-semibold text-live">In progress</Text>
        ) : isFinished ? (
          <Text className="text-xs text-textSecondary">Full time</Text>
        ) : (
          <Text className="text-xs text-textSecondary">
            {formatKickoff(match.kickoff_time)}
          </Text>
        )}

        {prediction ? (
          <View className="min-w-0 flex-row items-center gap-1">
            <Icon name="lock" size={12} color={Theme.colors.accent} />
            <Text className="min-w-0 flex-shrink text-xs font-medium text-accent" numberOfLines={1}>
              Saved: {prediction.pred_home_score}–{prediction.pred_away_score}
            </Text>
          </View>
        ) : !isFinished ? (
          <Text className="text-xs font-medium text-textTertiary">No prediction yet</Text>
        ) : null}
      </View>

      {isFinished && points ? (
        <View className="mt-2 flex-row items-center justify-end gap-1">
          <Text className="text-sm font-bold text-success">+{points.total_points} pts</Text>
          {points.total_points > 0 ? (
            <Icon name="target" size={14} color={Theme.colors.success} />
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

export const MatchCard = memo(MatchCardComponent);

import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
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
  const hasFinalScore = match.home_score !== null && match.away_score !== null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${match.home_team.name} versus ${match.away_team.name}`}
      onPress={() => onPress?.(match.id)}
      className="rounded-2xl border border-bgBorder bg-bgSurface2 p-4 active:opacity-80"
    >
      <View className="mb-3 flex-row items-center justify-between">
        <Badge label={STATUS_LABELS[match.status]} tone={STATUS_TONE[match.status]} />
        {match.group_name ? (
          <Text className="text-xs font-medium text-textTertiary">
            Group {match.group_name}
          </Text>
        ) : null}
      </View>

      {/* Teams row */}
      <View className="flex-row items-center">
        <View className="flex-1 flex-row items-center gap-2">
          <TeamFlag team={match.home_team} />
          <Text
            numberOfLines={1}
            className="flex-shrink text-base font-semibold text-textPrimary"
          >
            {match.home_team.name}
          </Text>
        </View>

        <View className="px-3">
          {isFinished && hasFinalScore ? (
            <Text className="text-lg font-bold text-textPrimary">
              {match.home_score} – {match.away_score}
            </Text>
          ) : (
            <Text className="text-sm font-semibold text-textTertiary">vs</Text>
          )}
        </View>

        <View className="flex-1 flex-row items-center justify-end gap-2">
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
      <View className="mt-3 flex-row items-center justify-between border-t border-bgBorder pt-3">
        {!isFinished ? (
          <Text className="text-xs text-textSecondary">
            {formatKickoff(match.kickoff_time)}
          </Text>
        ) : (
          <Text className="text-xs text-textSecondary">Full time</Text>
        )}

        {prediction ? (
          <View className="flex-row items-center gap-1">
            <Icon name="lock" size={12} color={Theme.colors.accent} />
            <Text className="text-xs font-medium text-accent">
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

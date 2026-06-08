import { Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { MultiplierBadge } from '@/components/ui/MultiplierBadge';
import Theme from '@/constants/theme/design-system';
import { useMatchTopScorer } from '@/hooks/usePoints';
import { useMyCards } from '@/hooks/useUserCards';
import type { Match, PointsRecord, Prediction } from '@/types';

interface PredictionResultProps {
  match: Match;
  prediction?: Prediction;
  points?: PointsRecord;
}

/**
 * Shown for a FINISHED match: the final score, the user's pick, and a
 * line-by-line breakdown of the points they earned.
 */
export function PredictionResult({
  match,
  prediction,
  points,
}: PredictionResultProps): React.JSX.Element {
  const topScorerQuery = useMatchTopScorer(match.id);
  const cardsQuery = useMyCards();
  const topScorer = topScorerQuery.data;
  const appliedCard = (cardsQuery.data ?? []).find(
    (card) => card.id === prediction?.applied_user_card_id
  );
  const effectiveMultiplier = match.points_multiplier + (appliedCard?.multiplier_bonus ?? 0);

  return (
    <View className="gap-5">
        <View className="flex-row items-center justify-between rounded-2xl border border-bgBorder bg-bgSurface2 px-5 py-4">
          <View className="min-w-0 flex-1">
            <Text className="text-xs font-bold text-textSecondary uppercase tracking-widest">
              Match multiplier
            </Text>
            <Text className="mt-1 text-xs text-textTertiary">
              {appliedCard
                ? `${appliedCard.definition?.name ?? 'Card boost'} added +${appliedCard.multiplier_bonus}`
                : 'Applied to this match score'}
            </Text>
          </View>
          <MultiplierBadge value={effectiveMultiplier} size="md" />
        </View>

        {!prediction ? (
          <Text className="text-center text-sm font-medium text-textSecondary">
            You did not submit a prediction for this match.
          </Text>
        ) : (
          <>
            {/* Your Prediction */}
            <View className="flex-row items-center justify-between rounded-2xl border border-bgBorder bg-bgSurface2 px-5 py-4">
              <Text className="text-xs font-bold text-textSecondary uppercase tracking-widest">Your pick</Text>
              <Text className="text-xl font-black text-textPrimary tracking-widest">
                {prediction.pred_home_score} - {prediction.pred_away_score}
              </Text>
            </View>

            {/* Points Breakdown */}
            {points ? (
              <View className="gap-3 rounded-2xl border border-bgBorder bg-bgSurface2 p-5">
                <Text className="text-[10px] font-black text-textTertiary uppercase tracking-widest mb-1">
                  Points Breakdown
                </Text>
                <BreakdownRow
                  label={match.is_knockout ? 'Correct qualifier' : 'Correct winner / draw'}
                  value={points.winner_points}
                />
                <BreakdownRow
                  label="Exact-score bonus"
                  value={points.exact_bonus}
                />
                <View className="mt-2 flex-row items-center justify-between border-t border-bgBorder pt-4">
                  <Text className="text-sm font-black text-textPrimary uppercase tracking-widest">Total Earned</Text>
                  <View className="flex-row items-center gap-1.5 bg-successDim px-3 py-1.5 rounded-xl border border-success/20">
                    <Text className="text-sm font-black text-success">{points.total_points} PTS</Text>
                    {points.total_points > 0 && (
                      <Icon name="target" size={14} color={Theme.colors.success} />
                    )}
                  </View>
                </View>
              </View>
            ) : (
              <View className="rounded-2xl border border-bgBorder bg-bgSurface2 p-5 items-center">
                <Text className="text-center text-xs font-medium text-textTertiary">
                  Points are being calculated…
                </Text>
              </View>
            )}
          </>
        )}

        {/* Match MVP Section */}
        {topScorer && (
          <View className="mt-2 rounded-2xl border border-accentBorder/30 bg-bgSurface2 p-5">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-[10px] font-black text-textSecondary uppercase tracking-widest">
                Match MVP
              </Text>
              <Icon name="trophy" size={16} color={Theme.colors.accent} />
            </View>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-accentDim border border-accentBorder/50">
                  <Icon name="profile" size={20} color={Theme.colors.accent} />
                </View>
                <View>
                  <Text className="text-[9px] font-bold text-textTertiary uppercase tracking-wider mb-0.5">Highest Scorer</Text>
                  <Text className="text-sm font-bold text-textPrimary">
                    {topScorer.username || topScorer.display_name}
                  </Text>
                </View>
              </View>
              <View className="items-end bg-bgSurface1 px-3 py-2 rounded-xl border border-bgBorder">
                <Text className="text-lg font-black text-accent">{topScorer.total_points}</Text>
                <Text className="text-[9px] text-textSecondary uppercase tracking-widest font-bold">PTS</Text>
              </View>
            </View>
          </View>
        )}
    </View>
  );
}

interface BreakdownRowProps {
  label: string;
  value: number;
}

function BreakdownRow({ label, value }: BreakdownRowProps): React.JSX.Element {
  const earned = value > 0;
  return (
    <View className="flex-row items-center justify-between mb-1.5">
      <Text className="text-xs font-medium text-textSecondary">{label}</Text>
      <Text className={`text-xs font-bold ${earned ? 'text-success' : 'text-textTertiary'}`}>
        {earned ? `+${value}` : '0'}
      </Text>
    </View>
  );
}

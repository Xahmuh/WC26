import { Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import Theme from '@/constants/theme/design-system';
import { POINTS } from '@/lib/scoring';
import { useMatchTopScorer } from '@/hooks/usePoints';
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
  const hasScore = match.home_score !== null && match.away_score !== null;
  const topScorerQuery = useMatchTopScorer(match.id);
  const topScorer = topScorerQuery.data;

  return (
    <View className="gap-4 rounded-2xl border border-bgBorder bg-bgSurface2 p-4">
      <View className="items-center gap-1">
        <Text className="text-xs font-medium uppercase tracking-wide text-textTertiary">
          Final score
        </Text>
        <Text className="text-3xl font-bold text-textPrimary">
          {hasScore ? `${match.home_score} – ${match.away_score}` : 'Awaiting result'}
        </Text>
      </View>

      {!prediction ? (
        <Text className="text-center text-sm text-textSecondary">
          You did not submit a prediction for this match.
        </Text>
      ) : (
        <>
          <View className="flex-row items-center justify-between border-t border-bgBorder pt-3">
            <Text className="text-sm text-textSecondary">Your prediction</Text>
            <Text className="text-sm font-semibold text-textPrimary">
              {prediction.pred_home_score} – {prediction.pred_away_score}
            </Text>
          </View>

          {points ? (
            <View className="gap-2">
              <BreakdownRow
                label="Correct result"
                value={points.winner_points}
                max={POINTS.WINNER}
              />
              <BreakdownRow
                label="Home goals"
                value={points.home_goal_points}
                max={POINTS.HOME_GOAL}
              />
              <BreakdownRow
                label="Away goals"
                value={points.away_goal_points}
                max={POINTS.AWAY_GOAL}
              />
              <BreakdownRow
                label="Exact-score bonus"
                value={points.exact_bonus}
                max={POINTS.EXACT_BONUS}
              />
              <View className="mt-1 flex-row items-center justify-between border-t border-bgBorder pt-3">
                <Text className="text-base font-bold text-textPrimary">Total</Text>
                <View className="flex-row items-center gap-1">
                  <Text className="text-base font-bold text-success">{points.total_points} pts</Text>
                  {points.total_points > 0 ? (
                    <Icon name="target" size={15} color={Theme.colors.success} />
                  ) : null}
                </View>
              </View>
            </View>
          ) : (
            <Text className="text-center text-xs text-textTertiary">
              Points are being calculated…
            </Text>
          )}
        </>
      )}

      {/* Match MVP Section */}
      {topScorer && (
        <View className="mt-4 pt-4 border-t border-bgBorder">
          <Text className="text-xs font-semibold text-textSecondary uppercase tracking-wide mb-3">
            Match MVP 🏆
          </Text>
          <View className="flex-row items-center justify-between rounded-xl bg-bgSurface p-3">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-accentDim border border-bgBorder">
                <Icon name="profile" size={18} color={Theme.colors.accent} />
              </View>
              <View>
                <Text className="text-xs text-textTertiary">Highest Scorer</Text>
                <Text className="text-sm font-bold text-textPrimary">
                  {topScorer.display_name}
                </Text>
              </View>
            </View>
            <View className="items-end">
              <Text className="text-lg font-bold text-accent">{topScorer.total_points}</Text>
              <Text className="text-[10px] text-textSecondary uppercase tracking-wider font-medium">Points</Text>
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
  max: number;
}

function BreakdownRow({ label, value, max }: BreakdownRowProps): React.JSX.Element {
  const earned = value > 0;
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-sm text-textSecondary">{label}</Text>
      <Text className={`text-sm font-semibold ${earned ? 'text-success' : 'text-textTertiary'}`}>
        {earned ? `+${value}` : '0'} / {max}
      </Text>
    </View>
  );
}

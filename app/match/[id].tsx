import { ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PredictionForm } from '@/components/prediction/PredictionForm';
import { PredictionResult } from '@/components/prediction/PredictionResult';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ErrorState } from '@/components/ui/States';
import { TeamFlag } from '@/components/ui/TeamFlag';
import Theme from '@/constants/theme/design-system';
import { Container } from '@/components/ui/Container';
import { useScoringRules } from '@/hooks/useAdmin';
import { useMatch } from '@/hooks/useMatches';
import { useMyPoints } from '@/hooks/usePoints';
import { useMyPredictions } from '@/hooks/usePredictions';
import { isFinishedLike, isNotStartedMatch } from '@/components/home/homeUtils';
import { STAGE_LABELS } from '@/lib/constants';
import { formatKickoff } from '@/lib/dates';

export default function MatchDetailScreen(): React.JSX.Element {
  const params = useLocalSearchParams<{ id: string }>();
  const matchId = typeof params.id === 'string' ? params.id : undefined;

  const matchQuery = useMatch(matchId);
  const predictionsQuery = useMyPredictions();
  const pointsQuery = useMyPoints();
  const rulesQuery = useScoringRules();

  if (matchQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-bgDeep" edges={['top', 'bottom']}>
        <ScreenHeader title="Match Details" fallback="/(tabs)/matches" />
        <LoadingSpinner fullScreen label="Loading match…" />
      </SafeAreaView>
    );
  }

  if (matchQuery.isError) {
    return (
      <SafeAreaView className="flex-1 bg-bgDeep" edges={['top', 'bottom']}>
        <ScreenHeader title="Match Details" fallback="/(tabs)/matches" />
        <ErrorState
          message={matchQuery.error.message}
          onRetry={() => void matchQuery.refetch()}
        />
      </SafeAreaView>
    );
  }

  const match = matchQuery.data;
  if (!match) {
    return (
      <SafeAreaView className="flex-1 bg-bgDeep" edges={['top', 'bottom']}>
        <ScreenHeader title="Match Details" fallback="/(tabs)/matches" />
        <ErrorState message="This match could not be found." />
      </SafeAreaView>
    );
  }

  const prediction = predictionsQuery.data?.get(match.id);
  const points = pointsQuery.data?.get(match.id);
  const isFinished = isFinishedLike(match.status);
  const isPredictionOpen = isNotStartedMatch(match.status, match.kickoff_time);
  const headerTitle = match.is_placeholder
    ? 'Match Details'
    : `${match.home_team.short_name ?? match.home_team.name} vs ${match.away_team.short_name ?? match.away_team.name}`;

  return (
    <SafeAreaView className="flex-1 bg-bgDeep" edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title={headerTitle}
        subtitle={isFinished ? 'Final result' : isPredictionOpen ? 'Make your prediction' : 'Predictions closed'}
        fallback="/(tabs)/matches"
      />
      <ScrollView contentContainerClassName="pb-10 pt-4">
        <Container nested className="px-4">
          <View className="gap-5">
            {/* Header */}
            <View className="items-center gap-3 rounded-2xl border border-bgBorder bg-bgSurface2 p-5">
              <View className="flex-row items-center justify-between gap-4">
                <View className="flex-1 items-center gap-2">
                  <TeamFlag team={match.home_team} size={48} />
                  <Text className="text-center text-sm font-semibold text-textPrimary">
                    {match.home_team.name}
                  </Text>
                </View>

                <View className="items-center gap-1 px-2">
                  {isFinished &&
                  match.home_score !== null &&
                  match.away_score !== null ? (
                    <Text className="text-2xl font-bold text-textPrimary">
                      {match.home_score} – {match.away_score}
                    </Text>
                  ) : (
                    <Text className="text-lg font-semibold text-textTertiary">vs</Text>
                  )}
                </View>

                <View className="flex-1 items-center gap-2">
                  <TeamFlag team={match.away_team} size={48} />
                  <Text className="text-center text-sm font-semibold text-textPrimary">
                    {match.away_team.name}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-2">
                <Badge label={STAGE_LABELS[match.stage]} tone="info" />
                {match.is_placeholder && (
                  <View className="rounded bg-accentDim px-2 py-0.5 border border-accentBorder/50">
                    <Text className="text-[10px] font-bold text-accent uppercase">TBD</Text>
                  </View>
                )}
              </View>
              <Text className="text-xs text-textSecondary">
                {formatKickoff(match.kickoff_time)}
              </Text>
              {match.venue ? (
                <View className="flex-row items-center gap-1">
                  <Icon name="stadium" size={12} color={Theme.colors.textTertiary} />
                  <Text className="text-xs text-textTertiary">{match.venue}</Text>
                </View>
              ) : null}
            </View>

            {/* Potential points — shows what's at stake before kickoff */}
            {isPredictionOpen && !match.is_placeholder && rulesQuery.data ? (
              <PotentialPoints
                winnerPoints={rulesQuery.data.winnerPoints * match.points_multiplier}
                exactPoints={rulesQuery.data.exactBonusPoints * match.points_multiplier}
                multiplier={match.points_multiplier}
              />
            ) : null}

            {/* Prediction or result */}
            {match.is_placeholder ? (
              <View className="items-center gap-2 rounded-2xl border border-bgBorder bg-bgSurface2 p-5">
                <Text className="text-sm font-semibold text-textPrimary">Knockout match — TBD</Text>
                <Text className="text-xs text-textSecondary text-center">
                  Teams for this knockout stage match have not been decided yet.
                  Predictions will open once both teams are confirmed.
                </Text>
              </View>
            ) : isFinished ? (
              <PredictionResult match={match} prediction={prediction} points={points} />
            ) : (
              <PredictionForm match={match} existing={prediction} />
            )}
          </View>
        </Container>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Potential points ─────────────────────────────────────────────────────────

interface PotentialPointsProps {
  /** Points for picking the correct winner/draw — own aspect value, already × this match's multiplier. */
  winnerPoints: number;
  /** The exact-score bonus — own aspect value, already × this match's multiplier (not combined with winner points). */
  exactPoints: number;
  multiplier: number;
}

/**
 * Shows what each scoring aspect is worth on THIS match — i.e. the
 * admin-configured per-aspect value scaled by this match's stage multiplier.
 * Each aspect stays independent (no "winner + bonus" combining): a 4x match
 * with winner=3/exact=5 shows +12 and +20, not (3+5)×4=32.
 */
function PotentialPoints({ winnerPoints, exactPoints, multiplier }: PotentialPointsProps): React.JSX.Element {
  return (
    <View className="gap-3 rounded-2xl border border-bgBorder bg-bgSurface2 p-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <Icon name="target" size={14} color={Theme.colors.accent} />
          <Text className="text-sm font-semibold text-textPrimary">Points up for grabs</Text>
        </View>
        {multiplier > 1 && (
          <View className="flex-row items-center gap-1 rounded-full bg-accentDim px-2 py-1 border border-accentBorder/50">
            <Icon name="zap" size={11} color={Theme.colors.accent} />
            <Text className="text-[10px] font-bold text-accent uppercase">{multiplier}x</Text>
          </View>
        )}
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1 items-center gap-1 rounded-xl border border-accent/35 bg-accent p-3">
          <Text className="text-xl font-extrabold text-accentDark">+{winnerPoints}</Text>
          <Text className="text-center text-[10px] uppercase tracking-wide text-accentDark/80">
            Correct winner / draw
          </Text>
        </View>
        <View className="flex-1 items-center gap-1 rounded-xl border border-accent/35 bg-accent p-3">
          <Text className="text-xl font-extrabold text-accentDark">+{exactPoints}</Text>
          <Text className="text-center text-[10px] uppercase tracking-wide text-accentDark/80">
            Exact score bonus
          </Text>
        </View>
      </View>

      <Text className="text-[11px] text-textTertiary text-center">
        Nail the exact scoreline to earn both — winner points plus the exact-score bonus.
      </Text>
    </View>
  );
}

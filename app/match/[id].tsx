import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PredictionForm } from '@/components/prediction/PredictionForm';
import { PredictionResult } from '@/components/prediction/PredictionResult';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { LiveBadge } from '@/components/ui/LiveBadge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ErrorState } from '@/components/ui/States';
import { TeamFlag } from '@/components/ui/TeamFlag';
import Theme from '@/constants/theme/design-system';
import { Container } from '@/components/ui/Container';
import { useScoringRules } from '@/hooks/useAdmin';
import { useMatch, useMatches } from '@/hooks/useMatches';
import { useMyPoints } from '@/hooks/usePoints';
import { useMyPredictions } from '@/hooks/usePredictions';
import { isFinishedLike, isNotStartedMatch, isOpenPredictionMatch } from '@/components/home/homeUtils';
import { STAGE_LABELS } from '@/lib/constants';
import { formatKickoff } from '@/lib/dates';
import { isLiveMatchStatus, shouldShowMatchScore } from '@/lib/matchStatus';

export default function MatchDetailScreen(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const matchId = typeof params.id === 'string' ? params.id : undefined;

  const matchQuery = useMatch(matchId);
  const matchesQuery = useMatches();
  const predictionsQuery = useMyPredictions();
  const pointsQuery = useMyPoints();
  const rulesQuery = useScoringRules();
  const [showNextMatchCta, setShowNextMatchCta] = useState(false);

  useEffect(() => {
    setShowNextMatchCta(false);
  }, [matchId]);

  const nextPredictableMatchId = useMemo(() => {
    const currentMatch = matchQuery.data;
    const matches = matchesQuery.data;
    if (!currentMatch || !matches?.length) return null;

    const currentKickoff = new Date(currentMatch.kickoff_time).getTime();
    const openMatches = matches
      .filter((candidate) => candidate.id !== currentMatch.id && isOpenPredictionMatch(candidate))
      .sort((a, b) => new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime());

    const predictions = predictionsQuery.data;
    const pendingMatches = predictions
      ? openMatches.filter((candidate) => !predictions.has(candidate.id))
      : openMatches;
    const candidates = pendingMatches.length > 0 ? pendingMatches : openMatches;

    return (
      candidates.find((candidate) => new Date(candidate.kickoff_time).getTime() >= currentKickoff)?.id ??
      candidates[0]?.id ??
      null
    );
  }, [matchQuery.data, matchesQuery.data, predictionsQuery.data]);

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
  const isLive = isLiveMatchStatus(match.status);
  const isPredictionOpen = isNotStartedMatch(match.status, match.kickoff_time);
  const showScore =
    shouldShowMatchScore(match.status) &&
    match.home_score !== null &&
    match.away_score !== null;
  const headerTitle = match.is_placeholder
    ? 'Match Details'
    : `${match.home_team.short_name ?? match.home_team.name} vs ${match.away_team.short_name ?? match.away_team.name}`;

  return (
    <SafeAreaView className="flex-1 bg-bgDeep" edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title={headerTitle}
        subtitle={isFinished ? 'Final result' : isLive ? 'Live now' : isPredictionOpen ? 'Make your prediction' : 'Predictions closed'}
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
                  {showScore ? (
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
                {isLive ? <LiveBadge /> : null}
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
              <PredictionForm
                match={match}
                existing={prediction}
                onSaved={() => setShowNextMatchCta(true)}
                onEditStart={() => setShowNextMatchCta(false)}
                onSkipPrediction={
                  nextPredictableMatchId && !prediction
                    ? () => {
                        router.push(`/match/${nextPredictableMatchId}` as never);
                      }
                    : undefined
                }
              />
            )}

            {showNextMatchCta && !match.is_placeholder ? (
              <View className="gap-3 rounded-2xl border border-accentBorder/60 bg-accentDim p-3">
                <View className="flex-row items-center gap-2">
                  <Icon name="checkCircle" size={16} color={Theme.colors.accent} />
                  <Text className="min-w-0 flex-1 text-xs font-bold uppercase tracking-wide text-accent">
                    Prediction saved
                  </Text>
                </View>
                <View className="gap-3">
                  {nextPredictableMatchId ? (
                    <View>
                      <Button
                        label="Predict Next Match"
                        variant="lime"
                        onPress={() => {
                          router.push(`/match/${nextPredictableMatchId}` as never);
                        }}
                      />
                    </View>
                  ) : null}
                  <View>
                    <Button
                      label="Back to Home"
                      variant="ghost"
                      onPress={() => {
                        router.replace('/(tabs)/home' as never);
                      }}
                    />
                  </View>
                </View>
              </View>
            ) : null}
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
 * Each aspect stays independent in the preview; exact-score totals combine
 * winner points plus the exact-score bonus when the match is scored.
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

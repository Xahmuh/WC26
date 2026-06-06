import { ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PredictionForm } from '@/components/prediction/PredictionForm';
import { PredictionResult } from '@/components/prediction/PredictionResult';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorState } from '@/components/ui/States';
import { TeamFlag } from '@/components/ui/TeamFlag';
import Theme from '@/constants/theme/design-system';
import { useMatch } from '@/hooks/useMatches';
import { useMyPoints } from '@/hooks/usePoints';
import { useMyPredictions } from '@/hooks/usePredictions';
import { STAGE_LABELS } from '@/lib/constants';
import { formatKickoff } from '@/lib/dates';

export default function MatchDetailScreen(): React.JSX.Element {
  const params = useLocalSearchParams<{ id: string }>();
  const matchId = typeof params.id === 'string' ? params.id : undefined;

  const matchQuery = useMatch(matchId);
  const predictionsQuery = useMyPredictions();
  const pointsQuery = useMyPoints();

  if (matchQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-bgDeep" edges={['bottom']}>
        <LoadingSpinner fullScreen label="Loading match…" />
      </SafeAreaView>
    );
  }

  if (matchQuery.isError) {
    return (
      <SafeAreaView className="flex-1 bg-bgDeep" edges={['bottom']}>
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
      <SafeAreaView className="flex-1 bg-bgDeep" edges={['bottom']}>
        <ErrorState message="This match could not be found." />
      </SafeAreaView>
    );
  }

  const prediction = predictionsQuery.data?.get(match.id);
  const points = pointsQuery.data?.get(match.id);
  const isFinished = match.status === 'FINISHED';

  return (
    <SafeAreaView className="flex-1 bg-bgDeep" edges={['bottom']}>
      <Stack.Screen options={{ title: STAGE_LABELS[match.stage] }} />
      <ScrollView contentContainerClassName="px-6 pb-10 pt-4 gap-5">
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
      </ScrollView>
    </SafeAreaView>
  );
}

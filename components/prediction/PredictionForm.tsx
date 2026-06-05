import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ScoreStepper } from '@/components/prediction/ScoreStepper';
import Theme from '@/constants/theme/design-system';
import { useCountdown } from '@/hooks/useCountdown';
import { useSubmitPrediction } from '@/hooks/usePredictions';
import { formatCountdown } from '@/lib/dates';
import type { Match, Prediction } from '@/types';

interface PredictionFormProps {
  match: Match;
  existing?: Prediction;
}

/**
 * Lets the user pick a scoreline before kickoff. Disabled once the match is
 * locked or has started. Submits optimistically via useSubmitPrediction.
 */
export function PredictionForm({
  match,
  existing,
}: PredictionFormProps): React.JSX.Element {
  const [home, setHome] = useState<number>(existing?.pred_home_score ?? 0);
  const [away, setAway] = useState<number>(existing?.pred_away_score ?? 0);
  const [justSaved, setJustSaved] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(!existing);

  const countdown = useCountdown(match.kickoff_time);
  const mutation = useSubmitPrediction();

  // Keep local state in sync if the existing prediction loads/changes.
  useEffect(() => {
    if (existing) {
      setHome(existing.pred_home_score);
      setAway(existing.pred_away_score);
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  }, [existing?.pred_home_score, existing?.pred_away_score, existing]);

  const locked = existing?.is_locked ?? false;
  const kickedOff = countdown.isElapsed || match.status !== 'SCHEDULED';
  const disabled = locked || kickedOff;

  const unchanged =
    existing != null &&
    existing.pred_home_score === home &&
    existing.pred_away_score === away;

  const handleSubmit = (): void => {
    setJustSaved(false);
    mutation.mutate(
      { matchId: match.id, predHome: home, predAway: away },
      {
        onSuccess: () => {
          setJustSaved(true);
          setIsEditing(false);
        },
      }
    );
  };

  if (disabled) {
    return (
      <View className="gap-2 rounded-2xl border border-bgBorder bg-bgSurface2 p-4">
        <Text className="text-sm font-semibold text-textPrimary">
          Predictions are closed
        </Text>
        <Text className="text-sm text-textSecondary">
          This match has kicked off, so picks are locked.
          {existing
            ? ` Your prediction: ${existing.pred_home_score}–${existing.pred_away_score}.`
            : ' You did not submit a prediction.'}
        </Text>
      </View>
    );
  }

  if (!isEditing && existing) {
    return (
      <View className="gap-4 rounded-2xl border border-bgBorder bg-bgSurface2 p-5 items-center">
        <View className="flex-row items-center gap-1.5 self-start">
          <Icon name="lock" size={16} color={Theme.colors.accent} />
          <Text className="text-xs font-bold text-accent uppercase tracking-wider">
            Prediction Locked & Saved
          </Text>
        </View>

        <View className="flex-row items-center justify-center gap-6 my-2">
          <View className="items-center">
            <Text className="text-[10px] text-textSecondary uppercase font-medium">
              {match.home_team.code || match.home_team.short_name}
            </Text>
            <Text className="text-4xl font-bold text-textPrimary mt-1">{home}</Text>
          </View>
          <Text className="text-2xl font-bold text-textTertiary">:</Text>
          <View className="items-center">
            <Text className="text-[10px] text-textSecondary uppercase font-medium">
              {match.away_team.code || match.away_team.short_name}
            </Text>
            <Text className="text-4xl font-bold text-textPrimary mt-1">{away}</Text>
          </View>
        </View>

        {justSaved && (
          <Text className="text-xs text-success font-medium">✓ Prediction updated successfully</Text>
        )}

        <Text className="text-xs text-textSecondary text-center">
          Match starts in {formatCountdown(countdown)}
        </Text>

        <Button
          label="Change Prediction"
          onPress={() => {
            setJustSaved(false);
            setIsEditing(true);
          }}
          className="w-full mt-2"
          variant="secondary"
        />
      </View>
    );
  }

  return (
    <View className="gap-4 rounded-2xl border border-bgBorder bg-bgSurface2 p-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-textPrimary">
          {existing ? 'Update your prediction' : 'Make your prediction'}
        </Text>
        <Text className="text-xs font-medium text-warning">
          Closes in {formatCountdown(countdown)}
        </Text>
      </View>

      <View className="flex-row items-start justify-center gap-6">
        <ScoreStepper
          label={match.home_team.code ?? match.home_team.short_name ?? 'Home'}
          value={home}
          onChange={setHome}
          disabled={mutation.isPending}
        />
        <Text className="mt-9 text-xl font-bold text-textTertiary">:</Text>
        <ScoreStepper
          label={match.away_team.code ?? match.away_team.short_name ?? 'Away'}
          value={away}
          onChange={setAway}
          disabled={mutation.isPending}
        />
      </View>

      {mutation.isError ? (
        <Text className="text-center text-xs text-live">
          {mutation.error.message}
        </Text>
      ) : null}

      {justSaved && !mutation.isError ? (
        <View className="flex-row items-center justify-center gap-1">
          <Icon name="check" size={14} color={Theme.colors.success} />
          <Text className="text-center text-xs text-success">Prediction saved</Text>
        </View>
      ) : null}

      <Button
        label={existing ? 'Update prediction' : 'Submit prediction'}
        onPress={handleSubmit}
        loading={mutation.isPending}
        disabled={unchanged}
      />

      {existing && (
        <Button
          label="Cancel"
          variant="ghost"
          onPress={() => {
            setHome(existing.pred_home_score);
            setAway(existing.pred_away_score);
            setIsEditing(false);
          }}
          className="mt-1"
        />
      )}
    </View>
  );
}

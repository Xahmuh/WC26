import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { MultiplierBadge } from '@/components/ui/MultiplierBadge';
import { ScoreStepper } from '@/components/prediction/ScoreStepper';
import Theme from '@/constants/theme/design-system';
import { useCountdown } from '@/hooks/useCountdown';
import { useSubmitPrediction } from '@/hooks/usePredictions';
import { isStageInCardWindow, useMyCards } from '@/hooks/useUserCards';
import { isNotStartedMatch } from '@/components/home/homeUtils';
import { STAGE_LABELS } from '@/lib/constants';
import { formatCountdown } from '@/lib/dates';
import type { Match, Prediction, Team, UserCard } from '@/types';

interface PredictionFormProps {
  match: Match;
  existing?: Prediction;
}

function teamNameById(match: Match, teamId: string | null | undefined): string | null {
  if (!teamId) return null;
  if (teamId === match.home_team.id) return match.home_team.name;
  if (teamId === match.away_team.id) return match.away_team.name;
  return null;
}

function QualifierButton({
  team,
  selected,
  disabled,
  onPress,
}: {
  team: Team;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !team.id}
      className={`flex-1 rounded-xl border p-3 ${
        selected ? 'border-accent bg-accentDim' : 'border-bgBorder bg-bgSurface1'
      }`}
    >
      <Text
        className={`text-center text-xs font-bold ${
          selected ? 'text-accent' : 'text-textSecondary'
        }`}
        numberOfLines={1}
      >
        {team.name}
      </Text>
    </Pressable>
  );
}

function cardDisplayName(card: UserCard): string {
  return card.definition?.name ?? 'Stage Card';
}

function cardWindowLabel(card: UserCard): string {
  return `${STAGE_LABELS[card.usable_from_stage]} to ${STAGE_LABELS[card.usable_until_stage]}`;
}

function CardBoostSummary({
  card,
  baseMultiplier,
}: {
  card: UserCard;
  baseMultiplier: number;
}): React.JSX.Element {
  return (
    <View className="w-full rounded-xl border border-accentBorder/40 bg-accentDim px-3 py-2">
      <View className="flex-row items-center justify-between gap-2">
        <View className="min-w-0 flex-1">
          <Text className="text-xs font-bold text-accent" numberOfLines={1}>
            {cardDisplayName(card)}
          </Text>
          <Text className="mt-0.5 text-[10px] text-textSecondary" numberOfLines={1}>
            +{card.multiplier_bonus} boost - {card.uses_remaining}/{card.max_uses} uses left
          </Text>
        </View>
        <MultiplierBadge value={baseMultiplier + card.multiplier_bonus} size="sm" />
      </View>
    </View>
  );
}

function CardBoostPicker({
  cards,
  selectedCardId,
  baseMultiplier,
  disabled,
  onSelect,
}: {
  cards: UserCard[];
  selectedCardId: string | null;
  baseMultiplier: number;
  disabled: boolean;
  onSelect: (cardId: string | null) => void;
}): React.JSX.Element | null {
  if (cards.length === 0) return null;

  return (
    <View className="gap-2 rounded-xl border border-bgBorder bg-bgSurface1 p-3">
      <View className="flex-row items-center justify-between gap-2">
        <View className="min-w-0 flex-1">
          <Text className="text-xs font-bold text-textSecondary uppercase">Card boost</Text>
          <Text className="mt-1 text-[11px] text-textTertiary">
            Pick one card to boost this match multiplier.
          </Text>
        </View>
        <MultiplierBadge
          value={
            baseMultiplier +
            (cards.find((card) => card.id === selectedCardId)?.multiplier_bonus ?? 0)
          }
          size="sm"
        />
      </View>

      <Pressable
        onPress={() => onSelect(null)}
        disabled={disabled}
        className={`rounded-lg border px-3 py-2 ${
          selectedCardId === null ? 'border-accent bg-accentDim' : 'border-bgBorder bg-bgSurface2'
        }`}
      >
        <Text
          className={`text-xs font-bold ${
            selectedCardId === null ? 'text-accent' : 'text-textSecondary'
          }`}
        >
          No card
        </Text>
      </Pressable>

      {cards.map((card) => {
        const selected = card.id === selectedCardId;
        return (
          <Pressable
            key={card.id}
            onPress={() => onSelect(selected ? null : card.id)}
            disabled={disabled}
            className={`rounded-lg border px-3 py-2 ${
              selected ? 'border-accent bg-accentDim' : 'border-bgBorder bg-bgSurface2'
            }`}
          >
            <View className="flex-row items-center justify-between gap-3">
              <View className="min-w-0 flex-1">
                <Text
                  className={`text-xs font-bold ${
                    selected ? 'text-accent' : 'text-textPrimary'
                  }`}
                  numberOfLines={1}
                >
                  {cardDisplayName(card)}
                </Text>
                <Text className="mt-1 text-[10px] text-textTertiary" numberOfLines={1}>
                  {cardWindowLabel(card)} - {card.uses_remaining}/{card.max_uses} uses
                </Text>
              </View>
              <Text className="text-xs font-black text-accent">
                X{baseMultiplier + card.multiplier_bonus}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Lets the user pick a 90-minute scoreline before kickoff. For knockout
 * fixtures, the qualifying team is stored separately from the score.
 */
export function PredictionForm({
  match,
  existing,
}: PredictionFormProps): React.JSX.Element {
  const [home, setHome] = useState<number>(existing?.pred_home_score ?? 0);
  const [away, setAway] = useState<number>(existing?.pred_away_score ?? 0);
  const [winnerTeamId, setWinnerTeamId] = useState<string | null>(
    existing?.pred_winner_team_id ?? null
  );
  const [selectedCardId, setSelectedCardId] = useState<string | null>(
    existing?.applied_user_card_id ?? null
  );
  const [justSaved, setJustSaved] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(!existing);

  const countdown = useCountdown(match.kickoff_time);
  const mutation = useSubmitPrediction();
  const cardsQuery = useMyCards();
  const isDrawPrediction = home === away;
  const showQualifierPicker = match.is_knockout && isDrawPrediction;
  const inferredWinnerTeamId = match.is_knockout
    ? home > away
      ? match.home_team.id
      : match.away_team.id
    : null;
  const selectedWinnerTeamId = showQualifierPicker ? winnerTeamId : inferredWinnerTeamId;

  useEffect(() => {
    if (existing) {
      setHome(existing.pred_home_score);
      setAway(existing.pred_away_score);
      setWinnerTeamId(existing.pred_winner_team_id);
      setSelectedCardId(existing.applied_user_card_id);
      setIsEditing(false);
    } else {
      setWinnerTeamId(null);
      setSelectedCardId(null);
      setIsEditing(true);
    }
  }, [
    existing?.pred_home_score,
    existing?.pred_away_score,
    existing?.pred_winner_team_id,
    existing?.applied_user_card_id,
    existing,
  ]);

  useEffect(() => {
    if (!match.is_knockout) return;
    if (!showQualifierPicker) {
      setWinnerTeamId(inferredWinnerTeamId);
    }
  }, [inferredWinnerTeamId, match.is_knockout, showQualifierPicker]);

  const locked = existing?.is_locked ?? false;
  const predictionWindowOpen = isNotStartedMatch(match.status, match.kickoff_time);
  const disabled = locked || !predictionWindowOpen;
  const qualifierName = teamNameById(match, selectedWinnerTeamId);
  const allCards = useMemo(() => cardsQuery.data ?? [], [cardsQuery.data]);
  const cardOptions = useMemo(() => {
    const currentCardId = existing?.applied_user_card_id ?? null;
    return allCards.filter((card) => {
      const isCurrentPredictionCard = currentCardId === card.id;
      const isWithinWindow = isStageInCardWindow(
        match.stage,
        card.usable_from_stage,
        card.usable_until_stage
      );
      return isWithinWindow && (isCurrentPredictionCard || (card.status === 'active' && card.uses_remaining > 0));
    });
  }, [allCards, existing?.applied_user_card_id, match.stage]);
  const selectedCard =
    cardOptions.find((card) => card.id === selectedCardId) ??
    allCards.find((card) => card.id === selectedCardId) ??
    null;
  const effectiveMultiplier = match.points_multiplier + (selectedCard?.multiplier_bonus ?? 0);

  const unchanged =
    existing != null &&
    existing.pred_home_score === home &&
    existing.pred_away_score === away &&
    existing.pred_winner_team_id === winnerTeamId &&
    existing.applied_user_card_id === selectedCardId;

  const handleSubmit = (): void => {
    if (showQualifierPicker && !winnerTeamId) {
      Alert.alert(
        'Qualifier required',
        'Knockout matches cannot end in a draw. Please select the team that qualifies.'
      );
      return;
    }

    setJustSaved(false);
    mutation.mutate(
      {
        matchId: match.id,
        predHome: home,
        predAway: away,
        predWinnerTeamId: match.is_knockout ? selectedWinnerTeamId : null,
        appliedUserCardId: selectedCardId,
      },
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
        <View className="flex-row flex-wrap items-center justify-between gap-2">
          <Text className="text-sm font-semibold text-textPrimary">
            Predictions are closed
          </Text>
          <MultiplierBadge value={effectiveMultiplier} size="sm" />
        </View>
        <Text className="text-sm text-textSecondary">
          This match is no longer open for picks.
          {existing
            ? ` Your prediction: ${existing.pred_home_score}–${existing.pred_away_score}${
                showQualifierPicker && qualifierName ? `, ${qualifierName} qualifies` : ''
              }.`
            : ' You did not submit a prediction.'}
        </Text>
        {existing && selectedCard ? (
          <CardBoostSummary card={selectedCard} baseMultiplier={match.points_multiplier} />
        ) : null}
      </View>
    );
  }

  if (!isEditing && existing) {
    return (
      <View className="gap-4 rounded-2xl border border-bgBorder bg-bgSurface2 p-5 items-center">
        <View className="w-full flex-row flex-wrap items-center justify-between gap-2">
          <View className="min-w-0 flex-1 flex-row items-center gap-1.5">
            <Icon name="lock" size={16} color={Theme.colors.accent} />
            <Text className="min-w-0 flex-shrink text-xs font-bold text-accent uppercase tracking-wider">
              Prediction Locked & Saved
            </Text>
          </View>
          <MultiplierBadge value={effectiveMultiplier} size="sm" />
        </View>

        <View className="flex-row items-center justify-center gap-6 my-2">
          <View className="items-center">
            <Text className="text-[10px] text-textSecondary uppercase font-medium">
              {match.home_team.code ?? match.home_team.short_name ?? 'Home'}
            </Text>
            <Text className="text-4xl font-bold text-textPrimary mt-1">{home}</Text>
          </View>
          <Text className="text-2xl font-bold text-textTertiary">:</Text>
          <View className="items-center">
            <Text className="text-[10px] text-textSecondary uppercase font-medium">
              {match.away_team.code ?? match.away_team.short_name ?? 'Away'}
            </Text>
            <Text className="text-4xl font-bold text-textPrimary mt-1">{away}</Text>
          </View>
        </View>

        {showQualifierPicker && qualifierName ? (
          <Text className="text-xs font-bold text-accent text-center">
            Qualifier: {qualifierName}
          </Text>
        ) : null}

        {selectedCard ? (
          <CardBoostSummary card={selectedCard} baseMultiplier={match.points_multiplier} />
        ) : null}

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
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <Text className="min-w-0 flex-shrink text-sm font-semibold text-textPrimary">
          {existing ? 'Update your prediction' : 'Make your prediction'}
        </Text>
        <View className="flex-row items-center gap-2">
          <Text className="text-xs font-medium text-warning">
            Closes in {formatCountdown(countdown)}
          </Text>
          <MultiplierBadge value={effectiveMultiplier} size="sm" />
        </View>
      </View>

      <View className="flex-row items-center justify-center gap-6">
        <ScoreStepper
          label={match.home_team.code ?? match.home_team.short_name ?? 'Home'}
          value={home}
          onChange={setHome}
          disabled={mutation.isPending}
        />
        <Text className="text-2xl font-bold text-textTertiary mt-4">:</Text>
        <ScoreStepper
          label={match.away_team.code ?? match.away_team.short_name ?? 'Away'}
          value={away}
          onChange={setAway}
          disabled={mutation.isPending}
        />
      </View>

      {showQualifierPicker ? (
        <View className="gap-2">
          <View className="rounded-xl border border-warning/40 bg-warning/10 p-3">
            <Text className="text-xs font-semibold text-warning">
              Knockout matches cannot end in a draw. Please select the team that qualifies.
            </Text>
          </View>
          <Text className="text-xs font-bold text-textSecondary uppercase">
            Qualifying team
          </Text>
          <View className="flex-row gap-2">
            <QualifierButton
              team={match.home_team}
              selected={winnerTeamId === match.home_team.id}
              disabled={mutation.isPending}
              onPress={() => setWinnerTeamId(match.home_team.id)}
            />
            <QualifierButton
              team={match.away_team}
              selected={winnerTeamId === match.away_team.id}
              disabled={mutation.isPending}
              onPress={() => setWinnerTeamId(match.away_team.id)}
            />
          </View>
        </View>
      ) : null}

      <CardBoostPicker
        cards={cardOptions}
        selectedCardId={selectedCardId}
        baseMultiplier={match.points_multiplier}
        disabled={mutation.isPending}
        onSelect={setSelectedCardId}
      />

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
            setWinnerTeamId(existing.pred_winner_team_id);
            setSelectedCardId(existing.applied_user_card_id);
            setIsEditing(false);
          }}
          className="mt-1"
        />
      )}
    </View>
  );
}

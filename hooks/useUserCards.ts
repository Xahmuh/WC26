import { useMemo } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import {
  getCardDefinitions,
  getMyUserCards,
  isUserCardUsableForStage,
  isStageInCardWindow,
} from '@/services/cards.service';
import { useAuthStore } from '@/stores/auth.store';
import type { CardDefinition, MatchStage, UserCard } from '@/types';

export const userCardKeys = {
  all: ['userCards'] as const,
  byUser: (userId: string) => ['userCards', userId] as const,
};

export const cardDefinitionKeys = {
  all: ['cardDefinitions'] as const,
};

export function useCardCatalog(): UseQueryResult<CardDefinition[], Error> {
  const userId = useAuthStore((s) => s.session?.user.id);

  return useQuery({
    queryKey: cardDefinitionKeys.all,
    enabled: Boolean(userId),
    queryFn: getCardDefinitions,
    staleTime: 60_000,
  });
}

export function useMyCards(): UseQueryResult<UserCard[], Error> {
  const userId = useAuthStore((s) => s.session?.user.id);

  return useQuery({
    queryKey: userCardKeys.byUser(userId ?? 'anon'),
    enabled: Boolean(userId),
    queryFn: getMyUserCards,
    staleTime: 30_000,
  });
}

export function useUsableCardsForStage(stage: MatchStage): UseQueryResult<UserCard[], Error> {
  const cardsQuery = useMyCards();
  const usableCards = useMemo(
    () => (cardsQuery.data ?? []).filter((card) => isUserCardUsableForStage(card, stage)),
    [cardsQuery.data, stage]
  );

  return {
    ...cardsQuery,
    data: usableCards,
  } as UseQueryResult<UserCard[], Error>;
}

export { isUserCardUsableForStage, isStageInCardWindow };

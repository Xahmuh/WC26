import { useMemo } from 'react';

import { CARD_TYPE_CONFIG, type CardType } from '@/components/ui/CardTypeConfig';
import { useMyPoints } from '@/hooks/usePoints';
import { useUserPerformance } from '@/hooks/useUserPerformance';
import { useAuthStore } from '@/stores/auth.store';

export interface EarnedCard {
  type: CardType;
  label: string;
  count: number;
  description: string;
}

export function useEarnedCards(): {
  cards: EarnedCard[];
  totalCards: number;
  isLoading: boolean;
  error: Error | null;
} {
  const userId = useAuthStore((s) => s.session?.user.id);
  const pointsQuery = useMyPoints();
  const performanceQuery = useUserPerformance(userId);

  const cards = useMemo(() => {
    const pointRows = Array.from(pointsQuery.data?.values() ?? []);
    const correctOutcomeCount = pointRows.filter((row) => row.winner_points > 0).length;
    const exactScoreCount = pointRows.filter((row) => row.exact_bonus > 0).length;
    const shieldCount = Math.floor((performanceQuery.kpis?.streak.current_streak ?? 0) / 3);

    return [
      {
        type: 'joker',
        label: CARD_TYPE_CONFIG.joker.label,
        count: exactScoreCount,
        description: 'Won from exact score predictions.',
      },
      {
        type: 'sniper',
        label: CARD_TYPE_CONFIG.sniper.label,
        count: correctOutcomeCount,
        description: 'Won from correct winner or draw predictions.',
      },
      {
        type: 'shield',
        label: CARD_TYPE_CONFIG.shield.label,
        count: shieldCount,
        description: 'Won from every 3-result active streak.',
      },
    ] satisfies EarnedCard[];
  }, [performanceQuery.kpis?.streak.current_streak, pointsQuery.data]);

  return {
    cards,
    totalCards: cards.reduce((sum, card) => sum + card.count, 0),
    isLoading: pointsQuery.isLoading || performanceQuery.loading,
    error: pointsQuery.error ?? (performanceQuery.error ? new Error(performanceQuery.error) : null),
  };
}

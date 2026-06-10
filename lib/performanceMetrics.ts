import { safe } from '@/lib/safe';
import type { ComputedKPIs, UserPerformanceStats, UserStreak } from '@/types/performance';

export const EMPTY_PERFORMANCE_STATS: UserPerformanceStats = {
  total_predictions: 0,
  correct_predictions: 0,
  exact_predictions: 0,
  total_points: 0,
  matches_participated: 0,
};

export function computePerformanceKPIs(
  stats: UserPerformanceStats,
  streak: UserStreak,
): ComputedKPIs {
  return {
    accuracyRate: Math.round(safe(stats.correct_predictions, stats.total_predictions) * 100),
    exactScoreAccuracy: Math.round(safe(stats.exact_predictions, stats.total_predictions) * 100),
    pointsPerMatch: parseFloat(safe(stats.total_points, stats.matches_participated).toFixed(1)),
    participationRate: Math.round(safe(stats.matches_participated, stats.total_predictions) * 100),
    streak,
  };
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function computeFormScore(kpis: ComputedKPIs): number {
  return Math.round(
    clampPercent(kpis.accuracyRate) * 0.55 +
      clampPercent(kpis.participationRate) * 0.25 +
      clampPercent(kpis.exactScoreAccuracy) * 0.2
  );
}

export function getFormLabel(score: number): string {
  if (score >= 75) return 'Excellent';
  if (score >= 55) return 'Strong';
  if (score >= 35) return 'Improving';
  return 'Getting started';
}

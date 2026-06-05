// ============================================================================
// Scoring engine — pure, dependency-free functions.
// ----------------------------------------------------------------------------
// Shared logic that decides how many points a prediction earns. Kept free of
// any React Native / Deno imports so it can run in the app, in Jest, and in
// the calculate-points edge function (see supabase/functions/_shared/scoring.ts
// which mirrors this file).
//
// Scoring rules (max 14 pts/match):
//   • Correct winner (or correct draw):  +5
//   • Correct home score:                +2
//   • Correct away score:                +2
//   • Exact score (both correct):        +5 bonus
//   • Otherwise:                          0  (never negative)
// ============================================================================

import type { Outcome, PointsBreakdown } from '@/types';

export const POINTS = {
  WINNER: 5,
  HOME_GOAL: 2,
  AWAY_GOAL: 2,
  EXACT_BONUS: 5,
  /** 5 + 2 + 2 + 5 */
  MAX_PER_MATCH: 14,
} as const;

export interface Score {
  home: number;
  away: number;
}

/**
 * Returns whether a scoreline is a HOME win, AWAY win, or DRAW.
 * @throws if either score is negative or not an integer.
 */
export function getOutcome(home: number, away: number): Outcome {
  assertValidGoals(home, 'home');
  assertValidGoals(away, 'away');

  if (home > away) return 'HOME';
  if (home < away) return 'AWAY';
  return 'DRAW';
}

/**
 * Calculates the points breakdown for a single prediction against the
 * actual final score. Pure: same inputs → same output, no side effects.
 */
export function calculatePoints(
  actual: Score,
  predicted: Score
): PointsBreakdown {
  const actualOutcome = getOutcome(actual.home, actual.away);
  const predictedOutcome = getOutcome(predicted.home, predicted.away);

  const winner_points =
    actualOutcome === predictedOutcome ? POINTS.WINNER : 0;

  const home_goal_points =
    actual.home === predicted.home ? POINTS.HOME_GOAL : 0;

  const away_goal_points =
    actual.away === predicted.away ? POINTS.AWAY_GOAL : 0;

  const isExact = actual.home === predicted.home && actual.away === predicted.away;
  const exact_bonus = isExact ? POINTS.EXACT_BONUS : 0;

  const total_points =
    winner_points + home_goal_points + away_goal_points + exact_bonus;

  return {
    winner_points,
    home_goal_points,
    away_goal_points,
    exact_bonus,
    total_points,
  };
}

function assertValidGoals(value: number, label: 'home' | 'away'): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(
      `Invalid ${label} score: expected a non-negative integer, got ${value}`
    );
  }
}

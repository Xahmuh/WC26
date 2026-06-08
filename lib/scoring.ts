// ============================================================================
// Scoring engine — pure, dependency-free functions.
// ----------------------------------------------------------------------------
// Shared logic that decides how many points a prediction earns. Kept free of
// any React Native imports so it can run in the app and in Jest.
//
// Scoring rules:
//   • Correct winner/draw, or knockout qualifier: configurable base (+3 default)
//   • Exact 90-minute score: configurable bonus (+5 default)
//   • Home/away partial goal points are retained as 0-valued compatibility fields.
//   • Otherwise:                          0  (never negative)
// ============================================================================

import type { Outcome, PointsBreakdown } from '@/types';

export const POINTS = {
  WINNER: 3,
  HOME_GOAL: 0,
  AWAY_GOAL: 0,
  EXACT_BONUS: 5,
  /** 3 + 5 */
  MAX_PER_MATCH: 8,
} as const;

export interface Score {
  home: number;
  away: number;
  winnerTeamId?: string | null;
  isKnockout?: boolean;
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
    actual.isKnockout
      ? actual.winnerTeamId !== null &&
        actual.winnerTeamId !== undefined &&
        actual.winnerTeamId === predicted.winnerTeamId
        ? POINTS.WINNER
        : 0
      : actualOutcome === predictedOutcome
        ? POINTS.WINNER
        : 0;

  const home_goal_points = 0;
  const away_goal_points = 0;

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

export function calculateEffectiveMultiplier(
  matchMultiplier: number,
  cardBonus: number = 0
): number {
  assertValidMultiplier(matchMultiplier, 'match multiplier');
  assertValidMultiplier(cardBonus, 'card bonus');
  return matchMultiplier + cardBonus;
}

export function applyPointsMultiplier(
  breakdown: PointsBreakdown,
  multiplier: number
): PointsBreakdown {
  assertValidMultiplier(multiplier, 'multiplier');

  return {
    winner_points: breakdown.winner_points * multiplier,
    home_goal_points: breakdown.home_goal_points * multiplier,
    away_goal_points: breakdown.away_goal_points * multiplier,
    exact_bonus: breakdown.exact_bonus * multiplier,
    total_points: breakdown.total_points * multiplier,
  };
}

function assertValidGoals(value: number, label: 'home' | 'away'): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(
      `Invalid ${label} score: expected a non-negative integer, got ${value}`
    );
  }
}

function assertValidMultiplier(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(
      `Invalid ${label}: expected a non-negative integer, got ${value}`
    );
  }
}

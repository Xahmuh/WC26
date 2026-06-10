import type { Outcome, PointsBreakdown } from '@/types';

export interface Score {
  home: number;
  away: number;
  winnerTeamId?: string | null;
  isKnockout?: boolean;
}

export interface ScoringRuleValues {
  winnerPoints: number;
  exactBonusPoints: number;
}

export function getMaxBasePoints(rules: ScoringRuleValues): number {
  return rules.winnerPoints + rules.exactBonusPoints;
}

export function getOutcome(home: number, away: number): Outcome {
  assertValidGoals(home, 'home');
  assertValidGoals(away, 'away');

  if (home > away) return 'HOME';
  if (home < away) return 'AWAY';
  return 'DRAW';
}

export function calculatePoints(
  actual: Score,
  predicted: Score,
  rules: ScoringRuleValues
): PointsBreakdown {
  assertValidPoints(rules.winnerPoints, 'winner points');
  assertValidPoints(rules.exactBonusPoints, 'exact bonus points');

  const actualOutcome = getOutcome(actual.home, actual.away);
  const predictedOutcome = getOutcome(predicted.home, predicted.away);

  const winner_points = actual.isKnockout
    ? actual.winnerTeamId !== null &&
      actual.winnerTeamId !== undefined &&
      actual.winnerTeamId === predicted.winnerTeamId
      ? rules.winnerPoints
      : 0
    : actualOutcome === predictedOutcome
      ? rules.winnerPoints
      : 0;

  const home_goal_points = 0;
  const away_goal_points = 0;

  const isExact = actual.home === predicted.home && actual.away === predicted.away;
  const exact_bonus = isExact ? rules.exactBonusPoints : 0;
  const total_points = winner_points + home_goal_points + away_goal_points + exact_bonus;

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

function assertValidPoints(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(
      `Invalid ${label}: expected a non-negative integer, got ${value}`
    );
  }
}

// ============================================================================
// Deno copy of the scoring engine used by calculate-points.
// Must stay in sync with lib/scoring.ts (same rules, no framework imports).
// ============================================================================

export interface Score {
  home: number;
  away: number;
  winnerTeamId?: string | null;
  isKnockout?: boolean;
}

export interface PointsBreakdown {
  winner_points: number;
  home_goal_points: number;
  away_goal_points: number;
  exact_bonus: number;
  total_points: number;
}

export type Outcome = 'HOME' | 'DRAW' | 'AWAY';

export const POINTS = {
  WINNER: 3,
  HOME_GOAL: 0,
  AWAY_GOAL: 0,
  EXACT_BONUS: 5,
  MAX_PER_MATCH: 8,
} as const;

export function getOutcome(home: number, away: number): Outcome {
  if (home > away) return 'HOME';
  if (home < away) return 'AWAY';
  return 'DRAW';
}

export function calculatePoints(actual: Score, predicted: Score): PointsBreakdown {
  const winner_points =
    actual.isKnockout
      ? actual.winnerTeamId !== null &&
        actual.winnerTeamId !== undefined &&
        actual.winnerTeamId === predicted.winnerTeamId
        ? POINTS.WINNER
        : 0
      : getOutcome(actual.home, actual.away) === getOutcome(predicted.home, predicted.away)
        ? POINTS.WINNER
        : 0;

  const home_goal_points = 0;
  const away_goal_points = 0;

  const isExact = actual.home === predicted.home && actual.away === predicted.away;
  const exact_bonus = isExact ? POINTS.EXACT_BONUS : 0;

  return {
    winner_points,
    home_goal_points,
    away_goal_points,
    exact_bonus,
    total_points: winner_points + home_goal_points + away_goal_points + exact_bonus,
  };
}

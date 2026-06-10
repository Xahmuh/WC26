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

export interface ScoringRuleValues {
  winnerPoints: number;
  exactBonusPoints: number;
}

export type Outcome = 'HOME' | 'DRAW' | 'AWAY';

export function getMaxBasePoints(rules: ScoringRuleValues): number {
  return rules.winnerPoints + rules.exactBonusPoints;
}

export function getOutcome(home: number, away: number): Outcome {
  if (home > away) return 'HOME';
  if (home < away) return 'AWAY';
  return 'DRAW';
}

export function calculatePoints(
  actual: Score,
  predicted: Score,
  rules: ScoringRuleValues
): PointsBreakdown {
  const winner_points = actual.isKnockout
    ? actual.winnerTeamId !== null &&
      actual.winnerTeamId !== undefined &&
      actual.winnerTeamId === predicted.winnerTeamId
      ? rules.winnerPoints
      : 0
    : getOutcome(actual.home, actual.away) === getOutcome(predicted.home, predicted.away)
      ? rules.winnerPoints
      : 0;

  const home_goal_points = 0;
  const away_goal_points = 0;

  const isExact = actual.home === predicted.home && actual.away === predicted.away;
  const exact_bonus = isExact ? rules.exactBonusPoints : 0;

  return {
    winner_points,
    home_goal_points,
    away_goal_points,
    exact_bonus,
    total_points: winner_points + home_goal_points + away_goal_points + exact_bonus,
  };
}

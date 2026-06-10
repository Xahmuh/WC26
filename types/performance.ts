export interface UserPerformanceStats {
  total_predictions: number;
  correct_predictions: number;
  exact_predictions: number;
  total_points: number;
  matches_participated: number;
}

export interface PerformancePointsBreakdown {
  outcome_points: number;
  exact_bonus: number;
  question_points: number;
  match_points: number;
}

export interface UserStreak {
  current_streak: number;
  streak_type: 'win' | 'loss' | 'none';
}

export interface ComputedKPIs {
  accuracyRate: number;
  exactScoreAccuracy: number;
  pointsPerMatch: number;
  participationRate: number;
  streak: UserStreak;
}

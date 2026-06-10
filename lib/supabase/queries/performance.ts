import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database.types';
import type { PerformancePointsBreakdown, UserPerformanceStats, UserStreak } from '@/types/performance';

type UserPerformanceRow = Tables<'user_performance'>;
type PublicPointRow = {
  winner_points: number | null;
  exact_bonus: number | null;
  total_points: number | null;
  match_id: string | null;
};
type PublicMatchRow = {
  id: string;
  status: string;
  kickoff_time: string;
};

function mapStats(row: UserPerformanceRow): UserPerformanceStats {
  return {
    total_predictions: row.total_predictions ?? 0,
    correct_predictions: row.correct_predictions ?? 0,
    exact_predictions: row.exact_predictions ?? 0,
    total_points: row.total_points ?? 0,
    matches_participated: row.matches_participated ?? 0,
  };
}

async function fetchPublicMatchPoints(userId: string): Promise<PublicPointRow[]> {
  const { data, error } = await supabase
    .from('points')
    .select('winner_points, exact_bonus, total_points, match_id')
    .eq('user_id', userId)
    .not('match_id', 'is', null);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as PublicPointRow[];
}

async function fetchPublicUserPerformanceFromPoints(userId: string): Promise<UserPerformanceStats> {
  const points = await fetchPublicMatchPoints(userId);
  const matchIds = new Set<string>();
  let correct_predictions = 0;
  let exact_predictions = 0;
  let total_points = 0;

  points.forEach((point) => {
    if (!point.match_id) return;
    matchIds.add(point.match_id);
    if ((point.winner_points ?? 0) > 0) correct_predictions += 1;
    if ((point.exact_bonus ?? 0) > 0) exact_predictions += 1;
    total_points += point.total_points ?? 0;
  });

  const total_predictions = matchIds.size;

  return {
    total_predictions,
    correct_predictions,
    exact_predictions,
    total_points,
    matches_participated: total_predictions,
  };
}

export async function fetchUserPerformance(
  userId: string,
): Promise<UserPerformanceStats | null> {
  const { data, error } = await supabase
    .from('user_performance')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return fetchPublicUserPerformanceFromPoints(userId);
  return mapStats(data);
}

export async function fetchUserPointsBreakdown(
  userId: string,
): Promise<PerformancePointsBreakdown> {
  const { data, error } = await supabase
    .from('points')
    .select('winner_points, exact_bonus, total_points, question_id')
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message);
  }

  const breakdown: PerformancePointsBreakdown = {
    outcome_points: 0,
    exact_bonus: 0,
    question_points: 0,
    match_points: 0,
  };

  for (const point of data ?? []) {
    if (point.question_id) {
      breakdown.question_points += point.total_points ?? 0;
    } else {
      breakdown.outcome_points += point.winner_points ?? 0;
      breakdown.exact_bonus += point.exact_bonus ?? 0;
      breakdown.match_points += point.total_points ?? 0;
    }
  }

  return breakdown;
}

export async function fetchUserStreak(userId: string): Promise<UserStreak> {
  const points = await fetchPublicMatchPoints(userId);
  const matchIds = Array.from(
    new Set(points.map((point) => point.match_id).filter((id): id is string => Boolean(id)))
  );

  if (matchIds.length === 0) {
    return { current_streak: 0, streak_type: 'none' };
  }

  const { data: matches, error } = await supabase
    .from('matches')
    .select('id, status, kickoff_time')
    .in('id', matchIds);

  if (error) {
    throw new Error(error.message);
  }

  const matchesById = new Map(
    ((matches ?? []) as PublicMatchRow[]).map((match) => [match.id, match])
  );
  const scoredMatches = points
    .filter((point) => point.match_id && matchesById.get(point.match_id)?.status === 'FINISHED')
    .sort((a, b) => {
      const aKickoff = a.match_id ? matchesById.get(a.match_id)?.kickoff_time ?? '' : '';
      const bKickoff = b.match_id ? matchesById.get(b.match_id)?.kickoff_time ?? '' : '';
      return new Date(bKickoff).getTime() - new Date(aKickoff).getTime();
    });

  if (scoredMatches.length === 0) {
    return { current_streak: 0, streak_type: 'none' };
  }

  const firstIsCorrect = (scoredMatches[0]?.winner_points ?? 0) > 0;
  let current_streak = 0;

  for (const point of scoredMatches) {
    const isCorrect = (point.winner_points ?? 0) > 0;
    if (isCorrect !== firstIsCorrect) break;
    current_streak += 1;
  }

  return {
    current_streak,
    streak_type: firstIsCorrect ? 'win' : 'loss',
  };
}

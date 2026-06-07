import { supabase } from '@/lib/supabase';
import type { Json, Tables } from '@/types/database.types';
import type { UserPerformanceStats, UserStreak } from '@/types/performance';

type UserPerformanceRow = Tables<'user_performance'>;

function mapStats(row: UserPerformanceRow): UserPerformanceStats {
  return {
    total_predictions: row.total_predictions ?? 0,
    correct_predictions: row.correct_predictions ?? 0,
    exact_predictions: row.exact_predictions ?? 0,
    total_points: row.total_points ?? 0,
    matches_participated: row.matches_participated ?? 0,
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

  if (!data) return null;
  return mapStats(data);
}

function parseStreak(data: Json): UserStreak {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { current_streak: 0, streak_type: 'none' };
  }

  const row = data as Record<string, Json | undefined>;
  const current_streak = typeof row.current_streak === 'number' ? row.current_streak : 0;
  const rawType = row.streak_type;
  const streak_type =
    rawType === 'win' || rawType === 'loss' || rawType === 'none' ? rawType : 'none';

  return { current_streak, streak_type };
}

export async function fetchUserStreak(userId: string): Promise<UserStreak> {
  const { data, error } = await supabase.rpc('get_user_streak', {
    p_user_id: userId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return parseStreak(data);
}

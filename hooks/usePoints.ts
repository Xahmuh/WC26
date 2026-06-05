// ============================================================================
// Points queries — the per-match scoring breakdown for the signed-in user.
// Points are public-readable (RLS) but we only ever fetch the current user's.
// ============================================================================

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';
import type { PointsRecord, PointsRow } from '@/types';

export const pointsKeys = {
  byUser: (userId: string) => ['points', userId] as const,
};

function mapPoints(row: PointsRow): PointsRecord {
  return {
    match_id: row.match_id || '',
    winner_points: row.winner_points,
    home_goal_points: row.home_goal_points,
    away_goal_points: row.away_goal_points,
    exact_bonus: row.exact_bonus,
    total_points: row.total_points,
  };
}

/** The signed-in user's points, keyed by match_id. */
export function useMyPoints(): UseQueryResult<Map<string, PointsRecord>, Error> {
  const userId = useAuthStore((s) => s.session?.user.id);

  return useQuery({
    queryKey: pointsKeys.byUser(userId ?? 'anon'),
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('points')
        .select('*')
        .eq('user_id', userId as string)
        .not('match_id', 'is', null) // Only fetch match prediction points here
        .returns<PointsRow[]>();

      if (error) throw new Error(error.message);
      return new Map((data ?? []).map((r) => [r.match_id as string, mapPoints(r)]));
    },
    staleTime: 30_000,
  });
}

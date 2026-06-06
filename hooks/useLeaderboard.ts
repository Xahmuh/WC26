// ============================================================================
// Leaderboard query. Reads the materialized view and re-fetches whenever the
// points table changes (via the realtime subscription in lib/supabase.ts).
// ============================================================================

import { useEffect } from 'react';
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';

import { subscribeToLeaderboard, supabase } from '@/lib/supabase';
import type { LeaderboardEntry, LeaderboardRow } from '@/types';

export const leaderboardKeys = {
  all: ['leaderboard'] as const,
};

function mapEntry(row: LeaderboardRow): LeaderboardEntry {
  return {
    rank: row.rank,
    user_id: row.user_id,
    display_name: row.username || row.display_name,
    username: row.username,
    avatar_url: row.avatar_url,
    total_points: row.total_points,
    predictions_made: row.predictions_made,
    predictions_scored: row.predictions_scored,
    exact_predictions: row.exact_predictions,
    supported_teams: row.supported_teams,
  };
}

async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('leaderboard')
    .select('*')
    .order('rank', { ascending: true })
    .returns<LeaderboardRow[]>();

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapEntry);
}

export function useLeaderboard(): UseQueryResult<LeaderboardEntry[], Error> {
  const queryClient = useQueryClient();

  // Live updates: when points change, invalidate so the view is re-read.
  useEffect(() => {
    const unsubscribe = subscribeToLeaderboard(() => {
      void queryClient.invalidateQueries({ queryKey: leaderboardKeys.all });
    });
    return unsubscribe;
  }, [queryClient]);

  return useQuery({
    queryKey: leaderboardKeys.all,
    queryFn: fetchLeaderboard,
    staleTime: 15_000,
  });
}

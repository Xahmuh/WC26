// ============================================================================
// Match queries. All reads go through Supabase (RLS: matches are public).
// ============================================================================

import { useEffect } from 'react';
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { MATCH_WITH_TEAMS_SELECT, mapMatch } from '@/lib/mappers';
import type { Match, MatchWithTeamsRow } from '@/types';

export const matchKeys = {
  all: ['matches'] as const,
  detail: (id: string) => ['matches', id] as const,
};

/**
 * Live match updates: any insert/update/delete on `matches` (score, status,
 * new fixtures) invalidates the cached lists so screens reflect results
 * instantly. One shared channel per mounted consumer; cleaned up on unmount.
 */
function useMatchesRealtime(): void {
  const queryClient = useQueryClient();
  useEffect(() => {
    const id = Math.random().toString(36).slice(2, 9);
    const channel = supabase
      .channel(`matches-rt-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        void queryClient.invalidateQueries({ queryKey: matchKeys.all });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

async function fetchMatches(): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select(MATCH_WITH_TEAMS_SELECT)
    .order('kickoff_time', { ascending: true })
    .returns<MatchWithTeamsRow[]>();

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapMatch);
}

async function fetchMatch(id: string): Promise<Match | null> {
  const { data, error } = await supabase
    .from('matches')
    .select(MATCH_WITH_TEAMS_SELECT)
    .eq('id', id)
    .maybeSingle<MatchWithTeamsRow>();

  if (error) throw new Error(error.message);
  return data ? mapMatch(data) : null;
}

export function useMatches(): UseQueryResult<Match[], Error> {
  useMatchesRealtime();
  return useQuery({
    queryKey: matchKeys.all,
    queryFn: fetchMatches,
    staleTime: 60_000,
  });
}

export function useMatch(id: string | undefined): UseQueryResult<Match | null, Error> {
  return useQuery({
    queryKey: matchKeys.detail(id ?? 'unknown'),
    queryFn: () => fetchMatch(id as string),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

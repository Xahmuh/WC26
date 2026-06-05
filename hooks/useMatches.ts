// ============================================================================
// Match queries. All reads go through Supabase (RLS: matches are public).
// ============================================================================

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { MATCH_WITH_TEAMS_SELECT, mapMatch } from '@/lib/mappers';
import type { Match, MatchWithTeamsRow } from '@/types';

export const matchKeys = {
  all: ['matches'] as const,
  detail: (id: string) => ['matches', id] as const,
};

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

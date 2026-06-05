import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Team } from '@/types';

export const teamKeys = {
  all: ['teams'] as const,
};

async function fetchTeams(): Promise<Team[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export function useTeams() {
  return useQuery({
    queryKey: teamKeys.all,
    queryFn: fetchTeams,
    staleTime: 300_000, // 5 minutes cache
  });
}

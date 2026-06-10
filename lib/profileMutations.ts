import { supabase } from '@/lib/supabase';

export async function updateSupportedTeams(
  userId: string,
  teamIds: string[]
): Promise<string[]> {
  const { data, error } = await supabase
    .from('users')
    .update({ supported_teams: teamIds })
    .eq('id', userId)
    .select('id, supported_teams')
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Could not save teams for this account. Please sign out and sign in again.');
  }

  return data.supported_teams ?? [];
}

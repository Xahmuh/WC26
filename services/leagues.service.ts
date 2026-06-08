// ============================================================================
// Mini Leagues — service layer.
// ----------------------------------------------------------------------------
// Ranking is NEVER computed here. We read `league_leaderboard`, a plain VIEW
// that re-ranks the existing `leaderboard` matview per league (see migration
// 030). All membership writes go through SECURITY DEFINER RPCs so capacity
// and ownership checks stay atomic and race-free.
// ============================================================================

import { supabase } from '@/lib/supabase';
import type { League, LeagueLeaderboardEntry, MyLeague } from '@/types';

export interface CreateLeagueInput {
  name: string;
  description?: string | null;
  avatarUrl?: string | null;
  maxMembers?: number | null;
}

export async function createLeague(input: CreateLeagueInput): Promise<League> {
  const { data, error } = await supabase.rpc('create_league', {
    p_name: input.name,
    p_description: input.description ?? undefined,
    p_avatar_url: input.avatarUrl ?? undefined,
    p_max_members: input.maxMembers ?? undefined,
  });

  if (error) throw new Error(error.message);
  return data as League;
}

export async function joinLeagueByCode(inviteCode: string): Promise<League> {
  const { data, error } = await supabase.rpc('join_league_by_code', {
    p_invite_code: inviteCode.trim().toUpperCase(),
  });

  if (error) throw new Error(error.message);
  return data as League;
}

export async function leaveLeague(leagueId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_league', { p_league_id: leagueId });
  if (error) throw new Error(error.message);
}

export async function removeLeagueMember(leagueId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_league_member', {
    p_league_id: leagueId,
    p_user_id: userId,
  });
  if (error) throw new Error(error.message);
}

export async function regenerateInviteCode(leagueId: string): Promise<string> {
  const { data, error } = await supabase.rpc('regenerate_league_invite_code', {
    p_league_id: leagueId,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export interface UpdateLeagueInput {
  leagueId: string;
  name?: string;
  description?: string | null;
  avatarUrl?: string | null;
  maxMembers?: number | null;
}

export async function updateLeague(input: UpdateLeagueInput): Promise<League> {
  const { data, error } = await supabase.rpc('update_league', {
    p_league_id: input.leagueId,
    p_name: input.name ?? undefined,
    p_description: input.description ?? undefined,
    p_avatar_url: input.avatarUrl ?? undefined,
    p_max_members: input.maxMembers ?? undefined,
  });
  if (error) throw new Error(error.message);
  return data as League;
}

export async function deleteLeague(leagueId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_league', { p_league_id: leagueId });
  if (error) throw new Error(error.message);
}

export async function transferLeagueOwnership(leagueId: string, newOwnerId: string): Promise<void> {
  const { error } = await supabase.rpc('transfer_league_ownership', {
    p_league_id: leagueId,
    p_new_owner_id: newOwnerId,
  });
  if (error) throw new Error(error.message);
}

/**
 * Leagues the current user belongs to, each annotated with the member count
 * and the user's own rank within that league (derived from `league_leaderboard`,
 * never recomputed here).
 */
export async function getMyLeagues(userId: string): Promise<MyLeague[]> {
  const { data: memberships, error: memberError } = await supabase
    .from('league_members')
    .select('league_id, role, leagues(*)')
    .eq('user_id', userId);

  if (memberError) throw new Error(memberError.message);
  if (!memberships || memberships.length === 0) return [];

  const leagueIds = memberships.map((m) => m.league_id);

  const { data: rankRows, error: rankError } = await supabase
    .from('league_leaderboard')
    .select('league_id, user_id, league_rank, league_member_count')
    .in('league_id', leagueIds)
    .returns<Pick<LeagueLeaderboardEntry, 'league_id' | 'user_id' | 'league_rank' | 'league_member_count'>[]>();

  if (rankError) throw new Error(rankError.message);

  const rankByLeague = new Map(
    (rankRows ?? []).filter((r) => r.user_id === userId).map((r) => [r.league_id, r])
  );

  return memberships
    .filter((m) => m.leagues)
    .map((m) => {
      const league = m.leagues as unknown as League;
      const rankRow = rankByLeague.get(m.league_id);
      return {
        ...league,
        member_count: rankRow?.league_member_count ?? 0,
        my_role: m.role as 'owner' | 'member',
        my_rank: rankRow?.league_rank ?? null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getLeagueLeaderboard(leagueId: string): Promise<LeagueLeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('league_leaderboard')
    .select('*')
    .eq('league_id', leagueId)
    .order('league_rank', { ascending: true })
    .returns<LeagueLeaderboardEntry[]>();

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getLeagueById(leagueId: string): Promise<League | null> {
  const { data, error } = await supabase.from('leagues').select('*').eq('id', leagueId).maybeSingle();
  if (error) throw new Error(error.message);
  return data as League | null;
}

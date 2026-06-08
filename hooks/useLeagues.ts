// ============================================================================
// Mini Leagues — hooks. Thin react-query wrappers over services/leagues.service.
// Realtime: league rosters/leagues are low-churn, so we invalidate on the
// existing `leaderboard_state` tick (ranks changed → my_rank/league_rank stale)
// plus on our own mutations — no new realtime channel needed.
// ============================================================================

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';

import { subscribeToLeaderboard } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';
import {
  createLeague,
  deleteLeague,
  getLeagueById,
  getLeagueLeaderboard,
  getMyLeagues,
  joinLeagueByCode,
  leaveLeague,
  regenerateInviteCode,
  removeLeagueMember,
  transferLeagueOwnership,
  updateLeague,
  type CreateLeagueInput,
  type UpdateLeagueInput,
} from '@/services/leagues.service';
import type { League, LeagueLeaderboardEntry, MyLeague } from '@/types';

export const leagueKeys = {
  all: ['leagues'] as const,
  mine: (userId: string | undefined) => ['leagues', 'mine', userId] as const,
  detail: (leagueId: string | undefined) => ['leagues', 'detail', leagueId] as const,
  leaderboard: (leagueId: string | undefined) => ['leagues', 'leaderboard', leagueId] as const,
};

// ── Queries ──────────────────────────────────────────────────────────────────

export function useMyLeagues(): UseQueryResult<MyLeague[], Error> {
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();

  // Global rank refresh implies league ranks changed too — refetch.
  useEffect(() => {
    const unsubscribe = subscribeToLeaderboard(() => {
      void queryClient.invalidateQueries({ queryKey: leagueKeys.mine(userId) });
    });
    return unsubscribe;
  }, [queryClient, userId]);

  return useQuery({
    queryKey: leagueKeys.mine(userId),
    queryFn: () => getMyLeagues(userId as string),
    enabled: Boolean(userId),
    staleTime: 15_000,
  });
}

export function useLeague(leagueId: string | undefined): UseQueryResult<League | null, Error> {
  return useQuery({
    queryKey: leagueKeys.detail(leagueId),
    queryFn: () => getLeagueById(leagueId as string),
    enabled: Boolean(leagueId),
  });
}

export function useLeagueLeaderboard(leagueId: string | undefined): UseQueryResult<LeagueLeaderboardEntry[], Error> {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = subscribeToLeaderboard(() => {
      void queryClient.invalidateQueries({ queryKey: leagueKeys.leaderboard(leagueId) });
    });
    return unsubscribe;
  }, [queryClient, leagueId]);

  return useQuery({
    queryKey: leagueKeys.leaderboard(leagueId),
    queryFn: () => getLeagueLeaderboard(leagueId as string),
    enabled: Boolean(leagueId),
    staleTime: 15_000,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

function useInvalidateLeagues() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);
  return (leagueId?: string) => {
    void queryClient.invalidateQueries({ queryKey: leagueKeys.mine(userId) });
    if (leagueId) {
      void queryClient.invalidateQueries({ queryKey: leagueKeys.detail(leagueId) });
      void queryClient.invalidateQueries({ queryKey: leagueKeys.leaderboard(leagueId) });
    }
  };
}

export function useCreateLeague() {
  const invalidate = useInvalidateLeagues();
  return useMutation({
    mutationFn: (input: CreateLeagueInput) => createLeague(input),
    onSuccess: () => invalidate(),
  });
}

export function useJoinLeague() {
  const invalidate = useInvalidateLeagues();
  return useMutation({
    mutationFn: (inviteCode: string) => joinLeagueByCode(inviteCode),
    onSuccess: (league) => invalidate(league.id),
  });
}

export function useLeaveLeague() {
  const invalidate = useInvalidateLeagues();
  return useMutation({
    mutationFn: (leagueId: string) => leaveLeague(leagueId),
    onSuccess: (_data, leagueId) => invalidate(leagueId),
  });
}

export function useRemoveLeagueMember() {
  const invalidate = useInvalidateLeagues();
  return useMutation({
    mutationFn: ({ leagueId, userId }: { leagueId: string; userId: string }) =>
      removeLeagueMember(leagueId, userId),
    onSuccess: (_data, { leagueId }) => invalidate(leagueId),
  });
}

export function useRegenerateInviteCode() {
  const invalidate = useInvalidateLeagues();
  return useMutation({
    mutationFn: (leagueId: string) => regenerateInviteCode(leagueId),
    onSuccess: (_data, leagueId) => invalidate(leagueId),
  });
}

export function useUpdateLeague() {
  const invalidate = useInvalidateLeagues();
  return useMutation({
    mutationFn: (input: UpdateLeagueInput) => updateLeague(input),
    onSuccess: (league) => invalidate(league.id),
  });
}

export function useDeleteLeague() {
  const invalidate = useInvalidateLeagues();
  return useMutation({
    mutationFn: (leagueId: string) => deleteLeague(leagueId),
    onSuccess: (_data, leagueId) => invalidate(leagueId),
  });
}

export function useTransferLeagueOwnership() {
  const invalidate = useInvalidateLeagues();
  return useMutation({
    mutationFn: ({ leagueId, newOwnerId }: { leagueId: string; newOwnerId: string }) =>
      transferLeagueOwnership(leagueId, newOwnerId),
    onSuccess: (_data, { leagueId }) => invalidate(leagueId),
  });
}

/** Resolves an `app deep link` (wc26://league/join/<code> or a shared invite code) to a league via the join RPC. */
export async function resolveInviteCodeFromLink(value: string): Promise<string> {
  const match = value.match(/([A-Z0-9]{8})\s*$/i);
  return (match?.[1] ?? value).trim().toUpperCase();
}

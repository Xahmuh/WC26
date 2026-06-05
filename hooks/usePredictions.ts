// ============================================================================
// Prediction queries + mutation (with optimistic update).
// RLS guarantees a user can only read/write their own, unlocked predictions.
// ============================================================================

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';
import type { Prediction, PredictionRow } from '@/types';

export const predictionKeys = {
  all: ['predictions'] as const,
  byUser: (userId: string) => ['predictions', userId] as const,
};

function mapPrediction(row: PredictionRow): Prediction {
  return {
    id: row.id,
    user_id: row.user_id,
    match_id: row.match_id,
    pred_home_score: row.pred_home_score,
    pred_away_score: row.pred_away_score,
    is_locked: row.is_locked,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function fetchUserPredictions(userId: string): Promise<Prediction[]> {
  const { data, error } = await supabase
    .from('predictions')
    .select('*')
    .eq('user_id', userId)
    .returns<PredictionRow[]>();

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapPrediction);
}

/** All of the signed-in user's predictions, keyed by match_id for easy lookup. */
export function useMyPredictions(): UseQueryResult<Map<string, Prediction>, Error> {
  const userId = useAuthStore((s) => s.session?.user.id);

  return useQuery({
    queryKey: predictionKeys.byUser(userId ?? 'anon'),
    enabled: Boolean(userId),
    queryFn: async () => {
      const list = await fetchUserPredictions(userId as string);
      return new Map(list.map((p) => [p.match_id, p]));
    },
    staleTime: 30_000,
  });
}

export interface SubmitPredictionInput {
  matchId: string;
  predHome: number;
  predAway: number;
}

interface OptimisticContext {
  previous: Map<string, Prediction> | undefined;
  queryKey: readonly string[];
}

/**
 * Upserts a prediction. Optimistically writes to the cache, then reconciles
 * with the server row (or rolls back on error).
 */
export function useSubmitPrediction(): UseMutationResult<
  Prediction,
  Error,
  SubmitPredictionInput,
  OptimisticContext
> {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async ({ matchId, predHome, predAway }) => {
      if (!userId) throw new Error('You must be signed in to predict.');

      const { data, error } = await supabase
        .from('predictions')
        .upsert(
          {
            user_id: userId,
            match_id: matchId,
            pred_home_score: predHome,
            pred_away_score: predAway,
          },
          { onConflict: 'user_id,match_id' }
        )
        .select('*')
        .single<PredictionRow>();

      if (error) throw new Error(error.message);
      return mapPrediction(data);
    },

    onMutate: async ({ matchId, predHome, predAway }) => {
      const queryKey = predictionKeys.byUser(userId ?? 'anon');
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Map<string, Prediction>>(queryKey);

      if (previous && userId) {
        const next = new Map(previous);
        const existing = next.get(matchId);
        next.set(matchId, {
          id: existing?.id ?? `optimistic-${matchId}`,
          user_id: userId,
          match_id: matchId,
          pred_home_score: predHome,
          pred_away_score: predAway,
          is_locked: false,
          created_at: existing?.created_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        queryClient.setQueryData(queryKey, next);
      }

      return { previous, queryKey };
    },

    onError: (_err, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
    },

    onSuccess: (prediction, _input, context) => {
      const current = queryClient.getQueryData<Map<string, Prediction>>(
        context.queryKey
      );
      const next = new Map(current ?? []);
      next.set(prediction.match_id, prediction);
      queryClient.setQueryData(context.queryKey, next);
    },

    onSettled: (_data, _err, _input, context) => {
      if (context) {
        void queryClient.invalidateQueries({ queryKey: context.queryKey });
      }
    },
  });
}

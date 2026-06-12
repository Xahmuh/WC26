import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import {
  createPredictionNews,
  deletePredictionNews,
  getActivePredictionNews,
  getPredictionNewsAdmin,
  updatePredictionNews,
  type PredictionNewsInput,
} from '@/services/prediction-news.service';

export const predictionNewsKeys = {
  all: ['predictionNews'] as const,
  active: ['predictionNews', 'active'] as const,
  admin: ['predictionNews', 'admin'] as const,
};

function usePredictionNewsRealtime(enabled = true): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const id = Math.random().toString(36).slice(2, 9);
    const channel = supabase
      .channel(`prediction-news-rt-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prediction_news' }, () => {
        void queryClient.invalidateQueries({ queryKey: predictionNewsKeys.all });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);
}

export function useActivePredictionNews(enabled = true) {
  usePredictionNewsRealtime(enabled);

  return useQuery({
    queryKey: predictionNewsKeys.active,
    queryFn: getActivePredictionNews,
    enabled,
    staleTime: 60_000,
  });
}

export function usePredictionNewsAdmin() {
  usePredictionNewsRealtime(true);

  return useQuery({
    queryKey: predictionNewsKeys.admin,
    queryFn: getPredictionNewsAdmin,
  });
}

export function useCreatePredictionNews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PredictionNewsInput) => createPredictionNews(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: predictionNewsKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useUpdatePredictionNews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      newsId,
      updates,
    }: {
      newsId: string;
      updates: { message?: string; isActive?: boolean; sortOrder?: number };
    }) => updatePredictionNews(newsId, updates),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: predictionNewsKeys.all });
    },
  });
}

export function useDeletePredictionNews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newsId: string) => deletePredictionNews(newsId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: predictionNewsKeys.all });
    },
  });
}

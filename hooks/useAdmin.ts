import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPredictionQuestion,
  resolvePredictionQuestion,
  setMatchMultiplier,
  updateQuestionStatus,
  getQuestionSubmissions,
  auditUserPrediction,
  createCustomMatch,
  updateMatchResult,
} from '@/services/admin.service';
import type { MatchStage, MatchStatus } from '@/types';

export function useSetMatchMultiplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ matchId, multiplier }: { matchId: string; multiplier: number }) =>
      setMatchMultiplier(matchId, multiplier),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}

export function useCreatePredictionQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      questionText,
      options,
      points,
      lockAtIso,
    }: {
      questionText: string;
      options: string[];
      points: number;
      lockAtIso: string;
    }) => createPredictionQuestion(questionText, options, points, lockAtIso),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['predictionQuestions'] });
    },
  });
}

export function useResolvePredictionQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ questionId, correctAnswer }: { questionId: string; correctAnswer: string }) =>
      resolvePredictionQuestion(questionId, correctAnswer),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['predictionQuestions'] });
      void queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      void queryClient.invalidateQueries({ queryKey: ['myPoints'] });
    },
  });
}

export function useUpdateQuestionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ questionId, status }: { questionId: string; status: 'open' | 'closed' }) =>
      updateQuestionStatus(questionId, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['predictionQuestions'] });
    },
  });
}

export function useQuestionSubmissions(questionId: string) {
  return useQuery({
    queryKey: ['questionSubmissions', questionId],
    queryFn: () => getQuestionSubmissions(questionId),
    enabled: Boolean(questionId),
  });
}

export function useAuditUserPrediction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      predictionId,
      status,
    }: {
      predictionId: string;
      status: 'approved' | 'rejected';
    }) => auditUserPrediction(predictionId, status),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['questionSubmissions'] });
      void queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      void queryClient.invalidateQueries({ queryKey: ['myPoints'] });
    },
  });
}

export function useCreateCustomMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      homeTeamId: string;
      awayTeamId: string;
      stage: MatchStage;
      groupName: string | null;
      kickoffTime: string;
      venue: string | null;
    }) => createCustomMatch(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}

export function useUpdateMatchResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      matchId,
      status,
      homeScore,
      awayScore,
    }: {
      matchId: string;
      status: MatchStatus;
      homeScore: number | null;
      awayScore: number | null;
    }) => updateMatchResult(matchId, status, homeScore, awayScore),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
      void queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      void queryClient.invalidateQueries({ queryKey: ['myPoints'] });
    },
  });
}

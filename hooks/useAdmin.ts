import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPredictionQuestion,
  deleteMatch,
  deleteUser,
  resolvePredictionQuestion,
  restoreUser,
  setMatchMultiplier,
  softDeleteUser,
  updateQuestionStatus,
  updatePredictionQuestion,
  deletePredictionQuestion,
  getQuestionSubmissions,
  auditUserPrediction,
  createCustomMatch,
  updateMatchResult,
  getHeroSlides,
  uploadHeroSlideImage,
  createHeroSlide,
  updateHeroSlide,
  deleteHeroSlide,
  reorderHeroSlides,
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

export function useUpdatePredictionQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      questionId,
      questionText,
      points,
      lockAtIso,
    }: {
      questionId: string;
      questionText: string;
      points: number;
      lockAtIso: string;
    }) => updatePredictionQuestion(questionId, { questionText, points, lockAtIso }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['predictionQuestions'] });
    },
  });
}

export function useDeletePredictionQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ questionId }: { questionId: string }) => deletePredictionQuestion(questionId),
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

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      void queryClient.invalidateQueries({ queryKey: ['joinedGroups'] });
    },
  });
}

export function useSoftDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => softDeleteUser(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      void queryClient.invalidateQueries({ queryKey: ['joinedGroups'] });
    },
  });
}

export function useRestoreUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => restoreUser(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      void queryClient.invalidateQueries({ queryKey: ['joinedGroups'] });
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

export function useDeleteMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (matchId: string) => deleteMatch(matchId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
      void queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      void queryClient.invalidateQueries({ queryKey: ['myPoints'] });
    },
  });
}

// ============================================================================
// Hero banner (home screen carousel) management
// ============================================================================

export function useHeroSlides() {
  return useQuery({
    queryKey: ['heroSlides'],
    queryFn: getHeroSlides,
  });
}

export function useUploadHeroSlideImage() {
  return useMutation({
    mutationFn: (localUri: string) => uploadHeroSlideImage(localUri),
  });
}

export function useCreateHeroSlide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      imagePath: string;
      backgroundColor: string;
      title: string | null;
      subtitle: string | null;
      linkUrl: string | null;
      sortOrder: number;
      isActive: boolean;
    }) => createHeroSlide(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['heroSlides'] });
    },
  });
}

export function useUpdateHeroSlide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      slideId,
      updates,
    }: {
      slideId: string;
      updates: {
        imagePath?: string;
        backgroundColor?: string;
        title?: string | null;
        subtitle?: string | null;
        linkUrl?: string | null;
        sortOrder?: number;
        isActive?: boolean;
      };
    }) => updateHeroSlide(slideId, updates),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['heroSlides'] });
    },
  });
}

export function useDeleteHeroSlide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slideId: string) => deleteHeroSlide(slideId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['heroSlides'] });
    },
  });
}

export function useReorderHeroSlides() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderedSlideIds: string[]) => reorderHeroSlides(orderedSlideIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['heroSlides'] });
    },
  });
}

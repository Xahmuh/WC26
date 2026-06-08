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
  uploadPredictionQuestionCardImage,
  uploadHeroSlideImage,
  createHeroSlide,
  updateHeroSlide,
  deleteHeroSlide,
  reorderHeroSlides,
  getHomeCardsTileSettings,
  uploadHomeCardsTileImage,
  updateHomeCardsTileSettings,
  getMatchesHeroSettings,
  uploadMatchesHeroImage,
  updateMatchesHeroSettings,
  getScoringRules,
  updateScoringRules,
  getStageMultipliers,
  setStageMultiplier,
  getCardDefinitions,
  createCardDefinition,
  updateCardDefinition,
  disableCardDefinition,
  uploadCardDefinitionImage,
  recalculateStageCards,
  type ScoringRules,
  type CardDefinitionInput,
} from '@/services/admin.service';
import type { CardDefinition, MatchDecisionMethod, MatchStage, MatchStatus } from '@/types';

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

// ----------------------------------------------------------------------------
// Scoring rules (admin-configurable points per prediction aspect)
// ----------------------------------------------------------------------------

export function useScoringRules() {
  return useQuery({
    queryKey: ['admin', 'scoring-rules'],
    queryFn: getScoringRules,
  });
}

export function useUpdateScoringRules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rules: ScoringRules) => updateScoringRules(rules),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'scoring-rules'] });
    },
  });
}

// ----------------------------------------------------------------------------
// Stage multipliers (admin presets, bulk-applied per match stage)
// ----------------------------------------------------------------------------

export function useStageMultipliers() {
  return useQuery({
    queryKey: ['admin', 'stage-multipliers'],
    queryFn: getStageMultipliers,
  });
}

export function useSetStageMultiplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ stage, multiplier }: { stage: MatchStage; multiplier: number }) =>
      setStageMultiplier(stage, multiplier),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'stage-multipliers'] });
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}

// ----------------------------------------------------------------------------
// Stage reward cards (admin-configurable My Cards)
// ----------------------------------------------------------------------------

export function useCardDefinitions() {
  return useQuery({
    queryKey: ['admin', 'card-definitions'],
    queryFn: getCardDefinitions,
  });
}

export function useCreateCardDefinition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CardDefinitionInput) => createCardDefinition(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'card-definitions'] });
      void queryClient.invalidateQueries({ queryKey: ['cardDefinitions'] });
    },
  });
}

export function useUpdateCardDefinition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ cardId, input }: { cardId: string; input: CardDefinitionInput }) =>
      updateCardDefinition(cardId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'card-definitions'] });
      void queryClient.invalidateQueries({ queryKey: ['cardDefinitions'] });
      void queryClient.invalidateQueries({ queryKey: ['userCards'] });
    },
  });
}

export function useDisableCardDefinition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cardId: string) => disableCardDefinition(cardId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'card-definitions'] });
      void queryClient.invalidateQueries({ queryKey: ['cardDefinitions'] });
    },
  });
}

export function useUploadCardDefinitionImage() {
  return useMutation({
    mutationFn: (input: { localUri: string; fileName?: string | null; mimeType?: string | null; webFile?: Blob | null }) =>
      uploadCardDefinitionImage(input),
  });
}

export function useRecalculateStageCards() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (stage: MatchStage) => recalculateStageCards(stage),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['userCards'] });
    },
  });
}

export type { CardDefinition, CardDefinitionInput };

export function useCreatePredictionQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      questionText,
      points,
      lockAtIso,
      cardImagePath,
    }: {
      questionText: string;
      points: number;
      lockAtIso: string;
      cardImagePath?: string | null;
    }) => createPredictionQuestion(questionText, points, lockAtIso, cardImagePath ?? null),
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
      cardImagePath,
    }: {
      questionId: string;
      questionText: string;
      points: number;
      lockAtIso: string;
      cardImagePath?: string | null;
    }) => updatePredictionQuestion(questionId, { questionText, points, lockAtIso, cardImagePath }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['predictionQuestions'] });
    },
  });
}

export function useUploadPredictionQuestionCardImage() {
  return useMutation({
    mutationFn: (input: { localUri: string; fileName?: string | null; mimeType?: string | null; webFile?: Blob | null }) =>
      uploadPredictionQuestionCardImage(input),
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
    onSuccess: () => {
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
      winnerTeamId,
      decisionMethod,
    }: {
      matchId: string;
      status: MatchStatus;
      homeScore: number | null;
      awayScore: number | null;
      winnerTeamId: string | null;
      decisionMethod: MatchDecisionMethod | null;
    }) => updateMatchResult(matchId, status, homeScore, awayScore, winnerTeamId, decisionMethod),
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
    mutationFn: (input: { localUri: string; fileName?: string | null; mimeType?: string | null; webFile?: Blob | null }) =>
      uploadHeroSlideImage(input),
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

export function useHomeCardsTileSettings() {
  return useQuery({
    queryKey: ['homeCardsTileSettings'],
    queryFn: getHomeCardsTileSettings,
  });
}

export function useUploadHomeCardsTileImage() {
  return useMutation({
    mutationFn: (input: { localUri: string; fileName?: string | null; mimeType?: string | null; webFile?: Blob | null }) =>
      uploadHomeCardsTileImage(input),
  });
}

export function useUpdateHomeCardsTileSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { imagePath: string | null; backgroundColor: string }) =>
      updateHomeCardsTileSettings(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['homeCardsTileSettings'] });
    },
  });
}

export function useMatchesHeroSettings() {
  return useQuery({
    queryKey: ['matchesHeroSettings'],
    queryFn: getMatchesHeroSettings,
  });
}

export function useUploadMatchesHeroImage() {
  return useMutation({
    mutationFn: (input: { localUri: string; fileName?: string | null; mimeType?: string | null; webFile?: Blob | null }) =>
      uploadMatchesHeroImage(input),
  });
}

export function useUpdateMatchesHeroSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { imagePath: string | null; backgroundColor: string }) =>
      updateMatchesHeroSettings(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['matchesHeroSettings'] });
    },
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getPredictionQuestions,
  getUserQuestionPredictions,
  submitQuestionPrediction,
} from '@/services/admin.service';

const QUESTIONS_KEY = ['predictionQuestions'];
const USER_PREDS_KEY = ['userQuestionPredictions'];

export function usePredictionQuestions() {
  return useQuery({
    queryKey: QUESTIONS_KEY,
    queryFn: getPredictionQuestions,
  });
}

export function useUserQuestionPredictions() {
  return useQuery({
    queryKey: USER_PREDS_KEY,
    queryFn: getUserQuestionPredictions,
  });
}

export function useSubmitQuestionPrediction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ questionId, prediction }: { questionId: string; prediction: string }) =>
      submitQuestionPrediction(questionId, prediction),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: USER_PREDS_KEY });
    },
  });
}

import { supabase } from '@/lib/supabase';
import type { PredictionQuestion, MatchStage, MatchStatus } from '@/types';

/**
 * Updates a match's points multiplier (e.g. 1 for Normal, 2 for Double, 3 for Triple).
 */
export async function setMatchMultiplier(matchId: string, multiplier: number): Promise<void> {
  const { error } = await supabase
    .from('matches')
    .update({ points_multiplier: multiplier })
    .eq('id', matchId);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Creates a new tournament prediction question.
 */
export async function createPredictionQuestion(
  questionText: string,
  options: string[] = [],
  points: number = 10,
  lockAtIso: string
): Promise<PredictionQuestion> {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('prediction_questions')
    .insert({
      question_text: questionText,
      options: options, // JSON array of options (can be empty for free-text)
      points: points,
      status: 'open',
      lock_at: lockAtIso,
      created_by: user?.id || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // Map option JSON to options array
  return {
    ...data,
    options: data.options as string[],
  } as PredictionQuestion;
}

/**
 * Updates an existing prediction question's text, points, and deadline.
 */
export async function updatePredictionQuestion(
  questionId: string,
  updates: { questionText: string; points: number; lockAtIso: string }
): Promise<void> {
  const { error } = await supabase
    .from('prediction_questions')
    .update({
      question_text: updates.questionText,
      points: updates.points,
      lock_at: updates.lockAtIso,
    })
    .eq('id', questionId);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Permanently deletes a prediction question. User submissions and any awarded
 * points cascade-delete via the table's foreign keys.
 */
export async function deletePredictionQuestion(questionId: string): Promise<void> {
  const { error } = await supabase
    .from('prediction_questions')
    .delete()
    .eq('id', questionId);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Resolves a tournament prediction question with the correct answer.
 * Triggers database RPC to award points and refresh the leaderboard.
 */
export async function resolvePredictionQuestion(
  questionId: string,
  correctAnswer: string
): Promise<void> {
  const { error } = await supabase.rpc('resolve_prediction_question', {
    p_question_id: questionId,
    p_correct_answer: correctAnswer,
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Updates a prediction question's status (e.g. 'open' or 'closed').
 */
export async function updateQuestionStatus(
  questionId: string,
  status: 'open' | 'closed'
): Promise<void> {
  const { error } = await supabase
    .from('prediction_questions')
    .update({ status })
    .eq('id', questionId);

  if (error) {
    throw new Error(error.message);
  }
}


/**
 * Fetches all prediction questions.
 */
export async function getPredictionQuestions(): Promise<PredictionQuestion[]> {
  const { data, error } = await supabase
    .from('prediction_questions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((q) => ({
    ...q,
    options: q.options as string[],
  })) as PredictionQuestion[];
}

/**
 * Submits or updates a user's answer to a custom question.
 */
export async function submitQuestionPrediction(
  questionId: string,
  prediction: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('user_question_predictions')
    .upsert({
      user_id: user.id,
      question_id: questionId,
      prediction: prediction,
    }, {
      onConflict: 'user_id,question_id',
    });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Fetches the user's answers to all custom questions, including audit status.
 */
export async function getUserQuestionPredictions(): Promise<Map<string, { prediction: string; status: 'pending' | 'approved' | 'rejected' }>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Map();

  const { data, error } = await supabase
    .from('user_question_predictions')
    .select('question_id, prediction, status')
    .eq('user_id', user.id);

  if (error) {
    throw new Error(error.message);
  }

  const map = new Map<string, { prediction: string; status: 'pending' | 'approved' | 'rejected' }>();
  if (data) {
    for (const row of data) {
      map.set(row.question_id, {
        prediction: row.prediction,
        status: (row.status || 'pending') as 'pending' | 'approved' | 'rejected',
      });
    }
  }
  return map;
}

export interface QuestionSubmission {
  id: string;
  prediction: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  user: {
    display_name: string;
    email: string | null;
    avatar_url: string | null;
  };
}

/**
 * Fetches all user submissions for a specific custom prediction question.
 */
export async function getQuestionSubmissions(questionId: string): Promise<QuestionSubmission[]> {
  const { data, error } = await supabase
    .from('user_question_predictions')
    .select(`
      id,
      prediction,
      status,
      created_at,
      user:user_id (
        display_name,
        email,
        avatar_url
      )
    `)
    .eq('question_id', questionId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    prediction: row.prediction,
    status: row.status,
    created_at: row.created_at,
    user: Array.isArray(row.user) ? row.user[0] : row.user,
  }));
}

/**
 * Audits a specific user prediction (approve or reject).
 */
export async function auditUserPrediction(
  predictionId: string,
  status: 'approved' | 'rejected'
): Promise<void> {
  const { error } = await supabase
    .from('user_question_predictions')
    .update({ status })
    .eq('id', predictionId);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Creates a new custom match.
 */
export async function createCustomMatch(input: {
  homeTeamId: string;
  awayTeamId: string;
  stage: MatchStage;
  groupName: string | null;
  kickoffTime: string;
  venue: string | null;
}): Promise<void> {
  const externalId = Math.floor(Date.now() / 1000);
  const { error } = await supabase
    .from('matches')
    .insert({
      external_id: externalId,
      home_team_id: input.homeTeamId,
      away_team_id: input.awayTeamId,
      stage: input.stage,
      group_name: input.groupName || null,
      kickoff_time: input.kickoffTime,
      venue: input.venue || null,
      status: 'SCHEDULED',
      points_multiplier: 1,
    });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Updates a match result (status and score). If status is set to 'FINISHED',
 * triggers the points calculation Edge Function.
 */
export async function updateMatchResult(
  matchId: string,
  status: MatchStatus,
  homeScore: number | null,
  awayScore: number | null
): Promise<void> {
  const { error } = await supabase
    .from('matches')
    .update({
      status,
      home_score: homeScore,
      away_score: awayScore,
    })
    .eq('id', matchId);

  if (error) {
    throw new Error(error.message);
  }

  // If status is 'FINISHED', invoke the 'calculate-points' edge function.
  if (status === 'FINISHED') {
    const { error: funcError } = await supabase.functions.invoke('calculate-points', {
      body: { match_id: matchId },
    });
    if (funcError) {
      console.error('Failed to trigger calculate-points:', funcError);
      throw new Error(`Match updated but points calculation failed: ${funcError.message}`);
    }
  }
}

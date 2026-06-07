import { supabase } from '@/lib/supabase';
import type { PredictionQuestion, MatchStage, MatchStatus, HeroSlide, Database } from '@/types';

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
  // Use the locally-stored session (no network round-trip). getUser() hits
  // /auth/v1/user and logs a scary 403 in the console when the stored token is
  // stale; getSession() reads from storage and RLS still scopes the rows below.
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
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
    username: string | null;
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
          username,
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
  // Points are calculated by the DB trigger (matches_after_write → score_match)
  // in migration 013. No edge function is needed.
}

/**
 * Permanently deletes a user from auth.users (cascades to public.users and all
 * dependent rows via FK). Invalidates all active sessions immediately.
 */
export async function deleteUser(userId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_user', {
    p_user_id: userId,
  });
  if (error) throw new Error(error.message);
}

/**
 * Soft-deletes a user: sets is_deleted = true. RLS blocks all subsequent
 * reads/writes. Use restoreUser() to reverse.
 */
export async function softDeleteUser(userId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_soft_delete_user', {
    p_user_id: userId,
  });
  if (error) throw new Error(error.message);
}

/**
 * Restores a soft-deleted user by clearing is_deleted.
 */
export async function restoreUser(userId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_restore_user', {
    p_user_id: userId,
  });
  if (error) throw new Error(error.message);
}

/**
 * Permanently deletes a match. Predictions and points cascade-delete via
 * the table's foreign keys.
 */
export async function deleteMatch(matchId: string): Promise<void> {
  // SECURITY DEFINER RPC: deletes reliably for admins and raises a clear error
  // for non-admins. A direct .delete() is silently filtered to 0 rows by RLS
  // when the caller isn't an admin, so the UI looked like it "did nothing".
  const { error } = await supabase.rpc('admin_delete_match', { p_match_id: matchId });
  if (error) {
    throw new Error(error.message);
  }
}

// ============================================================================
// Hero banner (home screen carousel) management
// ============================================================================

const HERO_BANNERS_BUCKET = 'hero-banners';

/**
 * Resolves a storage path inside the `hero-banners` bucket to a public URL.
 */
export function getHeroSlideImageUrl(imagePath: string): string {
  const { data } = supabase.storage.from(HERO_BANNERS_BUCKET).getPublicUrl(imagePath);
  return data.publicUrl;
}

/**
 * Fetches all hero slides ordered for display in the admin dashboard.
 */
export async function getHeroSlides(): Promise<HeroSlide[]> {
  const { data, error } = await supabase
    .from('hero_slides')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as HeroSlide[];
}

/**
 * Uploads a banner image (picked from the device) to the `hero-banners`
 * storage bucket and returns the storage path to persist on the slide row.
 */
export async function uploadHeroSlideImage(localUri: string): Promise<string> {
  const fileExt = localUri.split('.').pop()?.toLowerCase() || 'jpg';
  const contentType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
  const fileName = `slide-${Date.now()}.${fileExt}`;
  const filePath = `slides/${fileName}`;

  const formData = new FormData();
  formData.append('file', {
    uri: localUri,
    name: fileName,
    type: contentType,
  } as any);

  const { error } = await supabase.storage
    .from(HERO_BANNERS_BUCKET)
    .upload(filePath, formData, { contentType, upsert: true });

  if (error) {
    throw new Error(error.message);
  }

  return filePath;
}

/**
 * Creates a new hero slide.
 */
export async function createHeroSlide(input: {
  imagePath: string;
  backgroundColor: string;
  title: string | null;
  subtitle: string | null;
  linkUrl: string | null;
  sortOrder: number;
  isActive: boolean;
}): Promise<HeroSlide> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('hero_slides')
    .insert({
      image_path: input.imagePath,
      background_color: input.backgroundColor,
      title: input.title,
      subtitle: input.subtitle,
      link_url: input.linkUrl,
      sort_order: input.sortOrder,
      is_active: input.isActive,
      created_by: user?.id || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as HeroSlide;
}

/**
 * Updates an existing hero slide's content and visibility.
 */
export async function updateHeroSlide(
  slideId: string,
  updates: {
    imagePath?: string;
    backgroundColor?: string;
    title?: string | null;
    subtitle?: string | null;
    linkUrl?: string | null;
    sortOrder?: number;
    isActive?: boolean;
  }
): Promise<void> {
  const payload: Database['public']['Tables']['hero_slides']['Update'] = {};
  if (updates.imagePath !== undefined) payload.image_path = updates.imagePath;
  if (updates.backgroundColor !== undefined) payload.background_color = updates.backgroundColor;
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.subtitle !== undefined) payload.subtitle = updates.subtitle;
  if (updates.linkUrl !== undefined) payload.link_url = updates.linkUrl;
  if (updates.sortOrder !== undefined) payload.sort_order = updates.sortOrder;
  if (updates.isActive !== undefined) payload.is_active = updates.isActive;

  const { error } = await supabase
    .from('hero_slides')
    .update(payload)
    .eq('id', slideId);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Permanently deletes a hero slide.
 */
export async function deleteHeroSlide(slideId: string): Promise<void> {
  const { error } = await supabase
    .from('hero_slides')
    .delete()
    .eq('id', slideId);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Persists a new slide order after a drag-and-drop reorder in the dashboard.
 * Each entry's `sort_order` is set to its index in the provided array.
 */
export async function reorderHeroSlides(orderedSlideIds: string[]): Promise<void> {
  await Promise.all(
    orderedSlideIds.map((id, index) =>
      supabase.from('hero_slides').update({ sort_order: index }).eq('id', id)
    )
  ).then((results) => {
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      throw new Error(failed.error.message);
    }
  });
}

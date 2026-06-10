import { supabase } from '@/lib/supabase';
import { compressLocalImageResult } from '@/lib/imageUpload';
import { Platform } from 'react-native';
import type {
  PredictionQuestion,
  MatchStage,
  MatchStatus,
  MatchDecisionMethod,
  BannerCollection,
  BannerPlacement,
  HeroSlide,
  HomeCardsTileSettings,
  MatchesHeroSettings,
  CardDefinition,
  StageCardSetting,
  ApiProvider,
  Database,
} from '@/types';
import { DEFAULT_STAGE_MATCH_COUNTS, STAGE_ORDER } from '@/lib/stages';
import { DEFAULT_HOME_BANNER_POSITION, type HomeBannerPosition } from '@/lib/bannerPositions';

function normalizeAdminError(message: string): string {
  if (message.includes('matches_finished_knockout_has_outcome')) {
    return 'Some finished knockout matches are missing a qualifier. Set the qualified team first, then try again.';
  }

  if (message.includes('permission denied for table users')) {
    return 'Match deletion needs the latest database migration so total points can be recalculated safely.';
  }

  return message;
}

/**
 * Updates a match's points multiplier (e.g. 1 for Normal, 2 for Double, 3 for Triple).
 */
export async function setMatchMultiplier(matchId: string, multiplier: number): Promise<void> {
  const { error } = await supabase
    .from('matches')
    .update({ points_multiplier: multiplier })
    .eq('id', matchId);

  if (error) {
    throw new Error(normalizeAdminError(error.message));
  }
}

// ----------------------------------------------------------------------------
// Scoring rules (admin-configurable points per prediction "aspect")
// ----------------------------------------------------------------------------

export interface ScoringRules {
  winnerPoints: number;
  exactBonusPoints: number;
}

type ImageUploadInput = {
  localUri: string;
  fileName?: string | null;
  mimeType?: string | null;
  webFile?: Blob | null;
};

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = base64.replace(/^data:[^,]+,/, '').replace(/[\r\n\s]/g, '');
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  const outputLength = Math.floor((clean.length * 3) / 4) - padding;
  const bytes = new Uint8Array(outputLength);
  let buffer = 0;
  let bits = 0;
  let index = 0;

  for (let i = 0; i < clean.length; i += 1) {
    const char = clean[i];
    if (!char) continue;
    if (char === '=') break;
    const value = alphabet.indexOf(char);
    if (value === -1) continue;

    buffer = (buffer << 6) | value;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      bytes[index] = (buffer >> bits) & 0xff;
      index += 1;
    }
  }

  return bytes.buffer;
}

async function uploadCompressedImage(input: ImageUploadInput, options: {
  bucket: string;
  folder: string;
  prefix: string;
  maxWidth: number;
  quality?: number;
}): Promise<string> {
  const fileName = `${options.prefix}-${Date.now()}.jpg`;
  const filePath = `${options.folder}/${fileName}`;
  const contentType = 'image/jpeg';

  let fileBody: Blob | ArrayBuffer;

  const compressed = await compressLocalImageResult(input.localUri, {
    maxWidth: options.maxWidth,
    quality: options.quality,
  });

  if (Platform.OS === 'web') {
    const response = await fetch(compressed.uri);
    const blob = await response.blob();
    fileBody = blob.size > 0 ? blob : input.webFile ?? blob;
  } else {
    if (!compressed.base64) {
      throw new Error('Could not prepare the image data for upload.');
    }
    fileBody = base64ToArrayBuffer(compressed.base64);
  }

  const { error } = await supabase.storage
    .from(options.bucket)
    .upload(filePath, fileBody, { contentType, upsert: false });

  if (error) {
    throw new Error(error.message);
  }

  return filePath;
}

/**
 * Fetches the singleton scoring-rules row. Scoring is intentionally simple:
 * a prediction only earns points for (a) picking the correct winner/draw and
 * (b) nailing the exact score — no partial credit for matching just one side's
 * goal count.
 */
export async function getScoringRules(): Promise<ScoringRules> {
  const { data, error } = await supabase
    .from('scoring_rules')
    .select('winner_points, exact_bonus_points')
    .eq('id', 1)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    winnerPoints: data.winner_points,
    exactBonusPoints: data.exact_bonus_points,
  };
}

/** Updates the points awarded per prediction aspect (admin only — enforced by RLS). */
export async function updateScoringRules(rules: ScoringRules): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('scoring_rules')
    .update({
      winner_points: rules.winnerPoints,
      exact_bonus_points: rules.exactBonusPoints,
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    })
    .eq('id', 1);

  if (error) {
    throw new Error(error.message);
  }
}

// ----------------------------------------------------------------------------
// Stage multipliers (admin chooses a default 1x-6x multiplier per match stage)
// ----------------------------------------------------------------------------

export interface StageMultiplier {
  stage: MatchStage;
  multiplier: number;
}

export interface StageCardSettingInput {
  stage: MatchStage;
  expectedMatches: number;
}

function getDefaultStageCardSettings(): StageCardSetting[] {
  return STAGE_ORDER.map((stage) => ({
    stage,
    expected_matches: DEFAULT_STAGE_MATCH_COUNTS[stage],
    updated_by: null,
    updated_at: new Date(0).toISOString(),
  }));
}

/** Fetches the per-stage default multiplier presets. */
export async function getStageMultipliers(): Promise<StageMultiplier[]> {
  const { data, error } = await supabase
    .from('stage_multipliers')
    .select('stage, multiplier')
    .order('stage', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({ stage: row.stage as MatchStage, multiplier: row.multiplier }));
}

export async function getStageCardSettings(): Promise<StageCardSetting[]> {
  const { data, error } = await (supabase as any)
    .from('stage_card_settings')
    .select('stage, expected_matches, updated_by, updated_at');

  if (error) {
    if (error.code === '42P01') return getDefaultStageCardSettings();
    throw new Error(error.message);
  }

  const rows = (data ?? []) as StageCardSetting[];
  const byStage = new Map<MatchStage, StageCardSetting>(
    rows.map((row) => [row.stage, row])
  );

  return STAGE_ORDER.map<StageCardSetting>((stage) => (
    byStage.get(stage) ?? {
      stage,
      expected_matches: DEFAULT_STAGE_MATCH_COUNTS[stage],
      updated_by: null,
      updated_at: new Date(0).toISOString(),
    }
  ));
}

export async function setStageExpectedMatches(
  stage: MatchStage,
  expectedMatches: number
): Promise<void> {
  const { error } = await supabase.rpc('admin_set_stage_expected_matches' as any, {
    p_stage: stage,
    p_expected_matches: expectedMatches,
  });

  if (error) {
    if (error.code === '42883') {
      throw new Error('Please apply the stage card settings migration, then try again.');
    }
    throw new Error(error.message);
  }
}

/**
 * Sets a stage's default multiplier and bulk-applies it to eligible matches
 * currently in that stage (admin only — enforced inside the RPC).
 * Finished knockout matches missing their final outcome are skipped until fixed.
 * Returns the number of matches updated.
 */
export async function setStageMultiplier(stage: MatchStage, multiplier: number): Promise<number> {
  const { data, error } = await supabase.rpc('admin_set_stage_multiplier', {
    p_stage: stage,
    p_multiplier: multiplier,
  });

  if (error) {
    throw new Error(normalizeAdminError(error.message));
  }

  return data ?? 0;
}

// ----------------------------------------------------------------------------
// Stage reward cards
// ----------------------------------------------------------------------------

export interface CardDefinitionInput {
  name: string;
  description: string | null;
  imagePath: string | null;
  awardStage: MatchStage;
  thresholdPercent: number;
  usableFromStage: MatchStage;
  usableUntilStage: MatchStage;
  maxUses: number;
  multiplierBonus: number;
  isActive: boolean;
}

function withCardImageUrl(row: any): CardDefinition {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    image_path: row.image_path ?? null,
    image_url: row.image_path ? getCardDefinitionImageUrl(row.image_path) : null,
    award_stage: row.award_stage as MatchStage,
    threshold_percent: Number(row.threshold_percent),
    usable_from_stage: row.usable_from_stage as MatchStage,
    usable_until_stage: row.usable_until_stage as MatchStage,
    max_uses: row.max_uses,
    multiplier_bonus: row.multiplier_bonus,
    is_active: row.is_active,
    created_by: row.created_by ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function getCardDefinitionImageUrl(imagePath: string): string {
  const { data } = supabase.storage.from(CARD_IMAGES_BUCKET).getPublicUrl(imagePath);
  return data.publicUrl;
}

export async function uploadCardDefinitionImage(input: {
  localUri: string;
  fileName?: string | null;
  mimeType?: string | null;
  webFile?: Blob | null;
}): Promise<string> {
  return uploadCompressedImage(input, {
    bucket: CARD_IMAGES_BUCKET,
    folder: 'definitions',
    prefix: 'stage-card',
    maxWidth: 1280,
    quality: 0.72,
  });
}

export async function getCardDefinitions(): Promise<CardDefinition[]> {
  const { data, error } = await (supabase as any)
    .from('card_definitions')
    .select('*')
    .order('award_stage', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(withCardImageUrl);
}

export async function createCardDefinition(input: CardDefinitionInput): Promise<CardDefinition> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await (supabase as any)
    .from('card_definitions')
    .insert({
      name: input.name,
      description: input.description,
      image_path: input.imagePath,
      award_stage: input.awardStage,
      threshold_percent: input.thresholdPercent,
      usable_from_stage: input.usableFromStage,
      usable_until_stage: input.usableUntilStage,
      max_uses: input.maxUses,
      multiplier_bonus: input.multiplierBonus,
      is_active: input.isActive,
      created_by: user?.id ?? null,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return withCardImageUrl(data);
}

export async function updateCardDefinition(
  cardId: string,
  input: CardDefinitionInput
): Promise<CardDefinition> {
  const { data, error } = await (supabase as any)
    .from('card_definitions')
    .update({
      name: input.name,
      description: input.description,
      image_path: input.imagePath,
      award_stage: input.awardStage,
      threshold_percent: input.thresholdPercent,
      usable_from_stage: input.usableFromStage,
      usable_until_stage: input.usableUntilStage,
      max_uses: input.maxUses,
      multiplier_bonus: input.multiplierBonus,
      is_active: input.isActive,
    })
    .eq('id', cardId)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return withCardImageUrl(data);
}

export async function disableCardDefinition(cardId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('card_definitions')
    .update({ is_active: false })
    .eq('id', cardId);

  if (error) throw new Error(error.message);
}

export async function deleteCardDefinition(cardId: string): Promise<void> {
  const { data: card, error: fetchError } = await (supabase as any)
    .from('card_definitions')
    .select('image_path')
    .eq('id', cardId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);

  const { error: deleteError, count } = await (supabase as any)
    .from('card_definitions')
    .delete({ count: 'exact' })
    .eq('id', cardId);

  if (deleteError) throw new Error(deleteError.message);
  if (count === 0) throw new Error('Card was not deleted. It may already be missing or your account does not have permission.');

  if (card?.image_path) {
    await supabase.storage.from(CARD_IMAGES_BUCKET).remove([card.image_path]).catch(() => undefined);
  }
}

export async function recalculateStageCards(stage: MatchStage): Promise<number> {
  const { data, error } = await supabase.rpc('admin_recalculate_stage_cards' as any, {
    p_stage: stage,
  });

  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

/**
 * Creates a new tournament prediction question.
 */
export async function createPredictionQuestion(
  questionText: string,
  points: number = 10,
  lockAtIso: string,
  cardImagePath: string | null = null
): Promise<PredictionQuestion> {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('prediction_questions')
    .insert({
      question_text: questionText,
      options: [],
      points: points,
      status: 'open',
      lock_at: lockAtIso,
      card_image_path: cardImagePath,
      created_by: user?.id || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

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
  updates: { questionText: string; points: number; lockAtIso: string; cardImagePath?: string | null }
): Promise<void> {
  const { error } = await supabase
    .from('prediction_questions')
    .update({
      question_text: updates.questionText,
      points: updates.points,
      lock_at: updates.lockAtIso,
      ...(updates.cardImagePath !== undefined ? { card_image_path: updates.cardImagePath } : {}),
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
    card_image_url: q.card_image_path ? getPredictionQuestionCardImageUrl(q.card_image_path) : null,
  })) as PredictionQuestion[];
}

/**
 * Resolves a prediction-card image path to a public URL.
 */
export function getPredictionQuestionCardImageUrl(imagePath: string): string {
  const { data } = supabase.storage.from(PREDICTION_CARD_IMAGES_BUCKET).getPublicUrl(imagePath);
  return data.publicUrl;
}

/**
 * Uploads a tournament-prediction card image and returns the storage path.
 */
export async function uploadPredictionQuestionCardImage(input: {
  localUri: string;
  fileName?: string | null;
  mimeType?: string | null;
  webFile?: Blob | null;
}): Promise<string> {
  return uploadCompressedImage(input, {
    bucket: PREDICTION_CARD_IMAGES_BUCKET,
    folder: 'cards',
    prefix: 'prediction-card',
    maxWidth: 1280,
    quality: 0.7,
  });
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
 * Updates a match result. When a match becomes FINISHED, the database trigger
 * recalculates points with the same card-aware scorer used by API polling.
 */
export async function updateMatchResult(
  matchId: string,
  status: MatchStatus,
  homeScore: number | null,
  awayScore: number | null,
  winnerTeamId: string | null,
  decisionMethod: MatchDecisionMethod | null
): Promise<void> {
  const { error } = await supabase
    .from('matches')
    .update({
      status,
      home_score: homeScore,
      away_score: awayScore,
      winner_team_id: winnerTeamId,
      decision_method: decisionMethod,
    })
    .eq('id', matchId);

  if (error) {
    throw new Error(normalizeAdminError(error.message));
  }

  // Points are calculated by the DB trigger (matches_after_write -> score_match).
  // No Edge Function is invoked here, so manual and API results share one scorer.
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
  const { error } = await supabase.rpc('admin_delete_match', {
    p_match_id: matchId,
  });

  if (error) {
    throw new Error(normalizeAdminError(error.message));
  }
}

// ============================================================================
// API providers
// ============================================================================

export interface ApiProviderInput {
  id: string;
  name: string;
  adapter: string;
  baseUrl: string;
  competitionCode: string;
  tokenSecretName: string;
  isActive: boolean;
  rateLimitPerMinute: number | null;
  supportsFixtures: boolean;
  supportsResults: boolean;
  notes: string | null;
}

const DEFAULT_API_PROVIDER: ApiProvider = {
  id: 'football-data',
  name: 'football-data.org',
  adapter: 'football_data_v4',
  base_url: 'https://api.football-data.org/v4',
  competition_code: 'WC',
  token_secret_name: 'FOOTBALL_API_TOKEN',
  is_active: true,
  rate_limit_per_minute: 10,
  supports_fixtures: true,
  supports_results: true,
  notes: 'Current World Cup fixture/result provider.',
  updated_by: null,
  updated_at: new Date(0).toISOString(),
};

export async function getApiProviders(): Promise<ApiProvider[]> {
  const { data, error } = await (supabase as any)
    .from('api_providers')
    .select(
      'id, name, adapter, base_url, competition_code, token_secret_name, is_active, rate_limit_per_minute, supports_fixtures, supports_results, notes, updated_by, updated_at'
    )
    .order('is_active', { ascending: false })
    .order('name', { ascending: true });

  if (error) {
    if (error.code === '42P01') return [DEFAULT_API_PROVIDER];
    throw new Error(error.message);
  }

  return (data ?? []) as ApiProvider[];
}

export async function upsertApiProvider(input: ApiProviderInput): Promise<void> {
  const { error } = await supabase.rpc('admin_upsert_api_provider' as any, {
    p_id: input.id,
    p_name: input.name,
    p_adapter: input.adapter,
    p_base_url: input.baseUrl,
    p_competition_code: input.competitionCode,
    p_token_secret_name: input.tokenSecretName,
    p_is_active: input.isActive,
    p_rate_limit_per_minute: input.rateLimitPerMinute,
    p_supports_fixtures: input.supportsFixtures,
    p_supports_results: input.supportsResults,
    p_notes: input.notes,
  });

  if (error) {
    if (error.code === '42883') {
      throw new Error('Please apply the API providers migration, then try again.');
    }
    throw new Error(error.message);
  }
}

export async function setActiveApiProvider(providerId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_set_active_api_provider' as any, {
    p_id: providerId,
  });

  if (error) {
    if (error.code === '42883') {
      throw new Error('Please apply the API providers migration, then try again.');
    }
    throw new Error(error.message);
  }
}

// ============================================================================
// Hero banner (home screen carousel) management
// ============================================================================

const HERO_BANNERS_BUCKET = 'hero-banners';
const PREDICTION_CARD_IMAGES_BUCKET = 'prediction-card-images';
const CARD_IMAGES_BUCKET = 'card-images';
const HOME_CARDS_TILE_BUCKET = HERO_BANNERS_BUCKET;
const MATCHES_HERO_BUCKET = HERO_BANNERS_BUCKET;

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
export async function getHeroSlides(filter?: {
  placement?: BannerPlacement;
  collectionId?: string | null;
}): Promise<HeroSlide[]> {
  let query = supabase
    .from('hero_slides')
    .select('*')
    .order('sort_order', { ascending: true });

  if (filter?.placement) {
    query = query.eq('placement', filter.placement);
  }
  if (filter && 'collectionId' in filter) {
    if (filter.collectionId === null) {
      query = query.is('collection_id', null);
    } else if (filter.collectionId !== undefined) {
      query = query.eq('collection_id', filter.collectionId);
    }
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((row: any) => ({
    ...row,
    placement: (row.placement ?? 'top') as BannerPlacement,
    collection_id: row.collection_id ?? null,
  })) as HeroSlide[];
}

export async function getBannerCollections(): Promise<BannerCollection[]> {
  const { data, error } = await (supabase as any)
    .from('banner_collections')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((row: any) => ({
    ...row,
    home_position: (row.home_position ?? DEFAULT_HOME_BANNER_POSITION) as HomeBannerPosition,
  })) as BannerCollection[];
}

export async function createBannerCollection(input: {
  title: string;
  sortOrder: number;
  homePosition: HomeBannerPosition;
  isActive: boolean;
}): Promise<BannerCollection> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await (supabase as any)
    .from('banner_collections')
    .insert({
      title: input.title,
      sort_order: input.sortOrder,
      home_position: input.homePosition,
      is_active: input.isActive,
      created_by: user?.id ?? null,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as BannerCollection;
}

export async function updateBannerCollection(
  collectionId: string,
  updates: { title?: string; sortOrder?: number; homePosition?: HomeBannerPosition; isActive?: boolean }
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.sortOrder !== undefined) payload.sort_order = updates.sortOrder;
  if (updates.homePosition !== undefined) payload.home_position = updates.homePosition;
  if (updates.isActive !== undefined) payload.is_active = updates.isActive;

  const { error } = await (supabase as any)
    .from('banner_collections')
    .update(payload)
    .eq('id', collectionId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteBannerCollection(collectionId: string): Promise<void> {
  const { data: slides, error: fetchError } = await supabase
    .from('hero_slides')
    .select('image_path')
    .eq('collection_id', collectionId);

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  const { error, count } = await (supabase as any)
    .from('banner_collections')
    .delete({ count: 'exact' })
    .eq('id', collectionId);

  if (error) {
    throw new Error(error.message);
  }

  if (count === 0) {
    throw new Error('Banner group was not deleted. It may already be missing or your account does not have permission.');
  }

  const paths = (slides ?? []).map((slide) => slide.image_path).filter(Boolean);
  if (paths.length > 0) {
    await supabase.storage.from(HERO_BANNERS_BUCKET).remove(paths).catch(() => undefined);
  }
}

/**
 * Uploads a banner image (picked from the device) to the `hero-banners`
 * storage bucket and returns the storage path to persist on the slide row.
 */
export async function uploadHeroSlideImage(input: {
  localUri: string;
  fileName?: string | null;
  mimeType?: string | null;
  webFile?: Blob | null;
}): Promise<string> {
  return uploadCompressedImage(input, {
    bucket: HERO_BANNERS_BUCKET,
    folder: 'slides',
    prefix: 'slide',
    maxWidth: 1600,
    quality: 0.75,
  });
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
  placement?: BannerPlacement;
  collectionId?: string | null;
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
      placement: input.placement ?? 'top',
      collection_id: input.collectionId ?? null,
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
    placement?: BannerPlacement;
    collectionId?: string | null;
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
  if (updates.placement !== undefined) payload.placement = updates.placement;
  if (updates.collectionId !== undefined) payload.collection_id = updates.collectionId;
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
  const { data: slide, error: fetchError } = await supabase
    .from('hero_slides')
    .select('image_path')
    .eq('id', slideId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  const { error, count } = await supabase
    .from('hero_slides')
    .delete({ count: 'exact' })
    .eq('id', slideId);

  if (error) {
    throw new Error(error.message);
  }

  if (count === 0) {
    throw new Error('Hero slide was not deleted. It may already be missing or your account does not have permission.');
  }

  if (slide?.image_path) {
    await supabase.storage.from(HERO_BANNERS_BUCKET).remove([slide.image_path]).catch(() => undefined);
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

// ============================================================================
// Home My Cards tile artwork
// ============================================================================

export function getHomeCardsTileImageUrl(imagePath: string): string {
  const { data } = supabase.storage.from(HOME_CARDS_TILE_BUCKET).getPublicUrl(imagePath);
  return data.publicUrl;
}

function withHomeCardsTileImageUrl(row: HomeCardsTileSettings): HomeCardsTileSettings {
  return {
    ...row,
    image_url: row.image_path ? getHomeCardsTileImageUrl(row.image_path) : null,
  };
}

export async function getHomeCardsTileSettings(): Promise<HomeCardsTileSettings | null> {
  const { data, error } = await supabase
    .from('home_cards_tile_settings' as any)
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    if (error.code === '42P01') return null;
    throw new Error(error.message);
  }

  return data ? withHomeCardsTileImageUrl(data as unknown as HomeCardsTileSettings) : null;
}

export async function uploadHomeCardsTileImage(input: {
  localUri: string;
  fileName?: string | null;
  mimeType?: string | null;
  webFile?: Blob | null;
}): Promise<string> {
  return uploadCompressedImage(input, {
    bucket: HOME_CARDS_TILE_BUCKET,
    folder: 'my-cards',
    prefix: 'my-cards',
    maxWidth: 1200,
    quality: 0.75,
  });
}

export async function updateHomeCardsTileSettings(input: {
  imagePath: string | null;
  backgroundColor: string;
}): Promise<HomeCardsTileSettings> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('home_cards_tile_settings' as any)
    .upsert(
      {
        id: 1,
        image_path: input.imagePath,
        background_color: input.backgroundColor,
        updated_by: user?.id ?? null,
      },
      { onConflict: 'id' }
    )
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return withHomeCardsTileImageUrl(data as unknown as HomeCardsTileSettings);
}

// ============================================================================
// Matches hero banner artwork
// ============================================================================

export function getMatchesHeroImageUrl(imagePath: string): string {
  const { data } = supabase.storage.from(MATCHES_HERO_BUCKET).getPublicUrl(imagePath);
  return data.publicUrl;
}

function withMatchesHeroImageUrl(row: MatchesHeroSettings): MatchesHeroSettings {
  return {
    ...row,
    image_url: row.image_path ? getMatchesHeroImageUrl(row.image_path) : null,
  };
}

export async function getMatchesHeroSettings(): Promise<MatchesHeroSettings | null> {
  const { data, error } = await (supabase as any)
    .from('matches_hero_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    if (error.code === '42P01') return null;
    throw new Error(error.message);
  }

  return data ? withMatchesHeroImageUrl(data as MatchesHeroSettings) : null;
}

export async function uploadMatchesHeroImage(input: {
  localUri: string;
  fileName?: string | null;
  mimeType?: string | null;
  webFile?: Blob | null;
}): Promise<string> {
  return uploadCompressedImage(input, {
    bucket: MATCHES_HERO_BUCKET,
    folder: 'matches-hero',
    prefix: 'matches-hero',
    maxWidth: 1600,
    quality: 0.75,
  });
}

export async function updateMatchesHeroSettings(input: {
  imagePath: string | null;
  backgroundColor: string;
}): Promise<MatchesHeroSettings> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await (supabase as any)
    .from('matches_hero_settings')
    .upsert(
      {
        id: 1,
        image_path: input.imagePath,
        background_color: input.backgroundColor,
        updated_by: user?.id ?? null,
      },
      { onConflict: 'id' }
    )
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return withMatchesHeroImageUrl(data as MatchesHeroSettings);
}

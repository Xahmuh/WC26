// ============================================================================
// Shared domain types
// ----------------------------------------------------------------------------
// These mirror the Postgres enums/tables defined in
// supabase/migrations/001_initial_schema.sql so the DB stays the single
// source of truth. Display-friendly labels live in lib/constants.ts.
// ============================================================================

export type MatchStatus =
  | 'SCHEDULED'
  | 'IN_PLAY'
  | 'FINISHED'
  | 'POSTPONED'
  | 'CANCELLED';

export type MatchStage =
  | 'GROUP'
  | 'ROUND_OF_16'
  | 'QUARTER_FINAL'
  | 'SEMI_FINAL'
  | 'THIRD_PLACE'
  | 'FINAL';

export interface Team {
  id: string;
  external_id: number;
  name: string;
  short_name: string | null;
  code: string | null;
  flag_url: string | null;
  group_name: string | null;
}

export interface Match {
  id: string;
  external_id: number;
  /** TBD placeholder when the team is not yet decided (knockout bracket). */
  home_team: Team;
  away_team: Team;
  is_placeholder: boolean;
  home_score: number | null;
  away_score: number | null;
  status: MatchStatus;
  stage: MatchStage;
  group_name: string | null;
  kickoff_time: string; // ISO-8601 (UTC)
  venue: string | null;
  points_multiplier: number;
}

export interface Prediction {
  id: string;
  user_id: string;
  match_id: string;
  pred_home_score: number;
  pred_away_score: number;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface PointsRecord {
  match_id: string;
  winner_points: number;
  home_goal_points: number;
  away_goal_points: number;
  exact_bonus: number;
  total_points: number;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  total_points: number;
  predictions_made: number;
  predictions_scored: number;
  exact_predictions: number;
  supported_teams: string[] | null;
  previous_rank?: number;
}

export interface UserProfile {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  total_points: number;
  email: string | null;
  last_login: string | null;
  role: 'user' | 'admin';
  supported_teams: string[] | null;
}

// Outcome of a match (or a prediction) for scoring purposes.
export type Outcome = 'HOME' | 'DRAW' | 'AWAY';

export interface PointsBreakdown {
  winner_points: number;
  home_goal_points: number;
  away_goal_points: number;
  exact_bonus: number;
  total_points: number;
}

// Custom Prediction Questions (Tournament-wide)
export interface PredictionQuestion {
  id: string;
  question_text: string;
  options: string[]; // JSON array of options
  correct_answer: string | null;
  points: number;
  status: 'open' | 'closed' | 'resolved';
  created_at: string;
  resolved_at: string | null;
  created_by: string | null;
  lock_at?: string;
}

// Hero banner slides shown at the top of the home screen (admin-managed)
export interface HeroSlide {
  id: string;
  image_path: string; // path inside the `hero-banners` storage bucket
  background_color: string;
  title: string | null;
  subtitle: string | null;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserQuestionPrediction {
  id: string;
  user_id: string;
  question_id: string;
  prediction: string;
  created_at: string;
  updated_at: string;
  status?: 'pending' | 'approved' | 'rejected';
}

// ============================================================================
// Supabase row shapes + Database generic for a typed client.
// Only the columns the mobile app touches are modelled here.
// ============================================================================

export interface UserRow {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  total_points: number;
  email: string | null;
  last_login: string | null;
  role: 'user' | 'admin';
  created_at: string;
  supported_teams: string[] | null;
}

export interface TeamRow {
  id: string;
  external_id: number;
  name: string;
  short_name: string | null;
  code: string | null;
  flag_url: string | null;
  group_name: string | null;
  created_at: string;
}

export interface MatchRow {
  id: string;
  external_id: number;
  home_team_id: string | null;
  away_team_id: string | null;
  home_score: number | null;
  away_score: number | null;
  status: MatchStatus;
  stage: MatchStage;
  group_name: string | null;
  kickoff_time: string;
  venue: string | null;
  last_synced_at: string | null;
  created_at: string;
  points_multiplier: number;
  is_placeholder: boolean;
}

export interface PredictionRow {
  id: string;
  user_id: string;
  match_id: string;
  pred_home_score: number;
  pred_away_score: number;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface PointsRow {
  id: string;
  user_id: string;
  match_id: string | null;
  question_id: string | null;
  winner_points: number;
  home_goal_points: number;
  away_goal_points: number;
  exact_bonus: number;
  total_points: number;
  calculated_at: string;
}

export interface LeaderboardRow {
  user_id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  total_points: number;
  predictions_made: number;
  predictions_scored: number;
  exact_predictions: number;
  rank: number;
  supported_teams: string[] | null;
}

// The Supabase client generic comes straight from the auto-generated schema
// types (types/database.types.ts) — they carry the `Relationships` and
// `__InternalSupabase` metadata supabase-js needs to infer Insert/Update types.
// The hand-written *Row interfaces above are the app's own narrowed view of the
// data (e.g. non-null leaderboard fields) used by the mappers.
export type { Database } from './database.types';

// Shape returned when we select a match with its joined teams.
export interface MatchWithTeamsRow extends MatchRow {
  home_team: TeamRow | null;
  away_team: TeamRow | null;
}

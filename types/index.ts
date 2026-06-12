// ============================================================================
// Shared domain types
// ----------------------------------------------------------------------------
// These mirror the Postgres enums/tables defined in
// supabase/migrations/001_initial_schema.sql so the DB stays the single
// source of truth. Display-friendly labels live in lib/constants.ts.
// ============================================================================

export type MatchStatus =
  | 'SCHEDULED'
  | 'TIMED'
  | 'IN_PLAY'
  | 'PAUSED'
  | 'EXTRA_TIME'
  | 'PENALTY_SHOOTOUT'
  | 'FINISHED'
  | 'POSTPONED'
  | 'CANCELLED'
  | 'SUSPENDED';

export type MatchStage =
  | 'GROUP'
  | 'ROUND_OF_32'
  | 'ROUND_OF_16'
  | 'QUARTER_FINAL'
  | 'SEMI_FINAL'
  | 'THIRD_PLACE'
  | 'FINAL';

export type MatchDecisionMethod = 'FT' | 'ET' | 'PEN';

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
  is_knockout: boolean;
  home_score: number | null;
  away_score: number | null;
  winner_team_id: string | null;
  decision_method: MatchDecisionMethod | null;
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
  pred_winner_team_id: string | null;
  applied_user_card_id: string | null;
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

// ── Mini Leagues ────────────────────────────────────────────────────────────

export interface League {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  owner_id: string;
  invite_code: string;
  max_members: number | null;
  created_at: string;
  updated_at: string;
}

export interface LeagueMember {
  league_id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
}

/** A league in "My Leagues" — the league plus the caller's membership context. */
export interface MyLeague extends League {
  member_count: number;
  my_role: 'owner' | 'member';
  my_rank: number | null;
}

/** Row from the `league_leaderboard` view — same shape as LeaderboardEntry, scoped to a league. */
export interface LeagueLeaderboardEntry {
  league_id: string;
  user_id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  total_points: number;
  predictions_made: number;
  predictions_scored: number;
  exact_predictions: number;
  supported_teams: string[] | null;
  league_rank: number;
  league_member_count: number;
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
  card_image_path: string | null;
  card_image_url?: string | null;
  points: number;
  status: 'open' | 'closed' | 'resolved';
  created_at: string;
  resolved_at: string | null;
  created_by: string | null;
  lock_at?: string;
}

export type BannerPlacement = 'top' | 'bottom';
export type { HomeBannerPosition } from '@/lib/bannerPositions';

export interface BannerCollection {
  id: string;
  title: string;
  sort_order: number;
  home_position: import('@/lib/bannerPositions').HomeBannerPosition;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Banner slides shown on the home screen (admin-managed)
export interface HeroSlide {
  id: string;
  image_path: string; // path inside the `hero-banners` storage bucket
  background_color: string;
  title: string | null;
  subtitle: string | null;
  link_url: string | null;
  placement: BannerPlacement;
  collection_id: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HomeCardsTileSettings {
  id: number;
  image_path: string | null;
  image_url?: string | null;
  background_color: string;
  updated_by: string | null;
  updated_at: string;
}

export interface MatchesHeroSettings {
  id: number;
  image_path: string | null;
  image_url?: string | null;
  background_color: string;
  updated_by: string | null;
  updated_at: string;
}

export interface CardDefinition {
  id: string;
  name: string;
  description: string | null;
  image_path: string | null;
  image_url?: string | null;
  award_stage: MatchStage;
  threshold_percent: number;
  usable_from_stage: MatchStage;
  usable_until_stage: MatchStage;
  max_uses: number;
  multiplier_bonus: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserCard {
  id: string;
  user_id: string;
  card_definition_id: string;
  earned_stage: MatchStage;
  usable_from_stage: MatchStage;
  usable_until_stage: MatchStage;
  multiplier_bonus: number;
  max_uses: number;
  uses_remaining: number;
  status: 'active' | 'used' | 'revoked';
  unlocked_at: string;
  updated_at: string;
  definition?: CardDefinition | null;
}

export interface StageCardSetting {
  stage: MatchStage;
  expected_matches: number;
  updated_by: string | null;
  updated_at: string;
}

export interface ApiProvider {
  id: string;
  name: string;
  adapter: string;
  base_url: string;
  competition_code: string;
  token_secret_name: string;
  is_active: boolean;
  rate_limit_per_minute: number | null;
  supports_fixtures: boolean;
  supports_results: boolean;
  notes: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface AuthQuote {
  id: string;
  quote_text: string;
  author: string;
  sort_order: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthScreenSettings {
  id: number;
  developer_name: string;
  updated_by: string | null;
  updated_at: string;
}

export interface AuthContent {
  quotes: AuthQuote[];
  settings: AuthScreenSettings | null;
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

export interface PredictionNews {
  id: string;
  message: string;
  is_active: boolean;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
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
  winner_team_id: string | null;
  decision_method: MatchDecisionMethod | null;
  status: MatchStatus;
  stage: MatchStage;
  group_name: string | null;
  kickoff_time: string;
  venue: string | null;
  last_synced_at: string | null;
  created_at: string;
  points_multiplier: number;
  is_placeholder: boolean;
  is_knockout: boolean;
}

export interface PredictionRow {
  id: string;
  user_id: string;
  match_id: string;
  pred_home_score: number;
  pred_away_score: number;
  pred_winner_team_id: string | null;
  applied_user_card_id: string | null;
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

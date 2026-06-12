export type ProviderWinner = 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null;

export interface ProviderMatchForResultState {
  id: number;
  status?: string | null;
  lastUpdated?: string | null;
  score?: {
    fullTime?: { home?: number | null; away?: number | null } | null;
    regularTime?: { home?: number | null; away?: number | null } | null;
    winner?: ProviderWinner;
  } | null;
}

export interface ProviderScoreSnapshot {
  homeScore: number | null;
  awayScore: number | null;
}

export type ResultDecision =
  | ({ action: 'finalize' } & ProviderScoreSnapshot)
  | ({ action: 'defer'; reason: 'finished_without_final_score' } & ProviderScoreSnapshot)
  | ({ action: 'skip'; reason: 'not_finished' } & ProviderScoreSnapshot);

export const POLLABLE_MATCH_FILTER =
  'status.neq.FINISHED,home_score.is.null,away_score.is.null';

export function getResultDecision(match: ProviderMatchForResultState): ResultDecision {
  const score = readProviderScore(match);

  if (match.status !== 'FINISHED') {
    return { action: 'skip', reason: 'not_finished', ...score };
  }

  if (hasValidFinalScore(score)) {
    return { action: 'finalize', ...score };
  }

  return { action: 'defer', reason: 'finished_without_final_score', ...score };
}

export function hasValidFinalScore(
  score: ProviderScoreSnapshot
): score is { homeScore: number; awayScore: number } {
  return isValidScore(score.homeScore) && isValidScore(score.awayScore);
}

export function isPollableMatchSnapshot(match: {
  status: string;
  home_score: number | null;
  away_score: number | null;
}): boolean {
  return (
    match.status !== 'FINISHED' ||
    !hasValidFinalScore({
      homeScore: match.home_score,
      awayScore: match.away_score,
    })
  );
}

function readProviderScore(match: ProviderMatchForResultState): ProviderScoreSnapshot {
  return {
    homeScore: readNullableScore(
      match.score?.regularTime?.home ?? match.score?.fullTime?.home ?? null
    ),
    awayScore: readNullableScore(
      match.score?.regularTime?.away ?? match.score?.fullTime?.away ?? null
    ),
  };
}

function readNullableScore(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}

function isValidScore(value: number | null): value is number {
  return value !== null && Number.isInteger(value) && value >= 0;
}

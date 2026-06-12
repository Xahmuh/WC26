import type { MatchStatus } from '@/types';

export const LIVE_MATCH_STATUSES: readonly MatchStatus[] = [
  'IN_PLAY',
  'PAUSED',
  'EXTRA_TIME',
  'PENALTY_SHOOTOUT',
];

export const PREDICTION_OPEN_STATUSES: readonly MatchStatus[] = [
  'SCHEDULED',
  'TIMED',
];

export function isLiveMatchStatus(status: string | null | undefined): boolean {
  return LIVE_MATCH_STATUSES.includes(normalizeStatus(status) as MatchStatus);
}

export function isFinishedMatchStatus(status: string | null | undefined): boolean {
  const normalized = normalizeStatus(status);
  return normalized === 'FINISHED' || normalized === 'COMPLETED';
}

export function isPredictionOpenStatus(status: string | null | undefined): boolean {
  return PREDICTION_OPEN_STATUSES.includes(normalizeStatus(status) as MatchStatus);
}

export function shouldShowMatchScore(status: string | null | undefined): boolean {
  return isLiveMatchStatus(status) || isFinishedMatchStatus(status);
}

function normalizeStatus(status: string | null | undefined): string {
  return status?.toUpperCase() ?? '';
}

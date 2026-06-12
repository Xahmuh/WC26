import type { MatchStage, MatchStatus } from '@/types';

export const STAGE_LABELS: Record<MatchStage, string> = {
  GROUP: 'Group Stage',
  ROUND_OF_32: 'Round of 32',
  ROUND_OF_16: 'Round of 16',
  QUARTER_FINAL: 'Quarter-final',
  SEMI_FINAL: 'Semi-final',
  THIRD_PLACE: 'Third-place play-off',
  FINAL: 'Final',
};

export const STATUS_LABELS: Record<MatchStatus, string> = {
  SCHEDULED: 'Scheduled',
  TIMED: 'Scheduled',
  IN_PLAY: 'In play',
  PAUSED: 'Paused',
  EXTRA_TIME: 'Extra time',
  PENALTY_SHOOTOUT: 'Penalties',
  FINISHED: 'Finished',
  POSTPONED: 'Postponed',
  CANCELLED: 'Cancelled',
  SUSPENDED: 'Suspended',
};

export const MIN_GOALS = 0;
export const MAX_GOALS = 20;

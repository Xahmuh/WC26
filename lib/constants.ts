import type { MatchStage, MatchStatus } from '@/types';

export const STAGE_LABELS: Record<MatchStage, string> = {
  GROUP: 'Group Stage',
  ROUND_OF_16: 'Round of 16',
  QUARTER_FINAL: 'Quarter-final',
  SEMI_FINAL: 'Semi-final',
  THIRD_PLACE: 'Third-place play-off',
  FINAL: 'Final',
};

export const STATUS_LABELS: Record<MatchStatus, string> = {
  SCHEDULED: 'Scheduled',
  IN_PLAY: 'In play',
  FINISHED: 'Finished',
  POSTPONED: 'Postponed',
  CANCELLED: 'Cancelled',
};

export const MIN_GOALS = 0;
export const MAX_GOALS = 20;

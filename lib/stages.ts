import type { MatchStage } from '@/types';

export const STAGE_ORDER: MatchStage[] = [
  'GROUP',
  'ROUND_OF_32',
  'ROUND_OF_16',
  'QUARTER_FINAL',
  'SEMI_FINAL',
  'THIRD_PLACE',
  'FINAL',
];

export const DEFAULT_STAGE_MATCH_COUNTS: Record<MatchStage, number> = {
  GROUP: 72,
  ROUND_OF_32: 16,
  ROUND_OF_16: 8,
  QUARTER_FINAL: 4,
  SEMI_FINAL: 2,
  THIRD_PLACE: 1,
  FINAL: 1,
};

export function getStageRank(stage: MatchStage): number {
  const index = STAGE_ORDER.indexOf(stage);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}


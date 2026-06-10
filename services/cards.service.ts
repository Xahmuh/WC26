import { supabase } from '@/lib/supabase';
import { STAGE_ORDER, getStageRank } from '@/lib/stages';
import type { CardDefinition, MatchStage, UserCard } from '@/types';

const CARD_IMAGES_BUCKET = 'card-images';

export const CARD_STAGE_ORDER = STAGE_ORDER;

export function isStageInCardWindow(
  stage: MatchStage,
  fromStage: MatchStage,
  untilStage: MatchStage
): boolean {
  const rank = getStageRank(stage);
  return rank >= getStageRank(fromStage) && rank <= getStageRank(untilStage);
}

export function isUserCardUsableForStage(card: UserCard, stage: MatchStage): boolean {
  return (
    card.status === 'active' &&
    card.uses_remaining > 0 &&
    isStageInCardWindow(stage, card.usable_from_stage, card.usable_until_stage)
  );
}

function getCardDefinitionImageUrl(imagePath: string): string {
  const { data } = supabase.storage.from(CARD_IMAGES_BUCKET).getPublicUrl(imagePath);
  return data.publicUrl;
}

function mapCardDefinition(row: any): CardDefinition {
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

export async function getCardDefinitions(): Promise<CardDefinition[]> {
  const { data, error } = await (supabase as any)
    .from('card_definitions')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) {
    if (error.code === '42P01' || error.code === '42703') return [];
    throw new Error(error.message);
  }

  return (data ?? [])
    .map(mapCardDefinition)
    .sort((a: CardDefinition, b: CardDefinition) => {
      const stageDiff = getStageRank(a.award_stage) - getStageRank(b.award_stage);
      if (stageDiff !== 0) return stageDiff;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
}

function mapUserCard(row: any): UserCard {
  const definitionRow = Array.isArray(row.definition) ? row.definition[0] : row.definition;

  return {
    id: row.id,
    user_id: row.user_id,
    card_definition_id: row.card_definition_id,
    earned_stage: row.earned_stage as MatchStage,
    usable_from_stage: row.usable_from_stage as MatchStage,
    usable_until_stage: row.usable_until_stage as MatchStage,
    multiplier_bonus: row.multiplier_bonus,
    max_uses: row.max_uses,
    uses_remaining: row.uses_remaining,
    status: row.status,
    unlocked_at: row.unlocked_at,
    updated_at: row.updated_at,
    definition: definitionRow ? mapCardDefinition(definitionRow) : null,
  };
}

export async function getMyUserCards(): Promise<UserCard[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user.id;
  if (!userId) return [];

  const { data, error } = await (supabase as any)
    .from('user_cards')
    .select('*, definition:card_definition_id(*)')
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false });

  if (error) {
    if (error.code === '42P01' || error.code === '42703') return [];
    throw new Error(error.message);
  }

  return (data ?? []).map(mapUserCard);
}

import { useQuery } from '@tanstack/react-query';

import { EMPTY_PERFORMANCE_STATS, computePerformanceKPIs } from '@/lib/performanceMetrics';
import { supabase } from '@/lib/supabase';
import { fetchUserPerformance, fetchUserPointsBreakdown, fetchUserStreak } from '@/lib/supabase/queries/performance';
import type { ComputedKPIs, PerformancePointsBreakdown } from '@/types/performance';

const CARD_IMAGES_BUCKET = 'card-images';

export interface PlayerProfileCard {
  user_card_id: string;
  card_definition_id: string;
  name: string;
  image_path: string | null;
  image_url: string | null;
  multiplier_bonus: number;
  status: 'active' | 'used';
  unlocked_at: string;
}

export interface PlayerProfileData {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  total_points: number;
  supported_teams: string[] | null;
  breakdown: PerformancePointsBreakdown;
  kpis: ComputedKPIs;
  earned_cards: PlayerProfileCard[];
}

function getCardImageUrl(imagePath: string | null): string | null {
  if (!imagePath) return null;
  const { data } = supabase.storage.from(CARD_IMAGES_BUCKET).getPublicUrl(imagePath);
  return data.publicUrl;
}

export function usePlayerProfile(playerId: string | undefined) {
  return useQuery({
    queryKey: ['playerProfile', playerId],
    queryFn: async (): Promise<PlayerProfileData | null> => {
      if (!playerId) return null;

      // 1. Fetch user profile
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, display_name, username, avatar_url, total_points, supported_teams')
        .eq('id', playerId)
        .maybeSingle();

      if (userError) throw new Error(userError.message);
      if (!user) return null;

      const [
        performanceStats,
        streak,
        pointsBreakdown,
        { data: cards, error: cardsError },
      ] = await Promise.all([
        fetchUserPerformance(playerId),
        fetchUserStreak(playerId),
        fetchUserPointsBreakdown(playerId),
        supabase.rpc('get_player_profile_cards' as any, { p_user_id: playerId }),
      ]);

      if (cardsError) throw new Error(cardsError.message);

      return {
        id: user.id,
        display_name: user.username || user.display_name,
        username: user.username,
        avatar_url: user.avatar_url,
        total_points: user.total_points,
        supported_teams: user.supported_teams as string[] | null,
        breakdown: pointsBreakdown,
        kpis: computePerformanceKPIs(performanceStats ?? EMPTY_PERFORMANCE_STATS, streak),
        earned_cards: ((cards ?? []) as any[]).map((card) => ({
          user_card_id: card.user_card_id,
          card_definition_id: card.card_definition_id,
          name: card.name,
          image_path: card.image_path ?? null,
          image_url: getCardImageUrl(card.image_path ?? null),
          multiplier_bonus: Number(card.multiplier_bonus ?? 0),
          status: card.status === 'used' ? 'used' : 'active',
          unlocked_at: card.unlocked_at,
        })),
      };
    },
    enabled: Boolean(playerId),
    staleTime: 30_000,
  });
}

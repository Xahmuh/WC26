import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export interface PlayerProfileData {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  total_points: number;
  supported_teams: string[] | null;
  breakdown: {
    winner_points: number;
    goal_points: number;
    exact_bonus: number;
    question_points: number;
  };
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

      // 2. Fetch points list for breakdown
      const { data: points, error: pointsError } = await supabase
        .from('points')
        .select('winner_points, home_goal_points, away_goal_points, exact_bonus, total_points, question_id, match_id')
        .eq('user_id', playerId);

      if (pointsError) throw new Error(pointsError.message);

      let winner_points = 0;
      let goal_points = 0;
      let exact_bonus = 0;
      let question_points = 0;

      if (points) {
        for (const p of points) {
          if (p.question_id) {
            question_points += p.total_points || 0;
          } else {
            winner_points += p.winner_points || 0;
            goal_points += (p.home_goal_points || 0) + (p.away_goal_points || 0);
            exact_bonus += p.exact_bonus || 0;
          }
        }
      }

      return {
        id: user.id,
        display_name: user.username || user.display_name,
        username: user.username,
        avatar_url: user.avatar_url,
        total_points: user.total_points,
        supported_teams: user.supported_teams as string[] | null,
        breakdown: {
          winner_points,
          goal_points,
          exact_bonus,
          question_points,
        },
      };
    },
    enabled: Boolean(playerId),
    staleTime: 30_000,
  });
}

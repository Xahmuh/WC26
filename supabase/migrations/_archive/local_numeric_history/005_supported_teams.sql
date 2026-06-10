-- Migration: Supported Teams & Updated Leaderboard
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS supported_teams uuid[] DEFAULT '{}'::uuid[];

-- Constraint to ensure maximum of 3 supported teams
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_supported_teams_check;
ALTER TABLE public.users ADD CONSTRAINT users_supported_teams_check CHECK (cardinality(supported_teams) <= 3);

-- Recreate Leaderboard Materialized View
DROP MATERIALIZED VIEW IF EXISTS public.leaderboard;

CREATE MATERIALIZED VIEW public.leaderboard AS
SELECT
  u.id            AS user_id,
  u.display_name,
  u.avatar_url,
  u.supported_teams,
  COALESCE(SUM(p.total_points), 0)                       AS total_points,
  COUNT(p.id)                                            AS predictions_made,
  COUNT(p.id) FILTER (WHERE p.total_points > 0)          AS predictions_scored,
  COUNT(p.id) FILTER (WHERE p.exact_bonus > 0)           AS exact_predictions,
  RANK() OVER (
    ORDER BY
      COALESCE(SUM(p.total_points), 0) DESC,
      COUNT(p.id) FILTER (WHERE p.exact_bonus > 0) DESC
  )                                                       AS rank
FROM public.users u
LEFT JOIN public.points p ON p.user_id = u.id
GROUP BY u.id, u.display_name, u.avatar_url, u.supported_teams;

CREATE UNIQUE INDEX IF NOT EXISTS leaderboard_user_id_idx ON public.leaderboard(user_id);
GRANT SELECT ON public.leaderboard TO authenticated;

import { useCallback, useEffect, useState } from 'react';

import { safe } from '@/lib/safe';
import { fetchUserPerformance, fetchUserStreak } from '@/lib/supabase/queries/performance';
import type { ComputedKPIs } from '@/types/performance';

function computeKPIs(
  stats: NonNullable<Awaited<ReturnType<typeof fetchUserPerformance>>>,
  streak: Awaited<ReturnType<typeof fetchUserStreak>>,
): ComputedKPIs {
  return {
    accuracyRate: Math.round(safe(stats.correct_predictions, stats.total_predictions) * 100),
    exactScoreAccuracy: Math.round(safe(stats.exact_predictions, stats.total_predictions) * 100),
    pointsPerMatch: parseFloat(safe(stats.total_points, stats.matches_participated).toFixed(1)),
    participationRate: Math.round(safe(stats.matches_participated, stats.total_predictions) * 100),
    streak,
  };
}

export function useUserPerformance(userId: string | null | undefined) {
  const [kpis, setKpis] = useState<ComputedKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => {
    setReloadToken((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setKpis(null);
      return;
    }

    const uid = userId;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [stats, streak] = await Promise.all([
          fetchUserPerformance(uid),
          fetchUserStreak(uid),
        ]);

        if (cancelled) return;

        if (!stats || stats.total_predictions === 0) {
          setKpis(null);
          return;
        }

        setKpis(computeKPIs(stats, streak));
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Unknown error');
        setKpis(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [userId, reloadToken]);

  return { kpis, loading, error, reload };
}

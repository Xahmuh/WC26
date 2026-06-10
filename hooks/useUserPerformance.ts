import { useCallback, useEffect, useState } from 'react';

import { EMPTY_PERFORMANCE_STATS, computePerformanceKPIs } from '@/lib/performanceMetrics';
import { fetchUserPerformance, fetchUserPointsBreakdown, fetchUserStreak } from '@/lib/supabase/queries/performance';
import type { ComputedKPIs, PerformancePointsBreakdown } from '@/types/performance';

export function useUserPerformance(userId: string | null | undefined) {
  const [kpis, setKpis] = useState<ComputedKPIs | null>(null);
  const [breakdown, setBreakdown] = useState<PerformancePointsBreakdown | null>(null);
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
      setBreakdown(null);
      return;
    }

    const uid = userId;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [stats, streak, pointsBreakdown] = await Promise.all([
          fetchUserPerformance(uid),
          fetchUserStreak(uid),
          fetchUserPointsBreakdown(uid),
        ]);

        if (cancelled) return;

        setKpis(computePerformanceKPIs(stats ?? EMPTY_PERFORMANCE_STATS, streak));
        setBreakdown(pointsBreakdown);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Unknown error');
        setKpis(null);
        setBreakdown(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [userId, reloadToken]);

  return { kpis, breakdown, loading, error, reload };
}

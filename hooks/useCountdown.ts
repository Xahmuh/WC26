import { useEffect, useState } from 'react';

import { getCountdown, type Countdown } from '@/lib/dates';

/**
 * Live countdown to an ISO timestamp. Ticks every second until elapsed, then
 * stops the interval to avoid needless re-renders.
 */
export function useCountdown(iso: string): Countdown {
  const [countdown, setCountdown] = useState<Countdown>(() => getCountdown(iso));

  useEffect(() => {
    setCountdown(getCountdown(iso));
    if (getCountdown(iso).isElapsed) return;

    const interval = setInterval(() => {
      const next = getCountdown(iso);
      setCountdown(next);
      if (next.isElapsed) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [iso]);

  return countdown;
}

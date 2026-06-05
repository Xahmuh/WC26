// ============================================================================
// Date helpers — every value the user sees is rendered in their LOCAL timezone.
// Inputs are always ISO-8601 UTC strings coming from Postgres (timestamptz).
// ============================================================================

const VALID = (d: Date): boolean => !Number.isNaN(d.getTime());

/** "Mon, Jun 8 · 21:00" in the device's local timezone. */
export function formatKickoff(iso: string): string {
  const date = new Date(iso);
  if (!VALID(date)) return 'TBD';
  const day = date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const time = date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${day} · ${time}`;
}

/** "21:00" local time. */
export function formatTime(iso: string): string {
  const date = new Date(iso);
  if (!VALID(date)) return '--:--';
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isToday(iso: string): boolean {
  const date = new Date(iso);
  if (!VALID(date)) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function isPast(iso: string): boolean {
  const date = new Date(iso);
  if (!VALID(date)) return false;
  return date.getTime() <= Date.now();
}

export interface Countdown {
  total: number; // milliseconds remaining (0 if elapsed)
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isElapsed: boolean;
}

export function getCountdown(iso: string, from: number = Date.now()): Countdown {
  const target = new Date(iso).getTime();
  const total = Math.max(0, target - from);
  const isElapsed = total <= 0;
  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  return { total, days, hours, minutes, seconds, isElapsed };
}

export function formatCountdown(c: Countdown): string {
  if (c.isElapsed) return 'Kicked off';
  if (c.days > 0) return `${c.days}d ${c.hours}h`;
  if (c.hours > 0) return `${c.hours}h ${c.minutes}m`;
  return `${c.minutes}m ${c.seconds}s`;
}

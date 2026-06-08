import type { Match } from '@/types';

export type HomeMatch = Match & {
  is_golden?: boolean;
  is_match_of_day?: boolean;
  golden_multiplier?: number | null;
};

export function isFinishedLike(status: string | undefined): boolean {
  const normalized = status?.toUpperCase() ?? '';
  return normalized === 'FINISHED' || normalized === 'COMPLETED';
}

export function isUpcomingLike(status: string | undefined): boolean {
  const normalized = status?.toUpperCase() ?? '';
  return normalized === 'SCHEDULED' || normalized === 'UPCOMING' || normalized === 'IN_PLAY';
}

export function isNotStartedMatch(status: string | undefined, kickoffTime: string, nowMs = Date.now()): boolean {
  const normalized = status?.toUpperCase() ?? '';
  if (normalized !== 'SCHEDULED' && normalized !== 'UPCOMING') return false;

  const kickoffMs = new Date(kickoffTime).getTime();
  if (Number.isNaN(kickoffMs)) return false;

  return kickoffMs > nowMs;
}

export function isPredictionClosedMatch(status: string | undefined, kickoffTime: string, nowMs = Date.now()): boolean {
  const normalized = status?.toUpperCase() ?? '';
  if (normalized === 'POSTPONED' || normalized === 'CANCELLED') return false;
  if (normalized === 'IN_PLAY' || normalized === 'FINISHED' || normalized === 'COMPLETED') return true;

  const kickoffMs = new Date(kickoffTime).getTime();
  if (Number.isNaN(kickoffMs)) return false;

  return kickoffMs <= nowMs;
}

export function isTodayLocal(iso: string): boolean {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;

  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

export function formatShortMatchTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'TBD';

  const now = new Date();
  const localDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const matchDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((matchDate.getTime() - localDate.getTime()) / 86400000);

  const time = date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (diffDays === 0) return `Today · ${time}`;
  if (diffDays === 1) return `Tomorrow · ${time}`;
  if (diffDays === -1) return `Yesterday · ${time}`;

  return `${date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })} · ${time}`;
}

export function getGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

export function formatCountdownParts(iso: string): {
  days: number;
  hours: string;
  minutes: string;
  seconds: string;
  remainingMs: number;
  isElapsed: boolean;
} {
  const target = new Date(iso).getTime();
  const remainingMs = Math.max(0, target - Date.now());
  const isElapsed = remainingMs <= 0;
  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = String(Math.floor((totalSeconds / 3600) % 24)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds / 60) % 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');

  return { days, hours, minutes, seconds, remainingMs, isElapsed };
}

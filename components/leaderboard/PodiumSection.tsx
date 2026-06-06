// ============================================================================
// PodiumSection — the Top-3 podium shown above the leaderboard list.
// ----------------------------------------------------------------------------
// Lays out the champion in the centre (tallest), runner-up on the left and
// third place on the right. Renders only the positions that exist, so a
// leaderboard with 1 or 2 players shows just those cards — never empty slots.
//
// Pure presentation: it slices the already-ranked entries it is handed and
// performs no data fetching or ranking calculation.
// ============================================================================

import { View } from 'react-native';

import type { LeaderboardEntry } from '@/types';

import { PodiumCard, type PodiumPlace } from './PodiumCard';

export interface PodiumSectionProps {
  /** Ranked entries (sorted best-first); only the top 3 are used. */
  entries: LeaderboardEntry[];
  currentUserId?: string;
  /** Fired when a podium card is tapped; `place` is the 1–3 position shown. */
  onSelect?: (entry: LeaderboardEntry, place: PodiumPlace) => void;
}

// Visual order across the row: runner-up, champion (centre), third place.
const DISPLAY_ORDER: PodiumPlace[] = [2, 1, 3];

export function PodiumSection({
  entries,
  currentUserId,
  onSelect,
}: PodiumSectionProps): React.JSX.Element | null {
  const top = entries.slice(0, 3);
  if (top.length === 0) return null;

  return (
    <View className="mb-4 flex-row items-end justify-center gap-3 px-1 pt-4">
      {DISPLAY_ORDER.map((place) => {
        const entry = top[place - 1];
        if (!entry) return null;
        return (
          <PodiumCard
            key={entry.user_id}
            entry={entry}
            place={place}
            isCurrentUser={entry.user_id === currentUserId}
            onPress={onSelect ? () => onSelect(entry, place) : undefined}
          />
        );
      })}
    </View>
  );
}

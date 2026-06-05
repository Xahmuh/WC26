// ============================================================================
// App store (Zustand) — lightweight UI state that isn't server data.
// Server data (matches, predictions, leaderboard) lives in React Query.
// ============================================================================

import { create } from 'zustand';

export type MatchFilter = 'ALL' | 'TODAY' | 'UPCOMING' | 'FINISHED';

interface AppState {
  matchFilter: MatchFilter;
  setMatchFilter: (filter: MatchFilter) => void;
}

export const useAppStore = create<AppState>((set) => ({
  matchFilter: 'ALL',
  setMatchFilter: (matchFilter) => set({ matchFilter }),
}));

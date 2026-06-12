import {
  getResultDecision,
  hasValidFinalScore,
  isPollableMatchSnapshot,
} from '../supabase/functions/poll-results/result-state';

describe('poll-results result state', () => {
  it('finalizes a FINISHED provider match with a valid full-time score', () => {
    const decision = getResultDecision({
      id: 537327,
      status: 'FINISHED',
      score: {
        fullTime: { home: 2, away: 1 },
        winner: 'HOME_TEAM',
      },
    });

    expect(decision).toEqual({
      action: 'finalize',
      homeScore: 2,
      awayScore: 1,
    });
    expect(hasValidFinalScore(decision)).toBe(true);
  });

  it('does not finalize a FINISHED provider match when both scores are null', () => {
    expect(getResultDecision({
      id: 537327,
      status: 'FINISHED',
      lastUpdated: '2026-06-11T21:09:14Z',
      score: {
        fullTime: { home: null, away: null },
        winner: null,
      },
    })).toEqual({
      action: 'defer',
      reason: 'finished_without_final_score',
      homeScore: null,
      awayScore: null,
    });
  });

  it('does not finalize a FINISHED provider match when one score is missing', () => {
    expect(getResultDecision({
      id: 537327,
      status: 'FINISHED',
      score: {
        fullTime: { home: 1, away: null },
        winner: null,
      },
    })).toEqual({
      action: 'defer',
      reason: 'finished_without_final_score',
      homeScore: 1,
      awayScore: null,
    });
  });

  it('keeps IN_PLAY database matches eligible for polling', () => {
    expect(isPollableMatchSnapshot({
      status: 'IN_PLAY',
      home_score: null,
      away_score: null,
    })).toBe(true);
  });

  it('does not crash or finalize when the provider omits the score object', () => {
    expect(getResultDecision({
      id: 537327,
      status: 'FINISHED',
    })).toEqual({
      action: 'defer',
      reason: 'finished_without_final_score',
      homeScore: null,
      awayScore: null,
    });
  });

  it('only treats score snapshots as valid when both scores are valid numbers', () => {
    expect(hasValidFinalScore({ homeScore: 0, awayScore: 0 })).toBe(true);
    expect(hasValidFinalScore({ homeScore: 2, awayScore: null })).toBe(false);
    expect(hasValidFinalScore({ homeScore: null, awayScore: 1 })).toBe(false);
    expect(hasValidFinalScore({ homeScore: 1.5, awayScore: 1 })).toBe(false);
  });
});

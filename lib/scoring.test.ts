import {
  applyPointsMultiplier,
  calculateEffectiveMultiplier,
  calculatePoints,
  getOutcome,
  POINTS,
} from '@/lib/scoring';

describe('getOutcome', () => {
  it('detects a home win', () => {
    expect(getOutcome(2, 1)).toBe('HOME');
  });

  it('detects an away win', () => {
    expect(getOutcome(0, 3)).toBe('AWAY');
  });

  it('detects a draw', () => {
    expect(getOutcome(1, 1)).toBe('DRAW');
  });

  it('treats 0-0 as a draw', () => {
    expect(getOutcome(0, 0)).toBe('DRAW');
  });

  it('throws on a negative score', () => {
    expect(() => getOutcome(-1, 0)).toThrow(RangeError);
  });

  it('throws on a non-integer score', () => {
    expect(() => getOutcome(1.5, 0)).toThrow(RangeError);
  });
});

describe('calculatePoints', () => {
  it('awards max points for an exact home-win prediction', () => {
    const result = calculatePoints({ home: 2, away: 1 }, { home: 2, away: 1 });
    expect(result).toEqual({
      winner_points: POINTS.WINNER,
      home_goal_points: 0,
      away_goal_points: 0,
      exact_bonus: POINTS.EXACT_BONUS,
      total_points: POINTS.MAX_PER_MATCH,
    });
  });

  it('awards max points for an exact draw prediction', () => {
    const result = calculatePoints({ home: 1, away: 1 }, { home: 1, away: 1 });
    expect(result.total_points).toBe(POINTS.MAX_PER_MATCH);
    expect(result.exact_bonus).toBe(POINTS.EXACT_BONUS);
  });

  it('awards max points for an exact 0-0 draw prediction', () => {
    const result = calculatePoints({ home: 0, away: 0 }, { home: 0, away: 0 });
    expect(result.total_points).toBe(POINTS.MAX_PER_MATCH);
  });

  it('awards winner points for correct winner but no exact score', () => {
    // Actual 3-0 home win, predicted 1-0 home win → winner only.
    const result = calculatePoints({ home: 3, away: 0 }, { home: 1, away: 0 });
    expect(result.winner_points).toBe(POINTS.WINNER);
    expect(result.away_goal_points).toBe(0);
    expect(result.home_goal_points).toBe(0);
    expect(result.exact_bonus).toBe(0);
    expect(result.total_points).toBe(POINTS.WINNER);
  });

  it('does not award partial home-goal points when winner is wrong', () => {
    // Actual 2-3 away win, predicted 2-1 home win.
    const result = calculatePoints({ home: 2, away: 3 }, { home: 2, away: 1 });
    expect(result.winner_points).toBe(0);
    expect(result.home_goal_points).toBe(0);
    expect(result.away_goal_points).toBe(0);
    expect(result.exact_bonus).toBe(0);
    expect(result.total_points).toBe(0);
  });

  it('does not award partial away-goal points when winner is wrong', () => {
    // Actual 1-1 draw, predicted 0-1 away win.
    const result = calculatePoints({ home: 1, away: 1 }, { home: 0, away: 1 });
    expect(result.winner_points).toBe(0);
    expect(result.home_goal_points).toBe(0);
    expect(result.away_goal_points).toBe(0);
    expect(result.total_points).toBe(0);
  });

  it('awards correct winner only when one goal matches but score is not exact', () => {
    // Actual 2-1 home win, predicted 2-0 home win.
    const result = calculatePoints({ home: 2, away: 1 }, { home: 2, away: 0 });
    expect(result.winner_points).toBe(POINTS.WINNER);
    expect(result.home_goal_points).toBe(0);
    expect(result.away_goal_points).toBe(0);
    expect(result.exact_bonus).toBe(0);
    expect(result.total_points).toBe(POINTS.WINNER);
  });

  it('awards 0 for a completely wrong prediction', () => {
    // Actual 0-2 away win, predicted 3-0 home win.
    const result = calculatePoints({ home: 0, away: 2 }, { home: 3, away: 0 });
    expect(result).toEqual({
      winner_points: 0,
      home_goal_points: 0,
      away_goal_points: 0,
      exact_bonus: 0,
      total_points: 0,
    });
  });

  it('uses explicit qualifying team for knockout winner points', () => {
    const result = calculatePoints(
      { home: 1, away: 1, isKnockout: true, winnerTeamId: 'away-team' },
      { home: 1, away: 1, winnerTeamId: 'away-team' }
    );
    expect(result.winner_points).toBe(POINTS.WINNER);
    expect(result.exact_bonus).toBe(POINTS.EXACT_BONUS);
  });

  it('does not infer knockout qualifier from the 90-minute score', () => {
    const result = calculatePoints(
      { home: 2, away: 0, isKnockout: true, winnerTeamId: 'away-team' },
      { home: 2, away: 0, winnerTeamId: 'home-team' }
    );
    expect(result.winner_points).toBe(0);
    expect(result.exact_bonus).toBe(POINTS.EXACT_BONUS);
  });

  it('awards knockout qualifier points independently of a wrong 90-minute score', () => {
    const result = calculatePoints(
      { home: 1, away: 1, isKnockout: true, winnerTeamId: 'home-team' },
      { home: 2, away: 1, winnerTeamId: 'home-team' }
    );
    expect(result.winner_points).toBe(POINTS.WINNER);
    expect(result.exact_bonus).toBe(0);
  });

  it('never returns negative or above the max', () => {
    const samples: Array<[Parameters<typeof calculatePoints>[0], Parameters<typeof calculatePoints>[1]]> = [
      [{ home: 0, away: 0 }, { home: 5, away: 5 }],
      [{ home: 7, away: 2 }, { home: 0, away: 9 }],
      [{ home: 4, away: 4 }, { home: 4, away: 4 }],
    ];
    for (const [actual, predicted] of samples) {
      const { total_points } = calculatePoints(actual, predicted);
      expect(total_points).toBeGreaterThanOrEqual(0);
      expect(total_points).toBeLessThanOrEqual(POINTS.MAX_PER_MATCH);
    }
  });
});

describe('multiplier helpers', () => {
  it('combines match multiplier and card bonus additively', () => {
    expect(calculateEffectiveMultiplier(2, 3)).toBe(5);
  });

  it('applies a legend-card style effective multiplier to every scoring field', () => {
    const base = calculatePoints(
      { home: 1, away: 1, isKnockout: true, winnerTeamId: 'home-team' },
      { home: 1, away: 1, winnerTeamId: 'home-team' }
    );
    const effectiveMultiplier = calculateEffectiveMultiplier(2, 3);

    expect(applyPointsMultiplier(base, effectiveMultiplier)).toEqual({
      winner_points: POINTS.WINNER * effectiveMultiplier,
      home_goal_points: 0,
      away_goal_points: 0,
      exact_bonus: POINTS.EXACT_BONUS * effectiveMultiplier,
      total_points: POINTS.MAX_PER_MATCH * effectiveMultiplier,
    });
  });

  it('rejects invalid multipliers', () => {
    expect(() => calculateEffectiveMultiplier(1, -1)).toThrow(RangeError);
    expect(() => applyPointsMultiplier({
      winner_points: 1,
      home_goal_points: 0,
      away_goal_points: 0,
      exact_bonus: 0,
      total_points: 1,
    }, 1.5)).toThrow(RangeError);
  });
});

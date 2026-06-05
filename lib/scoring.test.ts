import { calculatePoints, getOutcome, POINTS } from '@/lib/scoring';

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
  it('awards the full 14 for an exact home-win prediction', () => {
    const result = calculatePoints({ home: 2, away: 1 }, { home: 2, away: 1 });
    expect(result).toEqual({
      winner_points: POINTS.WINNER,
      home_goal_points: POINTS.HOME_GOAL,
      away_goal_points: POINTS.AWAY_GOAL,
      exact_bonus: POINTS.EXACT_BONUS,
      total_points: POINTS.MAX_PER_MATCH,
    });
  });

  it('awards 14 for an exact draw prediction', () => {
    const result = calculatePoints({ home: 1, away: 1 }, { home: 1, away: 1 });
    expect(result.total_points).toBe(POINTS.MAX_PER_MATCH);
    expect(result.exact_bonus).toBe(POINTS.EXACT_BONUS);
  });

  it('awards 14 for an exact 0-0 draw prediction', () => {
    const result = calculatePoints({ home: 0, away: 0 }, { home: 0, away: 0 });
    expect(result.total_points).toBe(POINTS.MAX_PER_MATCH);
  });

  it('awards 5 for correct winner but no goal matches', () => {
    // Actual 3-0 home win, predicted 1-0 home win → winner only.
    const result = calculatePoints({ home: 3, away: 0 }, { home: 1, away: 0 });
    expect(result.winner_points).toBe(POINTS.WINNER);
    expect(result.away_goal_points).toBe(POINTS.AWAY_GOAL); // away 0 == 0
    expect(result.home_goal_points).toBe(0);
    expect(result.exact_bonus).toBe(0);
    expect(result.total_points).toBe(POINTS.WINNER + POINTS.AWAY_GOAL);
  });

  it('awards only the home-goal points when winner is wrong but home matches', () => {
    // Actual 2-3 away win, predicted 2-1 home win.
    const result = calculatePoints({ home: 2, away: 3 }, { home: 2, away: 1 });
    expect(result.winner_points).toBe(0);
    expect(result.home_goal_points).toBe(POINTS.HOME_GOAL);
    expect(result.away_goal_points).toBe(0);
    expect(result.exact_bonus).toBe(0);
    expect(result.total_points).toBe(POINTS.HOME_GOAL);
  });

  it('awards only the away-goal points when winner is wrong but away matches', () => {
    // Actual 1-1 draw, predicted 0-1 away win.
    const result = calculatePoints({ home: 1, away: 1 }, { home: 0, away: 1 });
    expect(result.winner_points).toBe(0);
    expect(result.home_goal_points).toBe(0);
    expect(result.away_goal_points).toBe(POINTS.AWAY_GOAL);
    expect(result.total_points).toBe(POINTS.AWAY_GOAL);
  });

  it('awards correct winner + one goal but no exact bonus', () => {
    // Actual 2-1 home win, predicted 2-0 home win.
    const result = calculatePoints({ home: 2, away: 1 }, { home: 2, away: 0 });
    expect(result.winner_points).toBe(POINTS.WINNER);
    expect(result.home_goal_points).toBe(POINTS.HOME_GOAL);
    expect(result.away_goal_points).toBe(0);
    expect(result.exact_bonus).toBe(0);
    expect(result.total_points).toBe(POINTS.WINNER + POINTS.HOME_GOAL);
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

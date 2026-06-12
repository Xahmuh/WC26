import {
  isLiveMatchStatus,
  isPredictionOpenStatus,
  shouldShowMatchScore,
} from './matchStatus';

describe('match status helpers', () => {
  it('treats active provider states as live', () => {
    expect(isLiveMatchStatus('IN_PLAY')).toBe(true);
    expect(isLiveMatchStatus('PAUSED')).toBe(true);
    expect(isLiveMatchStatus('EXTRA_TIME')).toBe(true);
    expect(isLiveMatchStatus('PENALTY_SHOOTOUT')).toBe(true);
  });

  it('does not treat suspended or scheduled matches as live', () => {
    expect(isLiveMatchStatus('SUSPENDED')).toBe(false);
    expect(isLiveMatchStatus('SCHEDULED')).toBe(false);
  });

  it('shows scores only for live or finished matches', () => {
    expect(shouldShowMatchScore('IN_PLAY')).toBe(true);
    expect(shouldShowMatchScore('FINISHED')).toBe(true);
    expect(shouldShowMatchScore('TIMED')).toBe(false);
  });

  it('keeps predictions open for scheduled provider states only', () => {
    expect(isPredictionOpenStatus('SCHEDULED')).toBe(true);
    expect(isPredictionOpenStatus('TIMED')).toBe(true);
    expect(isPredictionOpenStatus('PAUSED')).toBe(false);
  });
});

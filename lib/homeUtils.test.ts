import {
  isMissedPredictionMatch,
  isOpenPredictionMatch,
  isVisibleTodayMatch,
} from '@/components/home/homeUtils';
import type { Match, Team } from '@/types';

const TEAM: Team = {
  id: 'team-1',
  external_id: 1,
  name: 'Team One',
  short_name: 'ONE',
  code: 'ONE',
  flag_url: null,
  group_name: 'A',
};

function makeMatch(overrides: Partial<Match> = {}): Match {
  const now = new Date('2026-06-12T12:00:00.000Z').getTime();

  return {
    id: 'match-1',
    external_id: 1,
    home_team: TEAM,
    away_team: { ...TEAM, id: 'team-2', external_id: 2, name: 'Team Two' },
    is_placeholder: false,
    is_knockout: false,
    home_score: null,
    away_score: null,
    winner_team_id: null,
    decision_method: null,
    status: 'SCHEDULED',
    stage: 'GROUP',
    group_name: 'A',
    kickoff_time: new Date(now + 60_000).toISOString(),
    venue: null,
    points_multiplier: 1,
    ...overrides,
  };
}

describe('home prediction match helpers', () => {
  const nowMs = new Date('2026-06-12T12:00:00.000Z').getTime();

  it('counts concrete future matches as open to pick', () => {
    expect(isOpenPredictionMatch(makeMatch(), nowMs)).toBe(true);
  });

  it('counts Postgres timestamptz strings as open on native-safe parsing', () => {
    const match = makeMatch({
      status: 'TIMED',
      kickoff_time: '2026-06-13 19:00:00+00',
    });

    expect(isOpenPredictionMatch(match, new Date('2026-06-13T06:20:00.000Z').getTime())).toBe(true);
  });

  it('does not count future TBD placeholders as open to pick', () => {
    const tbdMatch = makeMatch({
      is_placeholder: true,
      home_team: { ...TEAM, id: '', name: 'TBD' },
      away_team: { ...TEAM, id: '', name: 'TBD' },
    });

    expect(isOpenPredictionMatch(tbdMatch, nowMs)).toBe(false);
  });

  it('does not count TBD placeholders as missed after kickoff', () => {
    const tbdMatch = makeMatch({
      is_placeholder: true,
      kickoff_time: new Date(nowMs - 60_000).toISOString(),
    });

    expect(isMissedPredictionMatch(tbdMatch, nowMs)).toBe(false);
  });

  it('keeps live matches visible in today matches', () => {
    const liveMatch = makeMatch({
      status: 'IN_PLAY',
      kickoff_time: new Date(nowMs - 30 * 60_000).toISOString(),
      home_score: 1,
      away_score: 0,
    });

    expect(isVisibleTodayMatch(liveMatch, nowMs)).toBe(true);
  });

  it('hides matches from today matches after the result is recorded', () => {
    const finishedMatch = makeMatch({
      status: 'FINISHED',
      kickoff_time: new Date(nowMs - 2 * 60 * 60_000).toISOString(),
      home_score: 2,
      away_score: 1,
    });

    expect(isVisibleTodayMatch(finishedMatch, nowMs)).toBe(false);
  });
});

import type { Match, MatchWithTeamsRow, Team, TeamRow } from '@/types';

export function mapTeam(row: TeamRow): Team {
  return {
    id: row.id,
    external_id: row.external_id,
    name: row.name,
    short_name: row.short_name,
    code: row.code,
    flag_url: row.flag_url,
    group_name: row.group_name,
  };
}

/** Stand-in for a not-yet-decided knockout team so the UI can render brackets. */
const TBD_TEAM: Team = {
  id: '',
  external_id: 0,
  name: 'TBD',
  short_name: 'TBD',
  code: 'TBD',
  flag_url: null,
  group_name: null,
};

export function mapMatch(row: MatchWithTeamsRow): Match {
  return {
    id: row.id,
    external_id: row.external_id,
    // Placeholder (knockout) matches may have no team yet → render as TBD.
    home_team: row.home_team ? mapTeam(row.home_team) : TBD_TEAM,
    away_team: row.away_team ? mapTeam(row.away_team) : TBD_TEAM,
    is_placeholder: row.is_placeholder ?? (!row.home_team || !row.away_team),
    is_knockout: row.stage !== 'GROUP',
    home_score: row.home_score,
    away_score: row.away_score,
    winner_team_id: row.winner_team_id,
    decision_method: row.decision_method,
    status: row.status,
    stage: row.stage,
    group_name: row.group_name,
    kickoff_time: row.kickoff_time,
    venue: row.venue,
    points_multiplier: row.points_multiplier || 1,
  };
}

/** Column selection used everywhere we need a match with its two teams. */
export const MATCH_WITH_TEAMS_SELECT =
  '*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)';

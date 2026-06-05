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

export function mapMatch(row: MatchWithTeamsRow): Match {
  return {
    id: row.id,
    external_id: row.external_id,
    home_team: mapTeam(row.home_team),
    away_team: mapTeam(row.away_team),
    home_score: row.home_score,
    away_score: row.away_score,
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

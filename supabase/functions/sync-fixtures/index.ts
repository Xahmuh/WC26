// ============================================================================
// sync-fixtures — seeds/refreshes teams + matches from football-data.org.
// ----------------------------------------------------------------------------
// Run once before the tournament to populate the schedule, then optionally on
// a slow cron (e.g. daily) to pick up venue/kickoff/stage changes. poll-results
// only UPDATES existing matches — this is what CREATES them.
//
// A single call to /competitions/WC/matches returns the whole schedule, so this
// is just one request and stays well within the free-plan rate limit.
// ============================================================================

import { createAdminClient } from '../_shared/client.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { getActiveApiProvider, getApiProviderToken } from '../_shared/api-provider.ts';

type ApiStatus =
  | 'SCHEDULED'
  | 'TIMED'
  | 'IN_PLAY'
  | 'PAUSED'
  | 'FINISHED'
  | 'SUSPENDED'
  | 'POSTPONED'
  | 'CANCELLED'
  | 'AWARDED';

interface ApiTeam {
  id: number | null;
  name: string | null;
  shortName: string | null;
  tla: string | null;
  crest: string | null;
}

interface ApiMatch {
  id: number;
  utcDate: string;
  status: ApiStatus;
  stage: string;
  group: string | null;
  venue: string | null;
  homeTeam: ApiTeam;
  awayTeam: ApiTeam;
  score: {
    duration: 'REGULAR' | 'EXTRA_TIME' | 'PENALTY_SHOOTOUT' | string | null;
    fullTime: { home: number | null; away: number | null };
    regularTime?: { home: number | null; away: number | null } | null;
    winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null;
  };
}

interface ApiMatchesResponse {
  matches: ApiMatch[];
}

type DbStatus = 'SCHEDULED' | 'IN_PLAY' | 'FINISHED' | 'POSTPONED' | 'CANCELLED';
type DbStage =
  | 'GROUP'
  | 'ROUND_OF_32'
  | 'ROUND_OF_16'
  | 'QUARTER_FINAL'
  | 'SEMI_FINAL'
  | 'THIRD_PLACE'
  | 'FINAL';

function mapStatus(s: ApiStatus): DbStatus {
  switch (s) {
    case 'FINISHED':
    case 'AWARDED':
      return 'FINISHED';
    case 'IN_PLAY':
    case 'PAUSED':
      return 'IN_PLAY';
    case 'POSTPONED':
    case 'SUSPENDED':
      return 'POSTPONED';
    case 'CANCELLED':
      return 'CANCELLED';
    default:
      return 'SCHEDULED';
  }
}

function mapStage(stage: string): DbStage {
  switch (stage) {
    case 'LAST_32':
    case 'ROUND_OF_32':
      return 'ROUND_OF_32';
    case 'LAST_16':
    case 'ROUND_OF_16':
      return 'ROUND_OF_16';
    case 'QUARTER_FINALS':
    case 'QUARTER_FINAL':
      return 'QUARTER_FINAL';
    case 'SEMI_FINALS':
    case 'SEMI_FINAL':
      return 'SEMI_FINAL';
    case 'THIRD_PLACE':
      return 'THIRD_PLACE';
    case 'FINAL':
      return 'FINAL';
    default:
      return 'GROUP';
  }
}

function groupLetter(group: string | null): string | null {
  if (!group) return null;
  const match = group.match(/([A-L])\s*$/i);
  return match ? match[1].toUpperCase() : null;
}

function mapDecisionMethod(
  duration: ApiMatch['score']['duration']
): 'FT' | 'ET' | 'PEN' | null {
  if (duration === 'REGULAR') return 'FT';
  if (duration === 'EXTRA_TIME') return 'ET';
  if (duration === 'PENALTY_SHOOTOUT') return 'PEN';
  return null;
}

function resolveWinnerTeamId(
  match: ApiMatch,
  homeId: string | null,
  awayId: string | null
): string | null {
  if (match.score.winner === 'HOME_TEAM') return homeId;
  if (match.score.winner === 'AWAY_TEAM') return awayId;
  if (match.score.fullTime.home !== null && match.score.fullTime.away !== null) {
    if (match.score.fullTime.home > match.score.fullTime.away) return homeId;
    if (match.score.fullTime.away > match.score.fullTime.home) return awayId;
  }
  return null;
}

function resolveDecisionMethod(
  duration: ApiMatch['score']['duration'],
  home: number | null,
  away: number | null,
  winnerTeamId: string | null
): 'FT' | 'ET' | 'PEN' | null {
  const method = mapDecisionMethod(duration);
  if (method || !winnerTeamId || home === null || away === null) return method;
  return home === away ? 'PEN' : 'FT';
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const provider = await getActiveApiProvider();
    const token = getApiProviderToken(provider);

    const res = await fetch(`${provider.base_url}/competitions/${provider.competition_code}/matches`, {
      headers: { 'X-Auth-Token': token },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return jsonResponse({ error: `football-data ${res.status}: ${text.slice(0, 200)}` }, 502);
    }

    const payload = (await res.json()) as ApiMatchesResponse;
    const supabase = createAdminClient();

    // 1. Upsert every team that appears in the schedule.
    const teamsById = new Map<number, ApiTeam>();
    for (const m of payload.matches) {
      if (m.homeTeam.id) teamsById.set(m.homeTeam.id, m.homeTeam);
      if (m.awayTeam.id) teamsById.set(m.awayTeam.id, m.awayTeam);
    }

    const teamRows = [...teamsById.values()].map((t) => ({
      external_id: t.id as number,
      name: t.name ?? 'TBD',
      short_name: t.shortName,
      code: t.tla,
      flag_url: t.crest,
    }));

    if (teamRows.length > 0) {
      const { error } = await supabase
        .from('teams')
        .upsert(teamRows, { onConflict: 'external_id' });
      if (error) return jsonResponse({ error: `teams upsert: ${error.message}` }, 500);
    }

    // 2. Map external team ids -> internal uuids.
    const { data: teamIdRows, error: teamSelectError } = await supabase
      .from('teams')
      .select('id, external_id');
    if (teamSelectError) {
      return jsonResponse({ error: teamSelectError.message }, 500);
    }
    const idByExternal = new Map<number, string>(
      (teamIdRows ?? []).map((r: { id: string; external_id: number }) => [
        r.external_id,
        r.id,
      ])
    );

    // 3. Build match rows for EVERY fixture — including knockout placeholders
    //    whose teams are still TBD (null ids). Resolve team uuids when known,
    //    otherwise leave null so the bracket exists from day one.
    const matchRows = payload.matches.map((m) => {
      const homeId = m.homeTeam.id ? idByExternal.get(m.homeTeam.id) ?? null : null;
      const awayId = m.awayTeam.id ? idByExternal.get(m.awayTeam.id) ?? null : null;
      const status = mapStatus(m.status);
      const finished = status === 'FINISHED';
      const stage = mapStage(m.stage);
      const homeScore = finished ? (m.score.regularTime?.home ?? m.score.fullTime.home) : null;
      const awayScore = finished ? (m.score.regularTime?.away ?? m.score.fullTime.away) : null;
      const winnerTeamId = finished ? resolveWinnerTeamId(m, homeId, awayId) : null;
      return {
        external_id: m.id,
        home_team_id: homeId,
        away_team_id: awayId,
        status,
        stage,
        group_name: groupLetter(m.group),
        kickoff_time: m.utcDate,
        venue: m.venue,
        home_score: homeScore,
        away_score: awayScore,
        winner_team_id: winnerTeamId,
        decision_method: finished
          ? resolveDecisionMethod(m.score.duration, homeScore, awayScore, winnerTeamId)
          : null,
      };
    });

    // 4. Safe conditional upsert (DB function): inserts new fixtures + TBD
    //    placeholders, fills teams progressively, NEVER overwrites finished
    //    scores, never deletes. Keyed on external_id; fully idempotent.
    let matchesSynced = 0;
    if (matchRows.length > 0) {
      const { data, error } = await supabase.rpc('sync_matches', { p_matches: matchRows });
      if (error) return jsonResponse({ error: `matches sync: ${error.message}` }, 500);
      matchesSynced = typeof data === 'number' ? data : matchRows.length;
    }

    // 5. Tournament completeness guarantee — warn only, never fail the sync.
    const REQUIRED_STAGES: DbStage[] = [
      'GROUP', 'ROUND_OF_32', 'ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'THIRD_PLACE', 'FINAL',
    ];
    const { data: stageRows } = await supabase.from('matches').select('stage');
    const present = new Set((stageRows ?? []).map((r: { stage: string }) => r.stage));
    const missingStages = REQUIRED_STAGES.filter((s) => !present.has(s));
    if (missingStages.length > 0) {
      console.warn(`[sync-fixtures] missing tournament stages: ${missingStages.join(', ')}`);
    }

    return jsonResponse({
      provider: provider.id,
      teams_synced: teamRows.length,
      matches_synced: matchesSynced,
      missing_stages: missingStages,
    });
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500
    );
  }
});

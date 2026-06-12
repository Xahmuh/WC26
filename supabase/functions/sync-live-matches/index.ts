// ============================================================================
// sync-live-matches - near-live status/score sync for match-day windows.
// ----------------------------------------------------------------------------
// Free-plan strategy:
//   1. Read local matches first and only call football-data.org when a match is
//      within the near-kickoff/live window.
//   2. Use public.try_begin_api_sync() to enforce at most one provider request
//      per minute, even if cron/manual invocations overlap.
//   3. Update live scores/statuses only; points are still scored exclusively by
//      the DB trigger when status becomes FINISHED.
// ============================================================================

import { createAdminClient } from '../_shared/client.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import {
  fetchCompetitionMatchesByDateRange,
  RateLimitError,
  type ApiMatch,
} from '../_shared/football-api.ts';

type DbStatus =
  | 'SCHEDULED'
  | 'TIMED'
  | 'IN_PLAY'
  | 'PAUSED'
  | 'EXTRA_TIME'
  | 'PENALTY_SHOOTOUT'
  | 'FINISHED'
  | 'POSTPONED'
  | 'CANCELLED'
  | 'SUSPENDED';

interface MatchToSync {
  id: string;
  external_id: number;
  status: DbStatus;
  kickoff_time: string;
  home_team_id: string | null;
  away_team_id: string | null;
  is_knockout: boolean;
}

interface SyncGateResult {
  should_run: boolean;
  last_started_at: string | null;
  wait_seconds: number;
}

const SYNC_KEY = 'sync-live-matches';
const MIN_PROVIDER_INTERVAL_SECONDS = 60;
const LOOKBACK_MS = 4 * 60 * 60 * 1000;
const LOOKAHEAD_MS = 15 * 60 * 1000;
const ACTIVE_STATUSES = new Set<DbStatus>([
  'IN_PLAY',
  'PAUSED',
  'EXTRA_TIME',
  'PENALTY_SHOOTOUT',
]);

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  if (!isAuthorized(req)) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const supabase = createAdminClient();
  let providerRequestStarted = false;

  try {
    await supabase.rpc('lock_predictions_at_kickoff');

    const now = new Date();
    const windowStart = new Date(now.getTime() - LOOKBACK_MS);
    const windowEnd = new Date(now.getTime() + LOOKAHEAD_MS);

    const { data: localMatches, error: localError } = await supabase
      .from('matches')
      .select('id, external_id, status, kickoff_time, home_team_id, away_team_id, is_knockout')
      .gte('kickoff_time', windowStart.toISOString())
      .lte('kickoff_time', windowEnd.toISOString())
      .returns<MatchToSync[]>();

    if (localError) {
      return jsonResponse({ error: `local matches: ${localError.message}` }, 500);
    }

    const candidates = (localMatches ?? []).filter((match) =>
      shouldPollMatch(match, now.getTime())
    );

    if (candidates.length === 0) {
      return jsonResponse({
        provider_request: false,
        checked: 0,
        updated: 0,
        message: 'No matches in the near-live polling window.',
      });
    }

    const { data: gateRows, error: gateError } = await supabase
      .rpc('try_begin_api_sync', {
        p_key: SYNC_KEY,
        p_min_interval_seconds: MIN_PROVIDER_INTERVAL_SECONDS,
      })
      .returns<SyncGateResult[]>();

    if (gateError) {
      return jsonResponse({ error: `sync gate: ${gateError.message}` }, 500);
    }

    const gate = gateRows?.[0];
    if (!gate?.should_run) {
      return jsonResponse({
        provider_request: false,
        checked: candidates.length,
        updated: 0,
        throttled: true,
        wait_seconds: gate?.wait_seconds ?? MIN_PROVIDER_INTERVAL_SECONDS,
        last_started_at: gate?.last_started_at ?? null,
      });
    }

    providerRequestStarted = true;
    const dateFrom = toUtcDate(windowStart);
    const dateTo = toUtcDate(windowEnd);
    const providerMatches = await fetchCompetitionMatchesByDateRange(dateFrom, dateTo);
    const providerByExternalId = new Map<number, ApiMatch>(
      providerMatches.map((match) => [match.id, match])
    );

    let updated = 0;
    const missing: number[] = [];
    const errors: string[] = [];

    for (const local of candidates) {
      const providerMatch = providerByExternalId.get(local.external_id);
      if (!providerMatch) {
        missing.push(local.external_id);
        continue;
      }

      const payload = buildUpdatePayload(providerMatch, local);
      if (payload.error) {
        errors.push(`${local.external_id}: ${payload.error}`);
        continue;
      }
      if (!payload.update) continue;

      const { data: rows, error: updateError } = await supabase
        .from('matches')
        .update(payload.update)
        .eq('id', local.id)
        .neq('status', 'FINISHED')
        .select('id');

      if (updateError) {
        errors.push(`${local.external_id}: ${updateError.message}`);
        continue;
      }

      updated += rows?.length ?? 0;
    }

    await markSyncState(supabase, errors.length > 0 ? 'completed_with_errors' : 'completed', {
      checked: candidates.length,
      updated,
      missing: missing.length,
      errors: errors.length,
    });

    return jsonResponse({
      provider_request: true,
      date_from: dateFrom,
      date_to: dateTo,
      checked: candidates.length,
      updated,
      missing,
      errors,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (providerRequestStarted) {
      await markSyncState(supabase, err instanceof RateLimitError ? 'rate_limited' : 'error', {
        error: message,
      }).catch(() => undefined);
    }

    return jsonResponse(
      {
        provider_request: providerRequestStarted,
        updated: 0,
        error: message,
      },
      err instanceof RateLimitError ? 200 : 500
    );
  }
});

function isAuthorized(req: Request): boolean {
  const expected = Deno.env.get('SYNC_LIVE_MATCHES_SECRET');
  if (!expected) return true;
  return req.headers.get('x-sync-secret') === expected;
}

function shouldPollMatch(match: MatchToSync, nowMs: number): boolean {
  if (match.status === 'FINISHED' || match.status === 'POSTPONED' || match.status === 'CANCELLED') {
    return false;
  }

  if (ACTIVE_STATUSES.has(match.status)) return true;

  const kickoffMs = new Date(match.kickoff_time).getTime();
  if (Number.isNaN(kickoffMs)) return false;

  return kickoffMs <= nowMs + LOOKAHEAD_MS && kickoffMs >= nowMs - LOOKBACK_MS;
}

function buildUpdatePayload(
  providerMatch: ApiMatch,
  local: MatchToSync
): {
  update?: Record<string, unknown>;
  error?: string;
} {
  const status = mapProviderStatus(providerMatch);
  const score = readProviderScore(providerMatch);
  const nowIso = new Date().toISOString();

  if (status === 'FINISHED') {
    if (!hasValidScore(score)) {
      return { error: 'FINISHED without complete final score' };
    }

    const winnerTeamId = resolveWinnerTeamId(providerMatch.score?.winner ?? null, local, score.home, score.away);
    if (local.is_knockout && !winnerTeamId) {
      return { error: 'missing knockout qualifier' };
    }

    return {
      update: {
        status,
        home_score: score.home,
        away_score: score.away,
        winner_team_id: winnerTeamId,
        decision_method: resolveDecisionMethod(providerMatch.score?.duration ?? null, score.home, score.away, winnerTeamId),
        last_synced_at: nowIso,
      },
    };
  }

  const update: Record<string, unknown> = {
    status,
    last_synced_at: nowIso,
  };

  if (hasValidScore(score) && status !== 'SCHEDULED' && status !== 'TIMED' && status !== 'POSTPONED' && status !== 'CANCELLED') {
    update.home_score = score.home;
    update.away_score = score.away;
  }

  return { update };
}

function mapProviderStatus(match: ApiMatch): DbStatus {
  if (match.status === 'TIMED') return 'TIMED';
  if (match.status === 'IN_PLAY') {
    if (match.score?.duration === 'EXTRA_TIME') return 'EXTRA_TIME';
    if (match.score?.duration === 'PENALTY_SHOOTOUT') return 'PENALTY_SHOOTOUT';
    return 'IN_PLAY';
  }
  if (match.status === 'PAUSED') return 'PAUSED';
  if (match.status === 'FINISHED' || match.status === 'AWARDED') return 'FINISHED';
  if (match.status === 'POSTPONED') return 'POSTPONED';
  if (match.status === 'CANCELLED') return 'CANCELLED';
  if (match.status === 'SUSPENDED') return 'SUSPENDED';
  return 'SCHEDULED';
}

function readProviderScore(match: ApiMatch): { home: number | null; away: number | null } {
  return {
    home: readNullableScore(match.score?.regularTime?.home ?? match.score?.fullTime?.home ?? null),
    away: readNullableScore(match.score?.regularTime?.away ?? match.score?.fullTime?.away ?? null),
  };
}

function readNullableScore(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}

function hasValidScore(score: {
  home: number | null;
  away: number | null;
}): score is { home: number; away: number } {
  return score.home !== null && score.away !== null;
}

function resolveWinnerTeamId(
  winner: ApiMatch['score']['winner'],
  match: MatchToSync,
  home: number,
  away: number
): string | null {
  if (winner === 'HOME_TEAM') return match.home_team_id;
  if (winner === 'AWAY_TEAM') return match.away_team_id;
  if (home > away) return match.home_team_id;
  if (away > home) return match.away_team_id;
  return null;
}

function mapDecisionMethod(duration: ApiMatch['score']['duration']): 'FT' | 'ET' | 'PEN' | null {
  if (duration === 'REGULAR') return 'FT';
  if (duration === 'EXTRA_TIME') return 'ET';
  if (duration === 'PENALTY_SHOOTOUT') return 'PEN';
  return null;
}

function resolveDecisionMethod(
  duration: ApiMatch['score']['duration'],
  home: number,
  away: number,
  winnerTeamId: string | null
): 'FT' | 'ET' | 'PEN' | null {
  const method = mapDecisionMethod(duration);
  if (method || !winnerTeamId) return method;
  return home === away ? 'PEN' : 'FT';
}

function toUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function markSyncState(
  supabase: ReturnType<typeof createAdminClient>,
  status: string,
  message: Record<string, unknown>
): Promise<void> {
  await supabase
    .from('api_sync_state')
    .update({
      last_completed_at: new Date().toISOString(),
      last_status: status,
      last_message: JSON.stringify(message).slice(0, 500),
      updated_at: new Date().toISOString(),
    })
    .eq('key', SYNC_KEY);
}

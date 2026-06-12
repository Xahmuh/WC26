// ============================================================================
// poll-results — Supabase Cron target (run every 5 minutes).
// ----------------------------------------------------------------------------
// BULK strategy: one request per tick.
//   1. Lock predictions whose match has kicked off.
//   2. Fetch ALL finished WC matches in a SINGLE call
//      (GET /competitions/WC/matches?status=FINISHED).
//   3. For each DB match not yet marked FINISHED, if the bulk payload reports it
//      finished with a score, persist the score. The DB trigger handles scoring.
//   4. Never throw — always return a { checked, updated } summary.
//
// This replaces the previous per-match polling (N requests, 6s apart) with a
// single request, eliminating any risk to the 10 req/min free-plan limit.
//
// Schedule (run once in the SQL editor after deploying):
//   select cron.schedule(
//     'poll-results-every-5-min', '*/5 * * * *',
//     $$ select net.http_post(
//          url := 'https://YOUR_PROJECT.supabase.co/functions/v1/poll-results',
//          headers := jsonb_build_object('Content-Type','application/json',
//            'Authorization','Bearer YOUR_ANON_KEY'),
//          body := '{}'::jsonb) $$);
// ============================================================================

import { createAdminClient, sleep } from '../_shared/client.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import {
  fetchFinishedMatches,
  RateLimitError,
  type ApiMatch,
} from '../_shared/football-api.ts';
import {
  getResultDecision,
  POLLABLE_MATCH_FILTER,
} from './result-state.ts';

interface MatchToPoll {
  id: string;
  external_id: number;
  home_team_id: string | null;
  away_team_id: string | null;
  is_knockout: boolean;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let checked = 0;
  let updated = 0;
  const errors: string[] = [];

  try {
    const supabase = createAdminClient();

    // Lock predictions for any match that has started.
    await supabase.rpc('lock_predictions_at_kickoff');

    // Candidate matches: anything unfinished, plus any bad FINISHED row that
    // still lacks a complete score.
    const { data: dbMatches, error: selectError } = await supabase
      .from('matches')
      .select('id, external_id, home_team_id, away_team_id, is_knockout')
      .or(POLLABLE_MATCH_FILTER)
      .returns<MatchToPoll[]>();

    if (selectError) {
      return jsonResponse({ checked, updated, error: selectError.message }, 500);
    }
    if (!dbMatches || dbMatches.length === 0) {
      return jsonResponse({ checked: 0, updated: 0, message: 'No matches to poll.' });
    }

    // SINGLE bulk API call (with one retry on rate-limit).
    let finished: ApiMatch[];
    try {
      finished = await fetchFinishedWithRetry();
    } catch (err) {
      return jsonResponse({
        checked: 0,
        updated: 0,
        errors: [
          `bulk fetch: ${err instanceof Error ? err.message : String(err)}`,
        ],
      });
    }

    const finishedByExternalId = new Map<number, ApiMatch>(
      finished.map((m) => [m.id, m])
    );

    for (const match of dbMatches) {
      checked++;

      const api = finishedByExternalId.get(match.external_id);
      if (!api) continue; // not finished yet per the API

      const decision = getResultDecision(api);
      if (decision.action === 'defer') {
        console.warn('[poll-results] Provider returned FINISHED without final score', {
          providerMatchId: api.id,
          status: api.status,
          homeScore: decision.homeScore,
          awayScore: decision.awayScore,
          lastUpdated: api.lastUpdated ?? null,
        });
        continue;
      }
      if (decision.action !== 'finalize') continue;

      const home = decision.homeScore;
      const away = decision.awayScore;
      const winnerTeamId = resolveWinnerTeamId(api.score?.winner ?? null, match, home, away);
      const decisionMethod = resolveDecisionMethod(
        api.score?.duration ?? null,
        home,
        away,
        winnerTeamId
      );

      if (match.is_knockout && !winnerTeamId) {
        errors.push(`update ${match.external_id}: missing knockout qualifier`);
        continue;
      }

      const { error: updateError } = await supabase
        .from('matches')
        .update({
          home_score: home,
          away_score: away,
          winner_team_id: winnerTeamId,
          decision_method: decisionMethod,
          status: 'FINISHED',
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', match.id);

      if (updateError) {
        errors.push(`update ${match.external_id}: ${updateError.message}`);
        continue;
      }

      updated++;
    }

    return jsonResponse({ checked, updated, errors });
  } catch (err) {
    // Last-resort guard: always return a structured result, never a thrown 500.
    return jsonResponse(
      {
        checked,
        updated,
        errors: [...errors, err instanceof Error ? err.message : String(err)],
      },
      200
    );
  }
});

/** One bulk fetch, retried once after the suggested delay on HTTP 429. */
async function fetchFinishedWithRetry(): Promise<ApiMatch[]> {
  try {
    return await fetchFinishedMatches();
  } catch (err) {
    if (err instanceof RateLimitError) {
      await sleep(err.retryAfterSeconds * 1000);
      return await fetchFinishedMatches(); // single retry, then propagate
    }
    throw err;
  }
}

function resolveWinnerTeamId(
  winner: ApiMatch['score']['winner'],
  match: MatchToPoll,
  home: number,
  away: number
): string | null {
  if (winner === 'HOME_TEAM') return match.home_team_id;
  if (winner === 'AWAY_TEAM') return match.away_team_id;
  if (home > away) return match.home_team_id;
  if (away > home) return match.away_team_id;
  return null;
}

function mapDecisionMethod(
  duration: ApiMatch['score']['duration']
): 'FT' | 'ET' | 'PEN' | null {
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

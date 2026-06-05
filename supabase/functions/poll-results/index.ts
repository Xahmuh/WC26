// ============================================================================
// poll-results — Supabase Cron target (run every 5 minutes).
// ----------------------------------------------------------------------------
// BULK strategy: one request per tick.
//   1. Lock predictions whose match has kicked off.
//   2. Fetch ALL finished WC matches in a SINGLE call
//      (GET /competitions/WC/matches?status=FINISHED).
//   3. For each DB match not yet marked FINISHED, if the bulk payload reports it
//      finished with a score, persist the score and trigger scoring.
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

interface MatchToPoll {
  id: string;
  external_id: number;
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

    // Candidate matches: everything we don't yet consider FINISHED.
    const { data: dbMatches, error: selectError } = await supabase
      .from('matches')
      .select('id, external_id')
      .neq('status', 'FINISHED')
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

      const home = api.score.fullTime.home;
      const away = api.score.fullTime.away;
      if (home === null || away === null) continue; // finished without a score?

      const { error: updateError } = await supabase
        .from('matches')
        .update({
          home_score: home,
          away_score: away,
          status: 'FINISHED',
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', match.id);

      if (updateError) {
        errors.push(`update ${match.external_id}: ${updateError.message}`);
        continue;
      }

      updated++;
      await triggerCalculatePoints(match.id, errors);
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

/** Invokes calculate-points for a finished match; failures are logged, not thrown. */
async function triggerCalculatePoints(
  matchId: string,
  errors: string[]
): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      errors.push('calculate-points: missing function env');
      return;
    }

    const res = await fetch(`${supabaseUrl}/functions/v1/calculate-points`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ match_id: matchId }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      errors.push(`calculate-points ${matchId}: ${res.status} ${text.slice(0, 120)}`);
    }
  } catch (err) {
    errors.push(
      `calculate-points ${matchId}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

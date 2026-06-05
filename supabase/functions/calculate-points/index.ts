// ============================================================================
// calculate-points — scores every prediction for a single finished match.
// ----------------------------------------------------------------------------
// Invoked by poll-results (service-role) once a match flips to FINISHED.
// Input:  { match_id: string }
// Output: { match_id, predictions_processed }
//
// Idempotent: re-running upserts the same point rows, so it is safe to retry.
// ============================================================================

import { createAdminClient } from '../_shared/client.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { calculatePoints } from '../_shared/scoring.ts';

interface RequestBody {
  match_id?: unknown;
}

interface MatchRow {
  id: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  points_multiplier: number;
}

interface PredictionRow {
  user_id: string;
  pred_home_score: number;
  pred_away_score: number;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let body: RequestBody;
    try {
      body = (await req.json()) as RequestBody;
    } catch {
      return jsonResponse({ error: 'Invalid JSON body.' }, 400);
    }

    if (!isNonEmptyString(body.match_id)) {
      return jsonResponse({ error: 'match_id (string) is required.' }, 400);
    }
    const matchId = body.match_id;

    const supabase = createAdminClient();

    // 1 + 2. Load the match and confirm it is actually finished.
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('id, home_score, away_score, status, points_multiplier')
      .eq('id', matchId)
      .maybeSingle<MatchRow>();

    if (matchError) {
      return jsonResponse({ error: matchError.message }, 500);
    }
    if (!match) {
      return jsonResponse({ error: 'Match not found.' }, 404);
    }
    if (match.status !== 'FINISHED') {
      return jsonResponse(
        { error: `Match status is ${match.status}, expected FINISHED.` },
        409
      );
    }
    if (match.home_score === null || match.away_score === null) {
      return jsonResponse({ error: 'Match has no final score.' }, 409);
    }

    const actual = { home: match.home_score, away: match.away_score };

    // 3. Load every prediction for this match.
    const { data: predictions, error: predError } = await supabase
      .from('predictions')
      .select('user_id, pred_home_score, pred_away_score')
      .eq('match_id', matchId)
      .returns<PredictionRow[]>();

    if (predError) {
      return jsonResponse({ error: predError.message }, 500);
    }

    if (!predictions || predictions.length === 0) {
      return jsonResponse({ match_id: matchId, predictions_processed: 0 });
    }

    // 4. Score each prediction and build the upsert payload.
    const nowIso = new Date().toISOString();
    const multiplier = match.points_multiplier ?? 1;
    const rows = predictions.map((p) => {
      const breakdown = calculatePoints(actual, {
        home: p.pred_home_score,
        away: p.pred_away_score,
      });
      return {
        user_id: p.user_id,
        match_id: matchId,
        winner_points: breakdown.winner_points * multiplier,
        home_goal_points: breakdown.home_goal_points * multiplier,
        away_goal_points: breakdown.away_goal_points * multiplier,
        exact_bonus: breakdown.exact_bonus * multiplier,
        total_points: breakdown.total_points * multiplier,
        calculated_at: nowIso,
      };
    });

    const { error: upsertError } = await supabase
      .from('points')
      .upsert(rows, { onConflict: 'user_id,match_id' });

    if (upsertError) {
      return jsonResponse({ error: upsertError.message }, 500);
    }

    // 5. Refresh the leaderboard view. CONCURRENTLY needs its unique index
    //    (created in the migration) and avoids locking readers out.
    const { error: refreshError } = await supabase.rpc('refresh_leaderboard');
    if (refreshError) {
      // Non-fatal: points are saved; the view will catch up on the next run.
      return jsonResponse({
        match_id: matchId,
        predictions_processed: rows.length,
        warning: `leaderboard refresh failed: ${refreshError.message}`,
      });
    }

    return jsonResponse({
      match_id: matchId,
      predictions_processed: rows.length,
    });
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500
    );
  }
});

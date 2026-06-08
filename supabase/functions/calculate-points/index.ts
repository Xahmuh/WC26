// ============================================================================
// calculate-points — deprecated compatibility endpoint.
// ----------------------------------------------------------------------------
// Scoring is now owned by the database trigger:
//   matches_after_write -> public.score_match(match_id)
//
// Keeping this endpoint as a no-op prevents older cron/config references from
// rewriting points with stale Edge Function logic that does not understand
// personal card multipliers.
// ============================================================================

import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

Deno.serve((req: Request): Response => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  return jsonResponse({
    deprecated: true,
    message:
      'Scoring is database-triggered from matches_after_write; calculate-points no longer writes point rows.',
  });
});

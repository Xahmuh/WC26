// ============================================================================
// Thin wrapper around football-data.org v4. The token lives ONLY in the
// FOOTBALL_API_TOKEN secret and is never exposed to clients.
// Free plan: 10 requests/minute — callers must pace themselves.
// ============================================================================

const BASE_URL = 'https://api.football-data.org/v4';

export type ApiMatchStatus =
  | 'SCHEDULED'
  | 'TIMED'
  | 'IN_PLAY'
  | 'PAUSED'
  | 'FINISHED'
  | 'SUSPENDED'
  | 'POSTPONED'
  | 'CANCELLED'
  | 'AWARDED';

export interface ApiMatch {
  id: number;
  status: ApiMatchStatus;
  utcDate: string;
  score: {
    fullTime: { home: number | null; away: number | null };
    winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null;
  };
}

interface ApiMatchesResponse {
  matches?: ApiMatch[];
}

export class RateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super(`Rate limited; retry after ${retryAfterSeconds}s`);
    this.name = 'RateLimitError';
  }
}

const COMPETITION = 'WC';

/**
 * Fetches ALL finished WC matches in a SINGLE request, instead of polling each
 * match individually. This is the rate-limit-friendly path used by the poller:
 * one call per cron tick regardless of how many matches are in flight.
 *
 * @throws RateLimitError on HTTP 429 so the caller can back off.
 * @throws Error on other non-2xx responses.
 */
export async function fetchFinishedMatches(): Promise<ApiMatch[]> {
  const token = Deno.env.get('FOOTBALL_API_TOKEN');
  if (!token) throw new Error('Missing FOOTBALL_API_TOKEN secret.');

  const res = await fetch(
    `${BASE_URL}/competitions/${COMPETITION}/matches?status=FINISHED`,
    { headers: { 'X-Auth-Token': token } }
  );

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('Retry-After')) || 60;
    throw new RateLimitError(retryAfter);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`football-data ${res.status}: ${text.slice(0, 200)}`);
  }

  const payload = (await res.json()) as ApiMatchesResponse;
  return payload.matches ?? [];
}

/**
 * Fetches a single match by its football-data external id.
 * @throws RateLimitError on HTTP 429 so the caller can back off.
 * @throws Error on other non-2xx responses.
 */
export async function fetchMatch(externalId: number): Promise<ApiMatch> {
  const token = Deno.env.get('FOOTBALL_API_TOKEN');
  if (!token) throw new Error('Missing FOOTBALL_API_TOKEN secret.');

  const res = await fetch(`${BASE_URL}/matches/${externalId}`, {
    headers: { 'X-Auth-Token': token },
  });

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('Retry-After')) || 60;
    throw new RateLimitError(retryAfter);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`football-data ${res.status}: ${text.slice(0, 200)}`);
  }

  return (await res.json()) as ApiMatch;
}

// ============================================================================
// Thin wrapper around football-data.org v4. The token lives ONLY in the
// FOOTBALL_API_TOKEN secret and is never exposed to clients.
// Free plan: 10 requests/minute — callers must pace themselves.
// ============================================================================

import {
  getActiveApiProvider,
  getApiProviderToken,
  type ApiProviderConfig,
} from './api-provider.ts';

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
  lastUpdated?: string | null;
  score: {
    duration: 'REGULAR' | 'EXTRA_TIME' | 'PENALTY_SHOOTOUT' | string | null;
    fullTime: { home: number | null; away: number | null };
    regularTime?: { home: number | null; away: number | null } | null;
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

async function fetchProviderMatches(
  provider: ApiProviderConfig,
  path: string
): Promise<ApiMatch[]> {
  const token = getApiProviderToken(provider);

  const res = await fetch(`${provider.base_url}${path}`, {
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

  const payload = (await res.json()) as ApiMatchesResponse;
  return payload.matches ?? [];
}

/**
 * Fetches ALL finished WC matches in a SINGLE request, instead of polling each
 * match individually. This is the rate-limit-friendly path used by the poller:
 * one call per cron tick regardless of how many matches are in flight.
 *
 * @throws RateLimitError on HTTP 429 so the caller can back off.
 * @throws Error on other non-2xx responses.
 */
export async function fetchFinishedMatches(): Promise<ApiMatch[]> {
  const provider = await getActiveApiProvider();
  return fetchProviderMatches(
    provider,
    `/competitions/${provider.competition_code}/matches?status=FINISHED`
  );
}

export async function fetchCompetitionMatchesByDateRange(
  dateFrom: string,
  dateTo: string
): Promise<ApiMatch[]> {
  const provider = await getActiveApiProvider();
  const params = new URLSearchParams({ dateFrom, dateTo });
  return fetchProviderMatches(
    provider,
    `/competitions/${provider.competition_code}/matches?${params.toString()}`
  );
}

/**
 * Fetches a single match by its football-data external id.
 * @throws RateLimitError on HTTP 429 so the caller can back off.
 * @throws Error on other non-2xx responses.
 */
export async function fetchMatch(externalId: number): Promise<ApiMatch> {
  const provider = await getActiveApiProvider();
  const token = getApiProviderToken(provider);

  const res = await fetch(`${provider.base_url}/matches/${externalId}`, {
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

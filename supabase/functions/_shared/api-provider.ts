import { createAdminClient } from './client.ts';

export interface ApiProviderConfig {
  id: string;
  name: string;
  adapter: string;
  base_url: string;
  competition_code: string;
  token_secret_name: string;
  rate_limit_per_minute: number | null;
}

const FALLBACK_PROVIDER: ApiProviderConfig = {
  id: 'football-data',
  name: 'football-data.org',
  adapter: 'football_data_v4',
  base_url: 'https://api.football-data.org/v4',
  competition_code: 'WC',
  token_secret_name: 'FOOTBALL_API_TOKEN',
  rate_limit_per_minute: 10,
};

export async function getActiveApiProvider(): Promise<ApiProviderConfig> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('api_providers')
    .select('id, name, adapter, base_url, competition_code, token_secret_name, rate_limit_per_minute')
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    if (error.code === '42P01') return FALLBACK_PROVIDER;
    throw new Error(`api provider config: ${error.message}`);
  }

  const provider = (data ?? FALLBACK_PROVIDER) as ApiProviderConfig;
  if (provider.adapter !== 'football_data_v4') {
    throw new Error(`Unsupported active API adapter: ${provider.adapter}`);
  }

  return provider;
}

export function getApiProviderToken(provider: ApiProviderConfig): string {
  const token = Deno.env.get(provider.token_secret_name);
  if (!token) throw new Error(`Missing ${provider.token_secret_name} secret.`);
  return token;
}


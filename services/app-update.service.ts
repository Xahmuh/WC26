import { supabase } from '@/lib/supabase';
import type { AppUpdateSettings } from '@/types';

export type AppUpdateSettingsInput = {
  latestVersion: string;
  minimumSupportedVersion: string;
  updateRequired: boolean;
  updateUrl: string | null;
  releaseNotes: string;
};

export const DEFAULT_APP_UPDATE_SETTINGS: AppUpdateSettings = {
  id: 1,
  latest_version: '1.0.1',
  minimum_supported_version: '1.0.0',
  update_required: false,
  update_url: null,
  release_notes: 'A new version is available. Please update to continue.',
  updated_by: null,
  updated_at: new Date(0).toISOString(),
};

function normalizeAppUpdateSettings(row: any): AppUpdateSettings {
  return {
    id: Number(row.id ?? 1),
    latest_version: String(row.latest_version ?? DEFAULT_APP_UPDATE_SETTINGS.latest_version),
    minimum_supported_version: String(
      row.minimum_supported_version ?? DEFAULT_APP_UPDATE_SETTINGS.minimum_supported_version
    ),
    update_required: Boolean(row.update_required),
    update_url: row.update_url ?? null,
    release_notes: String(row.release_notes ?? DEFAULT_APP_UPDATE_SETTINGS.release_notes),
    updated_by: row.updated_by ?? null,
    updated_at: row.updated_at ?? DEFAULT_APP_UPDATE_SETTINGS.updated_at,
  };
}

export async function getAppUpdateSettings(): Promise<AppUpdateSettings> {
  const { data, error } = await (supabase as any)
    .from('app_update_settings')
    .select(
      'id, latest_version, minimum_supported_version, update_required, update_url, release_notes, updated_by, updated_at'
    )
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    if (error.code === '42P01') return DEFAULT_APP_UPDATE_SETTINGS;
    throw new Error(error.message);
  }

  return data ? normalizeAppUpdateSettings(data) : DEFAULT_APP_UPDATE_SETTINGS;
}

export async function updateAppUpdateSettings(input: AppUpdateSettingsInput): Promise<AppUpdateSettings> {
  const { data: userResult } = await supabase.auth.getUser();
  const updateUrl = input.updateUrl?.trim() || null;

  const { data, error } = await (supabase as any)
    .from('app_update_settings')
    .upsert(
      {
        id: 1,
        latest_version: input.latestVersion.trim(),
        minimum_supported_version: input.minimumSupportedVersion.trim(),
        update_required: input.updateRequired,
        update_url: updateUrl,
        release_notes: input.releaseNotes.trim(),
        updated_by: userResult.user?.id ?? null,
      },
      { onConflict: 'id' }
    )
    .select(
      'id, latest_version, minimum_supported_version, update_required, update_url, release_notes, updated_by, updated_at'
    )
    .single();

  if (error) {
    if (error.code === '42P01') {
      throw new Error('Please apply the app update settings migration, then try again.');
    }
    throw new Error(error.message);
  }

  return normalizeAppUpdateSettings(data);
}

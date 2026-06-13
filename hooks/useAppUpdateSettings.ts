import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import {
  getAppUpdateSettings,
  updateAppUpdateSettings,
  type AppUpdateSettingsInput,
} from '@/services/app-update.service';

export const appUpdateSettingsKeys = {
  all: ['appUpdateSettings'] as const,
  detail: ['appUpdateSettings', 'detail'] as const,
};

function useAppUpdateSettingsRealtime(enabled = true): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const id = Math.random().toString(36).slice(2, 9);
    const channel = supabase
      .channel(`app-update-settings-rt-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_update_settings' }, () => {
        void queryClient.invalidateQueries({ queryKey: appUpdateSettingsKeys.all });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);
}

export function useAppUpdateSettings(enabled = true) {
  useAppUpdateSettingsRealtime(enabled);

  return useQuery({
    queryKey: appUpdateSettingsKeys.detail,
    queryFn: getAppUpdateSettings,
    enabled,
    staleTime: 60_000,
  });
}

export function useUpdateAppUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AppUpdateSettingsInput) => updateAppUpdateSettings(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: appUpdateSettingsKeys.all });
    },
  });
}

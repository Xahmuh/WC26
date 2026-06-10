import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { playNotificationSound } from '@/lib/sound';
import { useAuthStore } from '@/stores/auth.store';
import type { AppNotification } from '@/services/notifications.service';
import { notificationKeys } from '@/hooks/notificationKeys';

export function useNotificationRealtime(): void {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  useEffect(() => {
    if (!userId) return;

    const id = Math.random().toString(36).slice(2, 9);
    const channel = supabase
      .channel(`notifications-rt-${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: notificationKeys.all });
          const notification = payload.new as AppNotification;
          void playNotificationSound(notification.title, notification.body ?? undefined, notification.data);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => queryClient.invalidateQueries({ queryKey: notificationKeys.all })
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);
}

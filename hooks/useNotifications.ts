// ============================================================================
// Notifications: realtime feed + unread count + mark-as-read, with an in-app
// sound when a new one arrives. Subscribes to the user's own notification rows
// (RLS scopes the realtime stream).
// ============================================================================

import { useEffect } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';
import { playNotificationSound } from '@/lib/sound';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '@/services/notifications.service';

export const notificationKeys = {
  all: ['notifications'] as const,
};

export type UseNotificationsResult = UseQueryResult<AppNotification[], Error> & {
  unreadCount: number;
};

export function useNotifications(): UseNotificationsResult {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const query = useQuery({
    queryKey: notificationKeys.all,
    queryFn: () => fetchNotifications(),
    enabled: Boolean(userId),
    staleTime: 30_000,
  });

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
          const n = payload.new as AppNotification;
          void playNotificationSound(n.title, n.body ?? undefined);
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
  }, [userId, queryClient]);

  const unreadCount = (query.data ?? []).reduce(
    (acc, n) => (n.is_read ? acc : acc + 1),
    0
  );

  return { ...query, unreadCount };
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

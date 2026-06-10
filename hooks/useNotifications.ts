// ============================================================================
// Notifications: feed + unread count + mark-as-read. Realtime invalidation and
// sound live in useNotificationRealtime(), mounted once at the app root.
// ============================================================================

import {
  useMutation,
  useQuery,
  type UseQueryResult,
  useQueryClient,
} from '@tanstack/react-query';

import { useAuthStore } from '@/stores/auth.store';
import { notificationKeys } from '@/hooks/notificationKeys';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '@/services/notifications.service';

export type UseNotificationsResult = UseQueryResult<AppNotification[], Error> & {
  unreadCount: number;
};

export function useNotifications(): UseNotificationsResult {
  const userId = useAuthStore((s) => s.session?.user.id);

  const query = useQuery({
    queryKey: notificationKeys.all,
    queryFn: () => fetchNotifications(),
    enabled: Boolean(userId),
    staleTime: 30_000,
  });

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

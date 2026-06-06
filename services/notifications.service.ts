// ============================================================================
// Notifications data access. Rows are created server-side (scoring trigger,
// admin_broadcast); clients may read their own and flip is_read (RLS + guard
// trigger enforce this — see migration 011).
// ============================================================================

import { supabase } from '@/lib/supabase';

export type NotificationType =
  | 'points'
  | 'rank_change'
  | 'match_result'
  | 'announcement'
  | 'tournament';

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export async function fetchNotifications(limit = 50): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as AppNotification[];
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/** Marks all of the current user's unread notifications as read (RLS scopes it). */
export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('is_read', false);
  if (error) throw new Error(error.message);
}

import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';

let configured = false;
type NotificationsModule = typeof import('expo-notifications');

let _Notifications: NotificationsModule | null = null;
async function getNotifications(): Promise<NotificationsModule | null> {
  // Push notifications were removed from Expo Go in SDK 53 — on Android, merely
  // importing expo-notifications runs an auto-registration side effect that
  // THROWS in Expo Go, which would crash the app on boot. Skip the import
  // entirely there (notifications become a no-op); a dev/production build still
  // loads the module normally.
  if (isRunningInExpoGo()) return null;
  if (!_Notifications) {
    try {
      _Notifications = await import('expo-notifications');
    } catch {
      return null;
    }
  }
  return _Notifications;
}

export async function configureNotifications(): Promise<void> {
  if (configured || Platform.OS === 'web') return;
  configured = true;
  const Notifications = await getNotifications();
  if (!Notifications) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    const current = await Notifications.getPermissionsAsync();
    if (current.status !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      });
    }
  } catch {
    // no-op
  }
}

export async function playNotificationSound(
  title: string,
  body?: string,
  data?: Record<string, unknown>
): Promise<void> {
  if (Platform.OS === 'web') return;
  const Notifications = await getNotifications();
  if (!Notifications) return;
  try {
    await Notifications.scheduleNotificationAsync({
      // `data` rides along so a tapped notification can deep-link (e.g. match_id).
      content: { title, body: body ?? undefined, sound: 'default', data: data ?? {} },
      trigger: null,
    });
  } catch {
    // no-op
  }
}

/**
 * Registers a handler for when the user TAPS a notification (foreground,
 * background, or cold-start launch). Calls `onMatch(matchId)` when the payload
 * carries a `match_id`. No-op on web / in Expo Go. Returns an unsubscribe fn.
 */
export async function addNotificationResponseListener(
  onMatch: (matchId: string) => void
): Promise<() => void> {
  if (Platform.OS === 'web') return () => {};
  const Notifications = await getNotifications();
  if (!Notifications) return () => {};

  const extractMatchId = (data: unknown): string | null => {
    if (data && typeof data === 'object' && 'match_id' in data) {
      const v = (data as Record<string, unknown>).match_id;
      return typeof v === 'string' ? v : null;
    }
    return null;
  };

  try {
    // Cold start: the app was launched by tapping a notification.
    const last = await Notifications.getLastNotificationResponseAsync();
    const coldId = extractMatchId(last?.notification.request.content.data);
    if (coldId) onMatch(coldId);
  } catch {
    // no-op
  }

  const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
    const mid = extractMatchId(resp.notification.request.content.data);
    if (mid) onMatch(mid);
  });
  return () => sub.remove();
}

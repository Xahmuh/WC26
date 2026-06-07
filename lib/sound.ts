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

export async function playNotificationSound(title: string, body?: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const Notifications = await getNotifications();
  if (!Notifications) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body: body ?? undefined, sound: 'default' },
      trigger: null,
    });
  } catch {
    // no-op
  }
}

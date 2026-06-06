// ============================================================================
// Notification sound + foreground presentation via expo-notifications.
// ----------------------------------------------------------------------------
// In-app (foreground) we present an immediate local notification with the OS
// default sound — works on Android + iOS with no bundled audio asset. Calls are
// defensively guarded so web / Expo Go without the native module never crash.
// Background PUSH delivery (Expo push tokens + sender) is a documented
// follow-up; the handler/permissions wired here are the foundation for it.
// ============================================================================

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

let configured = false;

/** Call once at app start. Sets the foreground handler + requests permission. */
export async function configureNotifications(): Promise<void> {
  if (configured || Platform.OS === 'web') return;
  configured = true;
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
    // Native module not present (Expo Go / pre-rebuild) — sound is a no-op.
  }
}

/** Plays the notification sound (and shows a heads-up) for an in-app event. */
export async function playNotificationSound(title: string, body?: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body: body ?? undefined, sound: 'default' },
      trigger: null, // immediate
    });
  } catch {
    // no-op if the native module isn't available yet
  }
}

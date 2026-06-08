// ============================================================================
// NotificationBell — header bell with unread-count badge. Live count comes from
// useNotifications() (realtime). Tapping opens the notifications screen.
// ============================================================================

import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Colors } from '@/constants';
import { Icon } from '@/components/ui/Icon';
import { useNotifications } from '@/hooks/useNotifications';

export function NotificationBell(): React.JSX.Element {
  const router = useRouter();
  const { unreadCount } = useNotifications();

  return (
    <Pressable
      onPress={() => router.push('/notifications' as any)}
      accessibilityRole="button"
      accessibilityLabel={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
      className="items-center justify-center active:opacity-80"
      style={{
        width: 42,
        height: 42,
        borderRadius: 10,
        backgroundColor: 'rgba(18, 18, 18, 0.78)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.16)',
      }}
    >
      <Icon name="bell" size={18} color={Colors.text.primary} />
      {unreadCount > 0 && (
        <View
          style={{
            position: 'absolute',
            top: 7,
            right: 7,
            minWidth: 8,
            height: 8,
            paddingHorizontal: 4,
            borderRadius: 4,
            backgroundColor: Colors.accent.lime,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: Colors.background.primary,
          }}
        >
        </View>
      )}
    </Pressable>
  );
}

// ============================================================================
// NotificationBell — header bell with unread-count badge. Live count comes from
// useNotifications() (realtime). Tapping opens the notifications screen.
// ============================================================================

import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import Theme from '@/constants/theme/design-system';
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
      className="h-9 w-9 items-center justify-center rounded-full bg-bgSurface2 border border-bgBorder active:opacity-80"
    >
      <Icon name="bell" size={18} color={Theme.colors.textPrimary} />
      {unreadCount > 0 && (
        <View
          style={{
            position: 'absolute',
            top: -3,
            right: -3,
            minWidth: 18,
            height: 18,
            paddingHorizontal: 4,
            borderRadius: 9,
            backgroundColor: Theme.colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: Theme.colors.bgDeep,
          }}
        >
          <Text style={{ color: Theme.colors.accentDark, fontSize: 10, fontWeight: '800' }}>
            {unreadCount > 9 ? '9+' : String(unreadCount)}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

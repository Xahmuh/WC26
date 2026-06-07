import { FlatList, Pressable, Text, View, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import Theme from '@/constants/theme/design-system';
import { Container } from '@/components/ui/Container';
import { Icon, type IconName } from '@/components/ui/Icon';
import { EmptyState, ErrorState } from '@/components/ui/States';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/hooks/useNotifications';
import type { AppNotification, NotificationType } from '@/services/notifications.service';

const ICON_FOR: Record<NotificationType, IconName> = {
  points: 'star',
  rank_change: 'trendingUp',
  match_result: 'matches',
  announcement: 'info',
  tournament: 'trophy',
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function NotificationsScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, isLoading, isError, error, unreadCount, refetch, isRefetching } =
    useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const renderItem = ({ item }: { item: AppNotification }) => (
    <Pressable
      onPress={() => {
        // Issue 8 — mark read, then deep-link to the match if the payload has
        // a match_id. A deleted match shows the screen's own "not found" state.
        if (!item.is_read) markRead.mutate(item.id);
        const matchId =
          typeof item.data?.match_id === 'string' ? item.data.match_id : null;
        if (matchId) router.push(`/match/${matchId}`);
      }}
      className={`flex-row items-start gap-3 px-5 py-4 border-b border-bgBorder/60 ${
        item.is_read ? '' : 'bg-bgSurface1'
      } active:opacity-80`}
    >
      <View className="h-9 w-9 items-center justify-center rounded-full bg-accentDim border border-accentBorder/50 mt-0.5">
        <Icon name={ICON_FOR[item.type] ?? 'info'} size={18} color={Theme.colors.accent} />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="flex-1 text-sm font-bold text-textPrimary" numberOfLines={1}>
            {item.title}
          </Text>
          {!item.is_read && (
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Theme.colors.accent }} />
          )}
        </View>
        {item.body ? (
          <Text className="text-xs text-textSecondary mt-0.5">{item.body}</Text>
        ) : null}
        <Text className="text-[10px] text-textTertiary mt-1">{relativeTime(item.created_at)}</Text>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView className="flex-1 bg-bgDeep" edges={['bottom']}>
      {unreadCount > 0 && (
        <Container nested className="flex-row items-center justify-between px-5 py-3 border-b border-bgBorder">
          <Text className="text-xs font-semibold text-textSecondary">
            {unreadCount} unread
          </Text>
          <Pressable
            onPress={() => markAll.mutate()}
            disabled={markAll.isPending}
            className="min-h-11 flex-row items-center gap-1.5 px-2 active:opacity-70"
          >
            <Icon name="check" size={14} color={Theme.colors.accent} />
            <Text className="text-xs font-bold text-accent">Mark all read</Text>
          </Pressable>
        </Container>
      )}

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={Theme.colors.accent} />
        </View>
      ) : isError ? (
        <ErrorState message={error?.message ?? 'Failed to load notifications.'} onRetry={() => void refetch()} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          title="No notifications yet"
          description="You'll be notified when you earn points or your rank changes."
          icon="bell"
        />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(n) => n.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={Theme.colors.accent} />
          }
        />
      )}
    </SafeAreaView>
  );
}

import { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import Theme from '@/constants/theme/design-system';
import { Icon, type IconName } from '@/components/ui/Icon';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState, ErrorState } from '@/components/ui/States';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/hooks/useNotifications';
import type { AppNotification, NotificationType } from '@/services/notifications.service';

const ICON_FOR: Record<NotificationType, IconName> = {
  points: 'star',
  rank_change: 'trendingUp',
  match_result: 'matches',
  announcement: 'info',
  tournament: 'trophy',
  prediction_news: 'flame',
};

function relativeTime(iso: string): string {
  const createdAt = new Date(iso).getTime();
  if (Number.isNaN(createdAt)) return 'recently';

  const diff = Date.now() - createdAt;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return `${Math.floor(hours / 24)}d ago`;
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function getNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function formatNotificationBody(body: string | null, isPoints: boolean): string | null {
  if (!body) return null;
  return isPoints ? body.replace(/\n/g, ' / ') : body;
}

export default function NotificationsScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, isLoading, isError, error, unreadCount, refetch, isRefetching } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const notifications = data ?? [];

  const renderItem = useCallback(
    ({ item }: { item: AppNotification }) => {
      const isPoints = item.type === 'points';
      const pointsNum = getNumber(item.data?.total_points ?? item.data?.points);
      const homeTeam = getString(item.data?.home_team);
      const awayTeam = getString(item.data?.away_team);
      const body = formatNotificationBody(item.body, isPoints);
      const matchParties = isPoints && homeTeam && awayTeam ? `${homeTeam} vs ${awayTeam}` : null;

      return (
        <Pressable
          onPress={() => {
            if (!item.is_read) markRead.mutate(item.id);
            const matchId = getString(item.data?.match_id);
            if (matchId) router.push(`/match/${matchId}`);
          }}
          accessibilityRole="button"
          accessibilityLabel={`${matchParties || item.title}. ${item.is_read ? 'Read' : 'Unread'} notification.`}
          className={`flex-row items-center gap-4 border-b border-bgBorder/60 px-5 py-4 active:opacity-80 ${
            item.is_read ? '' : 'bg-bgSurface1'
          }`}
        >
          <View className="mt-0.5 h-10 w-10 items-center justify-center self-start rounded-full border border-accentBorder/50 bg-accentDim">
            <Icon name={ICON_FOR[item.type] ?? 'info'} size={20} color={Theme.colors.accent} />
          </View>

          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="min-w-0 flex-1 text-sm font-bold text-textPrimary" numberOfLines={1}>
                {matchParties || item.title}
              </Text>
              {!item.is_read ? (
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Theme.colors.accent }} />
              ) : null}
            </View>

            {body ? (
              <Text className="mt-1 text-xs leading-relaxed text-textSecondary" numberOfLines={isPoints ? 2 : 3}>
                {body}
              </Text>
            ) : null}

            <Text className="mt-1.5 text-[10px] font-medium uppercase tracking-wider text-textTertiary">
              {relativeTime(item.created_at)}
            </Text>
          </View>

          {isPoints ? (
            <View className="ml-1 h-12 w-12 items-center justify-center rounded-xl border border-white/5 bg-black shadow-sm">
              <Text className="text-[10px] font-bold uppercase tracking-widest text-textTertiary">PTS</Text>
              <Text className="text-xl font-black" style={{ color: '#A3E635' }}>
                {pointsNum > 0 ? `+${pointsNum}` : '0'}
              </Text>
            </View>
          ) : null}
        </Pressable>
      );
    },
    [markRead, router]
  );

  return (
    <SafeAreaView className="flex-1 bg-bgDeep" edges={['top', 'bottom']}>
      <ScreenHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        fallback="/(tabs)/profile"
        right={
          <Pressable
            onPress={() => markAll.mutate()}
            disabled={markAll.isPending || unreadCount === 0}
            accessibilityRole="button"
            accessibilityLabel="Mark all notifications read"
            accessibilityState={{ disabled: markAll.isPending || unreadCount === 0 }}
            className={`h-10 w-10 items-center justify-center rounded-full border active:opacity-70 ${
              unreadCount > 0 ? 'border-accentBorder bg-accentDim' : 'border-bgBorder bg-bgSurface1 opacity-60'
            }`}
          >
            <Icon name="check" size={16} color={Theme.colors.accent} />
          </Pressable>
        }
      />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={Theme.colors.accent} />
        </View>
      ) : isError ? (
        <ErrorState message={error?.message ?? 'Failed to load notifications.'} onRetry={() => void refetch()} />
      ) : notifications.length === 0 ? (
        <EmptyState
          title="No notifications yet"
          description="You'll be notified when you earn points or your rank changes."
          icon="bell"
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(notification) => notification.id}
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

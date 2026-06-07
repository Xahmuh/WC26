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

  const renderItem = ({ item }: { item: AppNotification }) => {
    const isPoints = item.type === 'points';
    const pointsNum = item.data?.total_points ?? item.data?.points ?? 0;
    const homeTeam = item.data?.home_team as string | undefined;
    const awayTeam = item.data?.away_team as string | undefined;
    const matchParties = isPoints && homeTeam && awayTeam ? `${homeTeam} vs ${awayTeam}` : null;

    return (
      <Pressable
        onPress={() => {
          if (!item.is_read) markRead.mutate(item.id);
          const matchId = typeof item.data?.match_id === 'string' ? item.data.match_id : null;
          if (matchId) router.push(`/match/${matchId}`);
        }}
        className={`flex-row items-center gap-4 px-5 py-4 border-b border-bgBorder/60 ${
          item.is_read ? '' : 'bg-bgSurface1'
        } active:opacity-80`}
      >
        <View className="h-10 w-10 items-center justify-center rounded-full bg-accentDim border border-accentBorder/50 self-start mt-0.5">
          <Icon name={ICON_FOR[item.type] ?? 'info'} size={20} color={Theme.colors.accent} />
        </View>

        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="flex-1 text-sm font-bold text-textPrimary" numberOfLines={1}>
              {matchParties || item.title}
            </Text>
            {!item.is_read && (
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Theme.colors.accent }} />
            )}
          </View>
          {item.body ? (
            <Text className="text-xs text-textSecondary mt-1 leading-relaxed" numberOfLines={isPoints ? 2 : 3}>
              {isPoints ? item.body.replace(/\n/g, ' • ') : item.body}
            </Text>
          ) : null}
          <Text className="text-[10px] font-medium text-textTertiary mt-1.5 uppercase tracking-wider">{relativeTime(item.created_at)}</Text>
        </View>

        {isPoints && (
          <View className="h-12 w-12 items-center justify-center rounded-xl bg-black border border-white/5 shadow-sm ml-1">
            <Text className="text-[10px] font-bold text-textTertiary uppercase tracking-widest">PTS</Text>
            <Text className="text-xl font-black" style={{ color: '#A3E635' }}>{pointsNum > 0 ? `+${pointsNum}` : '0'}</Text>
          </View>
        )}
      </Pressable>
    );
  };

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

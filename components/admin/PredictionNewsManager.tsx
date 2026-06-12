import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import Theme from '@/constants/theme/design-system';
import {
  useCreatePredictionNews,
  useDeletePredictionNews,
  usePredictionNewsAdmin,
  useUpdatePredictionNews,
} from '@/hooks/usePredictionNews';
import type { PredictionNews } from '@/types';

type DialogVariant = 'success' | 'error' | 'warning' | 'info' | 'danger';

type ShowAdminDialog = (dialog: {
  title: string;
  message?: string;
  variant?: DialogVariant;
  actions?: Array<{
    label: string;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'lime';
    onPress?: () => void;
  }>;
}) => void;

const STRIP_COLOR = '#c7cb73';
const MAX_MESSAGE_LENGTH = 220;

function formatCreatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Recently';

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function NewsRow({
  item,
  onDialog,
}: {
  item: PredictionNews;
  onDialog?: ShowAdminDialog;
}): React.JSX.Element {
  const updateMutation = useUpdatePredictionNews();
  const deleteMutation = useDeletePredictionNews();
  const isMutating =
    (updateMutation.isPending && updateMutation.variables?.newsId === item.id) ||
    (deleteMutation.isPending && deleteMutation.variables === item.id);

  const toggleActive = (): void => {
    updateMutation.mutate(
      { newsId: item.id, updates: { isActive: !item.is_active } },
      {
        onSuccess: () => {
          onDialog?.({
            title: item.is_active ? 'Hidden' : 'Activated',
            message: item.is_active
              ? 'This breaking news item is no longer shown in the strip.'
              : 'This breaking news item is now visible in the strip.',
            variant: 'success',
          });
        },
        onError: (err) => {
          onDialog?.({
            title: 'Error',
            message: err instanceof Error ? err.message : 'Could not update this news item.',
            variant: 'error',
          });
        },
      }
    );
  };

  const confirmDelete = (): void => {
    onDialog?.({
      title: 'Delete news item?',
      message: 'This removes it from the breaking-news strip. Existing user notifications stay in their inbox.',
      variant: 'danger',
      actions: [
        { label: 'Cancel', variant: 'ghost' },
        {
          label: 'Delete',
          variant: 'danger',
          onPress: () => {
            deleteMutation.mutate(item.id, {
              onSuccess: () => {
                onDialog?.({
                  title: 'Deleted',
                  message: 'Breaking news item removed.',
                  variant: 'success',
                });
              },
              onError: (err) => {
                onDialog?.({
                  title: 'Error',
                  message: err instanceof Error ? err.message : 'Could not delete this news item.',
                  variant: 'error',
                });
              },
            });
          },
        },
      ],
    });
  };

  return (
    <View className="gap-3 rounded-2xl border border-bgBorder bg-bgSurface1 p-3">
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <View className="mb-2 flex-row flex-wrap items-center gap-2">
            <View
              className="rounded-full px-2 py-1"
              style={{ backgroundColor: item.is_active ? STRIP_COLOR : Theme.colors.bgSurface2 }}
            >
              <Text
                className="text-[10px] font-black uppercase"
                style={{ color: item.is_active ? '#111111' : Theme.colors.textSecondary }}
              >
                {item.is_active ? 'Live strip' : 'Hidden'}
              </Text>
            </View>
            <Text className="text-[10px] font-semibold uppercase text-textTertiary">
              {formatCreatedAt(item.created_at)}
            </Text>
          </View>

          <Text className="text-sm font-bold leading-5 text-textPrimary">
            {item.message}
          </Text>
        </View>

        {isMutating ? <ActivityIndicator size="small" color={Theme.colors.accent} /> : null}
      </View>

      <View className="flex-row gap-2">
        <Pressable
          onPress={toggleActive}
          disabled={isMutating}
          className="min-h-11 flex-1 items-center justify-center rounded-xl border border-accentBorder bg-accentDim px-3 active:opacity-75"
        >
          <Text className="text-center text-xs font-bold uppercase text-accent" numberOfLines={1}>
            {item.is_active ? 'Hide' : 'Show'}
          </Text>
        </Pressable>
        <Pressable
          onPress={confirmDelete}
          disabled={isMutating}
          className="min-h-11 flex-1 items-center justify-center rounded-xl border border-live/30 bg-liveDim px-3 active:opacity-75"
        >
          <Text className="text-center text-xs font-bold uppercase text-live" numberOfLines={1}>
            Delete
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export function PredictionNewsManager({ onDialog }: { onDialog?: ShowAdminDialog }): React.JSX.Element {
  const newsQuery = usePredictionNewsAdmin();
  const createMutation = useCreatePredictionNews();
  const [message, setMessage] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [sendNotification, setSendNotification] = useState(true);

  const trimmedMessage = message.trim();
  const remaining = MAX_MESSAGE_LENGTH - trimmedMessage.length;
  const rows = useMemo(() => newsQuery.data ?? [], [newsQuery.data]);

  const handleCreate = (): void => {
    if (trimmedMessage.length < 8) {
      onDialog?.({
        title: 'Message too short',
        message: 'Write at least 8 characters for the breaking news item.',
        variant: 'warning',
      });
      return;
    }

    createMutation.mutate(
      {
        message: trimmedMessage,
        isActive,
        sendNotification,
      },
      {
        onSuccess: () => {
          setMessage('');
          setIsActive(true);
          setSendNotification(true);
          onDialog?.({
            title: 'Breaking news added',
            message: sendNotification
              ? 'The strip was updated and users received a notification.'
              : 'The strip was updated without sending notifications.',
            variant: 'success',
          });
        },
        onError: (err) => {
          onDialog?.({
            title: 'Error',
            message: err instanceof Error ? err.message : 'Could not add breaking news.',
            variant: 'error',
          });
        },
      }
    );
  };

  return (
    <View className="gap-4">
      <View className="gap-2">
        <Text className="text-base font-black text-textPrimary">Prediction Breaking News</Text>
        <Text className="text-sm leading-5 text-textSecondary">
          Add short prediction updates. Active items rotate in the top strip, and new items can broadcast to user notifications.
        </Text>
      </View>

      <View className="gap-3 rounded-2xl border border-bgBorder bg-bgSurface1 p-3">
        <View className="rounded-xl px-3 py-2" style={{ backgroundColor: STRIP_COLOR }}>
          <View className="flex-row items-center gap-2">
            <Icon name="flame" size={14} color="#111111" fixed />
            <Text className="text-[10px] font-black uppercase text-[#111111]">
              Breaking
            </Text>
            <Text className="min-w-0 flex-1 text-xs font-black text-[#111111]" numberOfLines={2}>
              {trimmedMessage || 'The match between Senegal and France assigned to be x2 instead of x1'}
            </Text>
          </View>
        </View>

        <View className="gap-1.5">
          <Text className="text-xs font-bold uppercase text-textSecondary">Message</Text>
          <TextInput
            value={message}
            onChangeText={(value) => setMessage(value.slice(0, MAX_MESSAGE_LENGTH))}
            placeholder="The match between Senegal and France assigned to be x2 instead of x1"
            placeholderTextColor={Theme.colors.textTertiary}
            multiline
            textAlignVertical="top"
            className="min-h-[88px] rounded-xl border border-bgBorder bg-bgSurface2 px-3 py-3 text-sm text-textPrimary"
          />
          <Text className={['text-right text-[10px] font-semibold', remaining < 0 ? 'text-live' : 'text-textTertiary'].join(' ')}>
            {remaining} left
          </Text>
        </View>

        <View className="gap-2">
          <Pressable
            onPress={() => setIsActive((value) => !value)}
            className="flex-row items-center justify-between rounded-xl border border-bgBorder bg-bgSurface2 px-3 py-3 active:opacity-80"
          >
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-bold text-textPrimary">Show in strip</Text>
              <Text className="mt-0.5 text-[11px] text-textTertiary">
                Active news appears above the header immediately.
              </Text>
            </View>
            <View className={['h-6 w-11 rounded-full p-1', isActive ? 'bg-accent' : 'bg-bgSurface1'].join(' ')}>
              <View className={['h-4 w-4 rounded-full bg-black', isActive ? 'ml-5' : 'ml-0'].join(' ')} />
            </View>
          </Pressable>

          <Pressable
            onPress={() => setSendNotification((value) => !value)}
            className="flex-row items-center justify-between rounded-xl border border-bgBorder bg-bgSurface2 px-3 py-3 active:opacity-80"
          >
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-bold text-textPrimary">Send notification</Text>
              <Text className="mt-0.5 text-[11px] text-textTertiary">
                Create a notification for every active user when this item is added.
              </Text>
            </View>
            <View className={['h-6 w-11 rounded-full p-1', sendNotification ? 'bg-accent' : 'bg-bgSurface1'].join(' ')}>
              <View className={['h-4 w-4 rounded-full bg-black', sendNotification ? 'ml-5' : 'ml-0'].join(' ')} />
            </View>
          </Pressable>
        </View>

        <Button
          label="Add Breaking News"
          variant="lime"
          loading={createMutation.isPending}
          disabled={trimmedMessage.length < 8 || createMutation.isPending}
          onPress={handleCreate}
        />
      </View>

      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-black uppercase text-textSecondary">
            Current news
          </Text>
          {newsQuery.isLoading ? <ActivityIndicator size="small" color={Theme.colors.accent} /> : null}
        </View>

        {newsQuery.isError ? (
          <View className="rounded-2xl border border-live/30 bg-liveDim p-4">
            <Text className="text-sm font-bold text-live">
              {newsQuery.error?.message ?? 'Could not load prediction news.'}
            </Text>
          </View>
        ) : rows.length === 0 ? (
          <View className="items-center gap-2 rounded-2xl border border-bgBorder bg-bgSurface1 p-5">
            <Icon name="info" size={18} color={Theme.colors.textSecondary} />
            <Text className="text-center text-sm font-semibold text-textSecondary">
              No breaking news yet.
            </Text>
          </View>
        ) : (
          rows.map((item) => (
            <NewsRow key={item.id} item={item} onDialog={onDialog} />
          ))
        )}
      </View>
    </View>
  );
}

import { useMemo } from 'react';
import { ScrollView, Text, View, Pressable, Image, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import Theme from '@/constants/theme/design-system';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useGroupLeaderboard } from '@/hooks/useGroups';
import { useAuthStore } from '@/stores/auth.store';

export default function GroupDetailsScreen(): React.JSX.Element {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const currentUserId = useAuthStore((s) => s.session?.user.id);

  const { data, isLoading, isError, error, refetch } = useGroupLeaderboard(id!);

  const group = data?.group;
  const members = data?.members || [];

  const handleShareCode = async () => {
    if (!group) return;
    try {
      await Share.share({
        message: `Join my World Cup 2026 Prediction League!\nGroup: ${group.name}\nInvite Code: ${group.code}\n\nDownload the app and enter the code in the Mini-Leagues tab!`,
      });
    } catch (err: any) {
      Alert.alert('Error', 'Failed to share invite code.');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-bgDeep justify-center items-center">
        <LoadingSpinner label="Loading standings..." />
      </SafeAreaView>
    );
  }

  if (isError || !group) {
    return (
      <SafeAreaView className="flex-1 bg-bgDeep justify-center items-center px-6">
        <Icon name="warning" size={40} color={Theme.colors.live} />
        <Text className="text-xl font-bold text-textPrimary mt-4">Failed to load group</Text>
        <Text className="text-sm text-textSecondary text-center mt-2">
          {error?.message || 'The group does not exist or you do not have permission to view it.'}
        </Text>
        <View className="mt-6 w-40">
          <Button label="Go back" variant="secondary" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bgDeep" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="px-6 py-3 flex-row items-center justify-between border-b border-bgBorder">
        <View className="flex-1 flex-row items-center gap-2">
          <Pressable onPress={() => router.back()} className="-ml-2 p-2 active:opacity-70">
            <Icon name="back" size={22} color={Theme.colors.accent} />
          </Pressable>
          <Text numberOfLines={1} className="flex-1 text-xl font-extrabold uppercase tracking-tight text-textPrimary">
            {group.name}
          </Text>
        </View>
        <Pressable onPress={() => void refetch()} className="p-2 active:opacity-70">
          <Icon name="refresh" size={20} color={Theme.colors.accent} />
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="px-6 py-4 gap-6">
        {/* Invite Code Share Card */}
        <Card className="p-5 border border-accentBorder bg-accentDim/5 gap-3">
          <View className="items-center gap-1">
            <Text className="text-xs text-textSecondary uppercase tracking-wider font-semibold">
              Invite your friends
            </Text>
            <Text className="text-3xl font-extrabold text-accent tracking-widest">{group.code}</Text>
          </View>
          <Pressable
            onPress={handleShareCode}
            className="h-10 flex-row gap-2 bg-accent rounded-full justify-center items-center active:opacity-85"
          >
            <Icon name="share" size={15} color={Theme.colors.accentDark} />
            <Text className="text-xs font-bold text-accentDark uppercase tracking-wide">
              Share Invite Code
            </Text>
          </Pressable>
        </Card>

        {/* Members Leaderboard Standings */}
        <View className="gap-3">
          <Text className="text-lg font-semibold text-textPrimary">Standings ({members.length})</Text>

          <Card className="overflow-hidden border border-bgBorder bg-bgSurface2">
            {/* Table Header */}
            <View className="flex-row items-center border-b border-bgBorder bg-bgSurface3 px-4 py-3">
              <Text className="w-10 text-xs font-semibold text-textSecondary text-center">Rank</Text>
              <Text className="flex-grow text-xs font-semibold text-textSecondary pl-2">Player</Text>
              <Text className="w-16 text-xs font-semibold text-textSecondary text-right">Points</Text>
            </View>

            {/* Table Rows */}
            <View>
              {members.map((member) => {
                const isMe = member.user_id === currentUserId;
                const initials = (member.display_name ?? '?').slice(0, 2).toUpperCase();

                // Custom rank badge background
                let rankBg = 'bg-bgSurface1 border-bgBorder';
                let rankTextColor = 'text-textSecondary';
                if (member.rank === 1) {
                  rankBg = 'bg-gold/20 border-gold/30';
                  rankTextColor = 'text-gold';
                } else if (member.rank === 2) {
                  rankBg = 'bg-silver/20 border-silver/30';
                  rankTextColor = 'text-silver';
                } else if (member.rank === 3) {
                  rankBg = 'bg-bronze/20 border-bronze/30';
                  rankTextColor = 'text-bronze';
                }

                return (
                  <View
                    key={member.user_id}
                    className={`flex-row items-center px-4 py-3 border-b border-bgBorder/50 ${
                      isMe ? 'bg-accentDim/10' : ''
                    }`}
                  >
                    {/* Rank Badge */}
                    <View className="w-10 items-center">
                      <View className={`h-6 w-6 rounded-full border items-center justify-center ${rankBg}`}>
                        <Text className={`text-xs font-bold ${rankTextColor}`}>
                          {member.rank}
                        </Text>
                      </View>
                    </View>

                    {/* Profile & Name */}
                    <View className="flex-grow flex-row items-center pl-2 gap-2">
                      {member.avatar_url ? (
                        <Image
                          source={{ uri: member.avatar_url }}
                          style={{ width: 26, height: 26, borderRadius: 13 }}
                        />
                      ) : (
                        <View className="h-[26px] w-[26px] items-center justify-center rounded-full bg-bgSurface3">
                          <Text className="text-[10px] font-bold text-textSecondary">{initials}</Text>
                        </View>
                      )}
                      <Text
                        numberOfLines={1}
                        className={`text-sm flex-1 ${isMe ? 'font-bold text-accent' : 'text-textPrimary'}`}
                      >
                        {member.display_name} {isMe ? '(You)' : ''}
                      </Text>
                    </View>

                    {/* Points */}
                    <Text className={`w-16 text-sm text-right font-bold ${isMe ? 'text-accent' : 'text-textPrimary'}`}>
                      {member.total_points}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

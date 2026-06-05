import { useMemo, useState } from 'react';
import { ScrollView, Text, View, Image, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import Theme from '@/constants/theme/design-system';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TeamFlag } from '@/components/ui/TeamFlag';
import { TeamPickerModal } from '@/components/ui/TeamPickerModal';
import { useTeams } from '@/hooks/useTeams';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useMyPoints } from '@/hooks/usePoints';
import { useMyPredictions } from '@/hooks/usePredictions';
import { useAuthStore } from '@/stores/auth.store';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen(): React.JSX.Element {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const userId = useAuthStore((s) => s.session?.user.id);
  const email = useAuthStore((s) => s.session?.user.email);
  const signOut = useAuthStore((s) => s.signOut);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const { data: teams = [] } = useTeams();
  const [showPicker, setShowPicker] = useState(false);
  const [savingTeams, setSavingTeams] = useState(false);

  const handleSaveTeams = async (teamsList: string[]) => {
    if (!userId) return;
    setSavingTeams(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ supported_teams: teamsList })
        .eq('id', userId);

      if (error) throw error;
      await refreshProfile();
      setShowPicker(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update teams.');
    } finally {
      setSavingTeams(false);
    }
  };

  const predictionsQuery = useMyPredictions();
  const pointsQuery = useMyPoints();
  const leaderboardQuery = useLeaderboard();

  const predictionsMade = predictionsQuery.data?.size ?? 0;

  const scored = useMemo(() => {
    if (!pointsQuery.data) return 0;
    return [...pointsQuery.data.values()].filter((p) => p.total_points > 0).length;
  }, [pointsQuery.data]);

  const rank = useMemo(
    () => leaderboardQuery.data?.find((e) => e.user_id === userId)?.rank ?? null,
    [leaderboardQuery.data, userId]
  );

  const initials = (profile?.display_name ?? '?').slice(0, 2).toUpperCase();
  const isAdmin = profile?.role === 'admin';

  return (
    <SafeAreaView className="flex-1 bg-bgDeep" edges={['top']}>
      <ScrollView contentContainerClassName="px-4 pb-8 pt-2 gap-6">
        <Text className="text-2xl font-bold text-textPrimary">Profile</Text>

        <Card className="items-center gap-3 p-6 border border-bgBorder bg-bgSurface2">
          {profile?.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              style={{ width: 80, height: 80, borderRadius: 40 }}
              className="border border-accent"
            />
          ) : (
            <View className="h-20 w-20 items-center justify-center rounded-full bg-bgSurface3 border border-bgBorder">
              <Text className="text-2xl font-bold text-textSecondary">{initials}</Text>
            </View>
          )}
          <View className="items-center gap-1.5">
            <View className="flex-row items-center gap-2">
              <Text className="text-lg font-bold text-textPrimary">
                {profile?.display_name ?? 'Player'}
              </Text>
              {isAdmin && (
                <View className="bg-red-500/20 border border-red-500/30 rounded px-1.5 py-0.5">
                  <Text className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
                    Admin
                  </Text>
                </View>
              )}
            </View>
            {email ? <Text className="text-sm text-textSecondary">{email}</Text> : null}
            {profile?.supported_teams && profile.supported_teams.length > 0 && (
              <View className="flex-row gap-1.5 mt-2">
                {profile.supported_teams.map((teamId) => {
                  const team = teams.find((t) => t.id === teamId);
                  if (!team) return null;
                  return <TeamFlag key={teamId} team={team} size={20} fixed />;
                })}
              </View>
            )}
          </View>
        </Card>

        {/* Action Buttons */}
        <View className="gap-3">
          <Button
            label="⚽ Edit Supported Teams"
            variant="ghost"
            onPress={() => setShowPicker(true)}
          />
          <Button
            label="🏆 Mini-Leagues / Groups"
            variant="ghost"
            onPress={() => router.push('/groups' as any)}
          />
          {isAdmin && (
            <Button
              label="🛠️ Admin Dashboard"
              variant="secondary"
              onPress={() => router.push('/admin' as any)}
            />
          )}
        </View>

        <View className="flex-row gap-3">
          <StatTile label="Points" value={profile?.total_points ?? 0} />
          <StatTile label="Rank" value={rank ? `#${rank}` : '—'} />
        </View>
        <View className="flex-row gap-3">
          <Pressable
            onPress={() => router.push('/profile/predictions' as any)}
            className="flex-1 active:opacity-80"
          >
            <StatTile label="Predictions" value={predictionsMade} />
          </Pressable>
          <StatTile label="Scored" value={scored} />
        </View>

        <View className="mt-2">
          <Button label="Sign out" variant="danger" onPress={() => void signOut()} />
        </View>
      </ScrollView>

      {showPicker && (
        <TeamPickerModal
          visible={true}
          onClose={() => setShowPicker(false)}
          selectedTeams={profile?.supported_teams || []}
          onSave={handleSaveTeams}
          saving={savingTeams}
        />
      )}
    </SafeAreaView>
  );
}

interface StatTileProps {
  label: string;
  value: string | number;
}

function StatTile({ label, value }: StatTileProps): React.JSX.Element {
  return (
    <Card className="flex-1 items-center gap-1 p-4 border border-bgBorder bg-bgSurface2">
      <Text className="text-2xl font-bold text-textPrimary">{value}</Text>
      <Text className="text-xs text-textSecondary">{label}</Text>
    </Card>
  );
}

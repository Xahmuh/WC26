import { useMemo, useState } from 'react';
import { Modal, ScrollView, Text, View, Image, Alert, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import Theme from '@/constants/theme/design-system';
import { TAB_BAR_CLEARANCE } from '@/components/ui/FloatingTabBar';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
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
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const userId = useAuthStore((s) => s.session?.user.id);
  const email = useAuthStore((s) => s.session?.user.email);
  const signOut = useAuthStore((s) => s.signOut);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const { data: teams = [] } = useTeams();
  const [showPicker, setShowPicker] = useState(false);
  const [savingTeams, setSavingTeams] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleChangeAvatar = async () => {
    if (!userId) return;
    let pickedUri = '';

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need storage permission to change your avatar.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;
      pickedUri = result.assets[0].uri;

      setUploadingAvatar(true);

      const fileExt = pickedUri.split('.').pop() || 'jpg';
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Try uploading to Supabase storage avatars bucket
      const formData = new FormData();
      formData.append('file', {
        uri: pickedUri,
        name: fileName,
        type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
      } as any);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, formData, {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          upsert: true,
        });

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        const avatarUrl = urlData.publicUrl;

        const { error: updateError } = await supabase
          .from('users')
          .update({ avatar_url: avatarUrl })
          .eq('id', userId);

        if (updateError) throw updateError;
        await refreshProfile();
        Alert.alert('Success', 'Avatar updated successfully!');
      } else {
        throw uploadError;
      }
    } catch (err: any) {
      console.log('Storage upload failed, trying base64 fallback:', err.message);
      if (!pickedUri) return;
      // Fallback to Base64 in users table directly
      try {
        const response = await fetch(pickedUri);
        const blob = await response.blob();
        // Await the FileReader so `finally` (which clears the spinner) only runs
        // once the upload actually completes — not while it's still pending.
        const base64data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error ?? new Error('Failed to read image.'));
          reader.readAsDataURL(blob);
        });

        const { error: base64UpdateError } = await supabase
          .from('users')
          .update({ avatar_url: base64data })
          .eq('id', userId);

        if (base64UpdateError) {
          Alert.alert('Error', base64UpdateError.message);
        } else {
          await refreshProfile();
          Alert.alert('Success', 'Avatar updated successfully!');
        }
      } catch (fallbackErr: any) {
        Alert.alert('Error', fallbackErr.message || 'Failed to update avatar.');
      }
    } finally {
      setUploadingAvatar(false);
    }
  };

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
      <ScrollView
        contentContainerClassName="px-6 pt-2 gap-6"
        contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }}
      >
        <View className="flex-row items-center gap-2.5">
          <View style={{ width: 5, height: 24, borderRadius: 2, backgroundColor: Theme.colors.accent }} />
          <Text className="text-2xl font-extrabold uppercase tracking-tight text-textPrimary">Profile</Text>
        </View>

        {/* ClutchTime UI Kit Avatar Card */}
        <View
          style={{ borderRadius: 16, backgroundColor: '#222222', borderWidth: 1, borderColor: '#3A3A3A' }}
          className="shadow-md shadow-black/60"
        >
          <View style={{ padding: 24 }}>
            <View className="flex-row items-center gap-5">
              {/* Avatar on Left */}
              <Pressable onPress={handleChangeAvatar} disabled={uploadingAvatar} className="relative active:opacity-90">
                <View style={{ borderRadius: 42, backgroundColor: '#111111' }}>
                  <Image
                    source={profile?.avatar_url ? { uri: profile.avatar_url } : require('@/assets/default_avatar.jpg')}
                    style={{ width: 84, height: 84, borderRadius: 42 }}
                    className="border border-[#3A3A3A]"
                  />
                </View>
                {/* Edit overlay badge */}
                <View
                  style={{ position: 'absolute', bottom: -2, right: -2, backgroundColor: '#C8FF00', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#222222', elevation: 4 }}
                >
                  {uploadingAvatar ? (
                    <ActivityIndicator size="small" color="#111111" />
                  ) : (
                    <Icon name="edit" size={14} color="#111111" />
                  )}
                </View>
              </Pressable>

              {/* Info on Right — min-w-0 lets children truncate inside the flex row */}
              <View className="flex-1 justify-center min-w-0">
                <View className="flex-row items-center gap-2">
                  {/* flex-1 + numberOfLines: long names ellipsize instead of
                      shoving the role badge off the card. */}
                  <Text
                    numberOfLines={1}
                    className="flex-1 text-[20px] font-bold text-white tracking-tight"
                  >
                    {profile?.display_name ?? 'Player'}
                  </Text>
                  <View
                    style={
                      isAdmin
                        ? { backgroundColor: 'rgba(224,48,48,0.1)', borderColor: '#E03030', borderWidth: 1 }
                        : { backgroundColor: 'rgba(200,255,0,0.1)', borderColor: Theme.colors.accent, borderWidth: 1 }
                    }
                    className="rounded-full px-2 py-0.5 shrink-0"
                  >
                    <Text
                      className="text-[9px] font-extrabold uppercase tracking-wider"
                      style={{ color: isAdmin ? '#E03030' : Theme.colors.accent }}
                    >
                      {isAdmin ? 'Admin' : 'User'}
                    </Text>
                  </View>
                </View>
                {email && <Text numberOfLines={1} className="text-[12px] font-medium text-[#888888] mt-1">{email}</Text>}
                
                {/* Supported Teams Badges */}
                {profile?.supported_teams && profile.supported_teams.length > 0 && (
                  <View className="flex-row gap-2 mt-4 flex-wrap">
                    {profile.supported_teams.map((teamId) => {
                      const team = teams.find((t) => t.id === teamId);
                      if (!team) return null;
                      return (
                        <View
                          key={teamId}
                          style={{ paddingHorizontal: 8, paddingVertical: 6, borderRadius: 4, backgroundColor: '#2A2A2A', flexDirection: 'row', alignItems: 'center', gap: 6 }}
                        >
                          <TeamFlag team={team} size={16} fixed />
                          <Text className="text-[10px] font-bold text-[#CCCCCC] uppercase tracking-wider">
                            {team.code ?? team.short_name ?? team.name}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="gap-3">
          <ProfileOption
            label="Edit Supported Teams"
            icon="shield"
            onPress={() => setShowPicker(true)}
          />
          <ProfileOption
            label="Mini-Leagues / Groups"
            icon="trophy"
            onPress={() => router.push('/groups' as any)}
          />
          <ProfileOption
            label="Notifications"
            icon="bell"
            onPress={() => router.push('/notifications' as any)}
          />
          {isAdmin && (
            <ProfileOption
              label="Admin Dashboard"
              icon="settings"
              onPress={() => router.push('/admin' as any)}
            />
          )}
        </View>

        {/* KPIs */}
        <View className="gap-3 mt-2">
          <View className="flex-row gap-3">
            <View className="flex-1">
              <StatTile 
                label="Points" 
                value={profile?.total_points ?? 0} 
                icon="star"
                iconColor="#FDE047"
                accentColor="#CA8A04"
              />
            </View>
            <View className="flex-1">
              <StatTile 
                label="Rank" 
                value={rank ? `#${rank}` : '—'} 
                icon="medal"
                iconColor="#38BDF8"
                accentColor="#0284C7"
              />
            </View>
          </View>
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => router.push('/profile/predictions' as any)}
              className="flex-1 active:opacity-80"
            >
              <StatTile 
                label="Predictions" 
                value={predictionsMade} 
                icon="target"
                iconColor="#C084FC"
                accentColor="#9333EA"
              />
            </Pressable>
            <View className="flex-1">
              <StatTile 
                label="Scored" 
                value={scored} 
                icon="flame"
                iconColor="#F87171"
                accentColor="#DC2626"
              />
            </View>
          </View>
        </View>

        <View className="mt-6 mb-2">
          <Button label="Sign out" variant="lime" onPress={() => setShowSignOutConfirm(true)} />
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

      {/* Sign-out confirmation popup */}
      <Modal
        visible={showSignOutConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSignOutConfirm(false)}
      >
        <Pressable
          onPress={() => setShowSignOutConfirm(false)}
          className="flex-1 items-center justify-center bg-black/70 px-8"
        >
          <Pressable className="w-full max-w-sm rounded-2xl border border-bgBorder bg-bgSurface2 p-6 gap-5">
            <View className="items-center gap-3">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-accentDim border border-accentBorder">
                <Icon name="logout" size={24} color={Theme.colors.accent} />
              </View>
              <Text className="text-lg font-bold text-textPrimary text-center">Sign out</Text>
              <Text className="text-sm text-textSecondary text-center">
                Are you sure you want to exit the application?
              </Text>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button
                  label="Yes"
                  variant="primary"
                  onPress={() => {
                    setShowSignOutConfirm(false);
                    void signOut();
                  }}
                />
              </View>
              <View className="flex-1">
                <Button
                  label="No"
                  variant="primary"
                  onPress={() => setShowSignOutConfirm(false)}
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

interface StatTileProps {
  label: string;
  value: string | number;
  icon?: any;
  iconColor?: string;
  accentColor?: string;
}

function StatTile({ label, value, icon }: StatTileProps): React.JSX.Element {
  return (
    <View 
      className="flex-1 p-4 rounded-2xl shadow-md shadow-black/60"
      style={{ minHeight: 100, backgroundColor: '#222222', borderColor: '#3A3A3A', borderWidth: 1 }}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-[11px] font-bold text-[#CCCCCC] uppercase tracking-widest mt-1">
          {label}
        </Text>
        {icon && (
          <View style={{ backgroundColor: '#1A1A1A', borderRadius: 8, padding: 6, borderWidth: 1, borderColor: '#2A2A2A' }}>
            <Icon name={icon} size={14} color="#FFFFFF" />
          </View>
        )}
      </View>
      <Text className="text-[32px] font-black text-white tracking-tighter mt-3">{value}</Text>
    </View>
  );
}

function ProfileOption({ label, icon, onPress }: { label: string; icon: any; onPress: () => void }): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center bg-bgSurface2 p-4 rounded-2xl border border-bgBorder active:opacity-70 shadow-sm shadow-black/20"
    >
      <View className="w-11 h-11 rounded-full bg-accentDim items-center justify-center mr-4 border border-accentBorder/50">
        <Icon name={icon} size={20} color={Theme.colors.accent} />
      </View>
      <Text className="flex-1 text-[15px] font-bold text-textPrimary tracking-wide">{label}</Text>
      <Icon name="forward" size={18} color={Theme.colors.textSecondary} />
    </Pressable>
  );
}

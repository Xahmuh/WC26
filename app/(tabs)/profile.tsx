import { useMemo, useState } from 'react';
import { Modal, ScrollView, Text, View, Alert, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';

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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64data = reader.result as string;
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
        };
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
        <Text className="text-2xl font-extrabold uppercase tracking-tight text-textPrimary">Profile</Text>

        <View 
          style={{ borderRadius: 28, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.08)' }}
          className="shadow-2xl shadow-black/50"
        >
          <BlurView 
            intensity={50} 
            tint="dark" 
            className="items-center gap-4 p-6 bg-bgDeep/20"
          >
            {/* Subtle light flare background decoration */}
            <View 
              style={{ 
                position: 'absolute', 
                top: -65, 
                right: -65, 
                width: 130, 
                height: 130, 
                borderRadius: 65, 
                backgroundColor: Theme.colors.accent, 
                opacity: 0.15,
              }} 
            />

            <Pressable 
              onPress={handleChangeAvatar} 
              disabled={uploadingAvatar}
              className="relative active:opacity-90"
            >
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={{ width: 88, height: 88, borderRadius: 44 }}
                  className="border-2 border-accent"
                />
              ) : (
                <Image
                  source={require('../../assets/avatar.webp')}
                  style={{ width: 88, height: 88, borderRadius: 44 }}
                  className="border-2 border-accent"
                />
              )}
              
              {/* Edit overlay badge */}
              <View 
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  backgroundColor: Theme.colors.accent,
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: '#131524',
                  elevation: 4,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 2,
                }}
              >
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color={Theme.colors.bgDeep} />
                ) : (
                  <Icon name="edit" size={12} color="#001C3D" />
                )}
              </View>
            </Pressable>

            <View className="items-center gap-2">
              <View className="flex-row items-center gap-2 justify-center">
                <Text className="text-xl font-black text-textPrimary tracking-tight">
                  {profile?.display_name ?? 'Player'}
                </Text>
                {isAdmin && (
                  <View className="bg-liveDim border border-live rounded-full px-2 py-0.5">
                    <Text className="text-[9px] font-extrabold text-live uppercase tracking-wider">
                      Admin
                    </Text>
                  </View>
                )}
              </View>

              {profile?.supported_teams && profile.supported_teams.length > 0 && (
                <View className="flex-row gap-2 mt-1 justify-center items-center">
                  {profile.supported_teams.map((teamId) => {
                    const team = teams.find((t) => t.id === teamId);
                    if (!team) return null;
                    return (
                      <View 
                        key={teamId} 
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 19,
                          overflow: 'hidden',
                          borderWidth: 1.5,
                          borderColor: Theme.colors.bgBorder,
                          justifyContent: 'center',
                          alignItems: 'center',
                          backgroundColor: Theme.colors.bgSurface3,
                        }}
                      >
                        <TeamFlag team={team} size={38} fixed />
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </BlurView>
        </View>

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
          <Button label="Sign out" variant="primary" onPress={() => setShowSignOutConfirm(true)} />
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
}

function StatTile({ label, value }: StatTileProps): React.JSX.Element {
  return (
    <Card className="flex-1 items-center gap-1 p-4 border border-bgBorder bg-bgSurface2">
      <Text className="text-2xl font-bold text-textPrimary">{value}</Text>
      <Text className="text-xs text-textSecondary">{label}</Text>
    </Card>
  );
}

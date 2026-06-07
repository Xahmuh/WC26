import { useMemo, useState } from 'react';
import { Modal, ScrollView, Text, View, Image, Alert, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import Theme from '@/constants/theme/design-system';
import { Container } from '@/components/ui/Container';
import { TAB_BAR_CLEARANCE } from '@/components/ui/FloatingTabBar';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Card } from '@/components/ui/Card';
import { TeamFlag } from '@/components/ui/TeamFlag';
import { TeamPickerModal } from '@/components/ui/TeamPickerModal';
import { useResponsive } from '@/lib/responsive';
import { useTeams } from '@/hooks/useTeams';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useMyPoints } from '@/hooks/usePoints';
import { useMyPredictions } from '@/hooks/usePredictions';
import { useAuthStore } from '@/stores/auth.store';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { scale: rs, isSmall } = useResponsive();
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
  const [editingName, setEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [savingName, setSavingName] = useState(false);

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

  const handleSaveName = async () => {
    const name = editNameValue.trim();
    if (!name || !userId) return;
    setSavingName(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ display_name: name })
        .eq('id', userId);
      if (error) throw error;
      await refreshProfile();
      setEditingName(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update name.');
    } finally {
      setSavingName(false);
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

  const displayHandle = (profile?.username || profile?.display_name) ?? '?';
  const initials = displayHandle.slice(0, 2).toUpperCase();
  const isAdmin = profile?.role === 'admin';

  return (
    <SafeAreaView className="flex-1 bg-bgDeep" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_CLEARANCE + 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Container nested className="px-6 pt-6 gap-6">
        <View className="gap-6">
        <View className="flex-row items-center gap-2.5">
          <View style={{ width: 5, height: 24, borderRadius: 2, backgroundColor: Theme.colors.accent }} />
          <Text className="text-2xl font-extrabold uppercase tracking-tight text-textPrimary">Profile</Text>
        </View>

        {/* Avatar Card — centered, full-width bands so nothing can overflow */}
        <LinearGradient
          colors={['#1C1C1E', '#151516', '#0D0D0D']}
          style={{ borderRadius: 20, borderWidth: 1, borderColor: Theme.colors.bgBorder, overflow: 'hidden' }}
          className="shadow-lg shadow-black/80"
        >
          <View style={{ padding: rs(isSmall ? 18 : 22), alignItems: 'center' }}>
            {/* Avatar */}
            <Pressable onPress={handleChangeAvatar} disabled={uploadingAvatar} className="active:opacity-90">
              {(() => {
                const a = rs(isSmall ? 84 : 92);
                const badge = rs(28);
                return (
                  <View style={{ borderRadius: a / 2 + 5, padding: 2.5, backgroundColor: Theme.colors.accentDim }}>
                    <View style={{ borderRadius: a / 2 + 2, padding: 2, backgroundColor: '#111111' }}>
                      <Image
                        source={profile?.avatar_url ? { uri: profile.avatar_url } : require('@/assets/default_avatar.jpg')}
                        style={{ width: a, height: a, borderRadius: a / 2 }}
                      />
                    </View>
                    {uploadingAvatar ? (
                      <View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.75)', width: badge, height: badge, borderRadius: badge / 2, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#151516' }}>
                        <ActivityIndicator size="small" color={Theme.colors.accent} />
                      </View>
                    ) : (
                      <View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: Theme.colors.accent, width: badge, height: badge, borderRadius: badge / 2, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#151516' }}>
                        <Icon name="edit" size={rs(13)} color={Theme.colors.accentDark} />
                      </View>
                    )}
                  </View>
                );
              })()}
            </Pressable>

            {/* Name + inline edit */}
            {editingName ? (
              <View style={{ width: '100%', alignItems: 'center', marginTop: 14 }}>
                <TextInput
                  value={editNameValue}
                  onChangeText={setEditNameValue}
                  className="text-[20px] font-bold text-white tracking-tight pb-1"
                  style={{
                    width: '100%',
                    maxWidth: 280,
                    minWidth: 160,
                    textAlign: 'center',
                    borderBottomWidth: 1.5,
                    borderBottomColor: Theme.colors.accent,
                  }}
                  placeholder="Your name"
                  placeholderTextColor="#666"
                  autoFocus
                />
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
                  <Pressable
                    onPress={() => setEditingName(false)}
                    disabled={savingName}
                    className="w-10 h-10 rounded-full bg-accent items-center justify-center active:opacity-75"
                  >
                    <Icon name="close" size={18} color="#111111" />
                  </Pressable>
                  <Pressable
                    onPress={handleSaveName}
                    disabled={savingName || !editNameValue.trim()}
                    className="w-10 h-10 rounded-full bg-accent items-center justify-center active:opacity-75"
                  >
                    {savingName ? (
                      <ActivityIndicator size="small" color="#111111" />
                    ) : (
                      <Icon name="check" size={18} color="#111111" />
                    )}
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, maxWidth: '100%', marginTop: 14, paddingHorizontal: 8 }}>
                <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: rs(21), fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.5 }}>
                  {(profile?.username || profile?.display_name) ?? 'Player'}
                </Text>
                <Pressable onPress={() => { setEditNameValue(profile?.username || profile?.display_name || ''); setEditingName(true); }} className="min-h-11 min-w-11 items-center justify-center active:opacity-75 shrink-0">
                  <Icon name="edit" size={15} color="#888" />
                </Pressable>
              </View>
            )}

            {/* Role badge */}
            <View
              style={
                isAdmin
                  ? { backgroundColor: 'rgba(224,48,48,0.12)', borderColor: '#E03030', borderWidth: 1, marginTop: 8 }
                  : { backgroundColor: Theme.colors.accentDim, borderColor: Theme.colors.accent, borderWidth: 1, marginTop: 8 }
              }
              className="rounded-full px-3 py-0.5"
            >
              <Text className="text-[9px] font-extrabold uppercase tracking-widest" style={{ color: isAdmin ? '#E03030' : Theme.colors.accent }}>
                {isAdmin ? 'Admin' : 'User'}
              </Text>
            </View>

            {/* Email */}
            {email && (
              <Text numberOfLines={1} className="text-[12px] font-medium text-[#888888] mt-2 tracking-wide" style={{ maxWidth: '100%', paddingHorizontal: 8 }}>
                {email}
              </Text>
            )}

            {/* Stats — full-width, equal flex columns (cannot overflow) */}
            <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: Theme.colors.bgBorder }}>
              <MiniStat value={profile?.total_points ?? 0} label="Points" />
              <View style={{ width: 1, height: 30, backgroundColor: Theme.colors.bgBorder }} />
              <MiniStat value={rank ?? '—'} label="Rank" />
              <View style={{ width: 1, height: 30, backgroundColor: Theme.colors.bgBorder }} />
              <MiniStat value={predictionsMade} label="Preds" />
            </View>

            {/* Supported Teams */}
            {profile?.supported_teams && profile.supported_teams.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 16, alignSelf: 'stretch' }}>
                {profile.supported_teams.map((teamId) => {
                  const team = teams.find((t) => t.id === teamId);
                  if (!team) return null;
                  return (
                    <View
                      key={teamId}
                      style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%' }}
                    >
                      <TeamFlag team={team} size={14} fixed />
                      <Text numberOfLines={1} style={{ flexShrink: 1 }} className="text-[10px] font-bold text-[#BBBBBB] uppercase tracking-wider">
                        {team.code ?? team.short_name ?? team.name}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </LinearGradient>

        <Button
          label="View My Performance"
          variant="secondary"
          onPress={() => router.push('/user-performance' as never)}
        />

        {/* Action Buttons */}
        <View className="gap-3">
          <ProfileOption
            label="Edit Supported Teams"
            icon="shield"
            onPress={() => setShowPicker(true)}
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
        <View className="gap-3">
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

        <View>
          <Button label="Sign out" variant="lime" onPress={() => setShowSignOutConfirm(true)} />
        </View>
        </View>
        </Container>
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

function MiniStat({ value, label }: { value: string | number; label: string }): React.JSX.Element {
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 4 }}>
      <Text numberOfLines={1} adjustsFontSizeToFit className="text-[17px] font-bold text-white">
        {value}
      </Text>
      <Text className="text-[9px] font-semibold text-[#888888] uppercase tracking-wider mt-1">{label}</Text>
    </View>
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

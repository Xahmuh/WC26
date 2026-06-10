import { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  Text,
  View,
  Image,
  Alert,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
  StyleSheet,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
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
import { TabPageHeader } from '@/components/ui/TabPageHeader';
import { TeamFlag } from '@/components/ui/TeamFlag';
import { TeamPickerModal } from '@/components/ui/TeamPickerModal';
import { useResponsive } from '@/lib/responsive';
import { useTeams } from '@/hooks/useTeams';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useMyPoints } from '@/hooks/usePoints';
import { useMyPredictions } from '@/hooks/usePredictions';
import { useAuthStore } from '@/stores/auth.store';
import { supabase } from '@/lib/supabase';
import { compressLocalImage } from '@/lib/imageUpload';
import { updateSupportedTeams } from '@/lib/profileMutations';

export default function ProfileScreen(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const { scale: rs, isSmall } = useResponsive();
  const profile = useAuthStore((s) => s.profile);
  const userId = useAuthStore((s) => s.session?.user.id);
  const email = useAuthStore((s) => s.session?.user.email);
  const signOut = useAuthStore((s) => s.signOut);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const setSupportedTeams = useAuthStore((s) => s.setSupportedTeams);

  const { data: teams = [], refetch: refetchTeams } = useTeams();
  const [showPicker, setShowPicker] = useState(false);
  const [savingTeams, setSavingTeams] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleChangeAvatar = async () => {
    if (!userId) return;

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
        quality: 0.75,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      const pickedUri = result.assets[0].uri;
      setUploadingAvatar(true);

      const compressedUri = await compressLocalImage(pickedUri, {
        maxWidth: 512,
        quality: 0.72,
      }).catch(() => pickedUri);

      const fileName = `${userId}-${Date.now()}.jpg`;
      const filePath = `avatars/${fileName}`;
      const contentType = 'image/jpeg';

      let fileBody: Blob | FormData;
      if (Platform.OS === 'web') {
        const response = await fetch(compressedUri);
        fileBody = await response.blob();
      } else {
        const formData = new FormData();
        formData.append('file', {
          uri: compressedUri,
          name: fileName,
          type: contentType,
        } as any);
        fileBody = formData;
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, fileBody, {
          contentType,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const avatarUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: avatarUrl })
        .eq('id', userId);

      if (updateError) throw updateError;
      await refreshProfile();
      Alert.alert('Success', 'Avatar updated successfully!');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update avatar.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveTeams = async (teamsList: string[]) => {
    if (!userId) return;
    setSavingTeams(true);
    try {
      const savedTeams = await updateSupportedTeams(userId, teamsList);
      setSupportedTeams(savedTeams);
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

  const primaryName = (profile?.display_name || profile?.username) ?? 'Player';
  const profileHandle =
    profile?.username && profile.username !== profile?.display_name ? profile.username : null;
  const initials = primaryName.slice(0, 2).toUpperCase();
  const isAdmin = profile?.role === 'admin';
  const trimmedEditName = editNameValue.trim();
  const canSaveName = Boolean(trimmedEditName) && trimmedEditName !== (profile?.display_name ?? '');
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshProfile(),
        refetchTeams(),
        predictionsQuery.refetch(),
        pointsQuery.refetch(),
        leaderboardQuery.refetch(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [leaderboardQuery, pointsQuery, predictionsQuery, refetchTeams, refreshProfile]);

  return (
    <SafeAreaView className="flex-1" edges={['top']}>
      <TabPageHeader title="Profile" subtitle="Account, teams, and stats" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          minHeight: screenHeight + 1,
          paddingBottom: insets.bottom + TAB_BAR_CLEARANCE + 16,
        }}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical
        overScrollMode="always"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={Theme.colors.accent}
            colors={[Theme.colors.accent]}
          />
        }
      >
        <Container nested className="px-6 pt-4 gap-6">
        <View className="gap-6">
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
              <LinearGradient
                colors={['rgba(255,255,255,0.09)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0.02)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: '100%',
                  marginTop: 16,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.1)',
                  overflow: 'hidden',
                }}
              >
                <BlurView intensity={24} tint="dark" style={{ padding: 14 }}>
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="text-[10px] font-extrabold uppercase tracking-[1.7px] text-accent">
                        Display name
                      </Text>
                      <Text className="text-[10px] font-semibold text-[#8F8F8F]">
                        Shown on leaderboard and predictions
                      </Text>
                    </View>
                    <Text className="text-[10px] font-bold text-[#777777]">
                      {trimmedEditName.length}/32
                    </Text>
                  </View>

                  <TextInput
                    value={editNameValue}
                    onChangeText={setEditNameValue}
                    className="mt-3 text-[22px] font-black text-white"
                    style={{
                      width: '100%',
                      textAlign: 'center',
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.1)',
                      backgroundColor: 'rgba(0,0,0,0.35)',
                      paddingHorizontal: 14,
                      paddingVertical: 11,
                    }}
                    placeholder="Your name"
                    placeholderTextColor="#666"
                    autoFocus
                    maxLength={32}
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      if (canSaveName) void handleSaveName();
                    }}
                  />

                  <View className="mt-3 flex-row gap-2">
                    <Pressable
                      onPress={() => {
                        setEditNameValue(primaryName);
                        setEditingName(false);
                      }}
                      disabled={savingName}
                      className="h-11 flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-bgBorder bg-bgSurface3 active:opacity-75"
                    >
                      <Icon name="close" size={16} color={Theme.colors.textSecondary} />
                      <Text className="text-xs font-extrabold uppercase tracking-wider text-textSecondary">
                        Cancel
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void handleSaveName()}
                      disabled={savingName || !canSaveName}
                      className="h-11 flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-accent active:opacity-80"
                      style={{ opacity: savingName || !canSaveName ? 0.55 : 1 }}
                    >
                      {savingName ? (
                        <ActivityIndicator size="small" color="#111111" />
                      ) : (
                        <Icon name="check" size={16} color="#111111" />
                      )}
                      <Text className="text-xs font-extrabold uppercase tracking-wider text-[#111111]">
                        Save
                      </Text>
                    </Pressable>
                  </View>
                </BlurView>
              </LinearGradient>
            ) : (
              <LinearGradient
                colors={['rgba(255,255,255,0.095)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0.018)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: '100%',
                  marginTop: 16,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.1)',
                  overflow: 'hidden',
                }}
              >
                <BlurView intensity={16} tint="dark" style={{ paddingHorizontal: 14, paddingVertical: 14 }}>
                  <View className="flex-row items-center gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-accentDim border border-accentBorder">
                      <Text className="text-sm font-black text-accent">{initials}</Text>
                    </View>

                    <View className="min-w-0 flex-1">
                      <Text className="text-[9px] font-extrabold uppercase tracking-[1.7px] text-accent">
                        Profile name
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={{ fontSize: rs(23), fontWeight: '900', color: '#FFFFFF' }}
                      >
                        {primaryName}
                      </Text>
                      {profileHandle ? (
                        <Text numberOfLines={1} className="text-[11px] font-semibold text-[#8F8F8F]">
                          @{profileHandle}
                        </Text>
                      ) : (
                        <Text numberOfLines={1} className="text-[11px] font-semibold text-[#8F8F8F]">
                          Visible to other players
                        </Text>
                      )}
                    </View>

                    <Pressable
                      onPress={() => {
                        setEditNameValue(primaryName);
                        setEditingName(true);
                      }}
                      className="h-11 w-11 items-center justify-center rounded-2xl border border-accentBorder bg-accentDim active:opacity-75 shrink-0"
                    >
                      <Icon name="edit" size={16} color={Theme.colors.accent} />
                    </Pressable>
                  </View>
                </BlurView>
              </LinearGradient>
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
            label="Mini Leagues"
            icon="group"
            onPress={() => router.push('/leagues' as any)}
          />
          <ProfileOption
            label="Notifications"
            icon="bell"
            onPress={() => router.push('/notifications' as any)}
          />
          <ProfileOption
            label="How to Play"
            icon="info"
            onPress={() => router.push('/profile/how-to-play' as any)}
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
        <View style={styles.kpiStack}>
          <View style={styles.kpiRow}>
            <View style={styles.kpiCell}>
              <StatTile 
                label="Points" 
                value={profile?.total_points ?? 0} 
                icon="star"
                iconColor="#FDE047"
                accentColor="#CA8A04"
                onPress={() => router.push('/user-performance' as never)}
              />
            </View>
            <View style={styles.kpiCell}>
              <StatTile 
                label="Rank" 
                value={rank ? `#${rank}` : '—'} 
                icon="medal"
                iconColor="#38BDF8"
                accentColor="#0284C7"
              />
            </View>
          </View>
          <View style={styles.kpiRow}>
            <View style={styles.kpiCell}>
              <StatTile 
                label="Predictions" 
                value={predictionsMade} 
                icon="target"
                iconColor="#C084FC"
                accentColor="#9333EA"
                onPress={() => router.push('/profile/predictions' as any)}
              />
            </View>
            <View style={styles.kpiCell}>
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

        <View style={styles.signOutBlock}>
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
  onPress?: () => void;
}

function StatTile({ label, value, icon, onPress }: StatTileProps): React.JSX.Element {
  const content = (
    <>
      <View style={styles.statTileHeader}>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.76}
          style={styles.statTileLabel}
        >
          {label}
        </Text>
        {icon && (
          <View style={styles.statTileIcon}>
            <Icon name={icon} size={18} color={Theme.colors.accent} />
          </View>
        )}
      </View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.55}
        style={styles.statTileValue}
      >
        {value}
      </Text>
    </>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      android_ripple={onPress ? { color: 'rgba(255,255,255,0.045)' } : undefined}
      style={({ pressed }) => [styles.statTile, pressed && styles.statTilePressed]}
    >
      <LinearGradient
        colors={['#242424', '#202020']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statTileSurface}
      >
        {content}
      </LinearGradient>
    </Pressable>
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

const styles = StyleSheet.create({
  kpiStack: {
    alignSelf: 'stretch',
    gap: 12,
  },
  kpiRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
  },
  kpiCell: {
    width: '48%',
    minWidth: 0,
  },
  statTilePressed: {
    opacity: 0.82,
  },
  statTile: {
    width: '100%',
    height: 116,
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: '#242424',
    ...Platform.select({
      web: { boxShadow: '0 8px 18px rgba(0,0,0,0.35)' },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.34,
        shadowRadius: 10,
      },
      android: { elevation: 5 },
    }),
  },
  statTileSurface: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 15,
    justifyContent: 'space-between',
  },
  statTileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  statTileLabel: {
    flex: 1,
    minWidth: 0,
    color: Theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 13,
    textTransform: 'uppercase',
  },
  statTileIcon: {
    width: 44,
    height: 44,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(215,217,94,0.32)',
    backgroundColor: Theme.colors.accentDim,
  },
  statTileValue: {
    maxWidth: '100%',
    marginTop: 12,
    color: Theme.colors.textPrimary,
    fontSize: 36,
    fontWeight: '900',
    lineHeight: 42,
  },
  signOutBlock: {
    marginTop: 4,
  },
});

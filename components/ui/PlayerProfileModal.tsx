import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PerformanceBreakdownGrid } from '@/components/performance/PerformanceBreakdownGrid';
import { PerformanceRadarCard } from '@/components/performance/PerformanceRadarCard';
import { PerformanceSummary } from '@/components/performance/PerformanceSummary';
import Theme from '@/constants/theme/design-system';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { useResponsive } from '@/lib/responsive';
import { Card } from './Card';
import { Icon } from './Icon';

interface PlayerProfileModalProps {
  visible: boolean;
  onClose: () => void;
  playerId: string | undefined;
  rank: number | undefined;
}

const MEDAL_COLOR: Record<number, string> = {
  1: Theme.colors.gold,
  2: Theme.colors.silver,
  3: Theme.colors.bronze,
};

const DEFAULT_AVATAR = require('@/assets/default_avatar.jpg');

export function PlayerProfileModal({
  visible,
  onClose,
  playerId,
  rank,
}: PlayerProfileModalProps): React.JSX.Element {
  const { data: profile, isLoading, isError, error } = usePlayerProfile(playerId);
  const insets = useSafeAreaInsets();
  const { height } = useResponsive();

  const overlayTopPadding = Math.max(16, insets.top + 16);
  const overlayBottomPadding = Math.max(16, insets.bottom + 16);
  const cardMaxHeight = Math.max(260, height - insets.top - insets.bottom - 48);
  const scrollBottomPadding = Math.max(16, insets.bottom + 12);

  const displayHandle = profile?.username || profile?.display_name || '?';
  const earnedCardCount = profile?.earned_cards.length ?? 0;
  const medalColor = rank ? MEDAL_COLOR[rank] : undefined;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View
        style={[
          styles.overlay,
          { paddingTop: overlayTopPadding, paddingBottom: overlayBottomPadding },
        ]}
      >
        <Card className="w-full max-w-sm" padding={20} style={[styles.sheet, { maxHeight: cardMaxHeight }]}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Player Profile</Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
            >
              <Icon name="close" size={16} color={Theme.colors.textSecondary} fixed />
            </Pressable>
          </View>

          {isLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={Theme.colors.accent} />
              <Text style={styles.loadingText}>Loading player details...</Text>
            </View>
          ) : isError || !profile ? (
            <View style={styles.errorState}>
              <Icon name="warning" size={28} color={Theme.colors.live} />
              <Text style={styles.errorText}>{error?.message || 'Player details not found'}</Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.profileScroll}
              contentContainerStyle={[
                styles.profileScrollContent,
                { paddingBottom: scrollBottomPadding },
              ]}
            >
              <View style={styles.identityHero}>
                <View style={styles.avatarStage}>
                  <View style={styles.avatarFrame}>
                    <Image
                      source={profile.avatar_url ? { uri: profile.avatar_url } : DEFAULT_AVATAR}
                      style={styles.avatarImage}
                      resizeMode="cover"
                    />
                  </View>
                  {medalColor ? (
                    <View style={[styles.medalBadge, { borderColor: medalColor }]}>
                      <Icon name="medal" size={16} color={medalColor} fixed />
                    </View>
                  ) : null}
                </View>

                <View style={styles.identityCopy}>
                  <Text style={styles.playerName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>
                    {displayHandle}
                  </Text>
                  <View style={styles.cardCountPill}>
                    <Icon name="gift" size={14} color={Theme.colors.accent} fixed />
                    <Text style={styles.cardCountText}>
                      {earnedCardCount} {earnedCardCount === 1 ? 'card' : 'cards'} gotten
                    </Text>
                  </View>
                </View>
              </View>

              <PerformanceRadarCard kpis={profile.kpis} />
              <PerformanceBreakdownGrid breakdown={profile.breakdown} />
              <PerformanceSummary kpis={profile.kpis} />
            </ScrollView>
          )}

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.closeProfileButton, pressed && styles.pressed]}
          >
            <Text style={styles.closeProfileText}>Close Profile</Text>
          </Pressable>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 16,
  },
  sheet: {
    gap: 16,
    borderColor: Theme.colors.accentBorder,
    backgroundColor: Theme.colors.bgSurface2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    paddingBottom: 12,
  },
  headerTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.bgBorder,
    backgroundColor: Theme.colors.bgSurface3,
  },
  pressed: {
    opacity: 0.82,
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 12,
    color: Theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorState: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 32,
  },
  errorText: {
    color: Theme.colors.live,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  profileScroll: {
    flexShrink: 1,
  },
  profileScrollContent: {
    gap: 18,
  },
  identityHero: {
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Theme.colors.accentBorder,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  avatarStage: {
    position: 'relative',
  },
  avatarFrame: {
    width: 88,
    height: 88,
    overflow: 'hidden',
    borderRadius: 44,
    borderWidth: 2,
    borderColor: Theme.colors.accent,
    backgroundColor: Theme.colors.bgSurface3,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  medalBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    backgroundColor: Theme.colors.bgSurface2,
  },
  identityCopy: {
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  playerName: {
    color: Theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 29,
    textAlign: 'center',
  },
  cardCountPill: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Theme.colors.accentBorder,
    backgroundColor: Theme.colors.accentDim,
    paddingHorizontal: 12,
  },
  cardCountText: {
    color: Theme.colors.accent,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  closeProfileButton: {
    width: '100%',
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: Theme.colors.accent,
  },
  closeProfileText: {
    color: Theme.colors.accentDark,
    fontSize: 14,
    fontWeight: '900',
  },
});

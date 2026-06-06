// ============================================================================
// PodiumCard — a single Top-3 podium position (avatar, name, points, rank).
// ----------------------------------------------------------------------------
// Tier styling (gold / silver / bronze) is derived from `place`. 1st place is
// the champion: larger avatar, gold accent, a floating TrophyBadge and a subtle
// glow. Sizes scale with screen width so the podium stays tidy on small phones.
// Each card slides + fades in on mount (staggered behind the champion) to give
// the section a premium entrance.
//
// Presentation only — receives a ready LeaderboardEntry, computes no ranking.
// ============================================================================

import { useEffect, useRef } from 'react';
import { Animated, Image, Pressable, Text, View } from 'react-native';

import Theme from '@/constants/theme/design-system';
import { useResponsive } from '@/lib/responsive';
import type { LeaderboardEntry } from '@/types';

import { TrophyBadge } from './TrophyBadge';

const DEFAULT_AVATAR = require('@/assets/default_avatar.jpg');

export type PodiumPlace = 1 | 2 | 3;

interface TierStyle {
  /** Accent colour for ring / pedestal / rank chip. */
  color: string;
  /** Baseline avatar diameter (pt, pre-scale). */
  avatar: number;
  /** Baseline pedestal height (pt, pre-scale). */
  pedestal: number;
  /** Champion-only highlight glow. */
  glow: boolean;
}

const TIERS: Record<PodiumPlace, TierStyle> = {
  1: { color: Theme.colors.gold, avatar: 84, pedestal: 84, glow: true },
  2: { color: Theme.colors.silver, avatar: 64, pedestal: 60, glow: false },
  3: { color: Theme.colors.bronze, avatar: 64, pedestal: 44, glow: false },
};

export interface PodiumCardProps {
  entry: LeaderboardEntry;
  /** Podium position 1–3; drives all tier styling. */
  place: PodiumPlace;
  isCurrentUser?: boolean;
  onPress?: () => void;
}

export function PodiumCard({
  entry,
  place,
  isCurrentUser = false,
  onPress,
}: PodiumCardProps): React.JSX.Element {
  const { scale } = useResponsive();
  const tier = TIERS[place];
  const isFirst = place === 1;
  const avatarSize = scale(tier.avatar);
  const pedestalHeight = scale(tier.pedestal);

  // Staggered entrance — champion settles first, runners-up follow.
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.timing(enter, {
      toValue: 1,
      duration: Theme.animation.slow,
      delay: isFirst ? 0 : 120,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [enter, isFirst]);

  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });

  const cardMaxWidth = scale(120);

  return (
    <Animated.View style={{ flex: 1, maxWidth: cardMaxWidth, opacity: enter, transform: [{ translateY }] }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Rank ${place}, ${entry.display_name}, ${entry.total_points} points`}
        className="items-center active:opacity-85"
      >
        {/* Floating trophy — champion only */}
        {isFirst && (
          <View className="mb-1 h-7 items-center justify-end">
            <TrophyBadge color={tier.color} size={26} />
          </View>
        )}

        {/* Avatar: glow wrapper (uncliped) + clipped ring */}
        <View
          style={
            tier.glow
              ? {
                  borderRadius: avatarSize / 2,
                  shadowColor: tier.color,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.55,
                  shadowRadius: 14,
                  elevation: 10,
                }
              : undefined
          }
        >
          <View
            style={{
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
              borderColor: tier.color,
              borderWidth: isFirst ? 3 : 2.5,
            }}
            className="items-center justify-center overflow-hidden bg-bgSurface3"
          >
            <Image
              source={entry.avatar_url ? { uri: entry.avatar_url } : DEFAULT_AVATAR}
              style={{ width: '100%', height: '100%' }}
            />
          </View>
        </View>

        {/* Rank label "#n" */}
        <View
          style={{ backgroundColor: tier.color }}
          className="-mt-2.5 rounded-full border-2 border-bgDeep px-2 py-0.5"
        >
          <Text className="text-[11px] font-black text-bgDeep">#{place}</Text>
        </View>

        {/* Display name */}
        <Text
          numberOfLines={1}
          className="mt-2 max-w-[104px] text-center text-xs font-bold text-textPrimary"
        >
          {entry.display_name}
          {isCurrentUser ? ' (you)' : ''}
        </Text>

        {/* Total points */}
        <View className="mt-1 rounded-full bg-accent px-3 py-0.5">
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            className="text-xs font-extrabold text-accentDark"
          >
            {entry.total_points}
          </Text>
        </View>

        {/* Pedestal */}
        <View
          style={{ height: pedestalHeight, borderColor: tier.color }}
          className={`mt-3 w-full items-center justify-start rounded-t-xl border border-b-0 pt-2 ${
            isCurrentUser ? 'bg-accentDim' : 'bg-bgSurface2'
          }`}
        >
          <Text style={{ color: tier.color }} className="text-2xl font-black">
            {place}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

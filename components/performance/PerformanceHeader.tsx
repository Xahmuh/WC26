import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import Theme from '@/constants/theme/design-system';
import { useResponsive } from '@/lib/responsive';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';

const DEFAULT_AVATAR = require('@/assets/default_avatar.jpg');

interface PerformanceHeaderProps {
  displayName: string;
  avatarUrl?: string | null;
}

export function PerformanceHeader({
  displayName,
  avatarUrl,
}: PerformanceHeaderProps): React.JSX.Element {
  const { isSmall, scale: rs } = useResponsive();
  const avatarSize = rs(isSmall ? 56 : 68);
  const avatarSource = avatarUrl ? { uri: avatarUrl } : DEFAULT_AVATAR;

  return (
    <Card
      className="w-full overflow-hidden"
      variant="elevated"
      padding={rs(isSmall ? 14 : 16)}
      style={{ backgroundColor: Theme.colors.bgSurface2 }}
    >
      <LinearGradient
        colors={['rgba(215,217,94,0.14)', 'rgba(215,217,94,0.04)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View className="flex-row items-center gap-4">
        <View
          className="items-center justify-center overflow-hidden rounded-full border-2"
          style={{ borderColor: Theme.colors.accent, width: avatarSize, height: avatarSize }}
        >
          <Image source={avatarSource} className="h-full w-full" resizeMode="cover" />
        </View>

        <View className="flex-1 items-start gap-1">
          <View className="flex-row items-center gap-1.5">
            <Icon name="trendingUp" size={14} color={Theme.colors.accent} />
            <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              My Performance
            </Text>
          </View>
          <Text
            className="max-w-full text-left text-2xl font-bold text-textPrimary"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.78}
          >
            {displayName}
          </Text>
          <Text
            className="text-left text-sm leading-5 text-textSecondary"
            numberOfLines={2}
          >
            See your correct picks, points, and current run.
          </Text>
        </View>
      </View>
    </Card>
  );
}

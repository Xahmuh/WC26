import { Image, Text, View } from 'react-native';

import Theme from '@/constants/theme/design-system';
import { useResponsive } from '@/lib/responsive';
import { Icon } from '@/components/ui/Icon';

interface PerformanceHeaderProps {
  displayName: string;
  avatarUrl?: string | null;
}

export function PerformanceHeader({
  displayName,
  avatarUrl,
}: PerformanceHeaderProps): React.JSX.Element {
  const { scale: rs } = useResponsive();
  const avatarSize = rs(72);
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <View className="items-center gap-3 py-2">
      <View
        className="items-center justify-center overflow-hidden rounded-full border-2"
        style={{ borderColor: Theme.colors.accent, width: avatarSize, height: avatarSize }}
      >
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} className="h-full w-full" />
        ) : (
          <View className="h-full w-full items-center justify-center bg-bgSurface3">
            <Text className="text-lg font-bold text-textPrimary">{initials}</Text>
          </View>
        )}
      </View>
      <View className="items-center gap-1">
        <Text className="text-xl font-bold text-textPrimary">{displayName}</Text>
        <View className="flex-row items-center gap-1.5">
          <Icon name="trendingUp" size={14} color={Theme.colors.accent} />
          <Text className="text-sm font-semibold uppercase tracking-wider text-accent">
            Your Stats
          </Text>
        </View>
      </View>
    </View>
  );
}

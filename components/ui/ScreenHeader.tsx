import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import Theme from '@/constants/theme/design-system';
import { Icon } from '@/components/ui/Icon';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string | null;
  fallback?: string;
  right?: ReactNode;
  accessibilityLabel?: string;
}

export function ScreenHeader({
  title,
  subtitle,
  fallback = '/(tabs)/home',
  right,
  accessibilityLabel = 'Back',
}: ScreenHeaderProps): React.JSX.Element {
  const router = useRouter();

  const handleBack = (): void => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(fallback as never);
  };

  return (
    <View className="border-b border-bgBorder bg-bgDeep px-5 py-3">
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          hitSlop={10}
          className="h-10 w-10 items-center justify-center rounded-full border border-bgBorder bg-bgSurface2 active:opacity-75"
        >
          <Icon name="back" size={18} color={Theme.colors.textPrimary} />
        </Pressable>

        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-lg font-black text-textPrimary">
            {title}
          </Text>
          {subtitle ? (
            <Text numberOfLines={1} className="mt-0.5 text-[11px] font-medium text-textSecondary">
              {subtitle}
            </Text>
          ) : null}
        </View>

        {right ? <View className="shrink-0">{right}</View> : null}
      </View>
    </View>
  );
}

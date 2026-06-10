import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Container } from '@/components/ui/Container';
import { Icon } from '@/components/ui/Icon';
import Theme from '@/constants/theme/design-system';

interface TabPageHeaderProps {
  title: string;
  subtitle?: string | null;
  showBackButton?: boolean;
  fallbackHref?: string;
}

export function TabPageHeader({
  title,
  subtitle,
  showBackButton = false,
  fallbackHref = '/profile',
}: TabPageHeaderProps): React.JSX.Element {
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(fallbackHref as never);
  };

  return (
    <View className="border-b border-bgBorder bg-bgDeep">
      <Container nested className="px-5 pb-3 pt-2">
        <View className="flex-row items-center gap-3">
          {showBackButton ? (
            <Pressable
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel={`Back from ${title}`}
              hitSlop={10}
              className="h-11 w-11 items-center justify-center rounded-full bg-bgSurface2"
            >
              <Icon name="back" size={24} color={Theme.colors.textPrimary} fixed />
            </Pressable>
          ) : null}

          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} className="text-3xl font-black text-textPrimary">
              {title}
            </Text>
            {subtitle ? (
              <Text numberOfLines={1} className="mt-1 text-sm font-semibold text-textSecondary">
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
      </Container>
    </View>
  );
}

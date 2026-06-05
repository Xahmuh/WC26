import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import Theme from '@/constants/theme/design-system';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps): React.JSX.Element {
  return (
    <View className="items-center justify-center gap-3 px-6 py-10">
      <Icon name="warning" size={40} color={Theme.colors.live} />
      <Text className="text-center text-base font-semibold text-textPrimary">
        Something went wrong
      </Text>
      <Text className="text-center text-sm text-textSecondary">{message}</Text>
      {onRetry ? (
        <View className="mt-2 w-40">
          <Button label="Try again" variant="secondary" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  /** Flat icon shown above the title. */
  icon?: IconName;
}

export function EmptyState({
  title,
  description,
  icon = 'calendar',
}: EmptyStateProps): React.JSX.Element {
  return (
    <View className="items-center justify-center gap-2 px-6 py-10">
      <Icon name={icon} size={40} color={Theme.colors.textTertiary} />
      <Text className="text-center text-base font-semibold text-textPrimary">
        {title}
      </Text>
      {description ? (
        <Text className="text-center text-sm text-textSecondary">{description}</Text>
      ) : null}
    </View>
  );
}

import { ActivityIndicator, Text, View } from 'react-native';

import Theme from '@/constants/theme/design-system';

interface LoadingSpinnerProps {
  label?: string;
  /** Fill the available space and center vertically. */
  fullScreen?: boolean;
}

export function LoadingSpinner({
  label,
  fullScreen = false,
}: LoadingSpinnerProps): React.JSX.Element {
  return (
    <View
      className={[
        'items-center justify-center gap-3',
        fullScreen ? 'flex-1' : 'py-8',
      ].join(' ')}
    >
      <ActivityIndicator color={Theme.colors.accent} size="large" />
      {label ? <Text className="text-sm text-textSecondary">{label}</Text> : null}
    </View>
  );
}

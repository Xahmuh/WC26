import { Stack } from 'expo-router';

import Theme from '@/constants/theme/design-system';

export default function AuthLayout(): React.JSX.Element {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Theme.colors.bgDeep },
      }}
    />
  );
}

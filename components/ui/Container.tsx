import { View, type ViewProps } from 'react-native';

import { useResponsive } from '@/lib/responsive';

interface ContainerProps extends ViewProps {
  children: React.ReactNode;
  /** Use inside ScrollView — skips flex-1 so content can grow naturally. */
  nested?: boolean;
}

/** Centers content and caps width on tablet/desktop without breaking mobile full-bleed. */
export function Container({
  children,
  nested = false,
  style,
  ...rest
}: ContainerProps): React.JSX.Element {
  const { containerMaxWidth } = useResponsive();

  return (
    <View
      className={nested ? 'w-full items-center' : 'w-full flex-1 items-center'}
      {...rest}
    >
      <View
        className={nested ? 'w-full' : 'w-full flex-1'}
        style={[{ maxWidth: containerMaxWidth }, style]}
      >
        {children}
      </View>
    </View>
  );
}

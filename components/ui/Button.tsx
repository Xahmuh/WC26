import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

import Theme from '@/constants/theme/design-system';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
}

// Pill-shaped CTAs per the design system (Theme.buttons.*), expressed as
// NativeWind utilities so layout stays in className land.
const CONTAINER: Record<Variant, string> = {
  primary: 'bg-accent active:opacity-80',
  secondary: 'bg-transparent border-[1.5px] border-accent active:opacity-80',
  ghost: 'bg-accentDim border border-accentBorder active:opacity-80',
  danger: 'bg-liveDim border border-live/30 active:opacity-80',
};

const LABEL: Record<Variant, string> = {
  primary: 'text-accentDark',
  secondary: 'text-accent',
  ghost: 'text-accent',
  danger: 'text-live',
};

const SPINNER: Record<Variant, string> = {
  primary: Theme.colors.accentDark,
  secondary: Theme.colors.accent,
  ghost: Theme.colors.accent,
  danger: Theme.colors.live,
};

export function Button({
  label,
  variant = 'primary',
  loading = false,
  fullWidth = true,
  disabled,
  ...rest
}: ButtonProps): React.JSX.Element {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(isDisabled), busy: loading }}
      disabled={isDisabled}
      className={[
        'h-12 flex-row items-center justify-center rounded-full px-7',
        CONTAINER[variant],
        fullWidth ? 'w-full' : 'self-start',
        isDisabled ? 'opacity-50' : '',
      ].join(' ')}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={SPINNER[variant]} />
      ) : (
        <Text className={`text-base font-semibold uppercase tracking-wide ${LABEL[variant]}`}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

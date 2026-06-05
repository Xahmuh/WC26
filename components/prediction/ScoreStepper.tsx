import { Pressable, Text, View } from 'react-native';

import { MAX_GOALS, MIN_GOALS } from '@/lib/constants';

interface ScoreStepperProps {
  label: string;
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
}

/**
 * Stepper input for a goal count. Constrained to [MIN_GOALS, MAX_GOALS] so the
 * value can never violate the DB CHECK constraint.
 */
export function ScoreStepper({
  label,
  value,
  onChange,
  disabled = false,
}: ScoreStepperProps): React.JSX.Element {
  const clamp = (n: number): number => Math.min(MAX_GOALS, Math.max(MIN_GOALS, n));
  const decrement = (): void => onChange(clamp(value - 1));
  const increment = (): void => onChange(clamp(value + 1));

  const atMin = value <= MIN_GOALS;
  const atMax = value >= MAX_GOALS;

  return (
    <View className="items-center gap-2">
      <Text numberOfLines={1} className="text-xs font-medium text-textSecondary">
        {label}
      </Text>
      <View className="flex-row items-center gap-3">
        <StepButton
          symbol="−"
          accessibilityLabel={`Decrease ${label} score`}
          onPress={decrement}
          disabled={disabled || atMin}
        />
        <View className="h-14 w-14 items-center justify-center rounded-xl border border-bgBorder bg-bgSurface2">
          <Text className="text-2xl font-bold text-textPrimary">{value}</Text>
        </View>
        <StepButton
          symbol="+"
          accessibilityLabel={`Increase ${label} score`}
          onPress={increment}
          disabled={disabled || atMax}
        />
      </View>
    </View>
  );
}

interface StepButtonProps {
  symbol: string;
  accessibilityLabel: string;
  onPress: () => void;
  disabled: boolean;
}

function StepButton({
  symbol,
  accessibilityLabel,
  onPress,
  disabled,
}: StepButtonProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`h-10 w-10 items-center justify-center rounded-full bg-accent active:opacity-80 ${
        disabled ? 'opacity-40' : ''
      }`}
    >
      <Text className="text-xl font-bold text-accentDark">{symbol}</Text>
    </Pressable>
  );
}

import { Text, View } from 'react-native';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
}

const TONE: Record<BadgeTone, string> = {
  neutral: 'bg-bgSurface3',
  info: 'bg-accentDim',
  success: 'bg-successDim',
  warning: 'bg-warningDim',
  danger: 'bg-liveDim',
};

const TEXT: Record<BadgeTone, string> = {
  neutral: 'text-textSecondary',
  info: 'text-accent',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-live',
};

export function Badge({ label, tone = 'neutral' }: BadgeProps): React.JSX.Element {
  return (
    <View className={`self-start rounded-md px-2.5 py-1 ${TONE[tone]}`}>
      <Text className={`text-xs font-semibold uppercase tracking-wide ${TEXT[tone]}`}>
        {label}
      </Text>
    </View>
  );
}

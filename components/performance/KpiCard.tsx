import { Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import Theme from '@/constants/theme/design-system';

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: IconName;
  accentColor?: string;
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon,
  accentColor = Theme.colors.accent,
}: KpiCardProps): React.JSX.Element {
  return (
    <Card className="min-h-[120px] justify-between">
      <View className="flex-row items-start justify-between">
        <Text className="text-[11px] font-bold uppercase tracking-widest text-textSecondary">
          {title}
        </Text>
        {icon ? (
          <View className="rounded-lg border border-bgBorder bg-bgSurface3 p-1.5">
            <Icon name={icon} size={14} color={accentColor} />
          </View>
        ) : null}
      </View>
      <Text className="mt-3 text-[28px] font-black tracking-tight" style={{ color: accentColor }}>
        {value}
      </Text>
      {subtitle ? (
        <Text className="mt-1 text-[11px] font-medium text-textTertiary">{subtitle}</Text>
      ) : null}
    </Card>
  );
}

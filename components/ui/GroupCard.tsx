import { Pressable, Text, View } from 'react-native';
import { Card } from './Card';
import { Icon } from './Icon';
import Theme from '@/constants/theme/design-system';

interface GroupCardProps {
  name: string;
  code: string;
  memberCount: number;
  onPress: () => void;
}

export function GroupCard({ name, code, memberCount, onPress }: GroupCardProps): React.JSX.Element {
  return (
    <Pressable onPress={onPress} className="active:scale-[0.99] transition-transform">
      <Card className="flex-row items-center justify-between p-4 border border-bgBorder bg-bgSurface2">
        <View className="flex-1 gap-1">
          <Text className="text-base font-bold text-textPrimary">{name}</Text>
          <View className="flex-row items-center gap-3">
            <View className="rounded bg-accentDim px-1.5 py-0.5 border border-accentBorder">
              <Text className="text-xs font-semibold text-accent tracking-wider">{code}</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Icon name="people" size={13} color={Theme.colors.textSecondary} />
              <Text className="text-xs text-textSecondary">
                {memberCount} {memberCount === 1 ? 'member' : 'members'}
              </Text>
            </View>
          </View>
        </View>

        <View className="h-8 w-8 items-center justify-center rounded-full bg-bgSurface3">
          <Icon name="forward" size={16} color={Theme.colors.textSecondary} />
        </View>
      </Card>
    </Pressable>
  );
}

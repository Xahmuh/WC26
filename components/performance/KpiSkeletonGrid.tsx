import { View } from 'react-native';

import { Card } from '@/components/ui/Card';

function SkeletonCard(): React.JSX.Element {
  return (
    <Card className="min-h-[120px] gap-3">
      <View className="h-3 w-20 rounded bg-bgSurface3" />
      <View className="mt-2 h-8 w-24 rounded bg-bgSurface3" />
      <View className="h-3 w-28 rounded bg-bgSurface3" />
    </Card>
  );
}

export function KpiSkeletonGrid(): React.JSX.Element {
  return (
    <View className="gap-3">
      <View className="flex-row gap-3">
        <View className="flex-1">
          <SkeletonCard />
        </View>
        <View className="flex-1">
          <SkeletonCard />
        </View>
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <SkeletonCard />
        </View>
        <View className="flex-1">
          <SkeletonCard />
        </View>
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <SkeletonCard />
        </View>
        <View className="flex-1" />
      </View>
    </View>
  );
}

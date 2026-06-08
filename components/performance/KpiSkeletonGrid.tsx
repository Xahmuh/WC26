import { View } from 'react-native';

import { useResponsive } from '@/lib/responsive';
import { Card, SkeletonBox } from '@/components/ui';

function SkeletonCard(): React.JSX.Element {
  return (
    <Card className="min-w-0 overflow-hidden" padding={14}>
      <View className="gap-3">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 min-w-0 gap-2">
            <SkeletonBox width={86} height={10} />
            <SkeletonBox width="72%" height={9} />
          </View>
          <SkeletonBox width={36} height={36} borderRadius={14} />
        </View>
        <View className="flex-row items-center gap-2">
          <SkeletonBox width={24} height={3} borderRadius={999} />
          <SkeletonBox width={64} height={26} />
        </View>
      </View>
    </Card>
  );
}

function chunkIndices(count: number, columns: number): number[][] {
  const rows: number[][] = [];
  for (let i = 0; i < count; i += columns) {
    const row: number[] = [];
    for (let j = i; j < Math.min(count, i + columns); j += 1) {
      row.push(j);
    }
    rows.push(row);
  }
  return rows;
}

export function KpiSkeletonGrid(): React.JSX.Element {
  const { isSmall, isTablet, isDesktop } = useResponsive();
  const columns = isSmall ? 1 : isTablet || isDesktop ? 3 : 2;
  const rows = chunkIndices(5, columns);

  return (
    <View className="gap-3">
      {rows.map((row, rowIndex) => (
        <View key={`skeleton-row-${rowIndex}`} className="flex-row gap-3">
          {row.map((index) => (
            <View key={index} className="flex-1 min-w-0">
              <SkeletonCard />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

import { useCallback } from 'react';
import { FlatList, RefreshControl, type ListRenderItemInfo } from 'react-native';

import Theme from '@/constants/theme/design-system';
import { MatchCard } from '@/components/match/MatchCard';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { Match, PointsRecord, Prediction } from '@/types';

interface MatchListProps {
  matches: Match[];
  predictions?: Map<string, Prediction>;
  points?: Map<string, PointsRecord>;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  onPressMatch?: (matchId: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Extra bottom padding so the last card clears the floating tab bar / nav bar. */
  bottomInset?: number;
}

export function MatchList({
  matches,
  predictions,
  points,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  onRefresh,
  refreshing = false,
  onPressMatch,
  emptyTitle = 'No matches',
  emptyDescription,
  bottomInset = 32,
}: MatchListProps): React.JSX.Element {
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Match>) => (
      <MatchCard
        match={item}
        prediction={predictions?.get(item.id)}
        points={points?.get(item.id)}
        onPress={onPressMatch}
      />
    ),
    [predictions, points, onPressMatch]
  );

  if (isLoading) {
    return <LoadingSpinner fullScreen label="Loading matches…" />;
  }

  if (isError) {
    return <ErrorState message={errorMessage ?? 'Failed to load matches.'} onRetry={onRetry} />;
  }

  return (
    <FlatList
      data={matches}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      style={{ flex: 1 }}
      contentContainerClassName="gap-3 px-6 pt-2"
      contentContainerStyle={{ paddingBottom: bottomInset }}
      ItemSeparatorComponent={null}
      ListEmptyComponent={
        <EmptyState title={emptyTitle} description={emptyDescription} />
      }
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Theme.colors.accent}
          />
        ) : undefined
      }
    />
  );
}

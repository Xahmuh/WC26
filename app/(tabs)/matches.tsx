import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MatchList } from '@/components/match/MatchList';
import { CalendarModal } from '@/components/ui/CalendarModal';
import { Icon } from '@/components/ui/Icon';
import Theme from '@/constants/theme/design-system';
import { useMatches } from '@/hooks/useMatches';
import { useMyPoints } from '@/hooks/usePoints';
import { useMyPredictions } from '@/hooks/usePredictions';
import { isPast, isToday } from '@/lib/dates';
import { useAppStore, type MatchFilter } from '@/stores/app.store';
import type { Match } from '@/types';

const FILTERS: MatchFilter[] = ['ALL', 'TODAY', 'UPCOMING', 'FINISHED'];

function applyFilter(matches: Match[], filter: MatchFilter): Match[] {
  switch (filter) {
    case 'TODAY':
      return matches.filter((m) => isToday(m.kickoff_time));
    case 'UPCOMING':
      return matches.filter(
        (m) => m.status === 'SCHEDULED' && !isPast(m.kickoff_time)
      );
    case 'FINISHED':
      return matches.filter((m) => m.status === 'FINISHED');
    case 'ALL':
    default:
      return matches;
  }
}

export default function MatchesScreen(): React.JSX.Element {
  const router = useRouter();
  const filter = useAppStore((s) => s.matchFilter);
  const setFilter = useAppStore((s) => s.setMatchFilter);

  const matchesQuery = useMatches();
  const predictionsQuery = useMyPredictions();
  const pointsQuery = useMyPoints();

  const [calendarVisible, setCalendarVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const matchDates = useMemo(() => {
    const dates = new Set<string>();
    if (matchesQuery.data) {
      for (const m of matchesQuery.data) {
        dates.add(m.kickoff_time.substring(0, 10));
      }
    }
    return dates;
  }, [matchesQuery.data]);

  const filtered = useMemo(() => {
    let result = applyFilter(matchesQuery.data ?? [], filter);
    if (selectedDate) {
      result = result.filter((m) => m.kickoff_time.substring(0, 10) === selectedDate);
    }
    return result;
  }, [matchesQuery.data, filter, selectedDate]);

  const onRefresh = (): void => {
    void matchesQuery.refetch();
    void predictionsQuery.refetch();
    void pointsQuery.refetch();
  };

  return (
    <SafeAreaView className="flex-1 bg-bgDeep" edges={['top']}>
      <View className="px-4 pb-2 pt-2">
        <Text className="mb-3 text-2xl font-bold text-textPrimary">Matches</Text>
        <View className="flex-row items-center gap-2">
          <View className="flex-row flex-1 gap-1.5">
            {FILTERS.map((f) => {
              const active = f === filter;
              return (
                <Pressable
                  key={f}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => setFilter(f)}
                  className={`flex-1 items-center rounded-full py-2 ${
                    active ? 'bg-accent' : 'bg-bgSurface2'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      active ? 'text-accentDark' : 'text-textSecondary'
                    }`}
                  >
                    {f}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          
          <Pressable
            onPress={() => setCalendarVisible(true)}
            className={`p-2.5 rounded-full border ${
              selectedDate ? 'bg-accentDim border-accent' : 'bg-bgSurface2 border-transparent'
            }`}
          >
            <Icon name="calendar" color={selectedDate ? Theme.colors.accent : Theme.colors.textSecondary} />
          </Pressable>
        </View>

        {selectedDate && (
          <View className="mt-2.5 flex-row items-center justify-between rounded-lg bg-bgSurface2 border border-bgBorder px-3 py-1.5">
            <Text className="text-xs text-textSecondary">
              Filtered by date: <Text className="font-bold text-textPrimary">{selectedDate}</Text>
            </Text>
            <Pressable onPress={() => setSelectedDate(null)} className="p-1">
              <Icon name="close" size={14} color={Theme.colors.live} />
            </Pressable>
          </View>
        )}
      </View>

      <MatchList
        matches={filtered}
        predictions={predictionsQuery.data}
        points={pointsQuery.data}
        isLoading={matchesQuery.isLoading}
        isError={matchesQuery.isError}
        errorMessage={matchesQuery.error?.message}
        onRetry={() => void matchesQuery.refetch()}
        onRefresh={onRefresh}
        refreshing={matchesQuery.isRefetching}
        onPressMatch={(id) => router.push(`/match/${id}`)}
        emptyTitle="No matches here"
        emptyDescription={selectedDate ? `No matches on ${selectedDate}.` : "Try a different filter."}
      />

      <CalendarModal
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        matchDates={matchDates}
      />
    </SafeAreaView>
  );
}

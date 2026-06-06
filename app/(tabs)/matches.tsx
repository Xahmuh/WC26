import { useMemo, useState, useEffect, useRef } from 'react';
import { Pressable, Text, View, Image, Platform, Animated, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { MatchList } from '@/components/match/MatchList';
import { CalendarModal } from '@/components/ui/CalendarModal';
import { TAB_BAR_CLEARANCE } from '@/components/ui/FloatingTabBar';
import { Icon } from '@/components/ui/Icon';
import Theme from '@/constants/theme/design-system';
import { useMatches } from '@/hooks/useMatches';
import { useMyPoints } from '@/hooks/usePoints';
import { useMyPredictions } from '@/hooks/usePredictions';
import { isPast, isToday } from '@/lib/dates';
import { useAppStore, type MatchFilter } from '@/stores/app.store';
import { useAuthStore } from '@/stores/auth.store';
import type { Match } from '@/types';

const FILTERS: MatchFilter[] = ['ALL', 'TODAY', 'UPCOMING', 'FINISHED'];

function applyFilter(matches: Match[], filter: MatchFilter, supportedTeams?: string[]): Match[] {
  switch (filter) {
    case 'TODAY':
      return matches.filter((m) => isToday(m.kickoff_time));
    case 'UPCOMING':
      return matches.filter(
        (m) => m.status === 'SCHEDULED' && !isPast(m.kickoff_time)
      );
    case 'FINISHED':
      return matches.filter((m) => m.status === 'FINISHED');
    case 'MY_TEAMS':
      if (!supportedTeams || supportedTeams.length === 0) return [];
      return matches.filter((m) => supportedTeams.includes(m.home_team.id) || supportedTeams.includes(m.away_team.id));
    case 'ALL':
    default:
      return matches;
  }
}

export default function MatchesScreen(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const filter = useAppStore((s) => s.matchFilter);
  const setFilter = useAppStore((s) => s.setMatchFilter);
  const profile = useAuthStore((s) => s.profile);

  const matchesQuery = useMatches();
  const predictionsQuery = useMyPredictions();
  const pointsQuery = useMyPoints();

  const [calendarVisible, setCalendarVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

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
    let result = applyFilter(matchesQuery.data ?? [], filter, profile?.supported_teams ?? undefined);
    if (selectedDate) {
      result = result.filter((m) => m.kickoff_time.substring(0, 10) === selectedDate);
    }
    return result;
  }, [matchesQuery.data, filter, selectedDate, profile?.supported_teams]);

  const onRefresh = (): void => {
    void matchesQuery.refetch();
    void predictionsQuery.refetch();
    void pointsQuery.refetch();
  };

  return (
    <SafeAreaView className="flex-1 bg-bgDeep" edges={['top']}>
      <View className="px-6 pb-2 pt-2">
        <View className="mb-4 flex-row items-center gap-2.5">
          <View style={{ width: 5, height: 24, borderRadius: 2, backgroundColor: Theme.colors.accent }} />
          <Text className="text-2xl font-extrabold uppercase tracking-tight text-textPrimary">Matches</Text>
        </View>
        <View style={{ width: '100%', height: 140, borderRadius: 16, marginBottom: 16, overflow: 'hidden', position: 'relative' }}>
          {Platform.OS === 'web' ? (
            <img 
              src={require('@/assets/banner.png')}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'right' }}
              alt="Banner"
            />
          ) : (
            <Image 
              source={require('@/assets/banner.png')}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          )}

          {/* Animated My Teams Button */}
          <View style={{ position: 'absolute', left: 16, top: '50%', transform: [{ translateY: -16 }] }}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Pressable
                onPress={() => setFilter(filter === 'MY_TEAMS' ? 'ALL' : 'MY_TEAMS')}
                style={{
                  backgroundColor: filter === 'MY_TEAMS' ? '#A0CC00' : '#C8FF00',
                  paddingHorizontal: 12,
                  height: 32,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  shadowColor: '#C8FF00',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.8,
                  shadowRadius: 12,
                  elevation: 8,
                }}
              >
                <Text style={{ color: '#111111', fontWeight: '800', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  My Teams
                </Text>
              </Pressable>
            </Animated.View>
          </View>
        </View>
        <View className="flex-row items-center gap-2">
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            className="flex-1"
            contentContainerStyle={{ gap: 6 }}
          >
            {FILTERS.map((f) => {
              const active = f === filter;
              return (
                <Pressable
                  key={f}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => setFilter(f)}
                  className={`px-3.5 items-center justify-center rounded-full py-2 ${
                    active ? 'bg-accent' : 'bg-bgSurface2'
                  }`}
                >
                  <Text
                    numberOfLines={1}
                    className={`text-xs font-semibold ${
                      active ? 'text-accentDark' : 'text-textSecondary'
                    }`}
                  >
                    {f}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          
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
        emptyDescription={
          filter === 'MY_TEAMS' && (!profile?.supported_teams || profile.supported_teams.length === 0)
            ? "You haven't selected any favorite teams. Go to your Profile to add them."
            : filter === 'MY_TEAMS'
            ? "No matches found for your favorite teams."
            : selectedDate 
            ? `No matches on ${selectedDate}.` 
            : "Try a different filter."
        }
        bottomInset={insets.bottom + TAB_BAR_CLEARANCE}
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

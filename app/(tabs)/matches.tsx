import { useMemo, useState, useEffect, useRef } from 'react';
import { Pressable, Text, View, Image, Platform, Animated, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { MatchList } from '@/components/match/MatchList';
import { CalendarModal } from '@/components/ui/CalendarModal';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { TAB_BAR_CLEARANCE } from '@/components/ui/FloatingTabBar';
import { Icon } from '@/components/ui/Icon';
import Theme from '@/constants/theme/design-system';
import { Container } from '@/components/ui/Container';
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
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 1200, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: Platform.OS !== 'web' }),
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
      <View className="flex-1">
        <Container nested className="px-6 pb-2 pt-6">
        <View className="flex-row items-center justify-between pb-4">

          {/* Profile Avatar */}
          <Pressable onPress={() => router.push('/profile')} className="w-10 h-10 rounded-full border border-bgBorder overflow-hidden active:opacity-80">
            <Image
              source={profile?.avatar_url ? { uri: profile.avatar_url } : require('@/assets/default_avatar.jpg')}
              style={{ width: '100%', height: '100%' }}
            />
          </Pressable>

          {/* Center logo */}
          <Image
            source={require('@/assets/icona.png')}
            style={{ width: '60%', height: 50 }}
            resizeMode="contain"
          />

          {/* Right icon */}
          <View className="w-10 items-end">
            <NotificationBell />
          </View>

        </View>
        <View className="mt-4 mb-4 flex-row items-center gap-2.5">
          <View style={{ width: 5, height: 24, borderRadius: 2, backgroundColor: Theme.colors.accent }} />
          <Text className="text-2xl font-extrabold uppercase tracking-tight text-textPrimary">Matches</Text>
        </View>
        <View style={{ width: '100%', aspectRatio: 375 / 140, borderRadius: 16, marginBottom: 16, overflow: 'hidden', position: 'relative' }}>
          <Image 
            source={require('@/assets/banner.png')}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />

          {/* Modern My Teams Chip */}
          <View style={{ position: 'absolute', left: 12, top: '50%', transform: [{ translateY: -18 }] }}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Pressable
                onPress={() => setFilter(filter === 'MY_TEAMS' ? 'ALL' : 'MY_TEAMS')}
                style={{
                  backgroundColor: filter === 'MY_TEAMS'
                    ? Theme.colors.accent
                    : 'rgba(0,0,0,0.45)',
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 6,
                  borderWidth: 1,
                  borderColor: filter === 'MY_TEAMS'
                    ? 'rgba(200,255,0,0.4)'
                    : 'rgba(255,255,255,0.12)',
                }}
              >
                <Icon name="shield" size={13} color={filter === 'MY_TEAMS' ? '#111111' : '#FFFFFF'} />
                <Text style={{
                  color: filter === 'MY_TEAMS' ? '#111111' : '#FFFFFF',
                  fontWeight: '700',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                }}>
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
                  className={`px-3.5 min-h-11 items-center justify-center rounded-full ${
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
            className={`min-h-11 min-w-11 items-center justify-center rounded-full border ${
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
            <Pressable onPress={() => setSelectedDate(null)} className="min-h-11 min-w-11 items-center justify-center">
              <Icon name="close" size={14} color={Theme.colors.live} />
            </Pressable>
          </View>
        )}
        </Container>

        <View className="flex-1">
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
        </View>
      </View>

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

import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  Pressable,
  Text,
  View,
  Image,
  Platform,
  Animated,
  ScrollView,
  TextInput,
  StyleSheet,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { MatchList } from '@/components/match/MatchList';
import { CalendarModal } from '@/components/ui/CalendarModal';
import { TAB_BAR_CLEARANCE } from '@/components/ui/FloatingTabBar';
import { Icon } from '@/components/ui/Icon';
import { TabPageHeader } from '@/components/ui/TabPageHeader';
import { TeamFlag } from '@/components/ui/TeamFlag';
import Theme from '@/constants/theme/design-system';
import { Container } from '@/components/ui/Container';
import { useMatches } from '@/hooks/useMatches';
import { useMatchesHeroSettings } from '@/hooks/useAdmin';
import { useMyPoints } from '@/hooks/usePoints';
import { useMyPredictions } from '@/hooks/usePredictions';
import { useTeams } from '@/hooks/useTeams';
import { STAGE_LABELS } from '@/lib/constants';
import { isToday } from '@/lib/dates';
import { isNotStartedMatch } from '@/components/home/homeUtils';
import { useAppStore, type MatchFilter } from '@/stores/app.store';
import { useAuthStore } from '@/stores/auth.store';
import type { Match, MatchStage, Team } from '@/types';

const FILTERS: MatchFilter[] = ['ALL', 'TODAY', 'UPCOMING', 'FINISHED'];
const HERO_ASPECT_RATIO = 9 / 4;
const STAGE_FILTERS: ('ALL' | MatchStage)[] = [
  'ALL',
  'GROUP',
  'ROUND_OF_32',
  'ROUND_OF_16',
  'QUARTER_FINAL',
  'SEMI_FINAL',
  'THIRD_PLACE',
  'FINAL',
];

function normalizeSearch(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function getStageLabel(stage: 'ALL' | MatchStage): string {
  return stage === 'ALL' ? 'All stages' : STAGE_LABELS[stage];
}

function applyFilter(matches: Match[], filter: MatchFilter, supportedTeams?: string[]): Match[] {
  switch (filter) {
    case 'TODAY':
      return matches.filter((m) => isToday(m.kickoff_time) && isNotStartedMatch(m.status, m.kickoff_time));
    case 'UPCOMING':
      return matches.filter((m) => isNotStartedMatch(m.status, m.kickoff_time));
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
  const params = useLocalSearchParams<{ filter?: string }>();
  const insets = useSafeAreaInsets();
  const filter = useAppStore((s) => s.matchFilter);
  const setFilter = useAppStore((s) => s.setMatchFilter);
  const profile = useAuthStore((s) => s.profile);

  const matchesQuery = useMatches();
  const matchesHeroQuery = useMatchesHeroSettings();
  const predictionsQuery = useMyPredictions();
  const pointsQuery = useMyPoints();
  const teamsQuery = useTeams();

  const [calendarVisible, setCalendarVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<'ALL' | MatchStage>('ALL');
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
  const [stageMenuOpen, setStageMenuOpen] = useState(false);
  const [countryMenuOpen, setCountryMenuOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 1200, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: Platform.OS !== 'web' }),
      ])
    ).start();
  }, [pulseAnim]);

  const refetchMatchesHero = matchesHeroQuery.refetch;
  useFocusEffect(
    useCallback(() => {
      void refetchMatchesHero();
    }, [refetchMatchesHero])
  );

  useEffect(() => {
    if (params.filter === 'TODAY') {
      setFilter('TODAY');
      setSelectedDate(null);
    }
  }, [params.filter, setFilter]);

  const matchDates = useMemo(() => {
    const dates = new Set<string>();
    if (matchesQuery.data) {
      for (const m of matchesQuery.data) {
        dates.add(m.kickoff_time.substring(0, 10));
      }
    }
    return dates;
  }, [matchesQuery.data]);

  const matchTeams = useMemo(() => {
    const byId = new Map<string, Team>();
    for (const match of matchesQuery.data ?? []) {
      if (match.home_team.id) byId.set(match.home_team.id, match.home_team);
      if (match.away_team.id) byId.set(match.away_team.id, match.away_team);
    }
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [matchesQuery.data]);

  const countryOptions = teamsQuery.data && teamsQuery.data.length > 0 ? teamsQuery.data : matchTeams;
  const selectedCountry = countryOptions.find((team) => team.id === selectedCountryId) ?? null;
  const normalizedCountrySearch = normalizeSearch(countrySearch);

  const filteredCountries = useMemo(() => {
    if (!normalizedCountrySearch) return countryOptions;

    return countryOptions.filter((team) => {
      const haystack = [team.name, team.short_name, team.code, team.group_name].map(normalizeSearch);
      return haystack.some((item) => item.includes(normalizedCountrySearch));
    });
  }, [countryOptions, normalizedCountrySearch]);

  const filtered = useMemo(() => {
    let result = applyFilter(matchesQuery.data ?? [], filter, profile?.supported_teams ?? undefined);
    if (selectedStage !== 'ALL') {
      result = result.filter((m) => m.stage === selectedStage);
    }
    if (selectedCountryId) {
      result = result.filter((m) => m.home_team.id === selectedCountryId || m.away_team.id === selectedCountryId);
    }
    if (selectedDate) {
      result = result.filter((m) => m.kickoff_time.substring(0, 10) === selectedDate);
    }
    return result;
  }, [matchesQuery.data, filter, selectedStage, selectedCountryId, selectedDate, profile?.supported_teams]);

  const onRefresh = (): void => {
    void matchesQuery.refetch();
    void matchesHeroQuery.refetch();
    void predictionsQuery.refetch();
    void pointsQuery.refetch();
  };

  const heroImageSource = matchesHeroQuery.data?.image_url
    ? { uri: matchesHeroQuery.data.image_url }
    : require('@/assets/Hero-banner.png');
  const heroBackgroundColor = matchesHeroQuery.data?.background_color ?? '#13214a';

  return (
    <SafeAreaView className="flex-1 bg-bgDeep" edges={['top']}>
      <TabPageHeader title="Matches" subtitle="Fixtures, filters, and predictions" />
      <View className="flex-1 bg-bgDeep">
        <Container nested className="px-6 pb-2 pt-4">
        <View
          style={{
            width: '100%',
            aspectRatio: HERO_ASPECT_RATIO,
            borderRadius: 16,
            marginBottom: 16,
            overflow: 'hidden',
            position: 'relative',
            borderWidth: 1,
            borderColor: Theme.colors.accentBorder,
            backgroundColor: heroBackgroundColor,
          }}
        >
          <Image 
            source={heroImageSource}
            style={{ width: '100%', height: '100%' }}
            resizeMode="contain"
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
                    ? 'rgba(215,217,94,0.4)'
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
        <View style={styles.extraFilters}>
          <View style={styles.filterColumn}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setStageMenuOpen((open) => !open);
                setCountryMenuOpen(false);
              }}
              style={[styles.filterButton, selectedStage !== 'ALL' && styles.filterButtonActive]}
            >
              <View style={styles.filterButtonCopy}>
                <Text style={styles.filterLabel}>Stage</Text>
                <Text style={styles.filterValue} numberOfLines={1}>
                  {getStageLabel(selectedStage)}
                </Text>
              </View>
              <Icon
                name="chevronDown"
                size={16}
                color={selectedStage !== 'ALL' ? Theme.colors.accent : Theme.colors.textSecondary}
              />
            </Pressable>

            {stageMenuOpen ? (
              <View style={styles.dropdown}>
                {STAGE_FILTERS.map((stage) => {
                  const active = stage === selectedStage;
                  return (
                    <Pressable
                      key={stage}
                      onPress={() => {
                        setSelectedStage(stage);
                        setStageMenuOpen(false);
                      }}
                      style={[styles.dropdownItem, active && styles.dropdownItemActive]}
                    >
                      <Text style={[styles.dropdownItemText, active && styles.dropdownItemTextActive]} numberOfLines={1}>
                        {getStageLabel(stage)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>

          <View style={styles.filterColumn}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setCountryMenuOpen((open) => !open);
                setStageMenuOpen(false);
              }}
              style={[styles.filterButton, selectedCountryId && styles.filterButtonActive]}
            >
              <View style={styles.filterButtonCopy}>
                <Text style={styles.filterLabel}>Country</Text>
                <Text style={styles.filterValue} numberOfLines={1}>
                  {selectedCountry?.name ?? 'All countries'}
                </Text>
              </View>
              <Icon
                name="search"
                size={16}
                color={selectedCountryId ? Theme.colors.accent : Theme.colors.textSecondary}
              />
            </Pressable>

            {countryMenuOpen ? (
              <View style={styles.dropdown}>
                <View style={styles.searchBox}>
                  <Icon name="search" size={15} color={Theme.colors.textTertiary} />
                  <TextInput
                    value={countrySearch}
                    onChangeText={setCountrySearch}
                    placeholder="Search country..."
                    placeholderTextColor={Theme.colors.textTertiary}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[
                      styles.searchInput,
                      Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
                    ]}
                  />
                  {countrySearch.length > 0 ? (
                    <Pressable onPress={() => setCountrySearch('')} style={styles.clearSearchButton}>
                      <Icon name="close" size={10} color={Theme.colors.textSecondary} />
                    </Pressable>
                  ) : null}
                </View>

                <ScrollView
                  style={styles.countryList}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <Pressable
                    onPress={() => {
                      setSelectedCountryId(null);
                      setCountryMenuOpen(false);
                      setCountrySearch('');
                    }}
                    style={[styles.dropdownItem, !selectedCountryId && styles.dropdownItemActive]}
                  >
                    <Text
                      style={[styles.dropdownItemText, !selectedCountryId && styles.dropdownItemTextActive]}
                      numberOfLines={1}
                    >
                      All countries
                    </Text>
                  </Pressable>

                  {filteredCountries.map((team) => {
                    const active = team.id === selectedCountryId;
                    return (
                      <Pressable
                        key={team.id}
                        onPress={() => {
                          setSelectedCountryId(team.id);
                          setCountryMenuOpen(false);
                          setCountrySearch('');
                        }}
                        style={[styles.countryItem, active && styles.dropdownItemActive]}
                      >
                        <TeamFlag team={team} size={18} fixed />
                        <Text style={[styles.dropdownItemText, active && styles.dropdownItemTextActive]} numberOfLines={1}>
                          {team.name}
                        </Text>
                      </Pressable>
                    );
                  })}

                  {filteredCountries.length === 0 ? (
                    <Text style={styles.emptyDropdownText}>No countries found</Text>
                  ) : null}
                </ScrollView>
              </View>
            ) : null}
          </View>
        </View>

        {(selectedStage !== 'ALL' || selectedCountryId) ? (
          <View style={styles.activeFiltersBar}>
            <Text style={styles.activeFiltersText} numberOfLines={1}>
              {selectedStage !== 'ALL' ? getStageLabel(selectedStage) : 'All stages'}
              {selectedCountry ? ` - ${selectedCountry.name}` : ''}
            </Text>
            <Pressable
              onPress={() => {
                setSelectedStage('ALL');
                setSelectedCountryId(null);
                setCountrySearch('');
                setStageMenuOpen(false);
                setCountryMenuOpen(false);
              }}
              style={styles.clearFiltersButton}
            >
              <Icon name="close" size={13} color={Theme.colors.live} />
            </Pressable>
          </View>
        ) : null}

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
                : selectedStage !== 'ALL' || selectedCountryId
                ? "No matches match these filters."
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

const styles = StyleSheet.create({
  extraFilters: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    zIndex: 20,
  },
  filterColumn: {
    flex: 1,
    minWidth: 0,
    position: 'relative',
  },
  filterButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.colors.bgBorder,
    backgroundColor: Theme.colors.bgSurface2,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  filterButtonActive: {
    borderColor: Theme.colors.accent,
    backgroundColor: Theme.colors.accentDim,
  },
  filterButtonCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  filterLabel: {
    color: Theme.colors.textTertiary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  filterValue: {
    color: Theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  dropdown: {
    position: 'absolute',
    top: 58,
    left: 0,
    right: 0,
    zIndex: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.colors.bgBorder,
    backgroundColor: Theme.colors.bgSurface2,
    padding: 8,
    ...Platform.select({
      web: { boxShadow: '0 12px 28px rgba(0,0,0,0.45)' },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 18,
      },
      android: { elevation: 12 },
    }),
  },
  dropdownItem: {
    minHeight: 38,
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: 10,
  },
  countryItem: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 10,
  },
  dropdownItemActive: {
    backgroundColor: Theme.colors.accentDim,
  },
  dropdownItemText: {
    flex: 1,
    color: Theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  dropdownItemTextActive: {
    color: Theme.colors.accent,
  },
  searchBox: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.colors.bgBorder,
    backgroundColor: Theme.colors.bgSurface1,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    height: 38,
    color: Theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    borderWidth: 0,
  },
  clearSearchButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.bgSurface3,
  },
  countryList: {
    maxHeight: 220,
  },
  emptyDropdownText: {
    color: Theme.colors.textTertiary,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 18,
  },
  activeFiltersBar: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.colors.accentBorder,
    backgroundColor: Theme.colors.accentDim,
    paddingLeft: 12,
    paddingRight: 6,
  },
  activeFiltersText: {
    flex: 1,
    color: Theme.colors.accent,
    fontSize: 11,
    fontWeight: '800',
  },
  clearFiltersButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

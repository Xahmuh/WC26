import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, View, Pressable, ActivityIndicator, Alert, TextInput, Image } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import Theme from '@/constants/theme/design-system';
import { TAB_BAR_CLEARANCE } from '@/components/ui/FloatingTabBar';
import { MatchCard } from '@/components/match/MatchCard';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { HeroCarousel } from '@/components/ui/HeroCarousel';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { TeamPickerModal } from '@/components/ui/TeamPickerModal';
import { PlayerProfileModal } from '@/components/ui/PlayerProfileModal';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { BrandingVideoModal } from '@/components/video/BrandingVideoModal';
import { useVideoPopup } from '@/hooks/useVideoPopup';
import { supabase } from '@/lib/supabase';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useMatches } from '@/hooks/useMatches';
import { useMyPoints } from '@/hooks/usePoints';
import { useMyPredictions } from '@/hooks/usePredictions';
import {
  usePredictionQuestions,
  useUserQuestionPredictions,
  useSubmitQuestionPrediction,
} from '@/hooks/usePredictionQuestions';
import { useCountdown } from '@/hooks/useCountdown';
import { isToday } from '@/lib/dates';
import { useResponsive } from '@/lib/responsive';
import { useAuthStore } from '@/stores/auth.store';
import type { PredictionQuestion } from '@/types';
import { Container } from '@/components/ui/Container';

// Horizontal slider sizing — cards are fixed-width so the next one peeks in.
const SLIDER_GAP = 12;
const SLIDER_SIDE_INSET = 24; // px-6 from outer ScrollView

export default function HomeScreen(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useResponsive();
  const sliderVisibleWidth = windowWidth - SLIDER_SIDE_INSET * 2;
  const sliderCardWidth = Math.min(320, sliderVisibleWidth - 32);
  const profile = useAuthStore((s) => s.profile);
  const userId = useAuthStore((s) => s.session?.user.id);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const [savingTeams, setSavingTeams] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<{ id: string; rank?: number } | null>(null);
  const { isVisible: isVideoPopupVisible, dismiss: dismissVideoPopup } = useVideoPopup();

  const handleSaveTeams = async (teams: string[]) => {
    if (!userId) return;
    setSavingTeams(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ supported_teams: teams })
        .eq('id', userId);

      if (error) throw error;
      await refreshProfile();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save supported teams.');
    } finally {
      setSavingTeams(false);
    }
  };

  const showPicker = Boolean(profile) && (!profile?.supported_teams || profile.supported_teams.length === 0);

  const matchesQuery = useMatches();
  const predictionsQuery = useMyPredictions();
  const pointsQuery = useMyPoints();
  const leaderboardQuery = useLeaderboard();
  
  // Custom Tournament Predictions Hooks
  const questionsQuery = usePredictionQuestions();
  const userPredsQuery = useUserQuestionPredictions();
  const submitPredMutation = useSubmitQuestionPrediction();

  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});

  const matches = matchesQuery.data ?? [];
  const predictions = predictionsQuery.data;
  const points = pointsQuery.data;
  
  const questions = questionsQuery.data ?? [];
  const userPreds = userPredsQuery.data ?? new Map<string, { prediction: string; status: 'pending' | 'approved' | 'rejected' }>();

  const todaysMatches = useMemo(
    // Issue 5 — Today's matches shows only still-relevant fixtures; finished /
    // postponed / cancelled drop off. (Status is IN_PLAY here, never "LIVE".)
    () =>
      matches.filter(
        (m) =>
          isToday(m.kickoff_time) &&
          (m.status === 'SCHEDULED' || m.status === 'IN_PLAY')
      ),
    [matches]
  );

  const myRecentPredictions = useMemo(() => {
    if (!predictions) return [];
    const byId = new Map(matches.map((m) => [m.id, m]));
    return [...predictions.values()]
      .map((p) => ({ prediction: p, match: byId.get(p.match_id) }))
      .filter((x): x is { prediction: typeof x.prediction; match: NonNullable<typeof x.match> } =>
        x.match !== undefined && x.match.status !== 'FINISHED'
      )
      .sort(
        (a, b) =>
          new Date(a.match.kickoff_time).getTime() -
          new Date(b.match.kickoff_time).getTime()
      );
  }, [predictions, matches]);

  const myRank = useMemo(() => {
    const entry = leaderboardQuery.data?.find((e) => e.user_id === userId);
    return entry?.rank ?? null;
  }, [leaderboardQuery.data, userId]);

  const predictionsMade = predictions?.size ?? 0;

  // Issue 1 — keep total points & rank fresh on every focus. Uses stable
  // refetch refs (react-query / zustand memoize these) so the focus callback
  // identity never changes on render → no re-fetch loop.
  const refetchLeaderboard = leaderboardQuery.refetch;
  const refetchPoints = pointsQuery.refetch;
  useFocusEffect(
    useCallback(() => {
      void refreshProfile();
      void refetchLeaderboard();
      void refetchPoints();
    }, [refreshProfile, refetchLeaderboard, refetchPoints])
  );

  // Issue 1 — realtime: reflect total_points the instant the user's row changes
  // (e.g. right after the admin finalizes a match and scoring runs).
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`home-user-${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
        () => {
          void refreshProfile();
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, refreshProfile]);

  const refreshing =
    matchesQuery.isRefetching ||
    predictionsQuery.isRefetching ||
    pointsQuery.isRefetching ||
    questionsQuery.isRefetching ||
    userPredsQuery.isRefetching;

  const onRefresh = (): void => {
    void refreshProfile();
    void matchesQuery.refetch();
    void predictionsQuery.refetch();
    void pointsQuery.refetch();
    void leaderboardQuery.refetch();
    void questionsQuery.refetch();
    void userPredsQuery.refetch();
  };

  const handleOptionSelect = (questionId: string, option: string) => {
    submitPredMutation.mutate({ questionId, prediction: option });
  };

  return (
    <SafeAreaView className="flex-1 bg-bgDeep" edges={['top']}>
      <ScrollView
        contentContainerClassName="px-6 pt-6 gap-6"
        contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Theme.colors.accent}
          />
        }
      >
        <Container nested>
        <View className="gap-6">
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

        {/* Hero Banner Slides */}
        <HeroCarousel />

        {/* Quick stats */}
        <View className="flex-row gap-3">
          <StatTile
            label="Total points"
            value={profile ? (profile.total_points ?? 0) : '—'}
            onPress={() => userId && setSelectedPlayer({ id: userId, rank: myRank ?? undefined })}
          />
          <StatTile
            label="Rank"
            value={myRank ?? '—'}
            onPress={() => router.push('/leaderboard')}
          />
          <StatTile 
            label="Predictions" 
            value={predictionsMade} 
            onPress={() => router.push('/profile/predictions' as any)}
          />
        </View>

        {/* Today's matches */}
        <View className="gap-3">
          <View className="flex-row items-center gap-2.5">
            <View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: Theme.colors.accent }} />
            <Text className="text-lg font-semibold text-textPrimary">Today’s matches</Text>
          </View>
          {matchesQuery.isLoading ? (
            <LoadingSpinner label="Loading matches…" />
          ) : matchesQuery.isError ? (
            <ErrorState
              message={matchesQuery.error.message}
              onRetry={() => void matchesQuery.refetch()}
            />
          ) : todaysMatches.length === 0 ? (
            <EmptyState
              title="No matches today"
              description="Check the Matches tab for upcoming fixtures."
              icon="calendar"
            />
          ) : (
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              snapToInterval={sliderCardWidth + SLIDER_GAP}
              decelerationRate="fast"
              contentContainerStyle={{ gap: SLIDER_GAP, paddingRight: 8 }}
            >
              {todaysMatches.map((match) => (
                <View key={match.id} style={{ width: sliderCardWidth }}>
                  <MatchCard
                    match={match}
                    prediction={predictions?.get(match.id)}
                    points={points?.get(match.id)}
                    onPress={(id) => router.push(`/match/${id}`)}
                  />
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* My recent predictions */}
        <View className="gap-3">
          <View className="flex-row items-center gap-2.5">
            <View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: Theme.colors.accent }} />
            <Text className="text-lg font-semibold text-textPrimary">My predictions</Text>
            {myRecentPredictions.length > 0 && (
              <View 
                className="bg-accent rounded-full min-w-[20px] h-5 items-center justify-center px-1.5"
                style={{ backgroundColor: Theme.colors.accent }}
              >
                <Text 
                  className="text-accentDark text-[11px] font-bold"
                  style={{ color: Theme.colors.accentDark }}
                >
                  {myRecentPredictions.length}
                </Text>
              </View>
            )}
          </View>
          {predictionsQuery.isLoading ? (
            <LoadingSpinner label="Loading predictions…" />
          ) : myRecentPredictions.length === 0 ? (
            <EmptyState
              title="No predictions yet"
              description="Pick a match and submit your first scoreline."
              icon="edit"
            />
          ) : (
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              snapToInterval={sliderCardWidth + SLIDER_GAP}
              decelerationRate="fast"
              contentContainerStyle={{ gap: SLIDER_GAP, paddingRight: 8 }}
            >
              {myRecentPredictions.map(({ prediction, match }) => (
                <View key={prediction.id} style={{ width: sliderCardWidth }}>
                  <MatchCard
                    match={match}
                    prediction={prediction}
                    points={points?.get(match.id)}
                    onPress={(id) => router.push(`/match/${id}`)}
                  />
                </View>
              ))}
            </ScrollView>
          )}
        </View>

          {/* Special Tournament Predictions (Admin Questions) */}
          {questions.length > 0 && (
            <View className="gap-3">
              <View className="flex-row items-center gap-2.5">
                <View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: Theme.colors.accent }} />
                <Text className="text-lg font-semibold text-textPrimary">Tournament Predictions</Text>
              </View>
              <ScrollView
                horizontal
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                snapToInterval={sliderCardWidth + SLIDER_GAP}
                decelerationRate="fast"
                contentContainerStyle={{ gap: SLIDER_GAP, paddingRight: 8 }}
              >
                {questions.map((q) => (
                  <View key={q.id} style={{ width: sliderCardWidth }}>
                    <PredictionQuestionCard
                      question={q}
                      predictionRecord={userPreds.get(q.id)}
                      onOptionSelect={handleOptionSelect}
                      isSubmitting={submitPredMutation.isPending && submitPredMutation.variables?.questionId === q.id}
                      submittingOption={submitPredMutation.isPending && submitPredMutation.variables?.questionId === q.id ? submitPredMutation.variables?.prediction : undefined}
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
        </Container>
      </ScrollView>

      {showPicker && (
        <TeamPickerModal
          visible={true}
          onClose={() => {}}
          selectedTeams={[]}
          onSave={handleSaveTeams}
          saving={savingTeams}
          isMandatory={true}
        />
      )}

      <PlayerProfileModal
        visible={selectedPlayer !== null}
        onClose={() => setSelectedPlayer(null)}
        playerId={selectedPlayer?.id}
        rank={selectedPlayer?.rank}
      />

      <BrandingVideoModal visible={isVideoPopupVisible} onClose={dismissVideoPopup} />
    </SafeAreaView>
  );
}

interface StatTileProps {
  label: string;
  value: string | number;
  onPress?: () => void;
}

function StatTile({ label, value, onPress }: StatTileProps): React.JSX.Element {
  return (
    <Pressable onPress={onPress} className="flex-1 active:opacity-80">
      <Card
        className="items-center justify-center gap-1 p-3 min-h-[88px]"
        style={{ backgroundColor: Theme.colors.accent, borderColor: Theme.colors.accent }}
      >
        <Text className="text-3xl font-black text-center" style={{ color: Theme.colors.accentDark }}>{value}</Text>
        <Text className="text-center text-[11px] font-bold" style={{ color: Theme.colors.accentDark }}>{label}</Text>
      </Card>
    </Pressable>
  );
}

function PredictionQuestionCard({
  question,
  predictionRecord,
  onOptionSelect,
  isSubmitting,
  submittingOption,
}: {
  question: PredictionQuestion;
  predictionRecord: { prediction: string; status: 'pending' | 'approved' | 'rejected' } | undefined;
  onOptionSelect: (questionId: string, option: string) => void;
  isSubmitting: boolean;
  submittingOption: string | undefined;
}): React.JSX.Element {
  const countdown = useCountdown(question.lock_at || '');
  const isResolved = question.status === 'resolved';
  const isTimeUp = countdown.isElapsed;
  const isLocked = question.status === 'closed' || isResolved || isTimeUp;

  const selectedAnswer = predictionRecord?.prediction;
  const auditStatus = predictionRecord?.status || 'pending';

  const [textVal, setTextVal] = useState(selectedAnswer || '');
  const [lastSelected, setLastSelected] = useState(selectedAnswer);

  if (selectedAnswer !== lastSelected) {
    setLastSelected(selectedAnswer);
    setTextVal(selectedAnswer || '');
  }

  // Format countdown text
  let countdownText = '';
  if (!isLocked) {
    if (countdown.days > 0) {
      countdownText = `${countdown.days}d ${countdown.hours}h`;
    } else if (countdown.hours > 0) {
      countdownText = `${countdown.hours}h ${countdown.minutes}m`;
    } else {
      countdownText = `${countdown.minutes}m ${countdown.seconds}s`;
    }
  }

  return (
    <Card className="p-4 border border-bgBorder bg-bgSurface2 gap-3">
      {/* Top row: points pill + a SINGLE status badge. Each side is one compact
          chip, so the row can never overflow no matter how states evolve. */}
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-row items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 shrink-0">
          <Icon name="trophy" size={12} color={Theme.colors.accentDark} />
          <Text
            className="text-[11px] font-extrabold uppercase tracking-wide"
            style={{ color: Theme.colors.accentDark }}
          >
            {question.points} pts
          </Text>
        </View>

        {isResolved ? (
          <View className="flex-row items-center gap-1 rounded-full bg-successDim px-2.5 py-1 shrink-0">
            <Icon name="checkCircle" size={11} color={Theme.colors.success} />
            <Text className="text-[10px] text-success font-bold uppercase">Resolved</Text>
          </View>
        ) : isLocked ? (
          <View className="flex-row items-center gap-1 rounded-full bg-bgSurface3 px-2.5 py-1 shrink-0">
            <Icon name="lock" size={10} color={Theme.colors.textSecondary} />
            <Text className="text-[10px] text-textSecondary font-bold uppercase">Locked</Text>
          </View>
        ) : (
          <View className="flex-row items-center gap-1 rounded-full bg-accentDim px-2.5 py-1 border border-accentBorder shrink-0">
            <Icon name="time" size={10} color={Theme.colors.accent} />
            <Text className="text-[10px] text-accent font-bold uppercase">{countdownText}</Text>
          </View>
        )}
      </View>

      {/* Question */}
      <Text className="text-base font-bold text-textPrimary leading-snug">{question.question_text}</Text>

      {/* Your-answer audit status — on its OWN row so extra badges never crowd
          the header. Shown only after the user has answered. */}
      {predictionRecord && (
        <View className="flex-row items-center gap-1.5 flex-wrap">
          <View
            className={`flex-row items-center gap-1 rounded-full px-2 py-0.5 ${
              auditStatus === 'approved'
                ? 'bg-successDim'
                : auditStatus === 'rejected'
                ? 'bg-liveDim'
                : 'bg-bgSurface3'
            }`}
          >
            <Icon
              name={
                auditStatus === 'approved'
                  ? 'checkCircle'
                  : auditStatus === 'rejected'
                  ? 'closeCircle'
                  : 'time'
              }
              size={11}
              color={
                auditStatus === 'approved'
                  ? Theme.colors.success
                  : auditStatus === 'rejected'
                  ? Theme.colors.live
                  : Theme.colors.textSecondary
              }
            />
            <Text
              className={`text-[10px] font-bold uppercase ${
                auditStatus === 'approved'
                  ? 'text-success'
                  : auditStatus === 'rejected'
                  ? 'text-live'
                  : 'text-textSecondary'
              }`}
            >
              {auditStatus === 'approved'
                ? 'Approved'
                : auditStatus === 'rejected'
                ? 'Rejected'
                : 'Pending audit'}
            </Text>
          </View>
        </View>
      )}

      {/* Options list or Free text input */}
      {question.options && question.options.length > 0 ? (
        <View className="gap-2">
          {question.options.map((option) => {
            const isSelected = selectedAnswer === option;
            const isCorrect = question.correct_answer === option;
            
            let btnStyle = 'bg-bgSurface1 border-bgBorder';
            let textStyle = 'text-textSecondary';
            
            if (isSelected) {
              if (isResolved) {
                if (isCorrect) {
                  btnStyle = 'bg-successDim border-success';
                  textStyle = 'text-success font-semibold';
                } else {
                  btnStyle = 'bg-liveDim border-live';
                  textStyle = 'text-live font-semibold';
                }
              } else {
                btnStyle = 'bg-accentDim border-accent';
                textStyle = 'text-accent font-semibold';
              }
            } else if (isResolved && isCorrect) {
              btnStyle = 'bg-successDim/20 border-success/30';
              textStyle = 'text-success/70';
            }

            const mutatingThis = isSubmitting && submittingOption === option;

            return (
              <Pressable
                key={option}
                onPress={() => !isLocked && onOptionSelect(question.id, option)}
                disabled={isLocked || isSubmitting}
                className={`h-11 flex-row items-center justify-between rounded-xl border px-4 active:opacity-85 ${btnStyle}`}
              >
                <Text className={`text-sm ${textStyle}`}>{option}</Text>
                {mutatingThis ? (
                  <ActivityIndicator size="small" color={Theme.colors.accent} />
                ) : isResolved && isCorrect ? (
                  <Text className="text-success text-xs font-bold"><Icon name="checkCircle" size={12} color={Theme.colors.success} /> Correct</Text>
                ) : isSelected && isResolved && !isCorrect ? (
                  <Text className="text-live text-xs font-bold"><Icon name="closeCircle" size={12} color={Theme.colors.live} /> Incorrect</Text>
                ) : isSelected ? (
                  <Text className="text-accent text-xs">● Selected</Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View className="flex-row items-center gap-2 mt-1">
          <TextInput
            value={textVal}
            onChangeText={setTextVal}
            placeholder={isLocked ? "No prediction submitted" : "Type your prediction..."}
            placeholderTextColor={Theme.colors.textTertiary}
            editable={!isLocked && !isSubmitting}
            className={`flex-1 h-11 rounded-xl border border-bgBorder bg-bgSurface1 px-4 text-sm text-textPrimary ${
              isLocked ? 'opacity-60' : ''
            }`}
          />
          {!isLocked && textVal.trim() !== (selectedAnswer || '') && (
            <Pressable
              onPress={() => {
                const val = textVal.trim();
                if (!val) {
                  Alert.alert('Error', 'Prediction cannot be empty.');
                  return;
                }
                onOptionSelect(question.id, val);
              }}
              disabled={isSubmitting}
              className="bg-accent px-4 rounded-xl h-11 items-center justify-center active:opacity-85"
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={Theme.colors.accentDark} />
              ) : (
                <Text className="text-accentDark text-xs font-bold uppercase">Submit</Text>
              )}
            </Pressable>
          )}
        </View>
      )}

      {isResolved && (
        <View className="mt-1 flex-row items-center justify-between border-t border-bgBorder pt-2">
          <Text className="text-xs text-textSecondary">
            Correct Answer: <Text className="font-bold text-textPrimary">{question.correct_answer || 'Audited'}</Text>
          </Text>
          {auditStatus === 'approved' ? (
            <Text className="text-xs font-bold text-success"><Icon name="trophy" size={12} color={Theme.colors.success} /> +{question.points} PTS Earned</Text>
          ) : (
            <Text className="text-xs text-textTertiary">No points earned</Text>
          )}
        </View>
      )}
    </Card>
  );
}

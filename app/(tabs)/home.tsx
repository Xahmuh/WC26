import { useEffect, useMemo, useState } from 'react';
import { Dimensions, RefreshControl, ScrollView, Text, View, Pressable, ActivityIndicator, Alert, TextInput, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import Theme from '@/constants/theme/design-system';
import { TAB_BAR_CLEARANCE } from '@/components/ui/FloatingTabBar';
import { MatchCard } from '@/components/match/MatchCard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { HeroCarousel } from '@/components/ui/HeroCarousel';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { TeamPickerModal } from '@/components/ui/TeamPickerModal';
import { PlayerProfileModal } from '@/components/ui/PlayerProfileModal';
import { NotificationBell } from '@/components/ui/NotificationBell';
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
import { useAuthStore } from '@/stores/auth.store';
import type { PredictionQuestion } from '@/types';

// Horizontal slider sizing — cards are fixed-width so the next one peeks in.
const SLIDER_GAP = 12;
const SLIDER_CARD_WIDTH = Math.min(320, Dimensions.get('window').width - 80);

export default function HomeScreen(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const userId = useAuthStore((s) => s.session?.user.id);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const [savingTeams, setSavingTeams] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<{ id: string; rank?: number } | null>(null);
const [rankTrend, setRankTrend] = useState<'up' | 'down' | 'same' | null>(null);

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
    () => matches.filter((m) => isToday(m.kickoff_time)),
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

  useEffect(() => {
    if (myRank === null) return;
    AsyncStorage.getItem('wc_last_rank').then((stored) => {
      if (stored !== null) {
        const prev = parseInt(stored, 10);
        if (myRank < prev) setRankTrend('up');
        else if (myRank > prev) setRankTrend('down');
        else setRankTrend('same');
      }
      AsyncStorage.setItem('wc_last_rank', String(myRank));
    });
  }, [myRank]);

  const refreshing =
    matchesQuery.isRefetching ||
    predictionsQuery.isRefetching ||
    pointsQuery.isRefetching ||
    questionsQuery.isRefetching ||
    userPredsQuery.isRefetching;

  const onRefresh = (): void => {
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
        <View className="flex-row items-center justify-between border-b border-bgBorder pb-4 gap-3">
          <View className="flex-row items-center gap-2.5 shrink-0">
            <View
              style={{
                width: 5,
                height: 28,
                borderRadius: 2.5,
                backgroundColor: Theme.colors.accent
              }}
            />
            <View className="flex-row items-center">
              <Text className="text-[24px] font-black uppercase tracking-tighter text-textPrimary">
                World Cup
              </Text>
              <Text className="text-[24px] font-black uppercase tracking-tighter text-accent ml-1.5" style={{ color: Theme.colors.accent }}>
                2026
              </Text>
            </View>
          </View>

          {/* Right cluster: bell + profile pill. shrink + min-w-0 so a long
              display name truncates instead of pushing the avatar off-screen. */}
          <View className="flex-row items-center gap-2 shrink min-w-0">
            <NotificationBell />
            <Pressable
              onPress={() => router.push('/profile')}
              style={{ maxWidth: '60%' }}
              className="flex-row items-center gap-2 bg-bgSurface2 border border-bgBorder rounded-full py-1.5 pl-1.5 pr-3 active:opacity-80 shrink min-w-0"
            >
              <View className="h-7 w-7 items-center justify-center rounded-full bg-bgSurface1 border border-bgBorder/50 overflow-hidden shrink-0">
                <Image
                  source={profile?.avatar_url ? { uri: profile.avatar_url } : require('@/assets/default_avatar.jpg')}
                  style={{ width: '100%', height: '100%' }}
                />
              </View>
              <Text className="text-xs font-bold text-textPrimary shrink" numberOfLines={1}>
                {(profile?.username || profile?.display_name) ?? 'Profile'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Hero Banner Slides */}
        <HeroCarousel />

        {/* Quick stats */}
        <View className="flex-row gap-3">
          <StatTile 
            label="Total points" 
            value={profile?.total_points ?? 0} 
            onPress={() => userId && setSelectedPlayer({ id: userId, rank: myRank ?? undefined })}
          />
          <StatTile 
            label="Rank" 
            value={myRank ?? '—'} 
            trend={rankTrend}
            onPress={() => router.push('/leaderboard')}
          />
          <StatTile 
            label="Predictions" 
            value={predictionsMade} 
            onPress={() => router.push('/profile/predictions' as any)}
          />
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
              showsHorizontalScrollIndicator={false}
              snapToInterval={SLIDER_CARD_WIDTH + SLIDER_GAP}
              decelerationRate="fast"
              contentContainerStyle={{ gap: SLIDER_GAP, paddingRight: 8 }}
            >
              {questions.map((q) => (
                <View key={q.id} style={{ width: SLIDER_CARD_WIDTH }}>
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
              showsHorizontalScrollIndicator={false}
              snapToInterval={SLIDER_CARD_WIDTH + SLIDER_GAP}
              decelerationRate="fast"
              contentContainerStyle={{ gap: SLIDER_GAP, paddingRight: 8 }}
            >
              {todaysMatches.map((match) => (
                <View key={match.id} style={{ width: SLIDER_CARD_WIDTH }}>
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
              showsHorizontalScrollIndicator={false}
              snapToInterval={SLIDER_CARD_WIDTH + SLIDER_GAP}
              decelerationRate="fast"
              contentContainerStyle={{ gap: SLIDER_GAP, paddingRight: 8 }}
            >
              {myRecentPredictions.map(({ prediction, match }) => (
                <View key={prediction.id} style={{ width: SLIDER_CARD_WIDTH }}>
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
    </SafeAreaView>
  );
}

interface StatTileProps {
  label: string;
  value: string | number;
  onPress?: () => void;
  trend?: 'up' | 'down' | 'same' | null;
}

function StatTile({ label, value, onPress, trend }: StatTileProps): React.JSX.Element {
  return (
    <Pressable onPress={onPress} className="flex-1 active:opacity-80">
      <Card 
        className="items-center justify-center gap-1 p-3 min-h-[88px]"
        style={{ backgroundColor: Theme.colors.accent, borderColor: Theme.colors.accent }}
      >
        <View className="flex-row items-center gap-1">
          <Text className="text-3xl font-black text-center" style={{ color: Theme.colors.accentDark }}>{value}</Text>
          {trend === 'up' && <Icon name="trendingUp" size={18} color="#22c55e" />}
          {trend === 'down' && <Icon name="trendingDown" size={18} color="#ef4444" />}
          {trend === 'same' && <Icon name="minus" size={18} color="#a1a1aa" />}
        </View>
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
      <View className="flex-row items-center justify-between">
        <Text className="text-xs text-textSecondary uppercase tracking-wider font-semibold">
          🏆 {question.points} PTS Question
        </Text>
        <View className="flex-row items-center gap-1.5">
          {predictionRecord && (
            <View
              className={`rounded px-1.5 py-0.5 ${
                auditStatus === 'approved'
                  ? 'bg-successDim'
                  : auditStatus === 'rejected'
                  ? 'bg-liveDim'
                  : 'bg-accentDim/40'
              }`}
            >
              <Text
                className={`text-[9px] font-bold uppercase ${
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
                  : 'Pending Audit'}
              </Text>
            </View>
          )}
          {isResolved ? (
            <View className="rounded bg-successDim px-1.5 py-0.5">
              <Text className="text-[10px] text-success font-bold uppercase">Resolved</Text>
            </View>
          ) : isLocked ? (
            <View className="rounded bg-bgBorder px-1.5 py-0.5">
              <Text className="text-[10px] text-textSecondary font-bold uppercase">Locked</Text>
            </View>
          ) : (
            <View className="rounded bg-accentDim px-1.5 py-0.5 border border-accentBorder">
              <Text className="text-[10px] text-accent font-bold uppercase">
                Ends in {countdownText}
              </Text>
            </View>
          )}
        </View>
      </View>

      <Text className="text-base font-bold text-textPrimary">{question.question_text}</Text>

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
                  <Text className="text-success text-xs font-bold">✓ Correct</Text>
                ) : isSelected && isResolved && !isCorrect ? (
                  <Text className="text-live text-xs font-bold">✗ Incorrect</Text>
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
            <Text className="text-xs font-bold text-success">🏆 +{question.points} PTS Earned</Text>
          ) : (
            <Text className="text-xs text-textTertiary">No points earned</Text>
          )}
        </View>
      )}
    </Card>
  );
}

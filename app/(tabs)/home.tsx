import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AvatarButton, NotificationBell, SkeletonBox } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { Colors, Typography } from '@/constants';
import { TAB_BAR_CLEARANCE } from '@/components/ui/FloatingTabBar';
import { HomeKpiBar } from '@/components/home/HomeKpiBar';
import { HeroBannerCarousel, HomeBannerCollections } from '@/components/home/HeroBannerCarousel';
import { MyCardsPreview } from '@/components/home/MyCardsPreview';
import { NextMatchCountdown } from '@/components/home/NextMatchCountdown';
import { MyTeamsMatches } from '@/components/home/MyTeamsMatches';
import { PendingPredictions } from '@/components/home/PendingPredictions';
import { TodayMatchesSection } from '@/components/home/TodayMatchesSection';
import { PerformancePreview } from '@/components/home/PerformancePreview';
import { MiniLeaderboard } from '@/components/home/MiniLeaderboard';
import { PredictionCarousel } from '@/components/predictions/PredictionCarousel';
import { useVideoPopup } from '@/hooks/useVideoPopup';
import { useSubmitQuestionPrediction, useUserQuestionPredictions, usePredictionQuestions as usePredictionQuestionsQuery } from '@/hooks/usePredictionQuestions';
import { useAuthStore } from '@/stores/auth.store';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { updateSupportedTeams } from '@/lib/profileMutations';
import { useCountdown } from '@/hooks/useCountdown';
import type { PredictionQuestion, UserProfile } from '@/types';
import { useResponsive } from '@/lib/responsive';
import { BrandingVideoModal } from '@/components/video/BrandingVideoModal';
import { TeamPickerModal } from '@/components/ui/TeamPickerModal';
import { PlayerProfileModal } from '@/components/ui/PlayerProfileModal';

export default function HomeScreen(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const userId = useAuthStore((s) => s.session?.user.id);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const setSupportedTeams = useAuthStore((s) => s.setSupportedTeams);
  const [refreshing, setRefreshing] = useState(false);
  const [savingTeams, setSavingTeams] = useState(false);
  const [teamPickerOpen, setTeamPickerOpen] = useState(false);
  const [dismissedMandatoryTeamPicker, setDismissedMandatoryTeamPicker] = useState(false);
  const [isBrandingSettling, setIsBrandingSettling] = useState(false);
  const brandingSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<{ id: string; rank?: number } | null>(null);
  const { isVisible: isVideoPopupVisible, dismiss: dismissVideoPopup } = useVideoPopup();
  const isStartupPopupActive = isVideoPopupVisible || isBrandingSettling;

  const showPicker =
    !isStartupPopupActive &&
    !dismissedMandatoryTeamPicker &&
    Boolean(profile) &&
    (!profile?.supported_teams || profile.supported_teams.length === 0);
  const teamPickerVisible = showPicker || teamPickerOpen;

  useEffect(() => {
    return () => {
      if (brandingSettleTimerRef.current) {
        clearTimeout(brandingSettleTimerRef.current);
      }
    };
  }, []);

  const handleBrandingVideoClose = useCallback(() => {
    dismissVideoPopup();
    setIsBrandingSettling(true);

    if (brandingSettleTimerRef.current) {
      clearTimeout(brandingSettleTimerRef.current);
    }

    brandingSettleTimerRef.current = setTimeout(() => {
      setIsBrandingSettling(false);
      brandingSettleTimerRef.current = null;
    }, 350);
  }, [dismissVideoPopup]);

  useFocusEffect(
    useCallback(() => {
      void refreshProfile();
    }, [refreshProfile])
  );

  useEffect(() => {
    if (!userId) return;

    const channelId = Math.random().toString(36).slice(2, 9);
    const channel = supabase
      .channel(`home-user-${userId}-${channelId}`)
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshProfile();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['matches'] }),
        queryClient.invalidateQueries({ queryKey: ['leaderboard'] }),
        queryClient.invalidateQueries({ queryKey: ['predictions'] }),
        queryClient.invalidateQueries({ queryKey: ['predictionQuestions'] }),
        queryClient.invalidateQueries({ queryKey: ['userQuestionPredictions'] }),
        queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshProfile]);

  const handleSaveTeams = useCallback(
    async (teams: string[]): Promise<boolean> => {
      if (!userId) return false;

      setSavingTeams(true);
      try {
        const savedTeams = await updateSupportedTeams(userId, teams);
        setSupportedTeams(savedTeams);
        await refreshProfile();
        return true;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to save supported teams.';
        Alert.alert('Error', message);
        return false;
      } finally {
        setSavingTeams(false);
      }
    },
    [refreshProfile, setSupportedTeams, userId]
  );

  const handleEditTeams = useCallback(() => {
    setTeamPickerOpen(true);
  }, []);

  const handleTeamPickerSave = useCallback(
    async (teams: string[]) => {
      const saved = await handleSaveTeams(teams);
      if (saved) {
        setTeamPickerOpen(false);
      }
    },
    [handleSaveTeams]
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + TAB_BAR_CLEARANCE + 8 },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={Colors.accent.lime} />
        }
      >
        <HomeHeader profile={profile} onAvatarPress={() => router.push('/profile' as never)} />

        <HomeKpiBar />

        <HeroBannerCarousel />
        <HomeBannerCollections position="after_top_banner" />

        <View style={styles.featureRow}>
          <View style={styles.featureHalf}>
            <MyCardsPreview />
          </View>
          <View style={styles.featureHalf}>
            <NextMatchCountdown />
          </View>
        </View>
        <HomeBannerCollections position="after_cards_countdown" />

        <MyTeamsMatches onEditTeams={handleEditTeams} />
        <HomeBannerCollections position="after_my_teams" />

        <PendingPredictions />
        <HomeBannerCollections position="after_pending_predictions" />

        <TodayMatchesSection />
        <TournamentPredictionsSection />
        <HomeBannerCollections position="after_today_matches" />

        <View style={styles.doubleRow}>
          <PerformancePreview style={styles.splitCard} />
          <MiniLeaderboard style={styles.splitCard} />
        </View>
        <HomeBannerCollections position="after_performance" />
        <HomeBannerCollections position="before_tournament_questions" />
      </ScrollView>

      {teamPickerVisible ? (
        <TeamPickerModal
          visible={teamPickerVisible}
          onClose={() => {
            if (showPicker) {
              setDismissedMandatoryTeamPicker(true);
            }
            setTeamPickerOpen(false);
          }}
          selectedTeams={profile?.supported_teams ?? []}
          onSave={handleTeamPickerSave}
          saving={savingTeams}
          isMandatory={showPicker}
        />
      ) : null}

      <PlayerProfileModal
        visible={selectedPlayer !== null}
        onClose={() => setSelectedPlayer(null)}
        playerId={selectedPlayer?.id}
        rank={selectedPlayer?.rank}
      />

      <BrandingVideoModal visible={isVideoPopupVisible} onClose={handleBrandingVideoClose} />
    </SafeAreaView>
  );
}

function HomeHeader({
  profile,
  onAvatarPress,
}: {
  profile: UserProfile | null;
  onAvatarPress: () => void;
}): React.JSX.Element {
  const displayName = profile?.display_name ?? profile?.username ?? 'Player';

  return (
    <View style={styles.header}>
      <View style={styles.headerSide}>
        {profile ? (
          <AvatarButton
            displayName={displayName}
            avatarUrl={profile?.avatar_url}
            size={54}
            onPress={onAvatarPress}
          />
        ) : (
          <SkeletonBox width={54} height={54} borderRadius={27} />
        )}
      </View>

      <View style={styles.headerCenter}>
        <Image source={require('@/assets/icona.png')} style={styles.logo} resizeMode="contain" />
      </View>

      <View style={styles.headerSideRight}>
        <NotificationBell />
      </View>
    </View>
  );
}

function TournamentPredictionsSection(): React.JSX.Element | null {
  const [openQuestion, setOpenQuestion] = useState<PredictionQuestion | null>(null);
  const questionsQuery = usePredictionQuestionsQuery();
  const userPredsQuery = useUserQuestionPredictions();
  const submitPredMutation = useSubmitQuestionPrediction();

  const questions = questionsQuery.data ?? [];
  const userPreds =
    userPredsQuery.data ?? new Map<string, { prediction: string; status: 'pending' | 'approved' | 'rejected' }>();

  const handleOptionSelect = useCallback(
    (questionId: string, prediction: string) => {
      submitPredMutation.mutate({ questionId, prediction });
    },
    [submitPredMutation]
  );

  if (questions.length === 0 && !questionsQuery.isLoading) {
    return null;
  }

  return (
    <View style={styles.tournamentSection}>
      <View style={styles.tournamentHeader}>
        <View style={styles.tournamentHeaderLine} />
        <Text style={styles.tournamentTitle}>Tournament Predictions</Text>
      </View>

      {questionsQuery.isLoading ? (
        <View style={styles.tournamentLoading}>
          <SkeletonBox width="100%" height={180} borderRadius={16} />
        </View>
      ) : (
        <PredictionCarousel
          questions={questions}
          predictionRecords={userPreds}
          onCardPress={(question) => setOpenQuestion(question)}
        />
      )}

      <PredictionQuestionModal
        visible={openQuestion !== null}
        question={openQuestion}
        predictionRecord={openQuestion ? userPreds.get(openQuestion.id) : undefined}
        isSubmitting={
          submitPredMutation.isPending && submitPredMutation.variables?.questionId === openQuestion?.id
        }
        onClose={() => setOpenQuestion(null)}
        onOptionSelect={handleOptionSelect}
      />
    </View>
  );
}

function PredictionQuestionCard({
  question,
  predictionRecord,
  onOptionSelect,
  isSubmitting,
  showImage = true,
}: {
  question: PredictionQuestion;
  predictionRecord: { prediction: string; status: 'pending' | 'approved' | 'rejected' } | undefined;
  onOptionSelect: (questionId: string, option: string) => void;
  isSubmitting: boolean;
  showImage?: boolean;
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
  const trimmedTextVal = textVal.trim();
  const hasTextChanged = trimmedTextVal !== (selectedAnswer || '');
  const canSubmitText = !isLocked && !isSubmitting && trimmedTextVal.length > 0 && hasTextChanged;
  const submitTextLabel = selectedAnswer && !hasTextChanged ? 'Saved' : selectedAnswer ? 'Update Answer' : 'Submit';

  return (
    <View style={styles.questionCard}>
      <View style={styles.questionInner}>
        <Text style={styles.questionTitle}>{question.question_text}</Text>

        {predictionRecord ? (
          <View style={styles.recordBadgeWrap}>
            <View
              style={[
                styles.recordBadge,
                auditStatus === 'approved'
                  ? styles.recordApproved
                  : auditStatus === 'rejected'
                  ? styles.recordRejected
                  : styles.recordPending,
              ]}
            >
              <Text
                style={[
                  styles.recordText,
                  auditStatus === 'approved'
                    ? styles.recordApprovedText
                    : auditStatus === 'rejected'
                    ? styles.recordRejectedText
                    : styles.recordPendingText,
                ]}
              >
                {auditStatus === 'approved' ? 'Approved' : auditStatus === 'rejected' ? 'Rejected' : 'Pending'}
              </Text>
            </View>
          </View>
        ) : null}

        {isResolved ? (
          <View style={styles.statusChip}>
            <Text style={styles.statusChipText}>Resolved</Text>
          </View>
        ) : isLocked ? (
          <View style={styles.statusChipMuted}>
            <Text style={styles.statusChipMutedText}>Locked</Text>
          </View>
        ) : (
          <View style={styles.statusChipOpen}>
            <Text style={styles.statusChipOpenText}>{countdownText ? `Ends in ${countdownText}` : 'Open'}</Text>
          </View>
        )}
      </View>

      <View style={styles.questionBody}>
        {showImage && question.card_image_url ? (
          <View style={styles.questionImageWrap}>
            <Image source={{ uri: question.card_image_url }} style={styles.questionImage} resizeMode="cover" />
          </View>
        ) : null}

        <View style={styles.freeTextRow}>
          <TextInput
            value={textVal}
            onChangeText={setTextVal}
            placeholder={isLocked ? 'No prediction submitted' : 'Type your prediction...'}
            placeholderTextColor={Colors.text.tertiary}
            editable={!isLocked && !isSubmitting}
            multiline
            numberOfLines={3}
            style={[styles.freeTextInput, isLocked && styles.freeTextInputDisabled]}
          />
          {!isLocked ? (
            <Pressable
              onPress={() => {
                if (!trimmedTextVal) {
                  Alert.alert('Error', 'Prediction cannot be empty.');
                  return;
                }
                if (!hasTextChanged) return;
                onOptionSelect(question.id, trimmedTextVal);
              }}
              disabled={!canSubmitText}
              style={[styles.submitButton, !canSubmitText && styles.submitButtonDisabled]}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={Colors.background.primary} />
              ) : (
                <Text style={[styles.submitButtonText, !canSubmitText && styles.submitButtonTextDisabled]}>
                  {submitTextLabel}
                </Text>
              )}
            </Pressable>
          ) : null}
        </View>

        {isResolved ? (
          <View style={styles.resultFooter}>
            <Text style={styles.resultFooterText}>
              Correct Answer: <Text style={styles.resultFooterStrong}>{question.correct_answer || 'Audited'}</Text>
            </Text>
            {auditStatus === 'approved' ? (
              <Text style={styles.resultEarned}>
                <Icon name="trophy" size={12} color={Colors.accent.lime} /> +{question.points} PTS Earned
              </Text>
            ) : (
              <Text style={styles.resultMuted}>No points earned</Text>
            )}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function PredictionQuestionModal({
  visible,
  question,
  predictionRecord,
  isSubmitting,
  onClose,
  onOptionSelect,
}: {
  visible: boolean;
  question: PredictionQuestion | null;
  predictionRecord: { prediction: string; status: 'pending' | 'approved' | 'rejected' } | undefined;
  isSubmitting: boolean;
  onClose: () => void;
  onOptionSelect: (questionId: string, option: string) => void;
}): React.JSX.Element | null {
  const { width, height } = useResponsive();
  const insets = useSafeAreaInsets();
  const isCompact = width < 480;
  const countdown = useCountdown(question?.lock_at || '');
  const isResolved = question?.status === 'resolved';
  const isTimeUp = countdown.isElapsed;
  const isLocked = question?.status === 'closed' || isResolved || isTimeUp;
  const hasPrediction = Boolean(predictionRecord?.prediction);
  const modalTitle = isResolved
    ? 'Result is in'
    : isLocked
      ? 'Prediction locked'
      : hasPrediction
        ? 'Update your pick'
        : 'Make your pick';
  const statusLabel = isResolved ? 'Resolved' : isLocked ? 'Locked' : hasPrediction ? 'Submitted' : 'Open';
  const shellPaddingTop = Math.max(16, insets.top + 12);
  const shellPaddingBottom = Math.max(16, insets.bottom + 12);
  const availableHeight = height - shellPaddingTop - shellPaddingBottom;
  const modalHeight = Math.min(isCompact ? 410 : 450, Math.max(350, Math.floor(availableHeight * 0.74)));

  if (!visible || !question) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View
        pointerEvents="box-none"
        style={[
          styles.modalShell,
          styles.modalShellCenter,
          {
            paddingHorizontal: isCompact ? 16 : 24,
            paddingTop: shellPaddingTop,
            paddingBottom: shellPaddingBottom,
          },
        ]}
      >
        <View
          style={[
            styles.modalCardWrap,
            isCompact ? styles.modalCardWrapCompact : styles.modalCardWrapWide,
            { height: modalHeight, maxHeight: modalHeight },
          ]}
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderCopy}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {modalTitle}
              </Text>
              <Text style={styles.modalSubtitle} numberOfLines={1}>
                Tournament prediction - {question.points} pts - {statusLabel}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close tournament prediction"
              hitSlop={10}
              style={styles.modalCloseButton}
            >
              <Icon name="close" size={18} color={Colors.text.primary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalQuestionWrap}>
              <PredictionQuestionCard
                question={question}
                predictionRecord={predictionRecord}
                onOptionSelect={onOptionSelect}
                isSubmitting={isSubmitting}
                showImage={false}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  scrollContent: {
    paddingHorizontal: 14,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 6,
    paddingBottom: 8,
    marginBottom: 2,
    backgroundColor: Colors.background.primary,
    zIndex: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
      },
      android: { elevation: 10 },
      web: { boxShadow: '0 10px 18px rgba(0,0,0,0.18)' },
    }),
  },
  headerSide: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 1.55,
    alignItems: 'center',
  },
  logo: {
    width: 188,
    height: 86,
  },
  headerSideRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  featureRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'stretch',
  },
  featureHalf: {
    flex: 1,
    flexBasis: 0,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    alignSelf: 'stretch',
  },
  doubleRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'stretch',
  },
  splitCard: {
    flex: 1,
    flexBasis: 0,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    minHeight: 228,
    alignSelf: 'stretch',
  },
  tournamentSection: {
    gap: 12,
  },
  tournamentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tournamentHeaderLine: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: Colors.accent.lime,
  },
  tournamentTitle: {
    color: Colors.text.primary,
    fontSize: 18,
    fontWeight: Typography.weight.bold,
  },
  tournamentLoading: {
    marginTop: 4,
  },
  questionCard: {
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  questionInner: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 12,
    gap: 6,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  questionBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.accent.limeBorder,
    backgroundColor: Colors.accent.limeLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  questionBadgeText: {
    color: Colors.accent.lime,
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  questionMeta: {
    color: Colors.text.tertiary,
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  questionTitle: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: Typography.weight.bold,
    lineHeight: 21,
  },
  recordBadgeWrap: {
    alignItems: 'flex-end',
  },
  recordBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  recordPending: {
    backgroundColor: '#1E1E1E',
  },
  recordApproved: {
    backgroundColor: 'rgba(74,222,128,0.15)',
  },
  recordRejected: {
    backgroundColor: 'rgba(224,48,48,0.15)',
  },
  recordText: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  recordPendingText: {
    color: Colors.text.secondary,
  },
  recordApprovedText: {
    color: Colors.accent.lime,
  },
  recordRejectedText: {
    color: Colors.red,
  },
  statusChip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: 'rgba(74,222,128,0.15)',
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  statusChipText: {
    color: Colors.accent.lime,
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  statusChipMuted: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  statusChipMutedText: {
    color: Colors.text.secondary,
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  statusChipOpen: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.accent.limeBorder,
    backgroundColor: Colors.background.primary,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  statusChipOpenText: {
    color: Colors.accent.lime,
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  questionBody: {
    paddingHorizontal: 0,
    paddingBottom: 0,
    gap: 10,
  },
  questionImageWrap: {
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    backgroundColor: Colors.background.cardAlt,
  },
  questionImage: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  freeTextRow: {
    gap: 8,
    backgroundColor: 'transparent',
  },
  freeTextInput: {
    minHeight: 88,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    backgroundColor: Colors.background.cardAlt,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text.primary,
    fontSize: Typography.size.sm,
    textAlignVertical: 'top',
  },
  freeTextInputDisabled: {
    opacity: 0.6,
  },
  submitButton: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: Colors.accent.lime,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.accent.lime,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.55,
  },
  submitButtonText: {
    color: Colors.background.primary,
    fontSize: 12,
    fontWeight: Typography.weight.bold,
  },
  submitButtonTextDisabled: {
    color: Colors.background.primary,
  },
  resultFooter: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border.subtle,
    gap: 8,
  },
  resultFooterText: {
    flex: 1,
    color: Colors.text.secondary,
    fontSize: 12,
  },
  resultFooterStrong: {
    color: Colors.text.primary,
    fontWeight: Typography.weight.bold,
  },
  resultEarned: {
    color: Colors.accent.lime,
    fontSize: 12,
    fontWeight: Typography.weight.bold,
  },
  resultMuted: {
    color: Colors.text.tertiary,
    fontSize: 12,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  modalShell: {
    flex: 1,
  },
  modalShellCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCardWrap: {
    width: '100%',
    flexShrink: 1,
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    backgroundColor: Colors.background.card,
  },
  modalCardWrapWide: {
    maxWidth: 420,
  },
  modalCardWrapCompact: {
    maxWidth: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  modalHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  modalTitle: {
    color: Colors.text.primary,
    fontSize: 18,
    fontWeight: Typography.weight.bold,
  },
  modalSubtitle: {
    marginTop: 3,
    color: Colors.text.secondary,
    fontSize: 12,
    fontWeight: Typography.weight.medium,
  },
  modalCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    backgroundColor: Colors.background.cardAlt,
  },
  modalScroll: {
    flex: 1,
    flexShrink: 1,
  },
  modalScrollContent: {
    paddingBottom: 16,
  },
  modalQuestionWrap: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.subtle,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
});

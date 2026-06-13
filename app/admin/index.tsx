import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View, TextInput, Pressable, ActivityIndicator, Alert, Modal, Image, Platform, KeyboardAvoidingView, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import Theme from '@/constants/theme/design-system';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { HeroBannerCarousel } from '@/components/home/HeroBannerCarousel';
import { BottomBannerCollectionsManager, FixedHeroBannerManager } from '@/components/admin/HeroBannerManager';
import { AuthContentManager } from '@/components/admin/AuthContentManager';
import { HomeCardsTileManager } from '@/components/admin/HomeCardsTileManager';
import { MatchesHeroManager } from '@/components/admin/MatchesHeroManager';
import { PredictionNewsManager } from '@/components/admin/PredictionNewsManager';
import { AppUpdateManager } from '@/components/admin/AppUpdateManager';
import { DateTimePickerModal } from '@/components/ui/DateTimePickerModal';
import { useMatches } from '@/hooks/useMatches';
import { usePredictionQuestions } from '@/hooks/usePredictionQuestions';
import { useTeams } from '@/hooks/useTeams';
import { TeamFlag } from '@/components/ui/TeamFlag';
import {
  useSetMatchMultiplier,
  useCreatePredictionQuestion,
  useResolvePredictionQuestion,
  useUpdateQuestionStatus,
  useUpdatePredictionQuestion,
  useUploadPredictionQuestionCardImage,
  useDeletePredictionQuestion,
  useQuestionSubmissions,
  useAuditUserPrediction,
  useCreateCustomMatch,
  useUpdateMatchResult,
  useDeleteMatch,
  useScoringRules,
  useUpdateScoringRules,
  useStageMultipliers,
  useSetStageMultiplier,
  useStageCardSettings,
  useSetStageExpectedMatches,
  useCardDefinitions,
  useCreateCardDefinition,
  useUpdateCardDefinition,
  useDisableCardDefinition,
  useDeleteCardDefinition,
  useUploadCardDefinitionImage,
  useRecalculateStageCards,
  useApiProviders,
  useUpsertApiProvider,
  useSetActiveApiProvider,
} from '@/hooks/useAdmin';
import type { ApiProvider, CardDefinition, Team, MatchDecisionMethod, MatchStage, MatchStatus, Match, PredictionQuestion } from '@/types';
import { formatKickoff } from '@/lib/dates';
import { DEFAULT_STAGE_MATCH_COUNTS } from '@/lib/stages';
import { useResponsive } from '@/lib/responsive';
import { useAuthStore } from '@/stores/auth.store';

async function ensureImageLibraryPermission(message: string): Promise<boolean> {
  if (Platform.OS === 'web') return true;

  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission Denied', message);
    return false;
  }

  return true;
}

interface SubmissionsAuditSectionProps {
  questionId: string;
  auditMutation: any;
}

function SubmissionsAuditSection({
  questionId,
  auditMutation,
}: SubmissionsAuditSectionProps): React.JSX.Element {
  const { data: submissions, isLoading, isError, error } = useQuestionSubmissions(questionId);

  if (isLoading) {
    return <ActivityIndicator size="small" color={Theme.colors.accent} className="py-4" />;
  }

  if (isError) {
    return (
      <Text className="text-xs text-live py-2">
        Error loading submissions: {error?.message}
      </Text>
    );
  }

  if (!submissions || submissions.length === 0) {
    return (
      <Text className="text-xs text-textTertiary text-center py-4 italic">
        No submissions yet for this question.
      </Text>
    );
  }

  return (
    <View className="mt-3 bg-bgSurface1 rounded-xl p-3 border border-bgBorder gap-2.5">
      <Text className="text-xs font-bold text-textSecondary uppercase">
        User Submissions ({submissions.length})
      </Text>
      
      <View className="h-[0.5px] bg-bgBorder" />

      {submissions.map((sub) => {
        const isApproved = sub.status === 'approved';
        const isRejected = sub.status === 'rejected';

        const isMutating =
          auditMutation.isPending &&
          auditMutation.variables?.predictionId === sub.id;

        return (
          <View
            key={sub.id}
            className="flex-row items-center justify-between border-b border-bgBorder/50 pb-2.5 mb-1.5 last:border-b-0 last:pb-0 last:mb-0"
          >
            <View className="flex-1 mr-3">
              <Text className="text-sm font-bold text-textPrimary">
                {sub.user?.username || sub.user?.display_name || 'Unknown User'}
              </Text>
              <Text className="text-xs text-textSecondary mt-1 italic">
                Prediction: "{sub.prediction}"
              </Text>
            </View>

            {isMutating ? (
              <ActivityIndicator size="small" color={Theme.colors.accent} />
            ) : (
              <View className="flex-row items-center gap-1.5">
                {isApproved && (
                  <View className="bg-successDim px-1.5 py-0.5 rounded">
                    <Text className="text-[9px] text-success font-bold uppercase">Approved</Text>
                  </View>
                )}
                {isRejected && (
                  <View className="bg-liveDim px-1.5 py-0.5 rounded">
                    <Text className="text-[9px] text-live font-bold uppercase">Rejected</Text>
                  </View>
                )}
                
                <View className="flex-row gap-1">
                  <Pressable
                    onPress={() => auditMutation.mutate({ predictionId: sub.id, status: 'approved' })}
                    className={`min-h-11 px-3 justify-center rounded border ${
                      isApproved
                        ? 'bg-successDim border-success'
                        : 'bg-bgSurface2 border-bgBorder'
                    }`}
                  >
                    <Text className={`text-[10px] font-bold ${isApproved ? 'text-success' : 'text-textSecondary'}`}>
                      Approve
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => auditMutation.mutate({ predictionId: sub.id, status: 'rejected' })}
                    className={`min-h-11 px-3 justify-center rounded border ${
                      isRejected
                        ? 'bg-liveDim border-live/30'
                        : 'bg-bgSurface2 border-bgBorder'
                    }`}
                  >
                    <Text className={`text-[10px] font-bold ${isRejected ? 'text-live' : 'text-textSecondary'}`}>
                      Reject
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const STAGE_LABELS: Record<MatchStage, string> = {
  GROUP: 'Group Stage',
  ROUND_OF_32: 'Round of 32',
  ROUND_OF_16: 'Round of 16',
  QUARTER_FINAL: 'Quarter Final',
  SEMI_FINAL: 'Semi Final',
  THIRD_PLACE: 'Third Place',
  FINAL: 'Final',
};

const STAGE_ORDER: MatchStage[] = [
  'GROUP',
  'ROUND_OF_32',
  'ROUND_OF_16',
  'QUARTER_FINAL',
  'SEMI_FINAL',
  'THIRD_PLACE',
  'FINAL',
];

const MULTIPLIER_OPTIONS = [1, 2, 3, 4, 5, 6];

type AdminTab =
  | 'matches'
  | 'add_match'
  | 'questions'
  | 'cards'
  | 'hero_banner'
  | 'news'
  | 'updates'
  | 'quotes'
  | 'scoring'
  | 'api';

type AdminDialogVariant = 'success' | 'error' | 'warning' | 'info' | 'danger';

interface AdminDialogAction {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'lime';
  onPress?: () => void;
}

interface AdminDialogState {
  title: string;
  message?: string;
  variant?: AdminDialogVariant;
  actions?: AdminDialogAction[];
}

type ShowAdminDialog = (dialog: AdminDialogState) => void;

const ADMIN_TABS: Array<{ key: AdminTab; label: string; width: number }> = [
  { key: 'matches', label: 'Matches', width: 104 },
  { key: 'add_match', label: 'Add Match', width: 116 },
  { key: 'questions', label: 'Questions', width: 116 },
  { key: 'cards', label: 'Cards', width: 88 },
  { key: 'hero_banner', label: 'Banners', width: 112 },
  { key: 'news', label: 'News', width: 86 },
  { key: 'updates', label: 'Updates', width: 104 },
  { key: 'quotes', label: 'Quotes', width: 96 },
  { key: 'scoring', label: 'Scoring', width: 104 },
  { key: 'api', label: 'API', width: 82 },
];

const ADMIN_DIALOG_META: Record<AdminDialogVariant, { icon: any; color: string; bg: string; border: string }> = {
  success: {
    icon: 'checkCircle',
    color: Theme.colors.success,
    bg: Theme.colors.successDim,
    border: 'rgba(74,222,128,0.30)',
  },
  error: {
    icon: 'closeCircle',
    color: Theme.colors.live,
    bg: Theme.colors.liveDim,
    border: 'rgba(224,48,48,0.30)',
  },
  warning: {
    icon: 'warning',
    color: Theme.colors.warning,
    bg: Theme.colors.warningDim,
    border: 'rgba(250,204,21,0.30)',
  },
  info: {
    icon: 'info',
    color: Theme.colors.accent,
    bg: Theme.colors.accentDim,
    border: Theme.colors.accentBorder,
  },
  danger: {
    icon: 'trash',
    color: Theme.colors.live,
    bg: Theme.colors.liveDim,
    border: 'rgba(224,48,48,0.30)',
  },
};

function AdminDialogModal({
  dialog,
  onClose,
}: {
  dialog: AdminDialogState | null;
  onClose: () => void;
}): React.JSX.Element | null {
  if (!dialog) return null;

  const variant = dialog.variant ?? 'info';
  const meta = ADMIN_DIALOG_META[variant];
  const actions = dialog.actions?.length ? dialog.actions : [{ label: 'OK', variant: 'primary' as const }];
  const stackedActions = actions.length > 2;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={styles.adminDialogOverlay}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={styles.adminDialogCard}
        >
          <View style={styles.adminDialogHeader}>
            <View
              style={[
                styles.adminDialogIcon,
                { backgroundColor: meta.bg, borderColor: meta.border },
              ]}
            >
              <Icon name={meta.icon} size={22} color={meta.color} fixed />
            </View>
            <View style={styles.adminDialogTitleWrap}>
              <Text style={styles.adminDialogTitle}>{dialog.title}</Text>
              {dialog.message ? (
                <Text style={styles.adminDialogMessage}>{dialog.message}</Text>
              ) : null}
            </View>
          </View>

          <View
            style={[
              styles.adminDialogActions,
              stackedActions ? styles.adminDialogActionsStacked : styles.adminDialogActionsRow,
            ]}
          >
            {actions.map((action) => (
              <View key={action.label} style={stackedActions ? undefined : styles.adminDialogActionSlot}>
                <Button
                  label={action.label}
                  variant={action.variant ?? 'primary'}
                  onPress={() => {
                    onClose();
                    action.onPress?.();
                  }}
                />
              </View>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ScoringSettingsSection(): React.JSX.Element {
  const rulesQuery = useScoringRules();
  const updateRulesMutation = useUpdateScoringRules();
  const stagesQuery = useStageMultipliers();
  const setStageMultiplierMutation = useSetStageMultiplier();

  const [winnerPoints, setWinnerPoints] = useState('');
  const [exactBonusPoints, setExactBonusPoints] = useState('');
  const [didHydrate, setDidHydrate] = useState(false);
  useEffect(() => {
    if (rulesQuery.data && !didHydrate) {
      setWinnerPoints(String(rulesQuery.data.winnerPoints));
      setExactBonusPoints(String(rulesQuery.data.exactBonusPoints));
      setDidHydrate(true);
    }
  }, [rulesQuery.data, didHydrate]);

  const handleSaveRules = () => {
    const parsed = {
      winnerPoints: parseInt(winnerPoints, 10),
      exactBonusPoints: parseInt(exactBonusPoints, 10),
    };

    if (Object.values(parsed).some((v) => Number.isNaN(v) || v < 0)) {
      Alert.alert('Invalid points', 'Please enter non-negative whole numbers for every field.');
      return;
    }

    updateRulesMutation.mutate(parsed, {
      onError: (err: any) => Alert.alert('Error', err.message || 'Failed to update scoring rules.'),
      onSuccess: () => Alert.alert('Saved', 'Scoring rules updated. They apply to matches scored from now on.'),
    });
  };

  const handleStageMultiplier = (stage: MatchStage, multiplier: number) => {
    setStageMultiplierMutation.mutate(
      { stage, multiplier },
      {
        onError: (err: any) => Alert.alert('Error', err.message || 'Failed to update stage multiplier.'),
        onSuccess: (affected) =>
          Alert.alert(
            'Applied',
            `${STAGE_LABELS[stage]} default multiplier set to ${multiplier}x` +
              (affected ? ` — applied to ${affected} match${affected === 1 ? '' : 'es'}.` : '.')
          ),
      }
    );
  };

  const stageMultiplierByStage = new Map(
    (stagesQuery.data ?? []).map((row) => [row.stage, row.multiplier])
  );

  return (
    <View className="gap-6">
      {/* Points per prediction aspect */}
      <Card className="p-4 border border-bgBorder bg-bgSurface2 gap-3">
        <Text className="text-sm font-bold text-textPrimary">Points per Prediction Aspect</Text>
        <Text className="text-xs text-textSecondary">
          Scoring is kept simple: a prediction only earns points for picking the correct
          winner/draw, plus a bonus for nailing the exact score (no partial credit for
          matching just one side's goal count). These are the base (1x) values — the match's
          multiplier is applied on top.
        </Text>

        {rulesQuery.isLoading ? (
          <LoadingSpinner label="Loading scoring rules..." />
        ) : (
          <View className="gap-3">
            {[
              { label: 'Correct winner / draw', value: winnerPoints, set: setWinnerPoints },
              { label: 'Exact score bonus', value: exactBonusPoints, set: setExactBonusPoints },
            ].map((field) => (
              <View key={field.label} className="flex-row items-center justify-between gap-3">
                <Text className="text-sm text-textSecondary flex-1">{field.label}</Text>
                <TextInput
                  value={field.value}
                  onChangeText={field.set}
                  keyboardType="number-pad"
                  className="h-10 w-20 rounded-lg border border-bgBorder bg-bgSurface1 px-3 text-center text-sm font-bold text-textPrimary"
                  placeholderTextColor={Theme.colors.textTertiary}
                />
              </View>
            ))}

            <Button
              label={updateRulesMutation.isPending ? 'Saving...' : 'Save Points'}
              onPress={handleSaveRules}
              disabled={updateRulesMutation.isPending}
            />
          </View>
        )}
      </Card>

      {/* Per-stage multiplier presets */}
      <Card className="p-4 border border-bgBorder bg-bgSurface2 gap-3">
        <Text className="text-sm font-bold text-textPrimary">Stage Multiplier Presets</Text>
        <Text className="text-xs text-textSecondary">
          Pick a default multiplier (1x-6x) for each tournament stage. Applying a value here
          updates every match currently in that stage — you can still fine-tune individual
          matches from the "Matches" tab afterwards.
        </Text>

        {stagesQuery.isLoading ? (
          <LoadingSpinner label="Loading stage presets..." />
        ) : (
          <View className="gap-3">
            {STAGE_ORDER.map((stage) => {
              const current = stageMultiplierByStage.get(stage) ?? 1;
              const isMutating =
                setStageMultiplierMutation.isPending &&
                setStageMultiplierMutation.variables?.stage === stage;

              return (
                <View key={stage} className="gap-1.5">
                  <Text className="text-xs font-semibold text-textSecondary uppercase">
                    {STAGE_LABELS[stage]}
                  </Text>
                  {isMutating ? (
                    <ActivityIndicator size="small" color={Theme.colors.accent} />
                  ) : (
                    <View className="flex-row flex-wrap gap-1">
                      {MULTIPLIER_OPTIONS.map((mult) => (
                        <Pressable
                          key={mult}
                          onPress={() => handleStageMultiplier(stage, mult)}
                          className={`px-2.5 py-1 rounded-md border ${
                            current === mult
                              ? 'bg-accentDim border-accent'
                              : 'bg-bgSurface1 border-bgBorder'
                          }`}
                        >
                          <Text
                            className={`text-xs font-bold ${
                              current === mult ? 'text-accent' : 'text-textSecondary'
                            }`}
                          >
                            {mult}x
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </Card>
    </View>
  );
}

function ScoringSettingsSectionWithEdit({ onDialog }: { onDialog: ShowAdminDialog }): React.JSX.Element {
  const rulesQuery = useScoringRules();
  const updateRulesMutation = useUpdateScoringRules();
  const stagesQuery = useStageMultipliers();
  const setStageMultiplierMutation = useSetStageMultiplier();
  const matchesQuery = useMatches();
  const stageCardSettingsQuery = useStageCardSettings();
  const setStageExpectedMatchesMutation = useSetStageExpectedMatches();

  const [winnerPoints, setWinnerPoints] = useState('');
  const [exactBonusPoints, setExactBonusPoints] = useState('');
  const [didHydrateRules, setDidHydrateRules] = useState(false);
  const [isEditingStages, setIsEditingStages] = useState(false);
  const [stageDraft, setStageDraft] = useState<Partial<Record<MatchStage, number>>>({});
  const [isEditingExpectedMatches, setIsEditingExpectedMatches] = useState(false);
  const [expectedMatchesDraft, setExpectedMatchesDraft] = useState<Partial<Record<MatchStage, string>>>({});

  useEffect(() => {
    if (rulesQuery.data && !didHydrateRules) {
      setWinnerPoints(String(rulesQuery.data.winnerPoints));
      setExactBonusPoints(String(rulesQuery.data.exactBonusPoints));
      setDidHydrateRules(true);
    }
  }, [rulesQuery.data, didHydrateRules]);

  useEffect(() => {
    if (isEditingExpectedMatches) return;
    const byStage = new Map(
      (stageCardSettingsQuery.data ?? []).map((row) => [row.stage, row.expected_matches])
    );
    const nextDraft: Partial<Record<MatchStage, string>> = {};
    STAGE_ORDER.forEach((stage) => {
      nextDraft[stage] = String(byStage.get(stage) ?? DEFAULT_STAGE_MATCH_COUNTS[stage]);
    });
    setExpectedMatchesDraft(nextDraft);
  }, [isEditingExpectedMatches, stageCardSettingsQuery.data]);

  const stageMultiplierByStage = new Map(
    (stagesQuery.data ?? []).map((row) => [row.stage, row.multiplier])
  );

  const getSavedStageMultiplier = (stage: MatchStage) => stageMultiplierByStage.get(stage) ?? 1;

  const stageExpectedByStage = new Map(
    (stageCardSettingsQuery.data ?? []).map((row) => [row.stage, row.expected_matches])
  );

  const stageAuditRows = STAGE_ORDER.map((stage) => {
    const expectedMatches = stageExpectedByStage.get(stage) ?? DEFAULT_STAGE_MATCH_COUNTS[stage];
    const activeMatches = (matchesQuery.data ?? []).filter(
      (match) =>
        match.stage === stage &&
        match.status !== 'POSTPONED' &&
        match.status !== 'CANCELLED'
    );
    const actualMatches = activeMatches.length;
    const actualMultiplierSum = activeMatches.reduce((sum, match) => sum + match.points_multiplier, 0);
    const savedMultiplier = getSavedStageMultiplier(stage);
    const missingMatches = Math.max(expectedMatches - actualMatches, 0);
    const basePoints = (rulesQuery.data?.winnerPoints ?? 0) + (rulesQuery.data?.exactBonusPoints ?? 0);
    const possiblePoints = basePoints * (actualMultiplierSum + missingMatches * savedMultiplier);

    return {
      stage,
      expectedMatches,
      actualMatches,
      missingMatches,
      savedMultiplier,
      possiblePoints,
    };
  });

  const resetStageDraft = () => {
    const nextDraft: Partial<Record<MatchStage, number>> = {};
    STAGE_ORDER.forEach((stage) => {
      nextDraft[stage] = getSavedStageMultiplier(stage);
    });
    setStageDraft(nextDraft);
  };

  const handleSaveRules = () => {
    const parsed = {
      winnerPoints: parseInt(winnerPoints, 10),
      exactBonusPoints: parseInt(exactBonusPoints, 10),
    };

    if (Object.values(parsed).some((value) => Number.isNaN(value) || value < 0)) {
      onDialog({
        title: 'Invalid points',
        message: 'Please enter non-negative whole numbers for every field.',
        variant: 'warning',
      });
      return;
    }

    updateRulesMutation.mutate(parsed, {
      onError: (err: any) =>
        onDialog({
          title: 'Error',
          message: err.message || 'Failed to update scoring rules.',
          variant: 'error',
        }),
      onSuccess: () =>
        onDialog({
          title: 'Saved',
          message: 'Scoring rules updated. They apply to matches scored from now on.',
          variant: 'success',
        }),
    });
  };

  const handleStartStageEdit = () => {
    resetStageDraft();
    setIsEditingStages(true);
  };

  const handleCancelStageEdit = () => {
    resetStageDraft();
    setIsEditingStages(false);
  };

  const handleSaveExpectedMatches = async () => {
    const parsed = STAGE_ORDER.map((stage) => {
      const raw = expectedMatchesDraft[stage] ?? String(DEFAULT_STAGE_MATCH_COUNTS[stage]);
      const expectedMatches = parseInt(raw, 10);
      return { stage, expectedMatches };
    });

    if (parsed.some((item) => Number.isNaN(item.expectedMatches) || item.expectedMatches < 0)) {
      onDialog({
        title: 'Invalid stage counts',
        message: 'Expected matches must be non-negative whole numbers.',
        variant: 'warning',
      });
      return;
    }

    const changed = parsed.filter(
      (item) => item.expectedMatches !== (stageExpectedByStage.get(item.stage) ?? DEFAULT_STAGE_MATCH_COUNTS[item.stage])
    );

    if (changed.length === 0) {
      setIsEditingExpectedMatches(false);
      onDialog({ title: 'No changes', message: 'Stage match counts are already up to date.', variant: 'info' });
      return;
    }

    try {
      await Promise.all(
        changed.map((item) =>
          setStageExpectedMatchesMutation.mutateAsync({
            stage: item.stage,
            expectedMatches: item.expectedMatches,
          })
        )
      );
      setIsEditingExpectedMatches(false);
      onDialog({
        title: 'Saved',
        message: `Updated ${changed.length} stage match count${changed.length === 1 ? '' : 's'}.`,
        variant: 'success',
      });
    } catch (err: any) {
      onDialog({
        title: 'Error',
        message: err.message || 'Failed to save stage match counts.',
        variant: 'error',
      });
    }
  };

  const handleSaveStageEdit = async () => {
    const changed = STAGE_ORDER
      .map((stage) => ({
        stage,
        current: getSavedStageMultiplier(stage),
        next: stageDraft[stage] ?? getSavedStageMultiplier(stage),
      }))
      .filter((item) => item.current !== item.next);

    if (changed.length === 0) {
      setIsEditingStages(false);
      onDialog({
        title: 'No changes',
        message: 'Stage multiplier presets are already up to date.',
        variant: 'info',
      });
      return;
    }

    try {
      const results = await Promise.all(
        changed.map((item) =>
          setStageMultiplierMutation.mutateAsync({ stage: item.stage, multiplier: item.next })
        )
      );
      const affected = results.reduce((sum, value) => sum + (value ?? 0), 0);
      setIsEditingStages(false);
      onDialog({
        title: 'Saved',
        message:
          `Updated ${changed.length} stage preset${changed.length === 1 ? '' : 's'}` +
          (affected ? ` and applied to ${affected} match${affected === 1 ? '' : 'es'}.` : '.'),
        variant: 'success',
      });
    } catch (err: any) {
      onDialog({
        title: 'Error',
        message: err.message || 'Failed to save stage multiplier presets.',
        variant: 'error',
      });
    }
  };

  return (
    <View className="gap-6">
      <Card className="p-4 border border-bgBorder bg-bgSurface2 gap-3">
        <Text className="text-sm font-bold text-textPrimary">Points per Prediction Aspect</Text>
        <Text className="text-xs text-textSecondary">
          Scoring is kept simple: a prediction earns points for the correct winner/draw,
          plus a bonus for the exact score. The match multiplier is applied on top.
        </Text>

        {rulesQuery.isLoading ? (
          <LoadingSpinner label="Loading scoring rules..." />
        ) : (
          <View className="gap-3">
            {[
              { label: 'Correct winner / draw', value: winnerPoints, set: setWinnerPoints },
              { label: 'Exact score bonus', value: exactBonusPoints, set: setExactBonusPoints },
            ].map((field) => (
              <View key={field.label} className="flex-row items-center justify-between gap-3">
                <Text className="text-sm text-textSecondary flex-1">{field.label}</Text>
                <TextInput
                  value={field.value}
                  onChangeText={field.set}
                  keyboardType="number-pad"
                  className="h-10 w-20 rounded-lg border border-bgBorder bg-bgSurface1 px-3 text-center text-sm font-bold text-textPrimary"
                  placeholderTextColor={Theme.colors.textTertiary}
                />
              </View>
            ))}

            <Button
              label={updateRulesMutation.isPending ? 'Saving...' : 'Save Points'}
              onPress={handleSaveRules}
              disabled={updateRulesMutation.isPending}
            />
          </View>
        )}
      </Card>

      <Card className="p-4 border border-bgBorder bg-bgSurface2 gap-3">
        <View className="flex-row items-center justify-between gap-3">
          <Text className="text-sm font-bold text-textPrimary">Stage Multiplier Presets</Text>
          {!isEditingStages && (
            <Pressable
              onPress={handleStartStageEdit}
              disabled={stagesQuery.isLoading}
              className="rounded-lg border border-accentBorder bg-accentDim px-3 py-2 active:opacity-80"
            >
              <Text className="text-[10px] font-bold uppercase tracking-wide text-accent">Edit</Text>
            </Pressable>
          )}
        </View>
        <Text className="text-xs text-textSecondary">
          Pick a default multiplier for each tournament stage. Changes are only applied after Save Changes.
        </Text>

        {stagesQuery.isLoading ? (
          <LoadingSpinner label="Loading stage presets..." />
        ) : (
          <View className="gap-3">
            {STAGE_ORDER.map((stage) => {
              const saved = getSavedStageMultiplier(stage);
              const current = isEditingStages ? stageDraft[stage] ?? saved : saved;

              return (
                <View key={stage} className="gap-1.5">
                  <Text className="text-xs font-semibold text-textSecondary uppercase">
                    {STAGE_LABELS[stage]}
                  </Text>
                  <View className="flex-row flex-wrap gap-1">
                    {MULTIPLIER_OPTIONS.map((multiplier) => (
                      <Pressable
                        key={multiplier}
                        onPress={() => {
                          if (!isEditingStages) return;
                          setStageDraft((prev) => ({ ...prev, [stage]: multiplier }));
                        }}
                        disabled={!isEditingStages || setStageMultiplierMutation.isPending}
                        className={`px-2.5 py-1 rounded-md border ${
                          current === multiplier
                            ? 'bg-accentDim border-accent'
                            : 'bg-bgSurface1 border-bgBorder'
                        } ${!isEditingStages ? 'opacity-80' : ''}`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            current === multiplier ? 'text-accent' : 'text-textSecondary'
                          }`}
                        >
                          {multiplier}x
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              );
            })}

            {isEditingStages && (
              <View className="flex-row gap-2 pt-2">
                <View className="flex-1">
                  <Button
                    label="Cancel"
                    variant="secondary"
                    onPress={handleCancelStageEdit}
                    disabled={setStageMultiplierMutation.isPending}
                  />
                </View>
                <View className="flex-1">
                  <Button
                    label={setStageMultiplierMutation.isPending ? 'Saving...' : 'Save Changes'}
                    onPress={handleSaveStageEdit}
                    loading={setStageMultiplierMutation.isPending}
                  />
                </View>
              </View>
            )}
          </View>
        )}
      </Card>

      <Card className="p-4 border border-bgBorder bg-bgSurface2 gap-3">
        <View className="flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text className="text-sm font-bold text-textPrimary">Stage Card Earning Audit</Text>
            <Text className="mt-1 text-xs text-textSecondary">
              Card thresholds use the full World Cup stage size, even before the API publishes later knockout fixtures.
            </Text>
          </View>
          {!isEditingExpectedMatches ? (
            <Pressable
              onPress={() => setIsEditingExpectedMatches(true)}
              disabled={stageCardSettingsQuery.isLoading}
              className="rounded-lg border border-accentBorder bg-accentDim px-3 py-2 active:opacity-80"
            >
              <Text className="text-[10px] font-bold uppercase tracking-wide text-accent">Edit</Text>
            </Pressable>
          ) : null}
        </View>

        {stageCardSettingsQuery.isLoading || matchesQuery.isLoading || stagesQuery.isLoading ? (
          <LoadingSpinner label="Loading stage audit..." />
        ) : (
          <View className="gap-2">
            {stageAuditRows.map((row) => (
              <View key={row.stage} className="rounded-xl border border-bgBorder bg-bgSurface1 px-3 py-3 gap-2">
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="min-w-0 flex-1 text-xs font-bold uppercase text-textPrimary" numberOfLines={1}>
                    {STAGE_LABELS[row.stage]}
                  </Text>
                  <Text className="text-[10px] font-bold text-accent">
                    {row.possiblePoints} pts ceiling
                  </Text>
                </View>

                <View className="flex-row flex-wrap gap-2">
                  <View className="min-w-[86px] flex-1">
                    <Text className="text-[9px] font-bold uppercase text-textTertiary">Expected</Text>
                    {isEditingExpectedMatches ? (
                      <TextInput
                        value={expectedMatchesDraft[row.stage] ?? String(row.expectedMatches)}
                        onChangeText={(value) =>
                          setExpectedMatchesDraft((prev) => ({ ...prev, [row.stage]: value }))
                        }
                        keyboardType="number-pad"
                        className="mt-1 h-9 rounded-lg border border-bgBorder bg-bgSurface2 px-2 text-center text-xs font-bold text-textPrimary"
                        placeholderTextColor={Theme.colors.textTertiary}
                      />
                    ) : (
                      <Text className="mt-1 text-xs font-bold text-textSecondary">{row.expectedMatches}</Text>
                    )}
                  </View>
                  <View className="min-w-[86px] flex-1">
                    <Text className="text-[9px] font-bold uppercase text-textTertiary">Actual</Text>
                    <Text className="mt-1 text-xs font-bold text-textSecondary">{row.actualMatches}</Text>
                  </View>
                  <View className="min-w-[86px] flex-1">
                    <Text className="text-[9px] font-bold uppercase text-textTertiary">Missing</Text>
                    <Text className="mt-1 text-xs font-bold text-textSecondary">
                      {row.missingMatches} @ {row.savedMultiplier}x
                    </Text>
                  </View>
                </View>
              </View>
            ))}

            {isEditingExpectedMatches ? (
              <View className="flex-row gap-2 pt-2">
                <View className="flex-1">
                  <Button
                    label="Cancel"
                    variant="secondary"
                    onPress={() => setIsEditingExpectedMatches(false)}
                    disabled={setStageExpectedMatchesMutation.isPending}
                  />
                </View>
                <View className="flex-1">
                  <Button
                    label={setStageExpectedMatchesMutation.isPending ? 'Saving...' : 'Save Counts'}
                    onPress={handleSaveExpectedMatches}
                    loading={setStageExpectedMatchesMutation.isPending}
                  />
                </View>
              </View>
            ) : null}
          </View>
        )}
      </Card>
    </View>
  );
}

interface CardFormState {
  name: string;
  description: string;
  imagePath: string | null;
  imagePreviewUri: string | null;
  awardStage: MatchStage;
  usableFromStage: MatchStage;
  usableUntilStage: MatchStage;
  thresholdPercent: string;
  maxUses: string;
  multiplierBonus: string;
  isActive: boolean;
}

function createEmptyCardForm(): CardFormState {
  return {
    name: '',
    description: '',
    imagePath: null,
    imagePreviewUri: null,
    awardStage: 'GROUP',
    usableFromStage: 'GROUP',
    usableUntilStage: 'ROUND_OF_32',
    thresholdPercent: '70',
    maxUses: '1',
    multiplierBonus: '1',
    isActive: true,
  };
}

function getStageIndex(stage: MatchStage): number {
  const index = STAGE_ORDER.indexOf(stage);
  return index === -1 ? 0 : index;
}

function StageSelector({
  label,
  value,
  stages,
  onChange,
}: {
  label: string;
  value: MatchStage;
  stages: MatchStage[];
  onChange: (stage: MatchStage) => void;
}): React.JSX.Element {
  return (
    <View className="gap-1.5">
      <Text className="text-xs font-semibold text-textSecondary uppercase">{label}</Text>
      <View className="flex-row flex-wrap gap-1.5">
        {stages.map((stage) => {
          const selected = value === stage;
          return (
            <Pressable
              key={stage}
              onPress={() => onChange(stage)}
              className={`px-2.5 py-1.5 rounded-lg border ${
                selected ? 'bg-accentDim border-accent' : 'bg-bgSurface1 border-bgBorder'
              }`}
            >
              <Text className={`text-[10px] font-bold ${selected ? 'text-accent' : 'text-textSecondary'}`}>
                {STAGE_LABELS[stage]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function StageCardsSection({ onDialog }: { onDialog: ShowAdminDialog }): React.JSX.Element {
  const cardsQuery = useCardDefinitions();
  const createMutation = useCreateCardDefinition();
  const updateMutation = useUpdateCardDefinition();
  const disableMutation = useDisableCardDefinition();
  const deleteCardMutation = useDeleteCardDefinition();
  const uploadMutation = useUploadCardDefinitionImage();
  const recalculateMutation = useRecalculateStageCards();

  const [form, setForm] = useState<CardFormState>(() => createEmptyCardForm());
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const awardStageIndex = getStageIndex(form.awardStage);
  const usableFromIndex = getStageIndex(form.usableFromStage);
  const usableFromOptions = STAGE_ORDER.slice(awardStageIndex);
  const usableUntilOptions = STAGE_ORDER.slice(usableFromIndex);

  const setAwardStage = (nextStage: MatchStage) => {
    setForm((prev) => {
      const awardIndex = getStageIndex(nextStage);
      const nextFrom =
        getStageIndex(prev.usableFromStage) < awardIndex ? nextStage : prev.usableFromStage;
      const nextUntil =
        getStageIndex(prev.usableUntilStage) < getStageIndex(nextFrom)
          ? nextFrom
          : prev.usableUntilStage;

      return {
        ...prev,
        awardStage: nextStage,
        usableFromStage: nextFrom,
        usableUntilStage: nextUntil,
      };
    });
  };

  const setUsableFromStage = (nextStage: MatchStage) => {
    setForm((prev) => ({
      ...prev,
      usableFromStage: nextStage,
      usableUntilStage:
        getStageIndex(prev.usableUntilStage) < getStageIndex(nextStage)
          ? nextStage
          : prev.usableUntilStage,
    }));
  };

  const resetForm = () => {
    setEditingCardId(null);
    setForm(createEmptyCardForm());
  };

  const startEditCard = (card: CardDefinition) => {
    setEditingCardId(card.id);
    setForm({
      name: card.name,
      description: card.description ?? '',
      imagePath: card.image_path,
      imagePreviewUri: card.image_url ?? null,
      awardStage: card.award_stage,
      usableFromStage: card.usable_from_stage,
      usableUntilStage: card.usable_until_stage,
      thresholdPercent: String(card.threshold_percent),
      maxUses: String(card.max_uses),
      multiplierBonus: String(card.multiplier_bonus),
      isActive: card.is_active,
    });
  };

  const handlePickCardImage = async () => {
    if (Platform.OS !== 'web') {
      const hasPermission = await ensureImageLibraryPermission('We need storage permission to pick a card image.');
      if (!hasPermission) return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [20, 29],
      quality: 0.8,
    });

    const asset = result.assets?.[0];
    if (result.canceled || !asset?.uri) return;

    setForm((prev) => ({ ...prev, imagePreviewUri: asset.uri }));

    uploadMutation.mutate(
      {
        localUri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        webFile: asset.file ?? null,
      },
      {
        onSuccess: (path) => {
          setForm((prev) => ({ ...prev, imagePath: path }));
        },
        onError: (err: any) => {
          onDialog({
            title: 'Upload Failed',
            message: err.message || 'Could not upload the card image.',
            variant: 'error',
          });
        },
      }
    );
  };

  const buildCardInput = () => {
    const threshold = Number(form.thresholdPercent);
    const maxUses = parseInt(form.maxUses, 10);
    const multiplierBonus = parseInt(form.multiplierBonus, 10);

    if (!form.name.trim()) {
      onDialog({ title: 'Invalid card', message: 'Card name is required.', variant: 'warning' });
      return null;
    }
    if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 100) {
      onDialog({ title: 'Invalid threshold', message: 'Threshold percent must be between 1 and 100.', variant: 'warning' });
      return null;
    }
    if (Number.isNaN(maxUses) || maxUses < 1 || maxUses > 20) {
      onDialog({ title: 'Invalid uses', message: 'Max uses must be between 1 and 20.', variant: 'warning' });
      return null;
    }
    if (Number.isNaN(multiplierBonus) || multiplierBonus < 1 || multiplierBonus > 10) {
      onDialog({ title: 'Invalid multiplier', message: 'Multiplier bonus must be between 1 and 10.', variant: 'warning' });
      return null;
    }
    if (getStageIndex(form.usableFromStage) < getStageIndex(form.awardStage)) {
      onDialog({ title: 'Invalid stage window', message: 'Usable from stage cannot be before the earning stage.', variant: 'warning' });
      return null;
    }
    if (getStageIndex(form.usableUntilStage) < getStageIndex(form.usableFromStage)) {
      onDialog({ title: 'Invalid stage window', message: 'Usable until stage must be after usable from stage.', variant: 'warning' });
      return null;
    }
    if (uploadMutation.isPending) {
      onDialog({ title: 'Image upload', message: 'Please wait until the card image upload finishes.', variant: 'info' });
      return null;
    }

    return {
      name: form.name.trim(),
      description: form.description.trim() || null,
      imagePath: form.imagePath,
      awardStage: form.awardStage,
      thresholdPercent: threshold,
      usableFromStage: form.usableFromStage,
      usableUntilStage: form.usableUntilStage,
      maxUses,
      multiplierBonus,
      isActive: form.isActive,
    };
  };

  const handleSaveCard = () => {
    const input = buildCardInput();
    if (!input) return;

    if (editingCardId) {
      updateMutation.mutate(
        { cardId: editingCardId, input },
        {
          onSuccess: () => {
            resetForm();
            onDialog({ title: 'Saved', message: 'Card definition updated.', variant: 'success' });
          },
          onError: (err: any) =>
            onDialog({ title: 'Error', message: err.message || 'Failed to update card.', variant: 'error' }),
        }
      );
      return;
    }

    createMutation.mutate(input, {
      onSuccess: () => {
        resetForm();
        onDialog({ title: 'Created', message: 'Card definition created.', variant: 'success' });
      },
      onError: (err: any) =>
        onDialog({ title: 'Error', message: err.message || 'Failed to create card.', variant: 'error' }),
    });
  };

  const handleDisableCard = (card: CardDefinition) => {
    onDialog({
      title: 'Disable card?',
      message: `${card.name} will stop being awarded. Already-earned cards stay in user inventories.`,
      variant: 'danger',
      actions: [
        { label: 'Cancel', variant: 'secondary' },
        {
          label: 'Disable',
          variant: 'danger',
          onPress: () => {
            disableMutation.mutate(card.id, {
              onError: (err: any) =>
                onDialog({ title: 'Error', message: err.message || 'Failed to disable card.', variant: 'error' }),
            });
          },
        },
      ],
    });
  };

  const handleDeleteCard = (card: CardDefinition) => {
    onDialog({
      title: 'Delete card permanently?',
      message: `${card.name} will be permanently deleted. Any copies already awarded to users will also be removed. This cannot be undone.`,
      variant: 'danger',
      actions: [
        { label: 'Cancel', variant: 'secondary' },
        {
          label: 'Delete',
          variant: 'danger',
          onPress: () => {
            deleteCardMutation.mutate(card.id, {
              onSuccess: () => {
                if (editingCardId === card.id) resetForm();
                onDialog({ title: 'Deleted', message: 'Card permanently deleted.', variant: 'success' });
              },
              onError: (err: any) =>
                onDialog({ title: 'Error', message: err.message || 'Failed to delete card.', variant: 'error' }),
            });
          },
        },
      ],
    });
  };

  const handleRecalculateStage = (stage: MatchStage) => {
    recalculateMutation.mutate(stage, {
      onSuccess: (count) => {
        onDialog({
          title: 'Recalculated',
          message: `Awarded ${count} card${count === 1 ? '' : 's'} for ${STAGE_LABELS[stage]}.`,
          variant: 'success',
        });
      },
      onError: (err: any) =>
        onDialog({ title: 'Error', message: err.message || 'Failed to recalculate cards.', variant: 'error' }),
    });
  };

  return (
    <View className="gap-6">
      <Card className="p-4 border border-bgBorder bg-bgSurface2 gap-4">
        <View className="flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text className="text-base font-bold text-textPrimary">
              {editingCardId ? 'Edit Stage Card' : 'Create Stage Card'}
            </Text>
            <Text className="mt-1 text-xs text-textSecondary">
              Configure how users earn a card and where it can boost match multipliers.
            </Text>
          </View>
          {editingCardId ? (
            <Pressable
              onPress={resetForm}
              className="rounded-lg border border-bgBorder bg-bgSurface1 px-3 py-2"
            >
              <Text className="text-[10px] font-bold uppercase text-textSecondary">New</Text>
            </Pressable>
          ) : null}
        </View>

        <View className="gap-1.5">
          <Text className="text-xs font-semibold text-textSecondary uppercase">Card Name</Text>
          <TextInput
            value={form.name}
            onChangeText={(name) => setForm((prev) => ({ ...prev, name }))}
            placeholder="e.g. Captain Card"
            placeholderTextColor={Theme.colors.textTertiary}
            className="h-11 rounded-lg border border-bgBorder bg-bgSurface1 px-3 text-sm text-textPrimary"
          />
        </View>

        <View className="gap-1.5">
          <Text className="text-xs font-semibold text-textSecondary uppercase">Description</Text>
          <TextInput
            value={form.description}
            onChangeText={(description) => setForm((prev) => ({ ...prev, description }))}
            placeholder="Short admin note shown to users"
            placeholderTextColor={Theme.colors.textTertiary}
            className="min-h-20 rounded-lg border border-bgBorder bg-bgSurface1 px-3 py-2 text-sm text-textPrimary"
            multiline
          />
        </View>

        <View className="gap-2">
          <Text className="text-xs font-semibold text-textSecondary uppercase">Card Image</Text>
          <View className="flex-row items-center gap-3">
            <View className="h-24 w-16 overflow-hidden rounded-xl border border-bgBorder bg-bgSurface1 items-center justify-center">
              {form.imagePreviewUri ? (
                <Image source={{ uri: form.imagePreviewUri }} resizeMode="cover" className="h-full w-full" />
              ) : (
                <Icon name="gift" size={24} color={Theme.colors.textTertiary} />
              )}
            </View>
            <View className="min-w-0 flex-1 gap-2">
              <Button
                label={uploadMutation.isPending ? 'Uploading...' : 'Upload Image'}
                variant="secondary"
                onPress={handlePickCardImage}
                loading={uploadMutation.isPending}
              />
              <Text className="text-[10px] text-textTertiary">
                Portrait artwork works best for the card collection screen.
              </Text>
            </View>
          </View>
        </View>

        <StageSelector
          label="Which stage earns this card?"
          value={form.awardStage}
          stages={STAGE_ORDER}
          onChange={setAwardStage}
        />

        <StageSelector
          label="Usable from"
          value={form.usableFromStage}
          stages={usableFromOptions}
          onChange={setUsableFromStage}
        />

        <StageSelector
          label="Usable until"
          value={form.usableUntilStage}
          stages={usableUntilOptions}
          onChange={(usableUntilStage) => setForm((prev) => ({ ...prev, usableUntilStage }))}
        />

        <View className="flex-row flex-wrap gap-3">
          <View className="min-w-[96px] flex-1 gap-1.5">
            <Text className="text-xs font-semibold text-textSecondary uppercase">Threshold %</Text>
            <TextInput
              value={form.thresholdPercent}
              onChangeText={(thresholdPercent) => setForm((prev) => ({ ...prev, thresholdPercent }))}
              keyboardType="numeric"
              placeholder="70"
              placeholderTextColor={Theme.colors.textTertiary}
              className="h-11 rounded-lg border border-bgBorder bg-bgSurface1 px-3 text-sm text-textPrimary"
            />
          </View>
          <View className="min-w-[96px] flex-1 gap-1.5">
            <Text className="text-xs font-semibold text-textSecondary uppercase">Max Uses</Text>
            <TextInput
              value={form.maxUses}
              onChangeText={(maxUses) => setForm((prev) => ({ ...prev, maxUses }))}
              keyboardType="numeric"
              placeholder="1"
              placeholderTextColor={Theme.colors.textTertiary}
              className="h-11 rounded-lg border border-bgBorder bg-bgSurface1 px-3 text-sm text-textPrimary"
            />
          </View>
          <View className="min-w-[96px] flex-1 gap-1.5">
            <Text className="text-xs font-semibold text-textSecondary uppercase">Multiplier +</Text>
            <TextInput
              value={form.multiplierBonus}
              onChangeText={(multiplierBonus) => setForm((prev) => ({ ...prev, multiplierBonus }))}
              keyboardType="numeric"
              placeholder="1"
              placeholderTextColor={Theme.colors.textTertiary}
              className="h-11 rounded-lg border border-bgBorder bg-bgSurface1 px-3 text-sm text-textPrimary"
            />
          </View>
        </View>

        <Pressable
          onPress={() => setForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
          className={`rounded-xl border px-3 py-3 ${
            form.isActive ? 'border-accent bg-accentDim' : 'border-bgBorder bg-bgSurface1'
          }`}
        >
          <View className="flex-row items-center justify-between gap-3">
            <Text className={`text-xs font-bold ${form.isActive ? 'text-accent' : 'text-textSecondary'}`}>
              {form.isActive ? 'Active - can be awarded' : 'Inactive - hidden from awards'}
            </Text>
            <Icon
              name={form.isActive ? 'checkCircle' : 'closeCircle'}
              size={16}
              color={form.isActive ? Theme.colors.accent : Theme.colors.textTertiary}
            />
          </View>
        </Pressable>

        <Button
          label={editingCardId ? 'Save Card' : 'Create Card'}
          onPress={handleSaveCard}
          loading={isSaving}
          disabled={isSaving || uploadMutation.isPending}
        />
      </Card>

      <Card className="p-4 border border-bgBorder bg-bgSurface2 gap-4">
        <View className="gap-1">
          <Text className="text-base font-bold text-textPrimary">Existing Cards</Text>
          <Text className="text-xs text-textSecondary">
            Recalculate a stage after editing thresholds to award cards to existing users.
          </Text>
        </View>

        {cardsQuery.isLoading ? (
          <LoadingSpinner label="Loading cards..." />
        ) : cardsQuery.isError ? (
          <Text className="text-xs text-live">{cardsQuery.error.message}</Text>
        ) : (cardsQuery.data ?? []).length === 0 ? (
          <Text className="text-sm text-textTertiary text-center py-4">No cards created yet.</Text>
        ) : (
          <View className="gap-3">
            {(cardsQuery.data ?? []).map((card) => (
              <View key={card.id} className="rounded-xl border border-bgBorder bg-bgSurface1 p-3 gap-3">
                <View className="flex-row gap-3">
                  <View className="h-20 w-14 overflow-hidden rounded-lg border border-bgBorder bg-bgSurface2 items-center justify-center">
                    {card.image_url ? (
                      <Image source={{ uri: card.image_url }} resizeMode="cover" className="h-full w-full" />
                    ) : (
                      <Icon name="gift" size={22} color={Theme.colors.textTertiary} />
                    )}
                  </View>
                  <View className="min-w-0 flex-1">
                    <View className="flex-row flex-wrap items-center gap-2">
                      <Text className="min-w-0 flex-shrink text-sm font-bold text-textPrimary" numberOfLines={1}>
                        {card.name}
                      </Text>
                      <View className={`rounded px-2 py-0.5 ${card.is_active ? 'bg-successDim' : 'bg-liveDim'}`}>
                        <Text className={`text-[9px] font-bold uppercase ${card.is_active ? 'text-success' : 'text-live'}`}>
                          {card.is_active ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>
                    <Text className="mt-1 text-xs text-textSecondary" numberOfLines={2}>
                      {card.description || 'No description'}
                    </Text>
                    <Text className="mt-2 text-[10px] font-bold uppercase text-textTertiary">
                      {STAGE_LABELS[card.award_stage]} - {card.threshold_percent}% - +{card.multiplier_bonus} boost
                    </Text>
                    <Text className="mt-1 text-[10px] text-textTertiary">
                      Usable: {STAGE_LABELS[card.usable_from_stage]} to {STAGE_LABELS[card.usable_until_stage]} - {card.max_uses} use{card.max_uses === 1 ? '' : 's'}
                    </Text>
                  </View>
                </View>

                <View className="flex-row flex-wrap gap-2">
                  <Pressable
                    onPress={() => startEditCard(card)}
                    className="rounded-lg border border-bgBorder bg-bgSurface2 px-3 py-2"
                  >
                    <Text className="text-[10px] font-bold uppercase text-textSecondary">Edit</Text>
                  </Pressable>
                  {card.is_active ? (
                    <Pressable
                      onPress={() => handleDisableCard(card)}
                      disabled={disableMutation.isPending}
                      className="rounded-lg border border-live/30 bg-liveDim px-3 py-2"
                    >
                      <Text className="text-[10px] font-bold uppercase text-live">Disable</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    onPress={() => handleRecalculateStage(card.award_stage)}
                    disabled={recalculateMutation.isPending}
                    className="rounded-lg border border-accentBorder bg-accentDim px-3 py-2"
                  >
                    <Text className="text-[10px] font-bold uppercase text-accent">
                      {recalculateMutation.isPending ? 'Recalculating...' : 'Recalculate Stage'}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleDeleteCard(card)}
                    disabled={deleteCardMutation.isPending}
                    className="rounded-lg border border-live/30 bg-liveDim px-3 py-2"
                  >
                    <Text className="text-[10px] font-bold uppercase text-live">
                      {deleteCardMutation.isPending ? 'Deleting...' : 'Delete'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </Card>
    </View>
  );
}

interface ApiProviderFormState {
  id: string;
  name: string;
  adapter: string;
  baseUrl: string;
  competitionCode: string;
  tokenSecretName: string;
  rateLimitPerMinute: string;
  supportsFixtures: boolean;
  supportsResults: boolean;
  notes: string;
  isActive: boolean;
}

function createApiProviderForm(provider?: ApiProvider): ApiProviderFormState {
  return {
    id: provider?.id ?? '',
    name: provider?.name ?? '',
    adapter: provider?.adapter ?? 'football_data_v4',
    baseUrl: provider?.base_url ?? '',
    competitionCode: provider?.competition_code ?? 'WC',
    tokenSecretName: provider?.token_secret_name ?? 'FOOTBALL_API_TOKEN',
    rateLimitPerMinute: provider?.rate_limit_per_minute ? String(provider.rate_limit_per_minute) : '',
    supportsFixtures: provider?.supports_fixtures ?? true,
    supportsResults: provider?.supports_results ?? true,
    notes: provider?.notes ?? '',
    isActive: provider?.is_active ?? false,
  };
}

function makeProviderId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function ApiSettingsSection({ onDialog }: { onDialog: ShowAdminDialog }): React.JSX.Element {
  const providersQuery = useApiProviders();
  const upsertMutation = useUpsertApiProvider();
  const setActiveMutation = useSetActiveApiProvider();
  const [form, setForm] = useState<ApiProviderFormState>(() => createApiProviderForm());
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);

  const providers = providersQuery.data ?? [];
  const activeProvider = providers.find((provider) => provider.is_active) ?? providers[0] ?? null;
  const isSaving = upsertMutation.isPending || setActiveMutation.isPending;

  const resetForm = () => {
    setEditingProviderId(null);
    setForm(createApiProviderForm());
  };

  const startEditProvider = (provider: ApiProvider) => {
    setEditingProviderId(provider.id);
    setForm(createApiProviderForm(provider));
  };

  const handleSaveProvider = () => {
    const id = (form.id.trim() || makeProviderId(form.name)).toLowerCase();
    const rateLimit = form.rateLimitPerMinute.trim()
      ? parseInt(form.rateLimitPerMinute, 10)
      : null;

    if (!id || !/^[a-z0-9][a-z0-9_-]*$/.test(id)) {
      onDialog({
        title: 'Invalid provider id',
        message: 'Use lowercase letters, numbers, dash, or underscore.',
        variant: 'warning',
      });
      return;
    }

    if (!form.name.trim()) {
      onDialog({ title: 'Invalid provider', message: 'Provider name is required.', variant: 'warning' });
      return;
    }

    try {
      const parsedUrl = new URL(form.baseUrl.trim());
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('Invalid protocol');
    } catch {
      onDialog({ title: 'Invalid URL', message: 'Base URL must start with http:// or https://.', variant: 'warning' });
      return;
    }

    if (!form.competitionCode.trim() || !form.tokenSecretName.trim()) {
      onDialog({
        title: 'Missing API config',
        message: 'Competition code and token secret name are required.',
        variant: 'warning',
      });
      return;
    }

    if (rateLimit !== null && (Number.isNaN(rateLimit) || rateLimit <= 0)) {
      onDialog({ title: 'Invalid rate limit', message: 'Rate limit must be a positive number.', variant: 'warning' });
      return;
    }

    upsertMutation.mutate(
      {
        id,
        name: form.name.trim(),
        adapter: form.adapter.trim() || 'football_data_v4',
        baseUrl: form.baseUrl.trim().replace(/\/+$/, ''),
        competitionCode: form.competitionCode.trim(),
        tokenSecretName: form.tokenSecretName.trim(),
        isActive: form.isActive,
        rateLimitPerMinute: rateLimit,
        supportsFixtures: form.supportsFixtures,
        supportsResults: form.supportsResults,
        notes: form.notes.trim() || null,
      },
      {
        onSuccess: () => {
          resetForm();
          onDialog({ title: 'Saved', message: 'API provider settings saved.', variant: 'success' });
        },
        onError: (err: any) =>
          onDialog({ title: 'Error', message: err.message || 'Failed to save API provider.', variant: 'error' }),
      }
    );
  };

  const handleSetActive = (provider: ApiProvider) => {
    setActiveMutation.mutate(provider.id, {
      onSuccess: () => {
        onDialog({ title: 'Activated', message: `${provider.name} is now the active API provider.`, variant: 'success' });
      },
      onError: (err: any) =>
        onDialog({ title: 'Error', message: err.message || 'Failed to activate provider.', variant: 'error' }),
    });
  };

  return (
    <View className="gap-6">
      <Card className="p-4 border border-bgBorder bg-bgSurface2 gap-3">
        <View className="flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text className="text-base font-bold text-textPrimary">Active API</Text>
            <Text className="mt-1 text-xs text-textSecondary">
              Fixture and result sync currently use the active football-data v4 compatible provider.
            </Text>
          </View>
          <View className="rounded-full border border-accentBorder bg-accentDim px-3 py-1">
            <Text className="text-[10px] font-bold uppercase text-accent">
              {activeProvider?.adapter ?? 'No provider'}
            </Text>
          </View>
        </View>

        {providersQuery.isLoading ? (
          <LoadingSpinner label="Loading API providers..." />
        ) : activeProvider ? (
          <View className="rounded-xl border border-bgBorder bg-bgSurface1 p-3 gap-2">
            <Text className="text-sm font-bold text-textPrimary">{activeProvider.name}</Text>
            <Text className="text-xs text-textSecondary">{activeProvider.base_url}</Text>
            <View className="flex-row flex-wrap gap-2">
              <Text className="text-[10px] font-bold text-textTertiary">
                Competition: <Text className="text-textSecondary">{activeProvider.competition_code}</Text>
              </Text>
              <Text className="text-[10px] font-bold text-textTertiary">
                Secret: <Text className="text-textSecondary">{activeProvider.token_secret_name}</Text>
              </Text>
              <Text className="text-[10px] font-bold text-textTertiary">
                Rate: <Text className="text-textSecondary">{activeProvider.rate_limit_per_minute ?? 'n/a'}/min</Text>
              </Text>
            </View>
          </View>
        ) : (
          <Text className="text-xs text-live">No API provider configured.</Text>
        )}
      </Card>

      <Card className="p-4 border border-bgBorder bg-bgSurface2 gap-4">
        <View className="flex-row items-center justify-between gap-3">
          <Text className="text-base font-bold text-textPrimary">
            {editingProviderId ? 'Edit API Provider' : 'Add API Provider'}
          </Text>
          {editingProviderId ? (
            <Pressable onPress={resetForm} className="rounded-lg border border-bgBorder bg-bgSurface1 px-3 py-2">
              <Text className="text-[10px] font-bold uppercase text-textSecondary">New</Text>
            </Pressable>
          ) : null}
        </View>

        <View className="flex-row flex-wrap gap-3">
          <View className="min-w-[140px] flex-1 gap-1.5">
            <Text className="text-xs font-semibold text-textSecondary uppercase">Provider ID</Text>
            <TextInput
              value={form.id}
              onChangeText={(id) => setForm((prev) => ({ ...prev, id }))}
              placeholder="football-data"
              placeholderTextColor={Theme.colors.textTertiary}
              autoCapitalize="none"
              className="h-11 rounded-lg border border-bgBorder bg-bgSurface1 px-3 text-sm text-textPrimary"
            />
          </View>
          <View className="min-w-[140px] flex-1 gap-1.5">
            <Text className="text-xs font-semibold text-textSecondary uppercase">Name</Text>
            <TextInput
              value={form.name}
              onChangeText={(name) => setForm((prev) => ({ ...prev, name }))}
              placeholder="football-data.org"
              placeholderTextColor={Theme.colors.textTertiary}
              className="h-11 rounded-lg border border-bgBorder bg-bgSurface1 px-3 text-sm text-textPrimary"
            />
          </View>
        </View>

        <View className="gap-1.5">
          <Text className="text-xs font-semibold text-textSecondary uppercase">Base URL</Text>
          <TextInput
            value={form.baseUrl}
            onChangeText={(baseUrl) => setForm((prev) => ({ ...prev, baseUrl }))}
            placeholder="https://api.football-data.org/v4"
            placeholderTextColor={Theme.colors.textTertiary}
            autoCapitalize="none"
            className="h-11 rounded-lg border border-bgBorder bg-bgSurface1 px-3 text-sm text-textPrimary"
          />
        </View>

        <View className="flex-row flex-wrap gap-3">
          <View className="min-w-[120px] flex-1 gap-1.5">
            <Text className="text-xs font-semibold text-textSecondary uppercase">Adapter</Text>
            <TextInput
              value={form.adapter}
              onChangeText={(adapter) => setForm((prev) => ({ ...prev, adapter }))}
              autoCapitalize="none"
              className="h-11 rounded-lg border border-bgBorder bg-bgSurface1 px-3 text-sm text-textPrimary"
            />
          </View>
          <View className="min-w-[96px] flex-1 gap-1.5">
            <Text className="text-xs font-semibold text-textSecondary uppercase">Competition</Text>
            <TextInput
              value={form.competitionCode}
              onChangeText={(competitionCode) => setForm((prev) => ({ ...prev, competitionCode }))}
              autoCapitalize="characters"
              className="h-11 rounded-lg border border-bgBorder bg-bgSurface1 px-3 text-sm text-textPrimary"
            />
          </View>
        </View>

        <View className="flex-row flex-wrap gap-3">
          <View className="min-w-[160px] flex-1 gap-1.5">
            <Text className="text-xs font-semibold text-textSecondary uppercase">Token Secret</Text>
            <TextInput
              value={form.tokenSecretName}
              onChangeText={(tokenSecretName) => setForm((prev) => ({ ...prev, tokenSecretName }))}
              autoCapitalize="characters"
              className="h-11 rounded-lg border border-bgBorder bg-bgSurface1 px-3 text-sm text-textPrimary"
            />
          </View>
          <View className="min-w-[96px] flex-1 gap-1.5">
            <Text className="text-xs font-semibold text-textSecondary uppercase">Rate / min</Text>
            <TextInput
              value={form.rateLimitPerMinute}
              onChangeText={(rateLimitPerMinute) => setForm((prev) => ({ ...prev, rateLimitPerMinute }))}
              keyboardType="number-pad"
              placeholder="10"
              placeholderTextColor={Theme.colors.textTertiary}
              className="h-11 rounded-lg border border-bgBorder bg-bgSurface1 px-3 text-sm text-textPrimary"
            />
          </View>
        </View>

        <View className="flex-row flex-wrap gap-2">
          {[
            { key: 'supportsFixtures', label: 'Fixtures' },
            { key: 'supportsResults', label: 'Results' },
            { key: 'isActive', label: 'Set Active' },
          ].map((item) => {
            const key = item.key as 'supportsFixtures' | 'supportsResults' | 'isActive';
            const selected = form[key];
            return (
              <Pressable
                key={item.key}
                onPress={() => setForm((prev) => ({ ...prev, [key]: !prev[key] }))}
                className={`rounded-lg border px-3 py-2 ${
                  selected ? 'border-accent bg-accentDim' : 'border-bgBorder bg-bgSurface1'
                }`}
              >
                <Text className={`text-[10px] font-bold uppercase ${selected ? 'text-accent' : 'text-textSecondary'}`}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View className="gap-1.5">
          <Text className="text-xs font-semibold text-textSecondary uppercase">Notes</Text>
          <TextInput
            value={form.notes}
            onChangeText={(notes) => setForm((prev) => ({ ...prev, notes }))}
            placeholder="Internal note for this provider"
            placeholderTextColor={Theme.colors.textTertiary}
            multiline
            className="min-h-20 rounded-lg border border-bgBorder bg-bgSurface1 px-3 py-2 text-sm text-textPrimary"
          />
        </View>

        <Button
          label={upsertMutation.isPending ? 'Saving...' : 'Save API Provider'}
          onPress={handleSaveProvider}
          loading={upsertMutation.isPending}
          disabled={isSaving}
        />
      </Card>

      <Card className="p-4 border border-bgBorder bg-bgSurface2 gap-3">
        <Text className="text-base font-bold text-textPrimary">Configured Providers</Text>
        {providersQuery.isLoading ? (
          <LoadingSpinner label="Loading providers..." />
        ) : providers.length === 0 ? (
          <Text className="text-sm text-textTertiary text-center py-4">No providers configured.</Text>
        ) : (
          <View className="gap-3">
            {providers.map((provider) => (
              <View key={provider.id} className="rounded-xl border border-bgBorder bg-bgSurface1 p-3 gap-3">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="min-w-0 flex-1">
                    <View className="flex-row flex-wrap items-center gap-2">
                      <Text className="text-sm font-bold text-textPrimary">{provider.name}</Text>
                      {provider.is_active ? (
                        <View className="rounded bg-successDim px-2 py-0.5">
                          <Text className="text-[9px] font-bold uppercase text-success">Active</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text className="mt-1 text-xs text-textSecondary" numberOfLines={1}>
                      {provider.base_url}
                    </Text>
                    <Text className="mt-1 text-[10px] text-textTertiary">
                      {provider.adapter} - {provider.competition_code} - {provider.token_secret_name}
                    </Text>
                  </View>
                </View>

                <View className="flex-row flex-wrap gap-2">
                  <Pressable
                    onPress={() => startEditProvider(provider)}
                    className="rounded-lg border border-bgBorder bg-bgSurface2 px-3 py-2"
                  >
                    <Text className="text-[10px] font-bold uppercase text-textSecondary">Edit</Text>
                  </Pressable>
                  {!provider.is_active ? (
                    <Pressable
                      onPress={() => handleSetActive(provider)}
                      disabled={setActiveMutation.isPending}
                      className="rounded-lg border border-accentBorder bg-accentDim px-3 py-2"
                    >
                      <Text className="text-[10px] font-bold uppercase text-accent">
                        {setActiveMutation.isPending ? 'Activating...' : 'Set Active'}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        )}
      </Card>
    </View>
  );
}

interface SingleTeamPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (team: Team) => void;
  teams: Team[];
  title: string;
}

function SingleTeamPickerModal({
  visible,
  onClose,
  onSelect,
  teams,
  title,
}: SingleTeamPickerModalProps): React.JSX.Element {
  const [search, setSearch] = useState('');
  const insets = useSafeAreaInsets();
  const { height } = useResponsive();

  const overlayTopPadding = Math.max(16, insets.top + 16);
  const overlayBottomPadding = Math.max(16, insets.bottom + 16);
  const cardMaxHeight = Math.max(260, height - insets.top - insets.bottom - 48);
  const listMaxHeight = Math.max(160, Math.min(300, cardMaxHeight - 150));
  
  const filtered = teams.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.short_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[
          singleTeamPickerStyles.overlay,
          { paddingTop: overlayTopPadding, paddingBottom: overlayBottomPadding },
        ]}
      >
        <Card
          className="w-full max-w-sm border border-bgBorder bg-bgSurface2 p-5 gap-4 rounded-2xl"
          style={{ maxHeight: cardMaxHeight }}
        >
          <View className="flex-row justify-between items-center pb-2 border-b border-bgBorder/50">
            <Text className="text-base font-bold text-textPrimary">{title}</Text>
            <Pressable onPress={onClose} className="p-1 px-2.5 rounded bg-bgSurface3 border border-bgBorder">
              <Text className="text-xs text-textSecondary font-bold">Cancel</Text>
            </Pressable>
          </View>
          
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search teams..."
            placeholderTextColor={Theme.colors.textTertiary}
            className="h-10 rounded-lg border border-bgBorder bg-bgSurface3 px-3 text-sm text-textPrimary"
            autoCapitalize="none"
          />

          <ScrollView
            className="flex-grow mt-2"
            style={{ maxHeight: listMaxHeight }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="gap-2">
              {filtered.map((team) => (
                <Pressable
                  key={team.id}
                  onPress={() => {
                    onSelect(team);
                    onClose();
                  }}
                  className="flex-row items-center gap-3 p-3 bg-bgSurface3 border border-bgBorder rounded-xl active:opacity-75"
                >
                  <TeamFlag team={team} size={24} fixed />
                  <Text className="text-sm font-bold text-textPrimary">{team.name}</Text>
                </Pressable>
              ))}
              {filtered.length === 0 && (
                <Text className="text-xs text-textTertiary text-center py-8">No teams found</Text>
              )}
            </View>
          </ScrollView>
        </Card>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  adminDialogOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.78)',
    paddingHorizontal: 20,
  },
  adminDialogCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Theme.colors.bgBorder,
    backgroundColor: Theme.colors.bgSurface2,
    padding: 18,
    gap: 18,
    ...Platform.select({
      web: { boxShadow: '0 18px 42px rgba(0,0,0,0.55)' },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.42,
        shadowRadius: 22,
      },
      android: { elevation: 16 },
    }),
  },
  adminDialogHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  adminDialogIcon: {
    width: 48,
    height: 48,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
  },
  adminDialogTitleWrap: {
    flex: 1,
    minWidth: 0,
    gap: 7,
  },
  adminDialogTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0,
  },
  adminDialogMessage: {
    color: Theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
  },
  adminDialogActions: {
    width: '100%',
    gap: 10,
  },
  adminDialogActionsRow: {
    flexDirection: 'row',
  },
  adminDialogActionsStacked: {
    flexDirection: 'column',
  },
  adminDialogActionSlot: {
    flex: 1,
    minWidth: 0,
  },
  adminTabsContent: {
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  adminTabChip: {
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 0,
    overflow: 'hidden',
  },
  adminTabChipActive: {
    borderColor: Theme.colors.accent,
    backgroundColor: Theme.colors.accentDim,
  },
  adminTabChipInactive: {
    borderColor: Theme.colors.bgBorder,
    backgroundColor: Theme.colors.bgSurface2,
  },
  adminTabLabel: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0,
  },
  adminTabLabelActive: {
    color: Theme.colors.accent,
  },
  adminTabLabelInactive: {
    color: Theme.colors.textSecondary,
  },
  adminScrollContent: {
    width: '100%',
    alignSelf: 'center',
    paddingTop: 16,
    paddingBottom: 24,
    gap: 24,
  },
});

const singleTeamPickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
});

export default function AdminDashboard(): React.JSX.Element {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const isAdmin = profile?.role === 'admin';
  const { isSmall, isTablet, containerMaxWidth } = useResponsive();

  const matchesQuery = useMatches();
  const questionsQuery = usePredictionQuestions();
  const teamsQuery = useTeams();

  const setMultiplierMutation = useSetMatchMultiplier();
  const createQuestionMutation = useCreatePredictionQuestion();
  const resolveQuestionMutation = useResolvePredictionQuestion();
  const updateQuestionStatusMutation = useUpdateQuestionStatus();
  const updateQuestionMutation = useUpdatePredictionQuestion();
  const uploadQuestionCardImageMutation = useUploadPredictionQuestionCardImage();
  const deleteQuestionMutation = useDeletePredictionQuestion();
  const auditMutation = useAuditUserPrediction();
  const createMatchMutation = useCreateCustomMatch();
  const updateResultMutation = useUpdateMatchResult();
  const deleteMatchMutation = useDeleteMatch();

  const scrollRef = useRef<ScrollView>(null);

  const goToMatchesPage = (next: number) => {
    setMatchesPage(next);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  // Create Question Form State
  const [qText, setQText] = useState('');
  const [qPoints, setQPoints] = useState('10');
  const [qLockAt, setQLockAt] = useState<Date | null>(null);
  const [isQLockPickerOpen, setIsQLockPickerOpen] = useState(false);
  const [qCardImagePath, setQCardImagePath] = useState<string | null>(null);
  const [qCardImagePreviewUri, setQCardImagePreviewUri] = useState<string | null>(null);

  // Edit Question Accordion State
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editQText, setEditQText] = useState('');
  const [editQPoints, setEditQPoints] = useState('10');
  const [editQLockAt, setEditQLockAt] = useState<Date | null>(null);
  const [isEditQLockPickerOpen, setIsEditQLockPickerOpen] = useState(false);
  const [editQCardImagePath, setEditQCardImagePath] = useState<string | null>(null);
  const [editQCardImagePreviewUri, setEditQCardImagePreviewUri] = useState<string | null>(null);

  // Delete Question confirmation
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Match search state
  const [searchQuery, setSearchQuery] = useState('');

  // Matches list pagination
  const [matchesPage, setMatchesPage] = useState(0);
  const MATCHES_PER_PAGE = 8;

  // Auditing section expanded state
  const [expandedAudits, setExpandedAudits] = useState<Record<string, boolean>>({});

  // Custom Match Creation Form State
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
  const [stage, setStage] = useState<MatchStage>('GROUP');
  const [groupName, setGroupName] = useState('');
  const [venue, setVenue] = useState('');
  const [kickoffDate, setKickoffDate] = useState<Date | null>(null);
  const [isKickoffPickerOpen, setIsKickoffPickerOpen] = useState(false);
  const [isHomePickerOpen, setIsHomePickerOpen] = useState(false);
  const [isAwayPickerOpen, setIsAwayPickerOpen] = useState(false);

  // Edit Match Result Accordion State
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<MatchStatus>('SCHEDULED');
  const [editHomeScore, setEditHomeScore] = useState('');
  const [editAwayScore, setEditAwayScore] = useState('');
  const [editWinnerTeamId, setEditWinnerTeamId] = useState<string | null>(null);
  const [editDecisionMethod, setEditDecisionMethod] = useState<MatchDecisionMethod>('FT');

  const [activeTab, setActiveTab] = useState<AdminTab>('matches');
  const [adminDialog, setAdminDialog] = useState<AdminDialogState | null>(null);
  const showAdminDialog = useCallback<ShowAdminDialog>((dialog) => {
    setAdminDialog(dialog);
  }, []);

  // Delete match confirmation. Uses an in-app Modal instead of Alert.alert
  // because Alert button callbacks do not fire reliably on react-native-web.
  const [deletingMatchId, setDeletingMatchId] = useState<string | null>(null);
  const [matchPendingDelete, setMatchPendingDelete] = useState<string | null>(null);
  const [deleteMatchError, setDeleteMatchError] = useState<string | null>(null);

  const handleDeleteMatch = useCallback((matchId: string) => {
    setDeleteMatchError(null);
    setMatchPendingDelete(matchId);
  }, []);

  const confirmDeleteMatch = useCallback(() => {
    const matchId = matchPendingDelete;
    if (!matchId) return;
    setDeleteMatchError(null);
    setDeletingMatchId(matchId);
    deleteMatchMutation.mutate(matchId, {
      onSuccess: () => {
        setDeletingMatchId(null);
        setMatchPendingDelete(null);
      },
      onError: (err: any) => {
        setDeletingMatchId(null);
        setDeleteMatchError(err?.message || 'Failed to delete match.');
      },
    });
  }, [matchPendingDelete, deleteMatchMutation]);

  if (!isAdmin) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-bgDeep px-6">
        <Icon name="ban" size={40} color={Theme.colors.live} />
        <Text className="text-xl font-bold text-textPrimary mt-4">Access Denied</Text>
        <Text className="text-sm text-textSecondary text-center mt-2">
          Only tournament administrators can access this dashboard.
        </Text>
        <Button label="Back to Home" onPress={() => router.replace('/(tabs)/home')} className="mt-6" />
      </SafeAreaView>
    );
  }

  const handleCreateQuestion = () => {
    if (!qText.trim()) {
      showAdminDialog({ title: 'Error', message: 'Question text is required.', variant: 'error' });
      return;
    }

    const pointsVal = parseInt(qPoints, 10);
    if (isNaN(pointsVal) || pointsVal <= 0) {
      showAdminDialog({ title: 'Error', message: 'Points must be a positive number.', variant: 'error' });
      return;
    }

    if (!qLockAt) {
      showAdminDialog({ title: 'Error', message: 'Please specify the deadline date and time.', variant: 'error' });
      return;
    }

    if (qLockAt.getTime() <= Date.now()) {
      showAdminDialog({ title: 'Error', message: 'Deadline must be in the future.', variant: 'error' });
      return;
    }

    createQuestionMutation.mutate(
      {
        questionText: qText.trim(),
        points: pointsVal,
        lockAtIso: qLockAt.toISOString(),
        cardImagePath: qCardImagePath,
      },
      {
        onSuccess: () => {
          setQText('');
          setQPoints('10');
          setQLockAt(null);
          setQCardImagePath(null);
          setQCardImagePreviewUri(null);
          showAdminDialog({ title: 'Success', message: 'Prediction question created!', variant: 'success' });
        },
        onError: (err: any) => {
          showAdminDialog({ title: 'Error', message: err.message || 'Failed to create question.', variant: 'error' });
        },
      }
    );
  };

  const handleResolveQuestion = (questionId: string, option: string) => {
    showAdminDialog({
      title: 'Resolve Question',
      message: `Are you sure "${option}" is the correct answer? This will award points and refresh the leaderboard.`,
      variant: 'warning',
      actions: [
        { label: 'Cancel', variant: 'secondary' },
        {
          label: 'Confirm',
          variant: 'primary',
          onPress: () => {
            resolveQuestionMutation.mutate(
              { questionId, correctAnswer: option },
              {
                onSuccess: () => {
                  showAdminDialog({
                    title: 'Success',
                    message: 'Question resolved and points awarded!',
                    variant: 'success',
                  });
                },
                onError: (err: any) => {
                  showAdminDialog({
                    title: 'Error',
                    message: err.message || 'Failed to resolve question.',
                    variant: 'error',
                  });
                },
              }
            );
          },
        },
      ],
    });
  };

  const handleToggleStatus = (questionId: string, currentStatus: 'open' | 'closed') => {
    const nextStatus = currentStatus === 'open' ? 'closed' : 'open';
    const actionLabel = nextStatus === 'closed' ? 'Lock Answers' : 'Unlock Answers';

    showAdminDialog({
      title: `${actionLabel}?`,
      message: `Are you sure you want to ${nextStatus === 'closed' ? 'lock' : 'unlock'} predictions for this question?`,
      variant: 'warning',
      actions: [
        { label: 'Cancel', variant: 'secondary' },
        {
          label: 'Confirm',
          variant: 'primary',
          onPress: () => {
            updateQuestionStatusMutation.mutate(
              { questionId, status: nextStatus },
              {
                onError: (err: any) => {
                  showAdminDialog({
                    title: 'Error',
                    message: err.message || 'Failed to update status.',
                    variant: 'error',
                  });
                },
              }
            );
          },
        },
      ],
    });
  };

  const handlePickQuestionCardImage = async (mode: 'create' | 'edit') => {
    if (Platform.OS !== 'web') {
      const hasPermission = await ensureImageLibraryPermission('We need storage permission to pick a card image.');
      if (!hasPermission) return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [20, 29],
      quality: 0.75,
    });

    const asset = result.assets?.[0];
    if (result.canceled || !asset?.uri) return;
    const localUri = asset.uri;

    if (mode === 'create') {
      setQCardImagePreviewUri(localUri);
    } else {
      setEditQCardImagePreviewUri(localUri);
    }

    uploadQuestionCardImageMutation.mutate({
      localUri,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      webFile: asset.file ?? null,
    }, {
      onSuccess: (path) => {
        if (mode === 'create') {
          setQCardImagePath(path);
        } else {
          setEditQCardImagePath(path);
        }
      },
      onError: (err: any) => {
        showAdminDialog({
          title: 'Upload Failed',
          message: err.message || 'Could not upload the card image.',
          variant: 'error',
        });
        if (mode === 'create') {
          setQCardImagePreviewUri(null);
        } else {
          setEditQCardImagePreviewUri(null);
        }
      },
    });
  };

  const handleStartEditQuestion = (q: PredictionQuestion) => {
    setEditingQuestionId(q.id);
    setEditQText(q.question_text);
    setEditQPoints(String(q.points));
    setEditQLockAt(q.lock_at ? new Date(q.lock_at) : null);
    setEditQCardImagePath(q.card_image_path ?? null);
    setEditQCardImagePreviewUri(q.card_image_url ?? null);
  };

  const handleSaveEditQuestion = (questionId: string) => {
    if (!editQText.trim()) {
      showAdminDialog({ title: 'Error', message: 'Question text is required.', variant: 'error' });
      return;
    }
    const pointsVal = parseInt(editQPoints, 10);
    if (isNaN(pointsVal) || pointsVal <= 0) {
      showAdminDialog({ title: 'Error', message: 'Points must be a positive number.', variant: 'error' });
      return;
    }
    if (!editQLockAt) {
      showAdminDialog({ title: 'Error', message: 'Please specify the deadline date and time.', variant: 'error' });
      return;
    }

    updateQuestionMutation.mutate(
      {
        questionId,
        questionText: editQText.trim(),
        points: pointsVal,
        lockAtIso: editQLockAt.toISOString(),
        cardImagePath: editQCardImagePath,
      },
      {
        onSuccess: () => {
          setEditingQuestionId(null);
          showAdminDialog({ title: 'Success', message: 'Question updated!', variant: 'success' });
        },
        onError: (err: any) => {
          showAdminDialog({ title: 'Error', message: err.message || 'Failed to update question.', variant: 'error' });
        },
      }
    );
  };

  // Delete uses an in-app confirmation Modal (Alert.alert buttons don't work on
  // react-native-web, so the confirm dialog never appeared there).
  const cancelDelete = () => {
    setDeletingQuestionId(null);
    setDeleteError(null);
  };

  const confirmDelete = () => {
    if (!deletingQuestionId) return;
    const questionId = deletingQuestionId;
    setDeleteError(null);
    deleteQuestionMutation.mutate(
      { questionId },
      {
        onSuccess: () => {
          if (editingQuestionId === questionId) setEditingQuestionId(null);
          setDeletingQuestionId(null);
        },
        onError: (err: any) => {
          setDeleteError(err.message || 'Failed to delete question.');
        },
      }
    );
  };

  const handleMultiplierChange = (matchId: string, currentMult: number, targetMult: number) => {
    if (currentMult === targetMult) return;
    setMultiplierMutation.mutate({ matchId, multiplier: targetMult });
  };

  const handleCreateMatch = () => {
    if (!homeTeam || !awayTeam) {
      showAdminDialog({ title: 'Error', message: 'Please select both home and away teams.', variant: 'error' });
      return;
    }
    if (homeTeam.id === awayTeam.id) {
      showAdminDialog({ title: 'Error', message: 'Home and away teams cannot be the same.', variant: 'error' });
      return;
    }

    if (!kickoffDate) {
      showAdminDialog({ title: 'Error', message: 'Please select the kickoff date and time.', variant: 'error' });
      return;
    }

    createMatchMutation.mutate(
      {
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        stage,
        groupName: groupName.trim() || null,
        kickoffTime: kickoffDate.toISOString(),
        venue: venue.trim() || null,
      },
      {
        onSuccess: () => {
          setHomeTeam(null);
          setAwayTeam(null);
          setStage('GROUP');
          setGroupName('');
          setVenue('');
          setKickoffDate(null);
          showAdminDialog({ title: 'Success', message: 'Custom match created!', variant: 'success' });
          setActiveTab('matches');
        },
        onError: (err: any) => {
          showAdminDialog({ title: 'Error', message: err.message || 'Failed to create match.', variant: 'error' });
        },
      }
    );
  };

  const handleSaveResult = (match: Match) => {
    let homeScoreNum: number | null = null;
    let awayScoreNum: number | null = null;

    if (editHomeScore.trim() !== '') {
      homeScoreNum = parseInt(editHomeScore, 10);
      if (isNaN(homeScoreNum) || homeScoreNum < 0) {
        showAdminDialog({ title: 'Error', message: 'Home score must be a positive number.', variant: 'error' });
        return;
      }
    }
    
    if (editAwayScore.trim() !== '') {
      awayScoreNum = parseInt(editAwayScore, 10);
      if (isNaN(awayScoreNum) || awayScoreNum < 0) {
        showAdminDialog({ title: 'Error', message: 'Away score must be a positive number.', variant: 'error' });
        return;
      }
    }

    if (editStatus === 'FINISHED' && (homeScoreNum === null || awayScoreNum === null)) {
      showAdminDialog({ title: 'Error', message: 'Scores are required to finish the match.', variant: 'error' });
      return;
    }

    if (editStatus === 'FINISHED' && match.is_knockout && !editWinnerTeamId) {
      showAdminDialog({
        title: 'Error',
        message: 'Knockout matches cannot end in a draw. Please select the team that qualifies.',
        variant: 'error',
      });
      return;
    }

    updateResultMutation.mutate(
      {
        matchId: match.id,
        status: editStatus,
        homeScore: homeScoreNum,
        awayScore: awayScoreNum,
        winnerTeamId: match.is_knockout && editStatus === 'FINISHED' ? editWinnerTeamId : null,
        decisionMethod: match.is_knockout && editStatus === 'FINISHED' ? editDecisionMethod : null,
      },
      {
        onSuccess: () => {
          setEditingMatchId(null);
          showAdminDialog({
            title: 'Success',
            message: 'Match updated and points calculated successfully!',
            variant: 'success',
          });
        },
        onError: (err: any) => {
          showAdminDialog({ title: 'Error', message: err.message || 'Failed to update match.', variant: 'error' });
        },
      }
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-bgDeep" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="px-4 py-3 flex-row items-center justify-between border-b border-bgBorder">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/home');
              }
            }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="w-9 h-9 rounded-full bg-accent items-center justify-center active:opacity-80"
          >
            <Icon name="back" size={20} color={Theme.colors.accentDark} fixed />
          </Pressable>
          <Text className="text-xl font-bold text-textPrimary">Admin Control Panel</Text>
        </View>
        <View className="bg-liveDim px-2 py-0.5 rounded">
          <Text className="text-[10px] font-bold text-live uppercase">Live DB</Text>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="border-b border-bgBorder"
        contentContainerStyle={styles.adminTabsContent}
      >
        {ADMIN_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              style={[
                styles.adminTabChip,
                { width: tab.width },
                isActive ? styles.adminTabChipActive : styles.adminTabChipInactive,
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.adminTabLabel,
                  isActive ? styles.adminTabLabelActive : styles.adminTabLabelInactive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.adminScrollContent,
          {
            maxWidth: isTablet ? Math.min(containerMaxWidth, 1080) : undefined,
            paddingHorizontal: isSmall ? 12 : 16,
          },
        ]}
      >
        {/* Matches Multiplier Tab */}
        {activeTab === 'matches' && (
          <View className="gap-4">
            <Text className="text-sm text-textSecondary">
              Set a points multiplier (1x-6x) for specific matches. Changes apply immediately to new/unsynced points calculations. Use the "Scoring" tab to set defaults per stage.
            </Text>

            {/* Search Bar */}
            <View className="relative">
              <TextInput
                value={searchQuery}
                onChangeText={(t) => {
                  setSearchQuery(t);
                  setMatchesPage(0);
                }}
                placeholder="Search team (e.g. Argentina, BRA)..."
                placeholderTextColor={Theme.colors.textTertiary}
                className="h-11 rounded-lg border border-bgBorder bg-bgSurface2 px-3 pr-10 text-sm text-textPrimary"
              />
              {searchQuery.length > 0 && (
                <Pressable
                  onPress={() => {
                    setSearchQuery('');
                    setMatchesPage(0);
                  }}
                  className="absolute right-3 top-3"
                >
                  <Text className="text-textSecondary text-sm font-bold">✕</Text>
                </Pressable>
              )}
            </View>

            {matchesQuery.isLoading ? (
              <LoadingSpinner label="Loading matches..." />
            ) : (
              <View className="gap-3">
                {(() => {
                  const filtered = matchesQuery.data?.filter((match) => {
                    if (!searchQuery.trim()) return true;
                    const q = searchQuery.toLowerCase();
                    const homeName = match.home_team.name.toLowerCase();
                    const awayName = match.away_team.name.toLowerCase();
                    const homeShort = match.home_team.short_name?.toLowerCase() || '';
                    const awayShort = match.away_team.short_name?.toLowerCase() || '';
                    const homeCode = match.home_team.code?.toLowerCase() || '';
                    const awayCode = match.away_team.code?.toLowerCase() || '';

                    return (
                      homeName.includes(q) ||
                      awayName.includes(q) ||
                      homeShort.includes(q) ||
                      awayShort.includes(q) ||
                      homeCode.includes(q) ||
                      awayCode.includes(q)
                    );
                  });

                  if (!filtered || filtered.length === 0) {
                    return (
                      <Text className="text-sm text-textTertiary text-center py-4">
                        No matches found matching "{searchQuery}"
                      </Text>
                    );
                  }

                  const totalPages = Math.ceil(filtered.length / MATCHES_PER_PAGE);
                  const page = Math.min(matchesPage, totalPages - 1);
                  const pageStart = page * MATCHES_PER_PAGE;
                  const pageItems = filtered.slice(pageStart, pageStart + MATCHES_PER_PAGE);

                  return (
                    <>
                      {pageItems.map((match) => {
                    const currentMult = match.points_multiplier || 1;
                    const isMutating =
                      setMultiplierMutation.isPending &&
                      setMultiplierMutation.variables?.matchId === match.id;
                    const needsManualQualifier =
                      match.is_knockout &&
                      match.status === 'FINISHED' &&
                      !match.winner_team_id;

                    return (
                      <Card key={match.id} className="p-4 border border-bgBorder bg-bgSurface2 gap-3">
                        <View className="flex-row justify-between items-center">
                          <Text className="text-[11px] text-textSecondary font-semibold">
                            {formatKickoff(match.kickoff_time)}
                          </Text>
                          <View className="flex-row items-center gap-2">
                            {deletingMatchId === match.id ? (
                              <ActivityIndicator size="small" color={Theme.colors.live} />
                            ) : (
                              <Pressable
                                onPress={() => handleDeleteMatch(match.id)}
                                className="p-1.5 rounded-full bg-liveDim active:opacity-70"
                              >
                                <Icon name="trash" size={13} color={Theme.colors.live} />
                              </Pressable>
                            )}
                            <View className="bg-bgSurface1 px-1.5 py-0.5 rounded border border-bgBorder">
                              <Text className="text-[9px] text-textSecondary font-bold uppercase">{match.status}</Text>
                            </View>
                            <Text className="text-xs font-bold text-accent uppercase tracking-wider">
                              {STAGE_LABELS[match.stage]}
                            </Text>
                          </View>
                        </View>

                        <View className="flex-row items-center justify-between">
                          <View className="flex-1 mr-4 gap-0.5">
                            <View className="flex-row items-center gap-2">
                              <View className="w-1.5 h-1.5 rounded-full bg-accent" />
                              <Text className="text-sm font-bold text-textPrimary" numberOfLines={1}>
                                {match.home_team.name}
                              </Text>
                              {match.home_score !== null && (
                                <Text className="text-base font-extrabold text-accent">{match.home_score}</Text>
                              )}
                            </View>
                            <View className="flex-row items-center gap-2">
                              <View className="w-1.5 h-1.5 rounded-full bg-live" />
                              <Text className="text-sm font-bold text-textPrimary" numberOfLines={1}>
                                {match.away_team.name}
                              </Text>
                              {match.away_score !== null && (
                                <Text className="text-base font-extrabold text-accent">{match.away_score}</Text>
                              )}
                            </View>
                            {match.is_knockout && match.winner_team_id && (
                              <Text className="text-[10px] text-accent font-bold mt-1">
                                Qualifier: {match.winner_team_id === match.home_team.id ? match.home_team.name : match.away_team.name}
                                {match.decision_method ? ` (${match.decision_method})` : ''}
                              </Text>
                            )}
                            {needsManualQualifier && (
                              <View className="mt-2 rounded-lg border border-live/30 bg-liveDim px-2 py-1.5">
                                <Text className="text-[10px] font-bold text-live">
                                  Needs manual qualifier before points can be finalized.
                                </Text>
                              </View>
                            )}
                          </View>
                          {isMutating ? (
                            <ActivityIndicator size="small" color={Theme.colors.accent} />
                          ) : (
                            <View className="flex-row flex-wrap gap-1 justify-end max-w-[180px]">
                              {[1, 2, 3, 4, 5, 6].map((mult) => (
                                <Pressable
                                  key={mult}
                                  onPress={() => handleMultiplierChange(match.id, currentMult, mult)}
                                  className={`px-2.5 py-1 rounded-md border ${
                                    currentMult === mult
                                      ? 'bg-accentDim border-accent'
                                      : 'bg-bgSurface1 border-bgBorder'
                                  }`}
                                >
                                  <Text
                                    className={`text-xs font-bold ${
                                      currentMult === mult ? 'text-accent' : 'text-textSecondary'
                                    }`}
                                  >
                                    {mult}x
                                  </Text>
                                </Pressable>
                              ))}
                            </View>
                          )}
                        </View>

                        {/* Accordion form for editing score and status */}
                        {editingMatchId === match.id ? (
                          <View className="mt-3 bg-bgSurface1 rounded-xl p-3 border border-bgBorder gap-3">
                            <Text className="text-xs font-bold text-textSecondary uppercase">
                              Update Score & Status
                            </Text>
                            
                            {/* Status Picker */}
                            <View className="gap-1.5">
                              <Text className="text-xs text-textTertiary uppercase font-semibold">Status</Text>
                              <View className="flex-row flex-wrap gap-1.5">
                                {([
                                  'SCHEDULED',
                                  'TIMED',
                                  'IN_PLAY',
                                  'PAUSED',
                                  'EXTRA_TIME',
                                  'PENALTY_SHOOTOUT',
                                  'FINISHED',
                                  'POSTPONED',
                                  'CANCELLED',
                                  'SUSPENDED',
                                ] as MatchStatus[]).map((statusVal) => (
                                  <Pressable
                                    key={statusVal}
                                    onPress={() => setEditStatus(statusVal)}
                                    className={`px-2.5 py-1 rounded border ${
                                      editStatus === statusVal
                                        ? 'bg-accentDim border-accent'
                                        : 'bg-bgSurface2 border-bgBorder'
                                    }`}
                                  >
                                    <Text className={`text-[10px] font-bold ${editStatus === statusVal ? 'text-accent' : 'text-textSecondary'}`}>
                                      {statusVal}
                                    </Text>
                                  </Pressable>
                                ))}
                              </View>
                            </View>

                            {/* Scores */}
                            <View className="flex-row gap-4 mt-1">
                              <View className="flex-1 gap-1.5">
                                <Text className="text-xs text-textTertiary uppercase font-semibold">{match.home_team.name} Score</Text>
                                <TextInput
                                  value={editHomeScore}
                                  onChangeText={setEditHomeScore}
                                  keyboardType="numeric"
                                  placeholder="0"
                                  placeholderTextColor={Theme.colors.textTertiary}
                                  className="h-10 rounded-lg border border-bgBorder bg-bgSurface2 px-3 text-sm text-textPrimary"
                                />
                              </View>
                              <View className="flex-1 gap-1.5">
                                <Text className="text-xs text-textTertiary uppercase font-semibold">{match.away_team.name} Score</Text>
                                <TextInput
                                  value={editAwayScore}
                                  onChangeText={setEditAwayScore}
                                  keyboardType="numeric"
                                  placeholder="0"
                                  placeholderTextColor={Theme.colors.textTertiary}
                                  className="h-10 rounded-lg border border-bgBorder bg-bgSurface2 px-3 text-sm text-textPrimary"
                                />
                              </View>
                            </View>

                            {match.is_knockout && editStatus === 'FINISHED' && (
                              <View className="gap-3">
                                <View className="gap-1.5">
                                  <Text className="text-xs text-textTertiary uppercase font-semibold">
                                    Qualifying Team
                                  </Text>
                                  <View className="flex-row gap-2">
                                    {[match.home_team, match.away_team].map((team) => (
                                      <Pressable
                                        key={team.id || team.name}
                                        onPress={() => setEditWinnerTeamId(team.id)}
                                        className={`flex-1 px-2.5 py-2 rounded border ${
                                          editWinnerTeamId === team.id
                                            ? 'bg-accentDim border-accent'
                                            : 'bg-bgSurface2 border-bgBorder'
                                        }`}
                                      >
                                        <Text
                                          className={`text-[10px] font-bold text-center ${
                                            editWinnerTeamId === team.id ? 'text-accent' : 'text-textSecondary'
                                          }`}
                                          numberOfLines={1}
                                        >
                                          {team.name}
                                        </Text>
                                      </Pressable>
                                    ))}
                                  </View>
                                </View>

                                <View className="gap-1.5">
                                  <Text className="text-xs text-textTertiary uppercase font-semibold">
                                    Decision Method
                                  </Text>
                                  <View className="flex-row gap-1.5">
                                    {(['FT', 'ET', 'PEN'] as MatchDecisionMethod[]).map((method) => (
                                      <Pressable
                                        key={method}
                                        onPress={() => setEditDecisionMethod(method)}
                                        className={`px-3 py-1.5 rounded border ${
                                          editDecisionMethod === method
                                            ? 'bg-accentDim border-accent'
                                            : 'bg-bgSurface2 border-bgBorder'
                                        }`}
                                      >
                                        <Text className={`text-[10px] font-bold ${editDecisionMethod === method ? 'text-accent' : 'text-textSecondary'}`}>
                                          {method}
                                        </Text>
                                      </Pressable>
                                    ))}
                                  </View>
                                </View>
                              </View>
                            )}

                            {editStatus === 'FINISHED' && (
                              <View className="bg-liveDim/20 border border-live/30 p-2 rounded-lg">
                                <Text className="text-[10px] font-semibold text-live leading-relaxed">
                                  <Icon name="warning" size={11} color={Theme.colors.live} /> Warning: Setting status to FINISHED will calculate user prediction points. Make sure scores are correct.
                                </Text>
                              </View>
                            )}

                            <View className="flex-row gap-2 mt-1 justify-end">
                              <Pressable
                                onPress={() => setEditingMatchId(null)}
                                className="px-3 py-2 rounded-lg bg-bgSurface2 border border-bgBorder active:opacity-75"
                              >
                                <Text className="text-xs font-bold text-textSecondary">Cancel</Text>
                              </Pressable>
                              <Pressable
                                onPress={() => handleSaveResult(match)}
                                disabled={updateResultMutation.isPending}
                                className="px-3 py-2 rounded-lg bg-accent active:opacity-75"
                              >
                                {updateResultMutation.isPending ? (
                                  <ActivityIndicator size="small" color={Theme.colors.accentDark} />
                                ) : (
                                  <Text className="text-xs font-bold text-accentDark">Save Result</Text>
                                )}
                              </Pressable>
                            </View>
                          </View>
                        ) : (
                          <Pressable
                            onPress={() => {
                              setEditingMatchId(match.id);
                              setEditStatus(match.status);
                              setEditHomeScore(match.home_score !== null ? String(match.home_score) : '');
                              setEditAwayScore(match.away_score !== null ? String(match.away_score) : '');
                              setEditWinnerTeamId(match.winner_team_id);
                              setEditDecisionMethod(match.decision_method ?? 'FT');
                            }}
                            className="mt-2 border-t border-bgBorder/50 pt-2 flex-row items-center justify-between"
                          >
                            <Text className="text-xs text-accent font-bold"><Icon name="tools" size={12} color={Theme.colors.accent} /> Edit Score & Status</Text>
                          </Pressable>
                        )}
                      </Card>
                    );
                  })}

                      {/* Pagination controls */}
                      {totalPages > 1 && (
                        <View className="flex-row items-center justify-between pt-2 mt-1">
                          <Pressable
                            disabled={page <= 0}
                            onPress={() => goToMatchesPage(page - 1)}
                            accessibilityRole="button"
                            accessibilityLabel="Previous page"
                            className={`min-h-11 min-w-11 rounded-full bg-accent items-center justify-center ${
                              page <= 0 ? 'opacity-30' : 'active:opacity-80'
                            }`}
                          >
                            <Icon name="back" size={20} color={Theme.colors.accentDark} fixed />
                          </Pressable>

                          <Text className="text-xs font-bold text-textSecondary">
                            Page {page + 1} of {totalPages}
                            <Text className="text-textTertiary font-normal"> · {filtered.length} matches</Text>
                          </Text>

                          <Pressable
                            disabled={page >= totalPages - 1}
                            onPress={() => goToMatchesPage(page + 1)}
                            accessibilityRole="button"
                            accessibilityLabel="Next page"
                            className={`min-h-11 min-w-11 rounded-full bg-accent items-center justify-center ${
                              page >= totalPages - 1 ? 'opacity-30' : 'active:opacity-80'
                            }`}
                          >
                            <Icon name="forward" size={20} color={Theme.colors.accentDark} fixed />
                          </Pressable>
                        </View>
                      )}
                    </>
                  );
                })()}
              </View>
            )}
          </View>
        )}
        {/* Add Match Tab */}
        {activeTab === 'add_match' && (
          <View className="gap-4">
            <Text className="text-sm text-textSecondary">
              Create a custom match manually. Select teams, stage, kickoff time, and venue.
            </Text>

            <Card className="p-4 border border-bgBorder bg-bgSurface2 gap-4">
              <Text className="text-base font-bold text-textPrimary">New Match</Text>

              {/* Home Team */}
              <View className="gap-1.5">
                <Text className="text-xs font-semibold text-textSecondary uppercase">Home Team</Text>
                <Pressable
                  onPress={() => setIsHomePickerOpen(true)}
                  className="h-11 rounded-lg border border-bgBorder bg-bgSurface1 px-3 flex-row items-center justify-between"
                >
                  {homeTeam ? (
                    <View className="flex-row items-center gap-2">
                      <TeamFlag team={homeTeam} size={20} fixed />
                      <Text className="text-sm font-bold text-textPrimary">{homeTeam.name}</Text>
                    </View>
                  ) : (
                    <Text className="text-sm text-textTertiary">Select home team…</Text>
                  )}
                  <Text className="text-textTertiary text-xs">▼</Text>
                </Pressable>
              </View>

              {/* Away Team */}
              <View className="gap-1.5">
                <Text className="text-xs font-semibold text-textSecondary uppercase">Away Team</Text>
                <Pressable
                  onPress={() => setIsAwayPickerOpen(true)}
                  className="h-11 rounded-lg border border-bgBorder bg-bgSurface1 px-3 flex-row items-center justify-between"
                >
                  {awayTeam ? (
                    <View className="flex-row items-center gap-2">
                      <TeamFlag team={awayTeam} size={20} fixed />
                      <Text className="text-sm font-bold text-textPrimary">{awayTeam.name}</Text>
                    </View>
                  ) : (
                    <Text className="text-sm text-textTertiary">Select away team…</Text>
                  )}
                  <Text className="text-textTertiary text-xs">▼</Text>
                </Pressable>
              </View>

              {/* Stage */}
              <View className="gap-1.5">
                <Text className="text-xs font-semibold text-textSecondary uppercase">Stage</Text>
                <View className="flex-row flex-wrap gap-1.5">
                  {STAGE_ORDER.map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => setStage(s)}
                      className={`px-2.5 py-1.5 rounded-lg border ${
                        stage === s ? 'bg-accentDim border-accent' : 'bg-bgSurface1 border-bgBorder'
                      }`}
                    >
                      <Text className={`text-[10px] font-bold ${stage === s ? 'text-accent' : 'text-textSecondary'}`}>
                        {STAGE_LABELS[s]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Group Name (optional) */}
              <View className="gap-1.5">
                <Text className="text-xs font-semibold text-textSecondary uppercase">Group Name (optional)</Text>
                <TextInput
                  value={groupName}
                  onChangeText={setGroupName}
                  placeholder="e.g. A, B, C…"
                  placeholderTextColor={Theme.colors.textTertiary}
                  className="h-11 rounded-lg border border-bgBorder bg-bgSurface1 px-3 text-sm text-textPrimary"
                />
              </View>

              {/* Venue (optional) */}
              <View className="gap-1.5">
                <Text className="text-xs font-semibold text-textSecondary uppercase">Venue (optional)</Text>
                <TextInput
                  value={venue}
                  onChangeText={setVenue}
                  placeholder="e.g. Lusail Stadium"
                  placeholderTextColor={Theme.colors.textTertiary}
                  className="h-11 rounded-lg border border-bgBorder bg-bgSurface1 px-3 text-sm text-textPrimary"
                />
              </View>

              {/* Kickoff Date & Time */}
              <View className="gap-1.5">
                <Text className="text-xs font-semibold text-textSecondary uppercase">Kickoff Date & Time</Text>
                <Pressable
                  onPress={() => setIsKickoffPickerOpen(true)}
                  className="h-11 rounded-lg border border-bgBorder bg-bgSurface1 px-3 flex-row items-center justify-between"
                >
                  <Text className={`text-sm ${kickoffDate ? 'text-textPrimary font-bold' : 'text-textTertiary'}`}>
                    {kickoffDate ? formatKickoff(kickoffDate.toISOString()) : 'Select kickoff date & time…'}
                  </Text>
                  <Icon name="calendar" size={12} color={Theme.colors.textTertiary} />
                </Pressable>
              </View>

              <Button
                label="Create Match"
                onPress={handleCreateMatch}
                loading={createMatchMutation.isPending}
              />
            </Card>
          </View>
        )}

        {/* Prediction Questions Tab */}
        {activeTab === 'questions' && (
          <View className="gap-6">
            {/* Create Question Form */}
            <Card className="p-4 border border-bgBorder bg-bgSurface2 gap-4">
              <Text className="text-base font-bold text-textPrimary">Create Prediction Question</Text>

              <View className="gap-1.5">
                <Text className="text-xs font-semibold text-textSecondary uppercase">Question Text</Text>
                <TextInput
                  value={qText}
                  onChangeText={setQText}
                  placeholder="e.g. Who will win the Golden Boot?"
                  placeholderTextColor={Theme.colors.textTertiary}
                  className="h-11 rounded-lg border border-bgBorder bg-bgSurface1 px-3 text-sm text-textPrimary"
                />
              </View>

              <View className="gap-1.5">
                <Text className="text-xs font-semibold text-textSecondary uppercase">Points Reward</Text>
                <TextInput
                  value={qPoints}
                  onChangeText={setQPoints}
                  keyboardType="numeric"
                  placeholder="10"
                  placeholderTextColor={Theme.colors.textTertiary}
                  className="h-11 rounded-lg border border-bgBorder bg-bgSurface1 px-3 text-sm text-textPrimary"
                />
              </View>

              <View className="gap-1.5">
                <Text className="text-xs font-semibold text-textSecondary uppercase">Deadline (Date & Time)</Text>
                <Pressable
                  onPress={() => setIsQLockPickerOpen(true)}
                  className="h-11 rounded-lg border border-bgBorder bg-bgSurface1 px-3 flex-row items-center justify-between"
                >
                  <Text className={`text-sm ${qLockAt ? 'text-textPrimary font-bold' : 'text-textTertiary'}`}>
                    {qLockAt ? formatKickoff(qLockAt.toISOString()) : 'Select deadline date & time…'}
                  </Text>
                  <Icon name="calendar" size={12} color={Theme.colors.textTertiary} />
                </Pressable>
              </View>

              <View className="gap-1.5">
                <Text className="text-xs font-semibold text-textSecondary uppercase">Card Image (optional)</Text>
                <Pressable
                  onPress={() => handlePickQuestionCardImage('create')}
                  className="h-40 rounded-xl border border-dashed border-bgBorder bg-bgSurface1 items-center justify-center overflow-hidden active:opacity-85"
                >
                  {uploadQuestionCardImageMutation.isPending && qCardImagePreviewUri ? (
                    <View className="absolute inset-0 items-center justify-center bg-black/50 z-10">
                      <ActivityIndicator size="small" color={Theme.colors.accent} />
                    </View>
                  ) : null}
                  {qCardImagePreviewUri ? (
                    <Image
                      source={{ uri: qCardImagePreviewUri }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="items-center gap-1 px-4">
                      <Icon name="add" size={20} color={Theme.colors.textTertiary} />
                      <Text className="text-xs font-semibold text-textSecondary text-center">
                        Tap to upload a card image
                      </Text>
                      <Text className="text-[10px] text-textTertiary text-center">
                        Recommended 720 x 1044 px. If empty, the default card design stays.
                      </Text>
                    </View>
                  )}
                </Pressable>
                {qCardImagePath ? (
                  <Pressable
                    onPress={() => {
                      setQCardImagePath(null);
                      setQCardImagePreviewUri(null);
                    }}
                    className="self-start rounded-lg border border-live/30 bg-liveDim px-3 py-2 active:opacity-80"
                  >
                    <Text className="text-[10px] font-bold uppercase text-live">Remove Image</Text>
                  </Pressable>
                ) : null}
              </View>

              <Button
                label={uploadQuestionCardImageMutation.isPending ? 'Uploading Image...' : 'Publish Question'}
                onPress={handleCreateQuestion}
                loading={createQuestionMutation.isPending}
                disabled={uploadQuestionCardImageMutation.isPending}
              />
            </Card>

            {/* List & Resolve Questions */}
            <View className="gap-3">
              <Text className="text-base font-bold text-textPrimary">Active Questions</Text>

              {questionsQuery.isLoading ? (
                <LoadingSpinner label="Loading questions..." />
              ) : questionsQuery.data?.length === 0 ? (
                <Text className="text-sm text-textTertiary text-center py-4">
                  No prediction questions created yet.
                </Text>
              ) : (
                <View className="gap-3">
                  {questionsQuery.data?.map((q) => {
                    const isResolved = q.status === 'resolved';
                    const isTimeUp = new Date(q.lock_at || '') <= new Date();
                    const needsResolution = isTimeUp && q.status !== 'resolved';

                    return (
                      <Card key={q.id} className="p-4 border border-bgBorder bg-bgSurface2 gap-3">
                        <View className="flex-row items-center justify-between">
                          <Text className="text-xs text-textSecondary font-semibold uppercase">
                            <Icon name="trophy" size={12} color={Theme.colors.textSecondary} /> {q.points} Points
                          </Text>
                          <View className="flex-row items-center gap-2">
                            {needsResolution && (
                              <View className="rounded bg-liveDim px-1.5 py-0.5 border border-live/30">
                                <Text className="text-[9px] text-live font-bold uppercase"><Icon name="warning" size={9} color={Theme.colors.live} /> Expired</Text>
                              </View>
                            )}
                            {q.status !== 'resolved' && (
                              <Pressable
                                onPress={() => handleToggleStatus(q.id, q.status as 'open' | 'closed')}
                                disabled={updateQuestionStatusMutation.isPending}
                                className={`rounded-md px-2 py-1 border ${
                                  q.status === 'closed' || isTimeUp
                                    ? 'bg-liveDim border-live/30'
                                    : 'bg-bgSurface1 border-bgBorder'
                                }`}
                              >
                                <Text className={`text-[10px] font-bold ${
                                  q.status === 'closed' || isTimeUp ? 'text-live' : 'text-textSecondary'
                                }`}>
                                  {q.status === 'closed' || isTimeUp ? (
                                    <><Icon name="unlock" size={10} color={Theme.colors.live} /> Unlock</>
                                  ) : (
                                    <><Icon name="lock" size={10} color={Theme.colors.textSecondary} /> Lock</>
                                  )}
                                </Text>
                              </Pressable>
                            )}
                            <View
                              className={`rounded px-1.5 py-0.5 ${
                                isResolved
                                  ? 'bg-successDim'
                                  : q.status === 'closed' || isTimeUp
                                  ? 'bg-liveDim'
                                  : 'bg-accentDim'
                              }`}
                            >
                              <Text
                                className={`text-[9px] font-bold uppercase ${
                                  isResolved
                                    ? 'text-success'
                                    : q.status === 'closed' || isTimeUp
                                    ? 'text-live'
                                    : 'text-accent'
                                }`}
                              >
                                {isResolved ? 'resolved' : q.status === 'closed' || isTimeUp ? 'locked' : q.status}
                              </Text>
                            </View>
                          </View>
                        </View>

                        <View className="flex-row gap-3">
                          {q.card_image_url ? (
                            <Image
                              source={{ uri: q.card_image_url }}
                              style={{ width: 54, height: 78, borderRadius: 10, backgroundColor: Theme.colors.bgSurface1 }}
                              resizeMode="cover"
                            />
                          ) : null}
                          <View className="flex-1 gap-1">
                            <Text className="text-base font-bold text-textPrimary">{q.question_text}</Text>

                            <Text className="text-xs text-textSecondary">
                              Deadline: <Text className="text-textPrimary font-semibold">{formatKickoff(q.lock_at || '')}</Text>
                            </Text>
                            {q.card_image_url ? (
                              <Text className="text-[10px] font-semibold uppercase tracking-wide text-accent">Custom card image</Text>
                            ) : null}
                          </View>
                        </View>

                        {/* Admin Edit / Delete actions */}
                        <View className="flex-row gap-2">
                          <Pressable
                            onPress={() =>
                              editingQuestionId === q.id
                                ? setEditingQuestionId(null)
                                : handleStartEditQuestion(q)
                            }
                            className="flex-1 items-center justify-center rounded-lg border border-bgBorder bg-bgSurface1 py-2 active:opacity-80"
                          >
                            <Text className="text-xs font-bold text-accent">
                              {editingQuestionId === q.id ? (
                                '✕ Close Edit'
                              ) : (
                                <><Icon name="edit" size={12} color={Theme.colors.accent} /> Edit</>
                              )}
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() => {
                              setDeleteError(null);
                              setDeletingQuestionId(q.id);
                            }}
                            disabled={deleteQuestionMutation.isPending}
                            className="flex-1 items-center justify-center rounded-lg border border-live/30 bg-liveDim py-2 active:opacity-80"
                          >
                            <Text className="text-xs font-bold text-live"><Icon name="trash" size={12} color={Theme.colors.live} /> Delete</Text>
                          </Pressable>
                        </View>

                        {/* Inline Edit Form */}
                        {editingQuestionId === q.id && (
                          <View className="bg-bgSurface1 rounded-xl p-3 border border-bgBorder gap-3">
                            <Text className="text-xs font-bold text-textSecondary uppercase">
                              Edit Question
                            </Text>

                            <View className="gap-1">
                              <Text className="text-[10px] text-textTertiary uppercase font-semibold">
                                Question Text
                              </Text>
                              <TextInput
                                value={editQText}
                                onChangeText={setEditQText}
                                placeholder="Question text"
                                placeholderTextColor={Theme.colors.textTertiary}
                                multiline
                                className="min-h-11 rounded-lg border border-bgBorder bg-bgSurface2 px-3 py-2 text-sm text-textPrimary"
                              />
                            </View>

                            <View className="gap-1">
                              <Text className="text-[10px] text-textTertiary uppercase font-semibold">
                                Points Reward
                              </Text>
                              <TextInput
                                value={editQPoints}
                                onChangeText={setEditQPoints}
                                keyboardType="numeric"
                                placeholder="10"
                                placeholderTextColor={Theme.colors.textTertiary}
                                className="h-11 rounded-lg border border-bgBorder bg-bgSurface2 px-3 text-sm text-textPrimary"
                              />
                            </View>

                            <View className="gap-1">
                              <Text className="text-[10px] text-textTertiary uppercase font-semibold">
                                Deadline (Date & Time)
                              </Text>
                              <Pressable
                                onPress={() => setIsEditQLockPickerOpen(true)}
                                className="h-11 rounded-lg border border-bgBorder bg-bgSurface2 px-3 flex-row items-center justify-between"
                              >
                                <Text className={`text-sm ${editQLockAt ? 'text-textPrimary font-bold' : 'text-textTertiary'}`}>
                                  {editQLockAt ? formatKickoff(editQLockAt.toISOString()) : 'Select deadline…'}
                                </Text>
                                <Icon name="calendar" size={12} color={Theme.colors.textTertiary} />
                              </Pressable>
                            </View>

                            <View className="gap-1">
                              <Text className="text-[10px] text-textTertiary uppercase font-semibold">
                                Card Image (optional)
                              </Text>
                              <Pressable
                                onPress={() => handlePickQuestionCardImage('edit')}
                                className="h-40 rounded-xl border border-dashed border-bgBorder bg-bgSurface2 items-center justify-center overflow-hidden active:opacity-85"
                              >
                                {uploadQuestionCardImageMutation.isPending && editQCardImagePreviewUri ? (
                                  <View className="absolute inset-0 items-center justify-center bg-black/50 z-10">
                                    <ActivityIndicator size="small" color={Theme.colors.accent} />
                                  </View>
                                ) : null}
                                {editQCardImagePreviewUri ? (
                                  <Image
                                    source={{ uri: editQCardImagePreviewUri }}
                                    style={{ width: '100%', height: '100%' }}
                                    resizeMode="cover"
                                  />
                                ) : (
                                  <View className="items-center gap-1 px-4">
                                    <Icon name="add" size={18} color={Theme.colors.textTertiary} />
                                    <Text className="text-xs font-semibold text-textSecondary text-center">
                                      Tap to upload a card image
                                    </Text>
                                    <Text className="text-[10px] text-textTertiary text-center">
                                      Leave empty to keep the default card design.
                                    </Text>
                                  </View>
                                )}
                              </Pressable>
                              {editQCardImagePath || editQCardImagePreviewUri ? (
                                <Pressable
                                  onPress={() => {
                                    setEditQCardImagePath(null);
                                    setEditQCardImagePreviewUri(null);
                                  }}
                                  className="self-start rounded-lg border border-live/30 bg-liveDim px-3 py-2 active:opacity-80"
                                >
                                  <Text className="text-[10px] font-bold uppercase text-live">Remove Image</Text>
                                </Pressable>
                              ) : null}
                            </View>

                            <View className="flex-row gap-2 justify-end">
                              <Pressable
                                onPress={() => setEditingQuestionId(null)}
                                className="px-3 py-2 rounded-lg bg-bgSurface2 border border-bgBorder active:opacity-75"
                              >
                                <Text className="text-xs font-bold text-textSecondary">Cancel</Text>
                              </Pressable>
                              <Pressable
                                onPress={() => handleSaveEditQuestion(q.id)}
                                disabled={updateQuestionMutation.isPending || uploadQuestionCardImageMutation.isPending}
                                className="px-3 py-2 rounded-lg bg-accent active:opacity-75"
                              >
                                {updateQuestionMutation.isPending || uploadQuestionCardImageMutation.isPending ? (
                                  <ActivityIndicator size="small" color={Theme.colors.accentDark} />
                                ) : (
                                  <Text className="text-xs font-bold text-accentDark">Save Changes</Text>
                                )}
                              </Pressable>
                            </View>
                          </View>
                        )}

                        {/* List Options */}
                        {q.options && q.options.length > 0 && (
                          <View className="gap-1.5 mt-1">
                            <Text className="text-xs font-bold text-textTertiary uppercase">
                              Select Correct Option to Resolve:
                            </Text>
                            <View className="flex-row flex-wrap gap-2">
                              {q.options.map((opt) => {
                                const isCorrect = q.correct_answer === opt;
                                let btnBg = 'bg-bgSurface1 border-bgBorder';
                                let textStyle = 'text-textSecondary';

                                if (isResolved) {
                                  if (isCorrect) {
                                    btnBg = 'bg-successDim border-success';
                                    textStyle = 'text-success font-semibold';
                                  } else {
                                    btnBg = 'bg-bgSurface1/40 border-bgBorder/40';
                                    textStyle = 'text-textTertiary';
                                  }
                                }

                                return (
                                  <Pressable
                                    key={opt}
                                    onPress={() => !isResolved && handleResolveQuestion(q.id, opt)}
                                    disabled={isResolved || resolveQuestionMutation.isPending}
                                    className={`rounded-full border px-3 py-1.5 ${btnBg}`}
                                  >
                                    <Text className={`text-xs ${textStyle}`}>{opt}</Text>
                                  </Pressable>
                                );
                              })}
                            </View>
                          </View>
                        )}

                        {isResolved && (
                          <View className="flex-row items-center justify-between border-t border-bgBorder pt-2 mt-1">
                            <Text className="text-xs text-textSecondary">
                              Resolved correct answer: <Text className="font-bold text-textPrimary">{q.correct_answer || 'Audited'}</Text>
                            </Text>
                          </View>
                        )}

                        {/* Audit Submissions Toggle Button */}
                        <Pressable
                          onPress={() => setExpandedAudits(prev => ({ ...prev, [q.id]: !prev[q.id] }))}
                          className="mt-3 flex-row items-center justify-between border-t border-bgBorder pt-3"
                        >
                          <Text className="text-xs font-bold text-accent">
                            {expandedAudits[q.id] ? '▼ Hide Auditing' : '▶ Audit User Submissions'}
                          </Text>
                        </Pressable>

                        {expandedAudits[q.id] && (
                          <SubmissionsAuditSection
                            questionId={q.id}
                            auditMutation={auditMutation}
                          />
                        )}
                      </Card>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Cards Tab */}
        {activeTab === 'cards' && <StageCardsSection onDialog={showAdminDialog} />}

        {/* Banners Tab */}
        {activeTab === 'hero_banner' && (
          <View className="gap-4">
            <View className="gap-1.5">
              <Text className="text-xs font-semibold text-textSecondary uppercase">Fixed Banner Preview</Text>
              <HeroBannerCarousel />
            </View>
            <Card className="border border-bgBorder bg-bgSurface2 p-4 gap-4">
              <FixedHeroBannerManager onDialog={showAdminDialog} />
            </Card>
            <BottomBannerCollectionsManager onDialog={showAdminDialog} />
            <MatchesHeroManager />
            <HomeCardsTileManager />
          </View>
        )}

        {/* News Tab */}
        {activeTab === 'news' && (
          <Card className="border border-bgBorder bg-bgSurface2 p-4">
            <PredictionNewsManager onDialog={showAdminDialog} />
          </Card>
        )}

        {/* Updates Tab */}
        {activeTab === 'updates' && (
          <Card className="border border-bgBorder bg-bgSurface2 p-4">
            <AppUpdateManager onDialog={showAdminDialog} />
          </Card>
        )}

        {/* Quotes Tab */}
        {activeTab === 'quotes' && <AuthContentManager onDialog={showAdminDialog} />}

        {/* Scoring Tab */}
        {activeTab === 'scoring' && <ScoringSettingsSectionWithEdit onDialog={showAdminDialog} />}

        {/* API Tab */}
        {activeTab === 'api' && <ApiSettingsSection onDialog={showAdminDialog} />}
      </ScrollView>

      {/* Team Picker Modals */}
      <SingleTeamPickerModal
        visible={isHomePickerOpen}
        onClose={() => setIsHomePickerOpen(false)}
        onSelect={(team) => setHomeTeam(team)}
        teams={teamsQuery.data || []}
        title="Select Home Team"
      />
      <SingleTeamPickerModal
        visible={isAwayPickerOpen}
        onClose={() => setIsAwayPickerOpen(false)}
        onSelect={(team) => setAwayTeam(team)}
        teams={teamsQuery.data || []}
        title="Select Away Team"
      />

      {/* Date & Time Pickers */}
      <DateTimePickerModal
        visible={isKickoffPickerOpen}
        onClose={() => setIsKickoffPickerOpen(false)}
        value={kickoffDate}
        onConfirm={(date) => setKickoffDate(date)}
        title="Kickoff Date & Time"
      />
      <DateTimePickerModal
        visible={isQLockPickerOpen}
        onClose={() => setIsQLockPickerOpen(false)}
        value={qLockAt}
        onConfirm={(date) => setQLockAt(date)}
        title="Deadline Date & Time"
        minDate={new Date()}
      />
      <DateTimePickerModal
        visible={isEditQLockPickerOpen}
        onClose={() => setIsEditQLockPickerOpen(false)}
        value={editQLockAt}
        onConfirm={(date) => setEditQLockAt(date)}
        title="Edit Deadline"
      />

      {/* Delete Question confirmation (works on web + native, unlike Alert) */}
      <Modal
        visible={deletingQuestionId !== null}
        transparent
        animationType="fade"
        onRequestClose={cancelDelete}
      >
        <Pressable
          onPress={cancelDelete}
          className="flex-1 items-center justify-center bg-black/70 px-8"
        >
          <Pressable className="w-full max-w-sm rounded-2xl border border-bgBorder bg-bgSurface2 p-6 gap-5">
            <View className="items-center gap-3">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-liveDim border border-live/30">
                <Icon name="trash" size={20} color={Theme.colors.live} />
              </View>
              <Text className="text-lg font-bold text-textPrimary text-center">Delete Question</Text>
              <Text className="text-sm text-textSecondary text-center">
                Are you sure you want to delete this question? All user submissions and awarded
                points for it will be permanently removed.
              </Text>
              {deleteError && (
                <Text className="text-xs text-live font-semibold text-center">{deleteError}</Text>
              )}
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button label="Cancel" variant="secondary" onPress={cancelDelete} />
              </View>
              <View className="flex-1">
                <Button
                  label="Delete"
                  variant="danger"
                  loading={deleteQuestionMutation.isPending}
                  onPress={confirmDelete}
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete Match confirmation (works on web + native, unlike Alert) */}
      <Modal
        visible={matchPendingDelete !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setMatchPendingDelete(null)}
      >
        <Pressable
          onPress={() => setMatchPendingDelete(null)}
          className="flex-1 items-center justify-center bg-black/70 px-8"
        >
          <Pressable className="w-full max-w-sm rounded-2xl border border-bgBorder bg-bgSurface2 p-6 gap-5">
            <View className="items-center gap-3">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-liveDim border border-live/30">
                <Icon name="trash" size={20} color={Theme.colors.live} />
              </View>
              <Text className="text-lg font-bold text-textPrimary text-center">Delete Match</Text>
              <Text className="text-sm text-textSecondary text-center">
                Are you sure you want to permanently delete this match? All predictions and
                points for it will also be removed. This cannot be undone.
              </Text>
              {deleteMatchError && (
                <Text className="text-xs text-live font-semibold text-center">{deleteMatchError}</Text>
              )}
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button label="Cancel" variant="secondary" onPress={() => setMatchPendingDelete(null)} />
              </View>
              <View className="flex-1">
                <Button
                  label="Delete"
                  variant="danger"
                  loading={deleteMatchMutation.isPending}
                  onPress={confirmDeleteMatch}
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <AdminDialogModal
        dialog={adminDialog}
        onClose={() => setAdminDialog(null)}
      />
    </SafeAreaView>
  );
}

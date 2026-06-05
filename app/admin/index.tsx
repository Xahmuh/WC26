import { useState } from 'react';
import { ScrollView, Text, View, TextInput, Pressable, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import Theme from '@/constants/theme/design-system';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { HeroCarousel } from '@/components/ui/HeroCarousel';
import { useMatches } from '@/hooks/useMatches';
import { usePredictionQuestions } from '@/hooks/usePredictionQuestions';
import { useTeams } from '@/hooks/useTeams';
import { TeamFlag } from '@/components/ui/TeamFlag';
import {
  useSetMatchMultiplier,
  useCreatePredictionQuestion,
  useResolvePredictionQuestion,
  useUpdateQuestionStatus,
  useQuestionSubmissions,
  useAuditUserPrediction,
  useCreateCustomMatch,
  useUpdateMatchResult,
} from '@/hooks/useAdmin';
import type { Team, MatchStage, MatchStatus } from '@/types';
import { formatKickoff } from '@/lib/dates';
import { useAuthStore } from '@/stores/auth.store';

interface SubmissionsAuditSectionProps {
  questionId: string;
  points: number;
  auditMutation: any;
}

function SubmissionsAuditSection({
  questionId,
  points,
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
                {sub.user?.display_name || 'Unknown User'}
              </Text>
              {sub.user?.email && (
                <Text className="text-[10px] text-textTertiary">
                  {sub.user.email}
                </Text>
              )}
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
                    className={`px-2 py-1 rounded border ${
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
                    className={`px-2 py-1 rounded border ${
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
  
  const filtered = teams.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.short_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Card className="w-full max-w-sm border border-bgBorder bg-bgSurface2 p-5 gap-4 rounded-2xl max-h-[80%]">
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

          <ScrollView className="flex-grow mt-2" style={{ maxHeight: 300 }}>
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
      </View>
    </Modal>
  );
}

export default function AdminDashboard(): React.JSX.Element {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const isAdmin = profile?.role === 'admin';

  const matchesQuery = useMatches();
  const questionsQuery = usePredictionQuestions();
  const teamsQuery = useTeams();

  const setMultiplierMutation = useSetMatchMultiplier();
  const createQuestionMutation = useCreatePredictionQuestion();
  const resolveQuestionMutation = useResolvePredictionQuestion();
  const updateQuestionStatusMutation = useUpdateQuestionStatus();
  const auditMutation = useAuditUserPrediction();
  const createMatchMutation = useCreateCustomMatch();
  const updateResultMutation = useUpdateMatchResult();

  // Create Question Form State
  const [qText, setQText] = useState('');
  const [qPoints, setQPoints] = useState('10');
  const [qLockDate, setQLockDate] = useState('');
  const [qLockTime, setQLockTime] = useState('');

  // Match search state
  const [searchQuery, setSearchQuery] = useState('');

  // Auditing section expanded state
  const [expandedAudits, setExpandedAudits] = useState<Record<string, boolean>>({});

  // Custom Match Creation Form State
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
  const [stage, setStage] = useState<MatchStage>('GROUP');
  const [groupName, setGroupName] = useState('');
  const [venue, setVenue] = useState('');
  const [dateStr, setDateStr] = useState(new Date().toISOString().slice(0, 10));
  const [timeStr, setTimeStr] = useState('18:00');
  const [isHomePickerOpen, setIsHomePickerOpen] = useState(false);
  const [isAwayPickerOpen, setIsAwayPickerOpen] = useState(false);

  // Edit Match Result Accordion State
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<MatchStatus>('SCHEDULED');
  const [editHomeScore, setEditHomeScore] = useState('');
  const [editAwayScore, setEditAwayScore] = useState('');

  // Active tab: 'matches', 'add_match', or 'questions'
  const [activeTab, setActiveTab] = useState<'matches' | 'add_match' | 'questions'>('matches');

  if (!isAdmin) {
    return (
      <SafeAreaView className="flex-1 bg-bgDeep justify-center items-center px-6">
        <Text className="text-4xl">🚫</Text>
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
      Alert.alert('Error', 'Question text is required.');
      return;
    }

    const pointsVal = parseInt(qPoints, 10);
    if (isNaN(pointsVal) || pointsVal <= 0) {
      Alert.alert('Error', 'Points must be a positive number.');
      return;
    }

    if (!qLockDate.trim() || !qLockTime.trim()) {
      Alert.alert('Error', 'Please specify the deadline date and time.');
      return;
    }

    const lockAtDate = new Date(`${qLockDate.trim()}T${qLockTime.trim()}:00`);
    if (isNaN(lockAtDate.getTime())) {
      Alert.alert('Error', 'Invalid date or time format. Use YYYY-MM-DD and HH:MM.');
      return;
    }

    if (lockAtDate.getTime() <= Date.now()) {
      Alert.alert('Error', 'Deadline must be in the future.');
      return;
    }

    createQuestionMutation.mutate(
      {
        questionText: qText.trim(),
        options: [],
        points: pointsVal,
        lockAtIso: lockAtDate.toISOString(),
      },
      {
        onSuccess: () => {
          setQText('');
          setQPoints('10');
          setQLockDate('');
          setQLockTime('');
          Alert.alert('Success', 'Prediction question created!');
        },
        onError: (err: any) => {
          Alert.alert('Error', err.message || 'Failed to create question.');
        },
      }
    );
  };

  const handleResolveQuestion = (questionId: string, option: string) => {
    Alert.alert(
      'Resolve Question',
      `Are you sure "${option}" is the correct answer? This will award points and refresh the leaderboard.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            resolveQuestionMutation.mutate(
              { questionId, correctAnswer: option },
              {
                onSuccess: () => {
                  Alert.alert('Success', 'Question resolved and points awarded!');
                },
                onError: (err: any) => {
                  Alert.alert('Error', err.message || 'Failed to resolve question.');
                },
              }
            );
          },
        },
      ]
    );
  };

  const handleToggleStatus = (questionId: string, currentStatus: 'open' | 'closed') => {
    const nextStatus = currentStatus === 'open' ? 'closed' : 'open';
    const actionLabel = nextStatus === 'closed' ? 'Lock Answers' : 'Unlock Answers';

    Alert.alert(
      `${actionLabel}?`,
      `Are you sure you want to ${nextStatus === 'closed' ? 'lock' : 'unlock'} predictions for this question?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            updateQuestionStatusMutation.mutate(
              { questionId, status: nextStatus },
              {
                onError: (err: any) => {
                  Alert.alert('Error', err.message || 'Failed to update status.');
                },
              }
            );
          },
        },
      ]
    );
  };

  const handleMultiplierChange = (matchId: string, currentMult: number, targetMult: number) => {
    if (currentMult === targetMult) return;
    setMultiplierMutation.mutate({ matchId, multiplier: targetMult });
  };

  const handleCreateMatch = () => {
    if (!homeTeam || !awayTeam) {
      Alert.alert('Error', 'Please select both home and away teams.');
      return;
    }
    if (homeTeam.id === awayTeam.id) {
      Alert.alert('Error', 'Home and away teams cannot be the same.');
      return;
    }
    
    // Parse date and time in local timezone
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^\d{2}:\d{2}$/;
    
    if (!dateRegex.test(dateStr.trim())) {
      Alert.alert('Error', 'Please enter date in YYYY-MM-DD format.');
      return;
    }
    if (!timeRegex.test(timeStr.trim())) {
      Alert.alert('Error', 'Please enter time in HH:MM format.');
      return;
    }

    try {
      const dateParts = dateStr.trim().split('-').map(Number);
      const timeParts = timeStr.trim().split(':').map(Number);
      const year = dateParts[0] ?? 2026;
      const month = dateParts[1] ?? 1;
      const day = dateParts[2] ?? 1;
      const hour = timeParts[0] ?? 0;
      const minute = timeParts[1] ?? 0;
      
      const localDate = new Date(year, month - 1, day, hour, minute);
      if (isNaN(localDate.getTime())) {
        Alert.alert('Error', 'Invalid date or time entered.');
        return;
      }

      createMatchMutation.mutate(
        {
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          stage,
          groupName: groupName.trim() || null,
          kickoffTime: localDate.toISOString(),
          venue: venue.trim() || null,
        },
        {
          onSuccess: () => {
            setHomeTeam(null);
            setAwayTeam(null);
            setStage('GROUP');
            setGroupName('');
            setVenue('');
            setDateStr(new Date().toISOString().slice(0, 10));
            setTimeStr('18:00');
            Alert.alert('Success', 'Custom match created!');
            setActiveTab('matches');
          },
          onError: (err: any) => {
            Alert.alert('Error', err.message || 'Failed to create match.');
          },
        }
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to parse kickoff date and time.');
    }
  };

  const handleSaveResult = (matchId: string) => {
    let homeScoreNum: number | null = null;
    let awayScoreNum: number | null = null;

    if (editHomeScore.trim() !== '') {
      homeScoreNum = parseInt(editHomeScore, 10);
      if (isNaN(homeScoreNum) || homeScoreNum < 0) {
        Alert.alert('Error', 'Home score must be a positive number.');
        return;
      }
    }
    
    if (editAwayScore.trim() !== '') {
      awayScoreNum = parseInt(editAwayScore, 10);
      if (isNaN(awayScoreNum) || awayScoreNum < 0) {
        Alert.alert('Error', 'Away score must be a positive number.');
        return;
      }
    }

    if (editStatus === 'FINISHED' && (homeScoreNum === null || awayScoreNum === null)) {
      Alert.alert('Error', 'Scores are required to finish the match.');
      return;
    }

    updateResultMutation.mutate(
      {
        matchId,
        status: editStatus,
        homeScore: homeScoreNum,
        awayScore: awayScoreNum,
      },
      {
        onSuccess: () => {
          setEditingMatchId(null);
          Alert.alert('Success', 'Match updated and points calculated successfully!');
        },
        onError: (err: any) => {
          Alert.alert('Error', err.message || 'Failed to update match.');
        },
      }
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-bgDeep" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="px-4 py-3 flex-row items-center justify-between border-b border-bgBorder">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} className="p-2">
            <Text className="text-xl text-accent font-bold">←</Text>
          </Pressable>
          <Text className="text-xl font-bold text-textPrimary">Admin Control Panel</Text>
        </View>
        <View className="bg-red-500/20 px-2 py-0.5 rounded">
          <Text className="text-[10px] font-bold text-red-400 uppercase">Live DB</Text>
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row border-b border-bgBorder">
        <Pressable
          onPress={() => setActiveTab('matches')}
          className={`flex-1 py-3 items-center border-b-2 ${
            activeTab === 'matches' ? 'border-accent' : 'border-transparent'
          }`}
        >
          <Text className={`font-bold ${activeTab === 'matches' ? 'text-accent' : 'text-textSecondary'}`}>
            Matches
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('add_match')}
          className={`flex-1 py-3 items-center border-b-2 ${
            activeTab === 'add_match' ? 'border-accent' : 'border-transparent'
          }`}
        >
          <Text className={`font-bold ${activeTab === 'add_match' ? 'text-accent' : 'text-textSecondary'}`}>
            Add Match
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('questions')}
          className={`flex-1 py-3 items-center border-b-2 ${
            activeTab === 'questions' ? 'border-accent' : 'border-transparent'
          }`}
        >
          <Text className={`font-bold ${activeTab === 'questions' ? 'text-accent' : 'text-textSecondary'}`}>
            Prediction Questions
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="p-4 gap-6">
        {/* Hero Banner Slides */}
        <HeroCarousel />
        {/* Matches Multiplier Tab */}
        {activeTab === 'matches' && (
          <View className="gap-4">
            <Text className="text-sm text-textSecondary">
              Toggle specific matches to Double (2x) or Triple (3x) points. Changes apply immediately to new/unsynced points calculations.
            </Text>

            {/* Search Bar */}
            <View className="relative">
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search team (e.g. Argentina, BRA)..."
                placeholderTextColor={Theme.colors.textTertiary}
                className="h-11 rounded-lg border border-bgBorder bg-bgSurface2 px-3 pr-10 text-sm text-textPrimary"
              />
              {searchQuery.length > 0 && (
                <Pressable
                  onPress={() => setSearchQuery('')}
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

                  return filtered.map((match) => {
                    const currentMult = match.points_multiplier || 1;
                    const isMutating =
                      setMultiplierMutation.isPending &&
                      setMultiplierMutation.variables?.matchId === match.id;

                    return (
                      <Card key={match.id} className="p-4 border border-bgBorder bg-bgSurface2 gap-3">
                        <View className="flex-row justify-between items-center">
                          <Text className="text-[11px] text-textSecondary font-semibold">
                            {formatKickoff(match.kickoff_time)}
                          </Text>
                          <View className="flex-row items-center gap-1.5">
                            <View className="bg-bgSurface1 px-1.5 py-0.5 rounded border border-bgBorder">
                              <Text className="text-[9px] text-textSecondary font-bold uppercase">{match.status}</Text>
                            </View>
                            <Text className="text-xs font-bold text-accent uppercase tracking-wider">
                              {match.stage}
                            </Text>
                          </View>
                        </View>

                        <View className="flex-row items-center justify-between">
                          <Text className="text-base font-bold text-textPrimary flex-1 mr-4">
                            {match.home_team.name} {match.home_score !== null ? match.home_score : ''} vs {match.away_team.name} {match.away_score !== null ? match.away_score : ''}
                          </Text>
                          {isMutating ? (
                            <ActivityIndicator size="small" color={Theme.colors.accent} />
                          ) : (
                            <View className="flex-row gap-1">
                              {[1, 2, 3].map((mult) => (
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
                                {(['SCHEDULED', 'IN_PLAY', 'FINISHED', 'POSTPONED', 'CANCELLED'] as MatchStatus[]).map((statusVal) => (
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

                            {editStatus === 'FINISHED' && (
                              <View className="bg-liveDim/20 border border-live/30 p-2 rounded-lg">
                                <Text className="text-[10px] font-semibold text-live leading-relaxed">
                                  ⚠️ Warning: Setting status to FINISHED will calculate user prediction points. Make sure scores are correct.
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
                                onPress={() => handleSaveResult(match.id)}
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
                            }}
                            className="mt-2 border-t border-bgBorder/50 pt-2 flex-row items-center justify-between"
                          >
                            <Text className="text-xs text-accent font-bold">🛠️ Edit Score & Status</Text>
                          </Pressable>
                        )}
                      </Card>
                    );
                  });
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
                  {(['GROUP', 'ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'THIRD_PLACE', 'FINAL'] as MatchStage[]).map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => setStage(s)}
                      className={`px-2.5 py-1.5 rounded-lg border ${
                        stage === s ? 'bg-accentDim border-accent' : 'bg-bgSurface1 border-bgBorder'
                      }`}
                    >
                      <Text className={`text-[10px] font-bold ${stage === s ? 'text-accent' : 'text-textSecondary'}`}>
                        {s.replace(/_/g, ' ')}
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

              {/* Date & Time */}
              <View className="flex-row gap-3">
                <View className="flex-1 gap-1.5">
                  <Text className="text-xs font-semibold text-textSecondary uppercase">Date (YYYY-MM-DD)</Text>
                  <TextInput
                    value={dateStr}
                    onChangeText={setDateStr}
                    placeholder="2026-06-11"
                    placeholderTextColor={Theme.colors.textTertiary}
                    className="h-11 rounded-lg border border-bgBorder bg-bgSurface1 px-3 text-sm text-textPrimary"
                  />
                </View>
                <View className="flex-1 gap-1.5">
                  <Text className="text-xs font-semibold text-textSecondary uppercase">Time (HH:MM)</Text>
                  <TextInput
                    value={timeStr}
                    onChangeText={setTimeStr}
                    placeholder="18:00"
                    placeholderTextColor={Theme.colors.textTertiary}
                    className="h-11 rounded-lg border border-bgBorder bg-bgSurface1 px-3 text-sm text-textPrimary"
                  />
                </View>
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
                <Text className="text-xs font-semibold text-textSecondary uppercase">Deadline</Text>
                <View className="flex-row gap-3">
                  <View className="flex-1 gap-1">
                    <Text className="text-[10px] text-textTertiary">Date (YYYY-MM-DD)</Text>
                    <TextInput
                      value={qLockDate}
                      onChangeText={setQLockDate}
                      placeholder="2026-06-15"
                      placeholderTextColor={Theme.colors.textTertiary}
                      className="h-11 rounded-lg border border-bgBorder bg-bgSurface1 px-3 text-sm text-textPrimary"
                    />
                  </View>
                  <View className="flex-1 gap-1">
                    <Text className="text-[10px] text-textTertiary">Time (HH:MM)</Text>
                    <TextInput
                      value={qLockTime}
                      onChangeText={setQLockTime}
                      placeholder="18:00"
                      placeholderTextColor={Theme.colors.textTertiary}
                      className="h-11 rounded-lg border border-bgBorder bg-bgSurface1 px-3 text-sm text-textPrimary"
                    />
                  </View>
                </View>
              </View>

              <Button
                label="Publish Question"
                onPress={handleCreateQuestion}
                loading={createQuestionMutation.isPending}
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
                            🏆 {q.points} Points
                          </Text>
                          <View className="flex-row items-center gap-2">
                            {needsResolution && (
                              <View className="rounded bg-liveDim px-1.5 py-0.5 border border-live/30">
                                <Text className="text-[9px] text-live font-bold uppercase">⚠️ Expired</Text>
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
                                  {q.status === 'closed' || isTimeUp ? '🔓 Unlock' : '🔒 Lock'}
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

                        <Text className="text-base font-bold text-textPrimary">{q.question_text}</Text>

                        <Text className="text-xs text-textSecondary">
                          Deadline: <Text className="text-textPrimary font-semibold">{formatKickoff(q.lock_at || '')}</Text>
                        </Text>

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
                            points={q.points}
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
    </SafeAreaView>
  );
}

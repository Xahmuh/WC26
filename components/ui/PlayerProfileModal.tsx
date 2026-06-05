import { Modal, Text, View, Pressable, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';

import Theme from '@/constants/theme/design-system';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { useTeams } from '@/hooks/useTeams';
import { TeamFlag } from './TeamFlag';
import { Card } from './Card';

interface PlayerProfileModalProps {
  visible: boolean;
  onClose: () => void;
  playerId: string | undefined;
  rank: number | undefined;
}

export function PlayerProfileModal({
  visible,
  onClose,
  playerId,
  rank,
}: PlayerProfileModalProps): React.JSX.Element {
  const { data: profile, isLoading, isError, error } = usePlayerProfile(playerId);
  const { data: teams = [] } = useTeams();

  const initials = profile?.display_name ? profile.display_name.slice(0, 2).toUpperCase() : '?';

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <Card className="w-full max-w-sm border border-bgBorder bg-bgSurface2 p-5 gap-5 rounded-2xl shadow-xl">
          {/* Header */}
          <View className="flex-row justify-between items-center border-b border-bgBorder/50 pb-2">
            <Text className="text-base font-bold text-textPrimary">Player Profile</Text>
            <Pressable onPress={onClose} className="p-1.5 rounded-full bg-bgSurface3 border border-bgBorder active:opacity-75">
              <Text className="text-textSecondary text-xs">✕</Text>
            </Pressable>
          </View>

          {isLoading ? (
            <View className="py-12 items-center justify-center">
              <ActivityIndicator size="large" color={Theme.colors.accent} />
              <Text className="text-xs text-textSecondary mt-3 font-semibold text-center">Loading player details...</Text>
            </View>
          ) : isError || !profile ? (
            <View className="py-8 items-center">
              <Text className="text-sm text-live font-semibold text-center">
                {error?.message || 'Player details not found'}
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-5">
              {/* User Identity & Info */}
              <View className="items-center gap-2">
                <View className="h-16 w-16 items-center justify-center rounded-full bg-bgSurface3 border border-bgBorder">
                  <Text className="text-xl font-bold text-textSecondary">{initials}</Text>
                </View>
                <View className="items-center">
                  <Text className="text-lg font-bold text-textPrimary text-center">
                    {profile.display_name}
                  </Text>
                  <View className="flex-row items-center gap-3 mt-1.5">
                    <View className="bg-accentDim border border-accent/20 px-2 py-0.5 rounded-md">
                      <Text className="text-[10px] font-bold text-accent uppercase">
                        Rank {rank ? `#${rank}` : '—'}
                      </Text>
                    </View>
                    <View className="bg-successDim border border-success/20 px-2 py-0.5 rounded-md">
                      <Text className="text-[10px] font-bold text-success uppercase">
                        {profile.total_points} PTS
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Supported Teams */}
              <View className="gap-2 border-t border-bgBorder/40 pt-3">
                <Text className="text-[11px] font-bold text-textSecondary uppercase tracking-wider">
                  Supporting Teams
                </Text>
                {profile.supported_teams && profile.supported_teams.length > 0 ? (
                  <View className="flex-row flex-wrap gap-2">
                    {profile.supported_teams.map((teamId) => {
                      const team = teams.find((t) => t.id === teamId);
                      if (!team) return null;
                      return (
                        <View
                          key={teamId}
                          className="flex-row items-center gap-1.5 bg-bgSurface3 border border-bgBorder px-2.5 py-1.5 rounded-xl"
                        >
                          <TeamFlag team={team} size={16} fixed />
                          <Text className="text-xs font-semibold text-textPrimary">
                            {team.name}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <Text className="text-xs text-textTertiary italic">No teams supported yet.</Text>
                )}
              </View>

              {/* Points Breakdown */}
              <View className="gap-2 border-t border-bgBorder/40 pt-3">
                <Text className="text-[11px] font-bold text-textSecondary uppercase tracking-wider">
                  Points Breakdown
                </Text>
                <View className="gap-2">
                  <BreakdownRow
                    label="Match Winner / Outcome"
                    value={profile.breakdown.winner_points}
                    icon="🎯"
                  />
                  <BreakdownRow
                    label="Goal Predictions (Home/Away)"
                    value={profile.breakdown.goal_points}
                    icon="⚽"
                  />
                  <BreakdownRow
                    label="Exact Scoreline Bonuses"
                    value={profile.breakdown.exact_bonus}
                    icon="🏆"
                  />
                  <BreakdownRow
                    label="Tournament predictions"
                    value={profile.breakdown.question_points}
                    icon="🌟"
                  />
                </View>
              </View>
            </ScrollView>
          )}

          {/* Close button */}
          <Pressable
            onPress={onClose}
            className="w-full h-11 items-center justify-center rounded-xl bg-accent active:opacity-85"
          >
            <Text className="text-sm font-bold text-black">Close Profile</Text>
          </Pressable>
        </Card>
      </View>
    </Modal>
  );
}

interface BreakdownRowProps {
  label: string;
  value: number;
  icon: string;
}

function BreakdownRow({ label, value, icon }: BreakdownRowProps): React.JSX.Element {
  return (
    <View className="flex-row items-center justify-between bg-bgSurface3/60 border border-bgBorder/50 rounded-xl px-3 py-2.5">
      <View className="flex-row items-center gap-2">
        <Text className="text-sm">{icon}</Text>
        <Text className="text-xs text-textSecondary font-semibold">{label}</Text>
      </View>
      <Text className="text-xs font-bold text-textPrimary">+{value} pts</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 16,
  },
});

import { Modal, Text, View, Pressable, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';

import Theme from '@/constants/theme/design-system';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { useTeams } from '@/hooks/useTeams';
import { Icon, type IconName } from './Icon';
import { TeamFlag } from './TeamFlag';
import { Card } from './Card';

interface PlayerProfileModalProps {
  visible: boolean;
  onClose: () => void;
  playerId: string | undefined;
  rank: number | undefined;
}

const MEDAL_COLOR: Record<number, string> = {
  1: Theme.colors.gold,
  2: Theme.colors.silver,
  3: Theme.colors.bronze,
};

export function PlayerProfileModal({
  visible,
  onClose,
  playerId,
  rank,
}: PlayerProfileModalProps): React.JSX.Element {
  const { data: profile, isLoading, isError, error } = usePlayerProfile(playerId);
  const { data: teams = [] } = useTeams();

  const initials = profile?.display_name ? profile.display_name.slice(0, 2).toUpperCase() : '?';
  const medalColor = rank ? MEDAL_COLOR[rank] : undefined;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Card className="w-full max-w-sm border border-bgBorder bg-bgSurface2 p-5 gap-5 rounded-2xl shadow-xl">
          {/* Header */}
          <View className="flex-row justify-between items-center border-b border-bgBorder/50 pb-3">
            <Text className="text-base font-bold text-textPrimary">Player Profile</Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              className="h-8 w-8 items-center justify-center rounded-full bg-bgSurface3 border border-bgBorder active:opacity-75"
            >
              <Icon name="close" size={16} color={Theme.colors.textSecondary} fixed />
            </Pressable>
          </View>

          {isLoading ? (
            <View className="py-12 items-center justify-center">
              <ActivityIndicator size="large" color={Theme.colors.accent} />
              <Text className="text-xs text-textSecondary mt-3 font-semibold text-center">
                Loading player details...
              </Text>
            </View>
          ) : isError || !profile ? (
            <View className="py-8 items-center gap-2">
              <Icon name="warning" size={28} color={Theme.colors.live} />
              <Text className="text-sm text-live font-semibold text-center">
                {error?.message || 'Player details not found'}
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-5">
              {/* Identity */}
              <View className="items-center gap-3">
                <View>
                  <View className="h-20 w-20 items-center justify-center rounded-full bg-bgSurface3 border-2 border-accent">
                    <Text className="text-2xl font-extrabold text-textPrimary">{initials}</Text>
                  </View>
                  {medalColor && (
                    <View
                      style={{ borderColor: medalColor }}
                      className="absolute -bottom-1 -right-1 h-8 w-8 items-center justify-center rounded-full bg-bgSurface2 border-2"
                    >
                      <Icon name="medal" size={16} color={medalColor} fixed />
                    </View>
                  )}
                </View>

                <View className="items-center gap-2">
                  <Text className="text-xl font-bold text-textPrimary text-center">
                    {profile.display_name}
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <View className="flex-row items-center gap-1 bg-accentDim border border-accentBorder px-2.5 py-1 rounded-full">
                      <Icon name="trendingUp" size={12} color={Theme.colors.accent} fixed />
                      <Text className="text-[11px] font-bold text-accent uppercase">
                        Rank {rank ? `#${rank}` : '—'}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-1 bg-successDim border border-success/20 px-2.5 py-1 rounded-full">
                      <Icon name="star" size={12} color={Theme.colors.success} fixed />
                      <Text className="text-[11px] font-bold text-success uppercase">
                        {profile.total_points} PTS
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Supported Teams */}
              <View className="gap-2.5 border-t border-bgBorder/40 pt-4">
                <View className="flex-row items-center gap-1.5">
                  <Icon name="shield" size={14} color={Theme.colors.textSecondary} fixed />
                  <Text className="text-[11px] font-bold text-textSecondary uppercase tracking-wider">
                    Supporting Teams
                  </Text>
                </View>
                {profile.supported_teams && profile.supported_teams.length > 0 ? (
                  <View className="flex-row flex-wrap gap-2">
                    {profile.supported_teams.map((teamId) => {
                      const team = teams.find((t) => t.id === teamId);
                      if (!team) return null;
                      return (
                        <View
                          key={teamId}
                          className="flex-row items-center gap-1.5 bg-bgSurface3 border border-bgBorder pl-1 pr-2.5 py-1 rounded-full"
                        >
                          <View className="overflow-hidden rounded-full border border-bgBorder">
                            <TeamFlag team={team} size={18} fixed />
                          </View>
                          <Text className="text-xs font-semibold text-textPrimary">{team.name}</Text>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <Text className="text-xs text-textTertiary italic">No teams supported yet.</Text>
                )}
              </View>

              {/* Points Breakdown */}
              <View className="gap-2.5 border-t border-bgBorder/40 pt-4">
                <View className="flex-row items-center gap-1.5">
                  <Icon name="trophy" size={14} color={Theme.colors.textSecondary} fixed />
                  <Text className="text-[11px] font-bold text-textSecondary uppercase tracking-wider">
                    Points Breakdown
                  </Text>
                </View>
                <View className="gap-2">
                  <BreakdownRow
                    label="Match Winner / Outcome"
                    value={profile.breakdown.winner_points}
                    icon="target"
                    tint={Theme.colors.accent}
                    tintBg={Theme.colors.accentDim}
                  />
                  <BreakdownRow
                    label="Goal Predictions (Home/Away)"
                    value={profile.breakdown.goal_points}
                    icon="matches"
                    tint={Theme.colors.success}
                    tintBg={Theme.colors.successDim}
                  />
                  <BreakdownRow
                    label="Exact Scoreline Bonuses"
                    value={profile.breakdown.exact_bonus}
                    icon="trophy"
                    tint={Theme.colors.gold}
                    tintBg="rgba(255,215,0,0.15)"
                  />
                  <BreakdownRow
                    label="Extra Points · Prediction Questions"
                    value={profile.breakdown.question_points}
                    icon="star"
                    tint={Theme.colors.warning}
                    tintBg={Theme.colors.warningDim}
                  />

                  {/* Grand total (includes the extra prediction-question points) */}
                  <View className="flex-row items-center justify-between rounded-xl bg-accentDim border border-accentBorder px-3 py-2.5 mt-0.5">
                    <View className="flex-row items-center gap-2.5 flex-1 pr-2">
                      <View className="h-8 w-8 items-center justify-center rounded-full bg-accent">
                        <Icon name="trophy" size={16} color={Theme.colors.accentDark} fixed />
                      </View>
                      <Text className="text-xs font-bold text-textPrimary uppercase tracking-wide">
                        Total Points
                      </Text>
                    </View>
                    <Text className="text-sm font-extrabold text-accent">{profile.total_points}</Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          )}

          {/* Close button */}
          <Pressable
            onPress={onClose}
            className="w-full h-11 flex-row items-center justify-center gap-2 rounded-xl bg-accent active:opacity-85"
          >
            <Text className="text-sm font-bold text-accentDark">Close Profile</Text>
          </Pressable>
        </Card>
      </View>
    </Modal>
  );
}

interface BreakdownRowProps {
  label: string;
  value: number;
  icon: IconName;
  tint: string;
  tintBg: string;
}

function BreakdownRow({ label, value, icon, tint, tintBg }: BreakdownRowProps): React.JSX.Element {
  const earned = value > 0;
  return (
    <View className="flex-row items-center justify-between bg-bgSurface3/60 border border-bgBorder/50 rounded-xl px-3 py-2.5">
      <View className="flex-row items-center gap-2.5 flex-1 pr-2">
        <View
          style={{ backgroundColor: tintBg }}
          className="h-8 w-8 items-center justify-center rounded-full"
        >
          <Icon name={icon} size={16} color={tint} fixed />
        </View>
        <Text className="text-xs text-textSecondary font-semibold flex-shrink">{label}</Text>
      </View>
      <Text
        className="text-sm font-bold"
        style={{ color: earned ? Theme.colors.textPrimary : Theme.colors.textTertiary }}
      >
        +{value}
      </Text>
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

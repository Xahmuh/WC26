import { StyleSheet, Text, View } from 'react-native';

import { Card, ProgressBar, SkeletonBox } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { Colors, Typography } from '@/constants';
import { useAuthStore } from '@/stores/auth.store';

const REWARD_THRESHOLD = 100;

export function NextRewardCard({ isLoading = false }: { isLoading?: boolean }): React.JSX.Element {
  const profile = useAuthStore((s) => s.profile);
  const points = profile?.total_points ?? 0;
  const progress = Math.min(1, points / REWARD_THRESHOLD);

  if (isLoading || !profile) {
    return (
      <Card style={styles.card} padding={14}>
        <Text style={styles.header}>NEXT REWARD</Text>
        <SkeletonBox width={52} height={52} borderRadius={26} style={styles.iconSkeleton} />
        <SkeletonBox width="72%" height={18} style={{ marginTop: 14, alignSelf: 'center' }} />
        <SkeletonBox width="56%" height={10} style={{ marginTop: 8, alignSelf: 'center' }} />
      </Card>
    );
  }

  return (
    <Card style={styles.card} padding={14}>
      <Text style={styles.header}>NEXT REWARD</Text>

      <View style={styles.iconWrap}>
        <Icon name="gift" size={26} color={Colors.accent.lime} />
      </View>

      <Text style={styles.progressText}>
        {points} / {REWARD_THRESHOLD} POINTS
      </Text>

      <View style={{ marginTop: 10 }}>
        <ProgressBar progress={progress} height={6} />
      </View>

      <Text style={styles.rewardName}>Mystery Pack</Text>
      <Text style={styles.subtitle}>Unlocks at {REWARD_THRESHOLD} points</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.background.card,
    borderColor: Colors.border.default,
    minWidth: 0,
    alignItems: 'center',
  },
  header: {
    color: Colors.text.primary,
    fontSize: 11,
    fontWeight: Typography.weight.black,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  iconWrap: {
    marginTop: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  iconSkeleton: {
    marginTop: 16,
    alignSelf: 'center',
  },
  progressText: {
    marginTop: 14,
    color: Colors.text.primary,
    fontSize: 14,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  rewardName: {
    marginTop: 10,
    color: Colors.accent.lime,
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 4,
    color: Colors.text.secondary,
    fontSize: Typography.size.sm,
    textAlign: 'center',
  },
});

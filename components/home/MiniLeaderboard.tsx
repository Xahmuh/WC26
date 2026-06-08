import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';

import { Card, SkeletonBox } from '@/components/ui';
import { Colors, Layout, Typography } from '@/constants';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { TrophyBadge } from '@/components/leaderboard/TrophyBadge';
import { useResponsive } from '@/lib/responsive';

interface MiniLeaderboardProps {
  style?: ViewStyle;
}

export function MiniLeaderboard({ style }: MiniLeaderboardProps): React.JSX.Element {
  const router = useRouter();
  const { isSmall } = useResponsive();
  const leaderboardQuery = useLeaderboard();
  const refetchLeaderboard = leaderboardQuery.refetch;
  const topThree = (leaderboardQuery.data ?? []).slice(0, 3);

  useFocusEffect(
    useCallback(() => {
      void refetchLeaderboard();
    }, [refetchLeaderboard])
  );

  const padding = isSmall ? 12 : 14;

  if (leaderboardQuery.isLoading) {
    return (
      <Card style={[styles.card, style]} padding={padding}>
        <View style={styles.header}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Top 3
          </Text>
        </View>
        {[0, 1, 2].map((index) => (
          <View key={index} style={styles.loadingRow}>
            <SkeletonBox width={26} height={26} borderRadius={13} />
            <View style={{ flex: 1 }}>
              <SkeletonBox width="72%" height={12} />
              <SkeletonBox width="48%" height={10} style={{ marginTop: 8 }} />
            </View>
          </View>
        ))}
      </Card>
    );
  }

  if (leaderboardQuery.isError) {
    return (
      <Card style={[styles.card, style]} padding={padding}>
        <View style={styles.header}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Top 3
          </Text>
        </View>
        <Text style={styles.error}>{leaderboardQuery.error.message}</Text>
      </Card>
    );
  }

  if (topThree.length === 0) {
    return (
      <Card style={[styles.card, style]} padding={padding}>
        <View style={styles.header}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Top 3
          </Text>
        </View>
        <Text style={styles.empty}>No leaderboard data yet</Text>
      </Card>
    );
  }

  return (
    <Card style={[styles.card, style]} padding={padding}>
      <View style={styles.body}>
        <View style={styles.header}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Top 3
          </Text>
          <View style={styles.headerRight}>
            <TrophyBadge />
          </View>
        </View>

        <View style={styles.rows}>
          {topThree.map((entry) => (
            <View key={entry.user_id} style={styles.row}>
              <View style={[styles.rankBubble, rankBubbleStyles[entry.rank as 1 | 2 | 3]]}>
                <Text style={styles.rankText}>{entry.rank}</Text>
              </View>
              <View style={styles.identity}>
                <Text style={styles.name} numberOfLines={1}>
                  {entry.display_name}
                </Text>
                <Text style={styles.points}>{entry.total_points} pts</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <Pressable
        onPress={() => router.push('/(tabs)/leaderboard' as never)}
        accessibilityRole="button"
        style={styles.button}
      >
        <Text style={styles.buttonText}>{'View Details >'}</Text>
      </Pressable>
    </Card>
  );
}

const rankBubbleStyles: Record<1 | 2 | 3, { backgroundColor: string }> = {
  1: { backgroundColor: '#D4AF37' },
  2: { backgroundColor: '#BFC5CD' },
  3: { backgroundColor: '#CD7F32' },
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.background.card,
    borderColor: Colors.border.default,
    minWidth: 0,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  body: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
    minWidth: 0,
  },
  headerTitle: {
    flex: 1,
    minWidth: 0,
    color: Colors.text.primary,
    fontSize: 18,
    fontWeight: Typography.weight.black,
    letterSpacing: 1,
  },
  headerRight: {
    flexShrink: 0,
  },
  rows: {
    marginTop: 0,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rankBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    color: Colors.background.primary,
    fontSize: 12,
    fontWeight: Typography.weight.black,
  },
  identity: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: Colors.text.primary,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
  },
  points: {
    marginTop: 2,
    color: Colors.accent.lime,
    fontSize: 12,
    fontWeight: Typography.weight.bold,
  },
  button: {
    marginTop: 12,
    minHeight: 44,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Layout.borderRadius.full,
    borderWidth: 1,
    borderColor: Colors.accent.limeBorder,
    paddingVertical: 12,
    backgroundColor: Colors.accent.limeLight,
  },
  buttonText: {
    color: Colors.accent.lime,
    fontSize: 12,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.4,
  },
  empty: {
    marginTop: 10,
    color: Colors.text.secondary,
    fontSize: Typography.size.sm,
  },
  error: {
    marginTop: 10,
    color: Colors.text.secondary,
    fontSize: Typography.size.sm,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 36,
  },
});

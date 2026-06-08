import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';

import { Card, ProgressBar } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { Colors, Typography } from '@/constants';
import { useMatches } from '@/hooks/useMatches';
import { formatCountdownParts, formatShortMatchTime } from '@/components/home/homeUtils';
import type { Match } from '@/types';

function isScheduledMatch(match: Match): boolean {
  const normalizedStatus = match.status.toUpperCase();
  return normalizedStatus === 'SCHEDULED' || normalizedStatus === 'UPCOMING';
}

function hasConcreteTeams(match: Match): boolean {
  return !match.is_placeholder && Boolean(match.home_team?.id) && Boolean(match.away_team?.id);
}

function kickoffTimestamp(match: Match): number {
  const timestamp = new Date(match.kickoff_time).getTime();
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
}

function getNextMatch(matches: Match[], now: number): Match | null {
  const upcoming = matches
    .filter((match) => isScheduledMatch(match) && kickoffTimestamp(match) > now)
    .sort((a, b) => kickoffTimestamp(a) - kickoffTimestamp(b));

  return upcoming.find(hasConcreteTeams) ?? upcoming[0] ?? null;
}

function getTeamName(match: Match, side: 'home' | 'away'): string {
  const team = side === 'home' ? match.home_team : match.away_team;
  return team?.name || 'TBD';
}

export function NextMatchCountdown({ isLoading = false }: { isLoading?: boolean }): React.JSX.Element {
  const router = useRouter();
  const matchesQuery = useMatches();
  const [tick, setTick] = useState(Date.now());
  const refetchMatches = matchesQuery.refetch;

  useFocusEffect(
    useCallback(() => {
      void refetchMatches();
    }, [refetchMatches])
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setTick(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const nextMatch = useMemo(() => {
    return getNextMatch(matchesQuery.data ?? [], tick);
  }, [matchesQuery.data, tick]);

  const loading = isLoading || matchesQuery.isLoading;

  if (loading) {
    return (
      <Card style={styles.card} padding={14}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Icon name="time" size={15} color={Colors.accent.lime} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              NEXT MATCH STARTS IN
            </Text>
            <Text style={styles.kicker}>Live countdown</Text>
          </View>
        </View>
        <View style={styles.loadingMatch} />
        <View style={styles.loadingTimer} />
      </Card>
    );
  }

  if (!nextMatch) {
    return (
      <Card style={styles.card} padding={14}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Icon name="time" size={15} color={Colors.accent.lime} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              NEXT MATCH STARTS IN
            </Text>
            <Text style={styles.kicker}>Live countdown</Text>
          </View>
        </View>
        <View style={styles.emptyWrap}>
          <Text style={styles.empty} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.78}>
            No upcoming matches
          </Text>
        </View>
      </Card>
    );
  }

  const countdown = formatCountdownParts(nextMatch.kickoff_time);
  const timeSegments = countdown.days > 0
    ? [String(countdown.days), countdown.hours, countdown.minutes]
    : [countdown.hours, countdown.minutes, countdown.seconds];
  const units = countdown.days > 0 ? ['DAYS', 'HRS', 'MINS'] : ['HRS', 'MINS', 'SECS'];
  const progress = Math.min(1, Math.max(0, 1 - countdown.remainingMs / (24 * 60 * 60 * 1000)));
  const matchup = `${getTeamName(nextMatch, 'home')} vs ${getTeamName(nextMatch, 'away')}`;

  return (
    <Card style={styles.card} padding={14}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Icon name="time" size={15} color={Colors.accent.lime} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
            NEXT MATCH STARTS IN
          </Text>
          <Text style={styles.kicker}>Live countdown</Text>
        </View>
      </View>

      <View style={styles.matchInfo}>
        <Text style={styles.matchTitle} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.72}>
          {matchup}
        </Text>
        <Text style={styles.matchTime} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
          {formatShortMatchTime(nextMatch.kickoff_time)}
        </Text>
      </View>

      <Pressable
        onPress={() => router.push(`/match/${nextMatch.id}` as never)}
        accessibilityRole="button"
        accessibilityLabel={`Open ${matchup}`}
        style={styles.footer}
      >
        <View style={styles.timeGrid}>
          {timeSegments.map((value, index) => (
            <View key={`${units[index]}-${index}`} style={styles.timeCell}>
              <Text style={styles.countdown} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55}>
                {value}
              </Text>
              <Text style={styles.unit} numberOfLines={1}>
                {units[index]}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.progressWrap}>
          <ProgressBar progress={progress} height={5} />
        </View>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    minHeight: 214,
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: '#0F1110',
    borderColor: Colors.accent.limeBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  headerIcon: {
    width: 27,
    height: 27,
    borderRadius: 13.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent.limeLight,
    borderWidth: 1,
    borderColor: Colors.accent.limeBorder,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  title: {
    color: Colors.text.primary,
    fontSize: 9,
    fontWeight: Typography.weight.black,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    minWidth: 0,
    flexShrink: 1,
  },
  kicker: {
    color: Colors.text.secondary,
    fontSize: 9,
    fontWeight: Typography.weight.medium,
  },
  countdown: {
    color: Colors.text.primary,
    fontSize: 20,
    fontWeight: Typography.weight.black,
    textAlign: 'center',
    fontFamily: Typography.fontFamily.mono,
    letterSpacing: 0,
    lineHeight: 23,
    alignSelf: 'stretch',
  },
  timeGrid: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'stretch',
  },
  timeCell: {
    flex: 1,
    minWidth: 0,
    borderRadius: 11,
    paddingVertical: 7,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(215, 217, 94, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(215, 217, 94, 0.18)',
  },
  unit: {
    color: Colors.text.secondary,
    fontSize: 8,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.4,
  },
  footer: {
    alignSelf: 'stretch',
    borderRadius: 15,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.24)',
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  matchInfo: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minWidth: 0,
    borderRadius: 15,
    paddingHorizontal: 9,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  matchTitle: {
    alignSelf: 'stretch',
    color: Colors.text.primary,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: Typography.weight.bold,
    textAlign: 'center',
  },
  matchTime: {
    alignSelf: 'stretch',
    color: Colors.text.secondary,
    fontSize: 10,
    fontWeight: Typography.weight.medium,
    textAlign: 'center',
  },
  progressWrap: {
    marginTop: 8,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    color: Colors.text.secondary,
    fontSize: Typography.size.sm,
    textAlign: 'center',
  },
  loadingMatch: {
    height: 54,
    borderRadius: 15,
    backgroundColor: '#2A2A2A',
  },
  loadingTimer: {
    height: 76,
    borderRadius: 15,
    backgroundColor: '#2A2A2A',
  },
});

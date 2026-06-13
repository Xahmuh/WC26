import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { Card } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { Colors, Typography } from '@/constants';
import { useMatches } from '@/hooks/useMatches';
import { formatCountdownParts, formatShortMatchTime } from '@/components/home/homeUtils';
import { toTimestamp } from '@/lib/dates';
import { isPredictionOpenStatus } from '@/lib/matchStatus';
import type { Match } from '@/types';

const KICKOFF_PROGRESS_WINDOW_MS = 72 * 60 * 60 * 1000;

function isScheduledMatch(match: Match): boolean {
  const normalizedStatus = match.status.toUpperCase();
  return normalizedStatus === 'UPCOMING' || isPredictionOpenStatus(match.status);
}

function hasConcreteTeams(match: Match): boolean {
  return !match.is_placeholder && Boolean(match.home_team?.id) && Boolean(match.away_team?.id);
}

function kickoffTimestamp(match: Match): number {
  const timestamp = toTimestamp(match.kickoff_time);
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

function getKickoffProgress(remainingMs: number): number {
  return Math.min(1, Math.max(0, 1 - remainingMs / KICKOFF_PROGRESS_WINDOW_MS));
}

function WhistleWatermark(): React.JSX.Element {
  return (
    <View pointerEvents="none" style={styles.whistleArt}>
      <View style={styles.whistleCord} />
      <View style={styles.whistleCordAlt} />
      <View style={styles.whistleBody}>
        <View style={styles.whistleHole} />
        <View style={styles.whistleCut} />
      </View>
      <View style={styles.whistleMouthpiece} />
      <View style={styles.whistleRing} />
      <View style={styles.whistleSignalLineOne} />
      <View style={styles.whistleSignalLineTwo} />
    </View>
  );
}

function CountdownCardShell({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <Card style={styles.card} padding={0}>
      <LinearGradient
        pointerEvents="none"
        colors={['#181B13', '#10130E', '#080908']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackdrop}
      />
      <View pointerEvents="none" style={styles.pitchMarkOne} />
      <View pointerEvents="none" style={styles.pitchMarkTwo} />
      <WhistleWatermark />
      <View style={styles.cardContent}>
        {children}
      </View>
    </Card>
  );
}

function KickoffProgressFooter({ progress }: { progress: number }): React.JSX.Element {
  const percentage = Math.round(progress * 100);

  return (
    <View style={styles.progressFooter}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>Kickoff proximity</Text>
        <Text style={styles.progressValue}>{percentage}%</Text>
      </View>
      <View style={styles.kickoffProgressTrack}>
        <LinearGradient
          colors={['#d7d95e', '#f4f6a0']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.kickoffProgressFill, { width: `${percentage}%` }]}
        />
      </View>
    </View>
  );
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
      <CountdownCardShell>
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
      </CountdownCardShell>
    );
  }

  if (!nextMatch) {
    return (
      <CountdownCardShell>
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
      </CountdownCardShell>
    );
  }

  const countdown = formatCountdownParts(nextMatch.kickoff_time);
  const timeSegments = countdown.days > 0
    ? [String(countdown.days), countdown.hours, countdown.minutes]
    : [countdown.hours, countdown.minutes, countdown.seconds];
  const units = countdown.days > 0 ? ['DAYS', 'HRS', 'MINS'] : ['HRS', 'MINS', 'SECS'];
  const progress = getKickoffProgress(countdown.remainingMs);
  const matchup = `${getTeamName(nextMatch, 'home')} vs ${getTeamName(nextMatch, 'away')}`;

  return (
    <CountdownCardShell>
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

        <KickoffProgressFooter progress={progress} />
      </Pressable>
    </CountdownCardShell>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    minHeight: 214,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#0F1110',
    borderColor: Colors.accent.limeBorder,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 10,
    padding: 14,
    position: 'relative',
    zIndex: 2,
  },
  gradientBackdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  pitchMarkOne: {
    position: 'absolute',
    left: -26,
    top: 42,
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 1,
    borderColor: 'rgba(215, 217, 94, 0.08)',
  },
  pitchMarkTwo: {
    position: 'absolute',
    right: -52,
    bottom: -28,
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  whistleArt: {
    position: 'absolute',
    right: -8,
    top: 42,
    width: 146,
    height: 116,
    opacity: 0.34,
    transform: [{ rotate: '-14deg' }],
  },
  whistleCord: {
    position: 'absolute',
    right: 34,
    top: -16,
    width: 94,
    height: 94,
    borderRadius: 47,
    borderWidth: 2,
    borderColor: 'rgba(215, 217, 94, 0.20)',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    transform: [{ rotate: '-10deg' }],
  },
  whistleCordAlt: {
    position: 'absolute',
    right: 52,
    top: -8,
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  whistleBody: {
    position: 'absolute',
    right: 18,
    top: 28,
    width: 86,
    height: 58,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(215, 217, 94, 0.42)',
    backgroundColor: 'rgba(215, 217, 94, 0.11)',
  },
  whistleHole: {
    position: 'absolute',
    left: 18,
    top: 15,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(215, 217, 94, 0.45)',
    backgroundColor: 'rgba(9, 10, 9, 0.62)',
  },
  whistleCut: {
    position: 'absolute',
    right: 8,
    top: 12,
    width: 25,
    height: 12,
    borderRadius: 5,
    backgroundColor: 'rgba(9, 10, 9, 0.54)',
    borderWidth: 1,
    borderColor: 'rgba(215, 217, 94, 0.28)',
  },
  whistleMouthpiece: {
    position: 'absolute',
    right: 88,
    top: 40,
    width: 44,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'rgba(215, 217, 94, 0.38)',
    backgroundColor: 'rgba(215, 217, 94, 0.08)',
  },
  whistleRing: {
    position: 'absolute',
    right: 0,
    top: 45,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(215, 217, 94, 0.38)',
  },
  whistleSignalLineOne: {
    position: 'absolute',
    left: 2,
    top: 48,
    width: 28,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(215, 217, 94, 0.34)',
  },
  whistleSignalLineTwo: {
    position: 'absolute',
    left: 14,
    top: 64,
    width: 20,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
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
    shadowColor: Colors.accent.lime,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
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
    backgroundColor: 'rgba(0, 0, 0, 0.34)',
    borderWidth: 1,
    borderColor: 'rgba(215, 217, 94, 0.16)',
  },
  matchInfo: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minWidth: 0,
    borderRadius: 15,
    paddingHorizontal: 9,
    paddingVertical: 10,
    backgroundColor: 'rgba(8, 9, 8, 0.54)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
  progressFooter: {
    marginTop: 8,
    gap: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  progressLabel: {
    color: Colors.text.tertiary,
    fontSize: 7,
    fontWeight: Typography.weight.black,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  progressValue: {
    color: Colors.accent.lime,
    fontSize: 8,
    fontWeight: Typography.weight.black,
    letterSpacing: 0,
  },
  kickoffProgressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  kickoffProgressFill: {
    height: '100%',
    borderRadius: 999,
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

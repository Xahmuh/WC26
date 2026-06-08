import { StyleSheet, Text, View } from 'react-native';

import { Card, ProgressBar } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import Theme from '@/constants/theme/design-system';
import type { ComputedKPIs } from '@/types/performance';

interface PerformanceSummaryProps {
  kpis: ComputedKPIs;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function formLabel(score: number): string {
  if (score >= 75) return 'Excellent form';
  if (score >= 55) return 'Strong form';
  if (score >= 35) return 'Building form';
  return 'Getting started';
}

export function PerformanceSummary({ kpis }: PerformanceSummaryProps): React.JSX.Element {
  const score = Math.round(
    clampPercent(kpis.accuracyRate) * 0.55 +
      clampPercent(kpis.participationRate) * 0.25 +
      clampPercent(kpis.exactScoreAccuracy) * 0.2
  );

  const streakValue = kpis.streak.current_streak;
  const streakText =
    kpis.streak.streak_type === 'none' || streakValue === 0
      ? 'No active streak'
      : `${streakValue} ${kpis.streak.streak_type === 'win' ? 'win' : 'loss'} streak`;

  return (
    <Card variant="accent" padding={16} style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>Overall form</Text>
          <Text style={styles.title}>{formLabel(score)}</Text>
        </View>
        <View style={styles.scoreBadge}>
          <Text style={styles.score}>{score}</Text>
          <Text style={styles.scoreLabel}>score</Text>
        </View>
      </View>

      <View style={styles.quickRow}>
        <SummaryPill icon="target" label="Accuracy" value={`${kpis.accuracyRate}%`} />
        <SummaryPill icon="star" label="Avg points" value={`${kpis.pointsPerMatch}`} />
        <SummaryPill icon="flame" label="Streak" value={streakValue ? String(streakValue) : '0'} />
      </View>

      <View style={styles.progressBlock}>
        <ProgressMetric label="Prediction accuracy" value={kpis.accuracyRate} />
        <ProgressMetric label="Match coverage" value={kpis.participationRate} />
      </View>

      <Text style={styles.caption} numberOfLines={2}>
        {streakText}. Keep predicting before kickoff to improve coverage and protect your form.
      </Text>
    </Card>
  );
}

function SummaryPill({
  icon,
  label,
  value,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  value: string;
}): React.JSX.Element {
  return (
    <View style={styles.pill}>
      <Icon name={icon} size={14} color={Theme.colors.accent} fixed />
      <View style={styles.pillCopy}>
        <Text style={styles.pillValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
          {value}
        </Text>
        <Text style={styles.pillLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}

function ProgressMetric({ label, value }: { label: string; value: number }): React.JSX.Element {
  const safeValue = clampPercent(value);

  return (
    <View style={styles.progressMetric}>
      <View style={styles.progressLabelRow}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={styles.progressValue}>{safeValue}%</Text>
      </View>
      <ProgressBar progress={safeValue / 100} height={7} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Theme.colors.bgSurface2,
    borderColor: Theme.colors.accentBorder,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: Theme.colors.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 4,
    color: Theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 29,
  },
  scoreBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.accentBorder,
    backgroundColor: Theme.colors.accentDim,
  },
  score: {
    color: Theme.colors.accent,
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 28,
  },
  scoreLabel: {
    color: Theme.colors.textSecondary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  quickRow: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    flex: 1,
    minWidth: 0,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Theme.colors.bgBorder,
    backgroundColor: Theme.colors.bgSurface3,
    paddingHorizontal: 10,
  },
  pillCopy: {
    flex: 1,
    minWidth: 0,
  },
  pillValue: {
    color: Theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 18,
  },
  pillLabel: {
    marginTop: 2,
    color: Theme.colors.textTertiary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  progressBlock: {
    marginTop: 16,
    gap: 12,
  },
  progressMetric: {
    gap: 7,
  },
  progressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  progressLabel: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  progressValue: {
    color: Theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: '900',
  },
  caption: {
    marginTop: 14,
    color: Theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
});

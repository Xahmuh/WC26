import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui';
import Theme from '@/constants/theme/design-system';
import { computeFormScore, getFormLabel } from '@/lib/performanceMetrics';
import type { ComputedKPIs } from '@/types/performance';

interface PerformanceSummaryProps {
  kpis: ComputedKPIs;
}

export function PerformanceSummary({ kpis }: PerformanceSummaryProps): React.JSX.Element {
  const score = computeFormScore(kpis);

  return (
    <Card variant="accent" padding={16} style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>Form score</Text>
          <Text style={styles.title}>{getFormLabel(score)}</Text>
        </View>
        <View style={styles.scoreBadge}>
          <Text style={styles.score}>{score}</Text>
          <Text style={styles.scoreLabel}>form</Text>
        </View>
      </View>

      <Text style={styles.scoreNote}>
        The circle score is out of 100. It combines correct picks, prediction activity, and exact scores.
      </Text>
      <View style={styles.formulaRow}>
        <Text style={styles.formulaPill}>Correct 55%</Text>
        <Text style={styles.formulaPill}>Activity 25%</Text>
        <Text style={styles.formulaPill}>Exact 20%</Text>
      </View>
    </Card>
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
  scoreNote: {
    marginTop: 10,
    color: Theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  formulaRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  formulaPill: {
    minHeight: 26,
    overflow: 'hidden',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Theme.colors.accentBorder,
    backgroundColor: 'rgba(255,255,255,0.04)',
    color: Theme.colors.textPrimary,
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 24,
    paddingHorizontal: 9,
    textTransform: 'uppercase',
  },
});

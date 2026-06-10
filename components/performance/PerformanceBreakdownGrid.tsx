import { Text, View, StyleSheet } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import Theme from '@/constants/theme/design-system';
import type { PerformancePointsBreakdown } from '@/types/performance';

interface PerformanceBreakdownGridProps {
  breakdown: PerformancePointsBreakdown;
}

type BreakdownCard = {
  key: string;
  title: string;
  value: number;
  subtitle: string;
  icon: IconName;
  accentColor: string;
};

export function PerformanceBreakdownGrid({
  breakdown,
}: PerformanceBreakdownGridProps): React.JSX.Element {
  const cards: BreakdownCard[] = [
    {
      key: 'outcome',
      title: 'Correct Winner',
      value: breakdown.outcome_points,
      subtitle: 'Winner / qualifier',
      icon: 'target',
      accentColor: Theme.colors.accent,
    },
    {
      key: 'exact',
      title: 'Exact Bonus',
      value: breakdown.exact_bonus,
      subtitle: 'Perfect scoreline',
      icon: 'trophy',
      accentColor: Theme.colors.gold,
    },
    {
      key: 'matches',
      title: 'Match Points',
      value: breakdown.match_points,
      subtitle: 'Prediction total',
      icon: 'matches',
      accentColor: Theme.colors.success,
    },
    {
      key: 'questions',
      title: 'Questions',
      value: breakdown.question_points,
      subtitle: 'Extra prediction picks',
      icon: 'star',
      accentColor: Theme.colors.warning,
    },
  ];
  const rows = [cards.slice(0, 2), cards.slice(2, 4)];

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Points</Text>
        <Text style={styles.title}>Breakdown</Text>
      </View>

      <View style={styles.grid}>
        {rows.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.row}>
            {row.map((card) => {
              const accentColor = card.value > 0 ? card.accentColor : Theme.colors.textTertiary;

              return (
                <View key={card.key} style={styles.cell}>
                  <View style={styles.breakdownCard}>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardTitleBlock}>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                          {card.title}
                        </Text>
                        <Text style={styles.cardSubtitle} numberOfLines={1}>
                          {card.subtitle}
                        </Text>
                      </View>
                      <View style={[styles.iconBadge, { borderColor: `${accentColor}33` }]}>
                        <Icon name={card.icon} size={15} color={accentColor} fixed />
                      </View>
                    </View>

                    <View style={styles.valueRow}>
                      <View style={[styles.valueRail, { backgroundColor: accentColor }]} />
                      <Text
                        style={[styles.cardValue, { color: accentColor }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.74}
                      >
                        +{card.value}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  header: {
    gap: 3,
  },
  eyebrow: {
    color: Theme.colors.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    color: Theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 25,
  },
  grid: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
  },
  cell: {
    flex: 1,
    minWidth: 0,
  },
  breakdownCard: {
    height: 118,
    overflow: 'hidden',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.colors.accentBorder,
    backgroundColor: Theme.colors.bgSurface2,
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitleBlock: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  cardTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  cardSubtitle: {
    color: Theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 13,
  },
  iconBadge: {
    width: 32,
    height: 32,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: Theme.colors.bgSurface3,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    minWidth: 0,
  },
  valueRail: {
    width: 22,
    height: 3,
    flexShrink: 0,
    borderRadius: 999,
  },
  cardValue: {
    flex: 1,
    minWidth: 0,
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 30,
  },
});

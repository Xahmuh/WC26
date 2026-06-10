import { View } from 'react-native';

import Theme from '@/constants/theme/design-system';
import { useResponsive } from '@/lib/responsive';
import { KpiCard } from '@/components/performance/KpiCard';
import type { ComputedKPIs } from '@/types/performance';

interface KpiGridProps {
  kpis: ComputedKPIs;
}

type KpiCardConfig = {
  key: string;
  title: string;
  value: string;
  subtitle: string;
  icon: Parameters<typeof KpiCard>[0]['icon'];
  accentColor: string;
};

function chunkCards<T>(cards: T[], columns: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < cards.length; i += columns) {
    rows.push(cards.slice(i, i + columns));
  }
  return rows;
}

function streakLabel(streak: ComputedKPIs['streak']): { value: string; subtitle: string; color: string } {
  if (streak.streak_type === 'none' || streak.current_streak === 0) {
    return {
      value: '0',
      subtitle: 'No current run',
      color: Theme.colors.textSecondary,
    };
  }

  return {
    value: String(streak.current_streak),
    subtitle: streak.streak_type === 'win' ? 'Correct picks in a row' : 'Missed picks in a row',
    color: streak.streak_type === 'win' ? Theme.colors.accent : Theme.colors.live,
  };
}

export function KpiGrid({ kpis }: KpiGridProps): React.JSX.Element {
  const { isSmall, isTablet, isDesktop } = useResponsive();
  const streak = streakLabel(kpis.streak);
  const columns = isSmall ? 1 : isTablet || isDesktop ? 3 : 2;

  const cards: KpiCardConfig[] = [
    {
      key: 'accuracy',
      title: 'Correct Picks',
      value: `${kpis.accuracyRate}%`,
      subtitle: 'Winner or draw right',
      icon: 'target',
      accentColor: kpis.accuracyRate >= 60 ? Theme.colors.accent : Theme.colors.textPrimary,
    },
    {
      key: 'exact',
      title: 'Exact Scores',
      value: `${kpis.exactScoreAccuracy}%`,
      subtitle: 'Full score right',
      icon: 'star',
      accentColor: kpis.exactScoreAccuracy >= 15 ? Theme.colors.warning : Theme.colors.textPrimary,
    },
    {
      key: 'ppm',
      title: 'Avg Points',
      value: `${kpis.pointsPerMatch} pts`,
      subtitle: 'Per scored match',
      icon: 'star',
      accentColor: Theme.colors.accent,
    },
    {
      key: 'streak',
      title: 'Current Run',
      value: streak.value,
      subtitle: streak.subtitle,
      icon: 'flame',
      accentColor: streak.color,
    },
    {
      key: 'participation',
      title: 'Activity',
      value: `${kpis.participationRate}%`,
      subtitle: 'Submitted picks',
      icon: 'trendingUp',
      accentColor: kpis.participationRate >= 70 ? Theme.colors.accent : Theme.colors.textPrimary,
    },
  ];

  const rows = chunkCards(cards, columns);

  return (
    <View className="gap-3">
      {rows.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} className="flex-row gap-3">
          {row.map((card) => (
            <View key={card.key} className="flex-1 min-w-0">
              <KpiCard
                title={card.title}
                value={card.value}
                subtitle={card.subtitle}
                icon={card.icon}
                accentColor={card.accentColor}
              />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

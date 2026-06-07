import { View } from 'react-native';

import Theme from '@/constants/theme/design-system';
import { KpiCard } from '@/components/performance/KpiCard';
import type { ComputedKPIs } from '@/types/performance';

interface KpiGridProps {
  kpis: ComputedKPIs;
}

function streakLabel(streak: ComputedKPIs['streak']): { text: string; color: string } {
  if (streak.streak_type === 'none' || streak.current_streak === 0) {
    return { text: '—', color: Theme.colors.textSecondary };
  }
  const prefix = streak.streak_type === 'win' ? '🔥' : '❄️';
  const label = streak.streak_type === 'win' ? 'Win' : 'Loss';
  const color = streak.streak_type === 'win' ? Theme.colors.accent : Theme.colors.live;
  return { text: `${prefix} ${streak.current_streak} ${label}`, color };
}

export function KpiGrid({ kpis }: KpiGridProps): React.JSX.Element {
  const streak = streakLabel(kpis.streak);

  const cards = [
    {
      key: 'accuracy',
      title: 'Accuracy Rate',
      value: `${kpis.accuracyRate}%`,
      subtitle: 'Correct outcomes',
      icon: 'target' as const,
      accentColor: kpis.accuracyRate >= 60 ? Theme.colors.accent : Theme.colors.textPrimary,
    },
    {
      key: 'exact',
      title: 'Exact Score',
      value: `${kpis.exactScoreAccuracy}%`,
      subtitle: 'Perfect scorelines',
      icon: 'star' as const,
      accentColor: kpis.exactScoreAccuracy >= 15 ? '#FDE047' : Theme.colors.textPrimary,
    },
    {
      key: 'ppm',
      title: 'Points / Match',
      value: `${kpis.pointsPerMatch} pts`,
      subtitle: 'Average return',
      icon: 'star' as const,
      accentColor: Theme.colors.accent,
    },
    {
      key: 'streak',
      title: 'Streak',
      value: streak.text,
      subtitle: 'Latest finished matches',
      icon: 'flame' as const,
      accentColor: streak.color,
    },
    {
      key: 'participation',
      title: 'Participation',
      value: `${kpis.participationRate}%`,
      subtitle: 'Matches covered',
      icon: 'trendingUp' as const,
      accentColor: kpis.participationRate >= 70 ? Theme.colors.accent : Theme.colors.textPrimary,
    },
  ];

  const rows: (typeof cards)[] = [];
  for (let i = 0; i < cards.length; i += 2) {
    rows.push(cards.slice(i, i + 2));
  }

  return (
    <View className="gap-3">
      {rows.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} className="flex-row gap-3">
          {row.map((card) => (
            <View key={card.key} className="flex-1">
              <KpiCard
                title={card.title}
                value={card.value}
                subtitle={card.subtitle}
                icon={card.icon}
                accentColor={card.accentColor}
              />
            </View>
          ))}
          {row.length === 1 ? <View className="flex-1" /> : null}
        </View>
      ))}
    </View>
  );
}

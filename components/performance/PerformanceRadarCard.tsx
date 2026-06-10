import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText, TSpan } from 'react-native-svg';

import { Card } from '@/components/ui';
import Theme from '@/constants/theme/design-system';
import { useResponsive } from '@/lib/responsive';
import type { ComputedKPIs } from '@/types/performance';

interface PerformanceRadarCardProps {
  kpis: ComputedKPIs;
  maxBasePoints?: number;
}

type RadarMetric = {
  key: string;
  label: string[];
  value: number;
  displayValue: string;
};

const VIEWBOX_SIZE = 240;
const CENTER = VIEWBOX_SIZE / 2;
const RADAR_RADIUS = 70;
const LABEL_RADIUS = 96;
const MAX_STREAK_FOR_RADAR = 5;

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function pointFor(index: number, total: number, radius: number): { x: number; y: number } {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / total;
  return {
    x: CENTER + Math.cos(angle) * radius,
    y: CENTER + Math.sin(angle) * radius,
  };
}

function pointsToString(points: Array<{ x: number; y: number }>): string {
  return points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
}

function gridPoints(total: number, level: number): string {
  const radius = (RADAR_RADIUS * level) / 4;
  return pointsToString(Array.from({ length: total }, (_, index) => pointFor(index, total, radius)));
}

function metricPoints(metrics: RadarMetric[], reveal: number): string {
  return pointsToString(
    metrics.map((metric, index) => {
      const radius = RADAR_RADIUS * (clampPercent(metric.value) / 100) * reveal;
      return pointFor(index, metrics.length, radius);
    })
  );
}

function labelAnchor(point: { x: number; y: number }): 'start' | 'middle' | 'end' {
  if (point.x < CENTER - 30) return 'start';
  if (point.x > CENTER + 30) return 'end';
  return 'middle';
}

function labelX(point: { x: number; y: number }): number {
  const anchor = labelAnchor(point);
  if (anchor === 'start') return Math.max(12, point.x - 4);
  if (anchor === 'end') return Math.min(VIEWBOX_SIZE - 12, point.x + 4);
  return point.x;
}

function radarMetrics(kpis: ComputedKPIs, maxBasePoints?: number): RadarMetric[] {
  const pointsScale = maxBasePoints && maxBasePoints > 0
    ? maxBasePoints
    : Math.max(kpis.pointsPerMatch, 1);
  const pointsIndex = clampPercent(Math.round((kpis.pointsPerMatch / pointsScale) * 100));
  const winStreak = kpis.streak.streak_type === 'win' ? kpis.streak.current_streak : 0;
  const streakIndex = clampPercent(
    Math.round((winStreak / MAX_STREAK_FOR_RADAR) * 100)
  );

  return [
    {
      key: 'correct',
      label: ['Correct', 'Picks'],
      value: clampPercent(kpis.accuracyRate),
      displayValue: `${kpis.accuracyRate}%`,
    },
    {
      key: 'exact',
      label: ['Exact', 'Scores'],
      value: clampPercent(kpis.exactScoreAccuracy),
      displayValue: `${kpis.exactScoreAccuracy}%`,
    },
    {
      key: 'points',
      label: ['Average', 'Points'],
      value: pointsIndex,
      displayValue: `${kpis.pointsPerMatch}`,
    },
    {
      key: 'run',
      label: ['Current', 'Run'],
      value: streakIndex,
      displayValue: String(winStreak),
    },
    {
      key: 'activity',
      label: ['Prediction', 'Activity'],
      value: clampPercent(kpis.participationRate),
      displayValue: `${kpis.participationRate}%`,
    },
  ];
}

export function PerformanceRadarCard({ kpis, maxBasePoints }: PerformanceRadarCardProps): React.JSX.Element {
  const { width, isSmall, scale: rs } = useResponsive();
  const [reveal, setReveal] = useState(0);
  const [pulse, setPulse] = useState(0);
  const revealValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(0)).current;

  const metrics = useMemo(() => radarMetrics(kpis, maxBasePoints), [kpis, maxBasePoints]);
  const chartSize = Math.min(rs(isSmall ? 252 : 292), Math.max(220, width - 64), 340);
  const polygonPoints = metricPoints(metrics, reveal);
  const pulseRadius = RADAR_RADIUS + pulse * 9;
  const pulseOpacity = 0.35 * (1 - pulse);

  useEffect(() => {
    const revealListener = revealValue.addListener(({ value }) => setReveal(value));
    const pulseListener = pulseValue.addListener(({ value }) => setPulse(value));

    revealValue.setValue(0);
    Animated.timing(revealValue, {
      toValue: 1,
      duration: 850,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    pulseValue.setValue(0);
    const pulseLoop = Animated.loop(
      Animated.timing(pulseValue, {
        toValue: 1,
        duration: 1400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      })
    );
    pulseLoop.start();

    return () => {
      revealValue.removeListener(revealListener);
      pulseValue.removeListener(pulseListener);
      revealValue.stopAnimation();
      pulseValue.stopAnimation();
      pulseLoop.stop();
    };
  }, [pulseValue, revealValue, kpis]);

  return (
    <Card padding={16} style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>KPI radar</Text>
          <Text style={styles.title}>Prediction Profile</Text>
        </View>
      </View>

      <View style={[styles.chartWrap, { width: chartSize, height: chartSize }]}>
        <Svg width={chartSize} height={chartSize} viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}>
          {[1, 2, 3, 4].map((level) => (
            <Polygon
              key={level}
              points={gridPoints(metrics.length, level)}
              fill={level === 4 ? 'rgba(0,0,0,0.34)' : 'transparent'}
              stroke={level === 4 ? 'rgba(215,217,94,0.28)' : 'rgba(255,255,255,0.16)'}
              strokeWidth={level === 4 ? 1.6 : 1}
            />
          ))}

          {metrics.map((metric, index) => {
            const end = pointFor(index, metrics.length, RADAR_RADIUS);
            const labelPoint = pointFor(index, metrics.length, LABEL_RADIUS);
            const anchor = labelAnchor(labelPoint);
            const x = labelX(labelPoint);
            const labelY = labelPoint.y - 4;

            return (
              <React.Fragment key={metric.key}>
                <Line
                  x1={CENTER}
                  y1={CENTER}
                  x2={end.x}
                  y2={end.y}
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth={1}
                />
                <SvgText
                  x={x}
                  y={labelY}
                  fill={Theme.colors.textPrimary}
                  fontSize={7}
                  fontWeight="800"
                  textAnchor={anchor}
                >
                  {metric.label.map((line, lineIndex) => (
                    <TSpan key={line} x={x} dy={lineIndex === 0 ? 0 : 8}>
                      {line}
                    </TSpan>
                  ))}
                </SvgText>
                <SvgText
                  x={x}
                  y={labelY + 22}
                  fill={Theme.colors.accent}
                  fontSize={8}
                  fontWeight="900"
                  textAnchor={anchor}
                >
                  {metric.displayValue}
                </SvgText>
              </React.Fragment>
            );
          })}

          <Circle
            cx={CENTER}
            cy={CENTER}
            r={pulseRadius}
            fill="transparent"
            stroke={Theme.colors.accent}
            strokeWidth={1.2}
            opacity={pulseOpacity}
          />
          <Polygon
            points={polygonPoints}
            fill="rgba(215,217,94,0.18)"
            stroke={Theme.colors.accent}
            strokeWidth={3}
            strokeLinejoin="round"
          />
          {metrics.map((metric, index) => {
            const radius = RADAR_RADIUS * (clampPercent(metric.value) / 100) * reveal;
            const point = pointFor(index, metrics.length, radius);

            return (
              <Circle
                key={`${metric.key}-dot`}
                cx={point.x}
                cy={point.y}
                r={3.8}
                fill={Theme.colors.accent}
                stroke="#000000"
                strokeWidth={1.4}
              />
            );
          })}
        </Svg>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Theme.colors.bgSurface2,
    borderColor: Theme.colors.accentBorder,
  },
  headerRow: {
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
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 4,
    color: Theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 27,
  },
  chartWrap: {
    marginTop: 14,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});

import { View, StyleSheet } from 'react-native';

import { Colors } from '@/constants';

interface ProgressBarProps {
  progress: number;
  height?: number;
  color?: string;
  backgroundColor?: string;
}

export function ProgressBar({
  progress,
  height = 6,
  color = Colors.accent.lime,
  backgroundColor = 'rgba(255,255,255,0.1)',
}: ProgressBarProps): React.JSX.Element {
  const clampedProgress = Math.min(Math.max(progress, 0), 1);

  return (
    <View style={[styles.track, { height, backgroundColor, borderRadius: height / 2 }]}>
      <View
        style={[
          styles.fill,
          {
            width: `${clampedProgress * 100}%`,
            height,
            backgroundColor: color,
            borderRadius: height / 2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {},
});


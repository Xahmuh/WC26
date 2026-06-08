import React, { useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Image, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import Theme from '@/constants/theme/design-system';
import { ms, useResponsive } from '@/lib/responsive';
import type { PredictionQuestion } from '@/types';

import { PredictionCardBadge } from './PredictionCardBadge';
import { PredictionStatusChip, type PredictionCardStatus } from './PredictionStatusChip';

export const CARD_GAP = ms(10);
export const CARD_RADIUS = ms(12);

const HEIGHT_RATIO = 1.45;

export function getCardWidth(width: number, isTablet: boolean): number {
  const computed = Math.round(width * (isTablet ? 0.24 : 0.40));
  // Limit max width for web to avoid layout breaking on large screens
  return Math.min(computed, 220);
}

interface Props {
  question: PredictionQuestion;
  predictionRecord: { prediction: string; status: 'pending' | 'approved' | 'rejected' } | undefined;
  onPress: () => void;
}

export function PredictionCard({ question, predictionRecord, onPress }: Props): React.JSX.Element {
  const { width, isTablet } = useResponsive();

  const cardWidth  = getCardWidth(width, isTablet);
  const cardHeight = Math.round(cardWidth * HEIGHT_RATIO);

  const isResolved  = question.status === 'resolved';
  const lockAt      = question.lock_at;
  const isLocked    = question.status === 'closed' || isResolved;
  const isSubmitted = !!predictionRecord?.prediction;

  const status: PredictionCardStatus = isLocked ? 'closed' : isSubmitted ? 'submitted' : 'open';

  // Micro-animations for press interaction
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.96,
        useNativeDriver: Platform.OS !== 'web',
        speed: 40,
        bounciness: 3,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.92,
        duration: 150,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: Platform.OS !== 'web',
        speed: 40,
        bounciness: 3,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${question.question_text}. ${question.points} points. ${isLocked ? 'Locked' : 'Open for prediction'}`}
      style={{
        width: cardWidth,
        height: cardHeight,
      }}
    >
      <Animated.View
        style={[
          styles.cardAnimatedContainer,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
            borderColor: isLocked ? '#1A2C4C' : Theme.colors.accent + '33', // 20% opacity lime border
          },
        ]}
      >
        <LinearGradient
          colors={isLocked ? ['#0E1624', '#060B12'] : ['#192B4F', '#0D172A', '#050A14']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />

        {question.card_image_url ? (
          <>
            <Image
              source={{ uri: question.card_image_url }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['rgba(5,10,20,0.08)', 'rgba(5,10,20,0.20)', 'rgba(5,10,20,0.72)']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
          </>
        ) : null}
        {/* Top row */}
        <View style={styles.topRow}>
          <PredictionStatusChip status={status} closesAt={lockAt} />
        </View>

        {/* Center — badge */}
        <View style={styles.center}>
          <PredictionCardBadge points={question.points} isLocked={isLocked} />
        </View>

        {/* Bottom — question text */}
        <View style={styles.bottomContent}>
          <Text
            style={[
              styles.title,
              { color: isLocked ? Theme.colors.textTertiary : Theme.colors.textPrimary },
            ]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {question.question_text}
          </Text>

          {isSubmitted && (
            <View style={styles.submittedRow}>
              <Text
                style={[styles.submittedText, { color: Theme.colors.accent }]}
                accessibilityLiveRegion="polite"
              >
                Your prediction submitted
              </Text>
            </View>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardAnimatedContainer: {
    flex: 1,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    padding: ms(10),
    overflow: 'hidden',
    justifyContent: 'flex-start',
    backgroundColor: Theme.colors.bgSurface2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    zIndex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: ms(12),
    zIndex: 1,
  },
  bottomContent: {
    gap: ms(4),
    zIndex: 1,
  },
  title: {
    fontSize: ms(12),
    fontWeight: '700',
    lineHeight: ms(16),
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  submittedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ms(3),
    marginTop: ms(2),
  },
  submittedText: {
    fontSize: ms(9),
    fontWeight: '600',
  },

});

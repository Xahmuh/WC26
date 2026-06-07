// ============================================================================
// PredictionCarousel — horizontal snap-scrolling row of PredictionCards.
// ============================================================================

import React from 'react';
import { ScrollView } from 'react-native';

import { ms, useResponsive } from '@/lib/responsive';
import type { PredictionQuestion } from '@/types';

import { PredictionCard, CARD_GAP, getCardWidth } from './PredictionCard';

const SIDE_INSET = ms(16);

interface Props {
  questions: PredictionQuestion[];
  predictionRecords: Map<string, { prediction: string; status: 'pending' | 'approved' | 'rejected' }>;
  onCardPress: (question: PredictionQuestion) => void;
}

export function PredictionCarousel({ questions, predictionRecords, onCardPress }: Props): React.JSX.Element {
  const { width, isTablet } = useResponsive();
  const cardWidth = getCardWidth(width, isTablet);

  return (
    <ScrollView
      horizontal
      nestedScrollEnabled
      showsHorizontalScrollIndicator={false}
      snapToInterval={cardWidth + CARD_GAP}
      decelerationRate="fast"
      contentContainerStyle={{ paddingHorizontal: SIDE_INSET, gap: CARD_GAP }}
      accessibilityLabel="Tournament predictions carousel"
    >
      {questions.map((question) => (
        // ← شيلنا الـ View wrapper — كان بيسبب الانكماش
        <PredictionCard
          key={question.id}
          question={question}
          predictionRecord={predictionRecords.get(question.id)}
          onPress={() => onCardPress(question)}
        />
      ))}
    </ScrollView>
  );
}
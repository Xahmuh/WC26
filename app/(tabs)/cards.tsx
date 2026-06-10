import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { SkeletonBox } from '@/components/ui';
import { Icon, type IconName } from '@/components/ui/Icon';
import { TAB_BAR_CLEARANCE } from '@/components/ui/FloatingTabBar';
import { TabPageHeader } from '@/components/ui/TabPageHeader';
import { Colors, Shadows, Typography } from '@/constants';
import { useScoringRules, useStageCardSettings, useStageMultipliers } from '@/hooks/useAdmin';
import { useMatches } from '@/hooks/useMatches';
import { useMyPoints } from '@/hooks/usePoints';
import { useCardCatalog, useMyCards } from '@/hooks/useUserCards';
import { STAGE_LABELS } from '@/lib/constants';
import { useResponsive } from '@/lib/responsive';
import { DEFAULT_STAGE_MATCH_COUNTS, getStageRank, STAGE_ORDER } from '@/lib/stages';
import type { CardDefinition, MatchStage, UserCard } from '@/types';

type CollectionStatus = 'locked' | 'ready' | 'used' | 'revoked';

const CARD_GAP = 12;
const MAX_CONTENT_WIDTH = 980;
const WEB_SHELL_MAX_WIDTH = 480;
const MIN_CAROUSEL_CARD_WIDTH = 198;
const MIN_NATIVE_CARD_WIDTH = 320;
const MAX_NATIVE_CARD_WIDTH = 360;
const MAX_MOBILE_CAROUSEL_CARD_WIDTH = 304;
const MAX_LARGE_CAROUSEL_CARD_WIDTH = 340;
const CARD_ART_ASPECT_RATIO = 1500 / 1080;
// Name block + footer + progress + gaps + padding. Used as a MIN height so
// cards in a row share a baseline, while still growing for long titles / large
// font scales instead of clipping.
const CARD_CHROME_HEIGHT = 150;
const CARD_SKELETON_ITEMS = [0, 1, 2, 3];

interface CollectionCard {
  definition: CardDefinition;
  userCard: UserCard | null;
  status: CollectionStatus;
  progressPercent: number;
  userStagePoints: number;
  requiredPoints: number;
  totalPossiblePoints: number;
}

function getStatusLabel(status: CollectionStatus): string {
  if (status === 'ready') return 'Ready';
  if (status === 'used') return 'Used';
  if (status === 'revoked') return 'Revoked';
  return 'Locked';
}

function getStatusTone(status: CollectionStatus): 'ready' | 'muted' | 'locked' {
  if (status === 'ready') return 'ready';
  if (status === 'locked') return 'locked';
  return 'muted';
}

function getCollectionStatus(userCard: UserCard | null): CollectionStatus {
  if (!userCard) return 'locked';
  if (userCard.status === 'revoked') return 'revoked';
  if (userCard.status === 'used' || userCard.uses_remaining <= 0) return 'used';
  return 'ready';
}

function getCardDescription(card: CollectionCard): string {
  return (
    card.definition.description ??
    `Reach ${card.definition.threshold_percent}% of ${STAGE_LABELS[card.definition.award_stage]} points to unlock.`
  );
}

function getCardArtHeight(width: number): number {
  return Math.round(width * CARD_ART_ASPECT_RATIO);
}

function getCardMinHeight(width: number): number {
  return getCardArtHeight(width) + CARD_CHROME_HEIGHT;
}

function getCarouselCardWidth(viewportWidth: number): number {
  if (viewportWidth <= 0) return 240;

  if (Platform.OS !== 'web') {
    const sidePeekRatio = viewportWidth >= 700 ? 0.08 : 0.07;
    const sidePeek = Math.max(18, Math.round(viewportWidth * sidePeekRatio));
    const targetWidth = viewportWidth - sidePeek * 2;

    return Math.round(
      Math.min(viewportWidth, Math.max(MIN_CAROUSEL_CARD_WIDTH, targetWidth))
    );
  }

  const maxWidth =
    viewportWidth >= 700 ? MAX_LARGE_CAROUSEL_CARD_WIDTH : MAX_MOBILE_CAROUSEL_CARD_WIDTH;
  const sidePeek = viewportWidth < 360 ? 26 : viewportWidth >= 700 ? 72 : 38;
  const targetWidth = viewportWidth - sidePeek * 2;

  return Math.round(
    Math.min(viewportWidth, Math.min(maxWidth, Math.max(MIN_CAROUSEL_CARD_WIDTH, targetWidth)))
  );
}

function buildCollection(input: {
  definitions: CardDefinition[];
  userCards: UserCard[];
  matches: ReturnType<typeof useMatches>['data'];
  points: ReturnType<typeof useMyPoints>['data'];
  stageSettings: Array<{ stage: MatchStage; expected_matches: number }> | undefined;
  stageMultipliers: Array<{ stage: MatchStage; multiplier: number }> | undefined;
  winnerPoints: number;
  exactBonusPoints: number;
}): CollectionCard[] {
  const definitionsById = new Map<string, CardDefinition>();
  input.definitions.forEach((definition) => {
    definitionsById.set(definition.id, definition);
  });
  input.userCards.forEach((userCard) => {
    if (userCard.definition && !definitionsById.has(userCard.definition.id)) {
      definitionsById.set(userCard.definition.id, userCard.definition);
    }
  });

  const userCardsByDefinitionId = new Map(
    input.userCards.map((userCard) => [userCard.card_definition_id, userCard])
  );
  const matches = input.matches ?? [];
  const points = Array.from(input.points?.values() ?? []);
  const maxBasePoints = input.winnerPoints + input.exactBonusPoints;

  const expectedMatchesByStage = new Map<MatchStage, number>();
  STAGE_ORDER.forEach((stage) => {
    expectedMatchesByStage.set(stage, DEFAULT_STAGE_MATCH_COUNTS[stage]);
  });
  input.stageSettings?.forEach((setting) => {
    expectedMatchesByStage.set(setting.stage, setting.expected_matches);
  });

  const defaultMultiplierByStage = new Map<MatchStage, number>();
  input.stageMultipliers?.forEach((row) => {
    defaultMultiplierByStage.set(row.stage, row.multiplier);
  });

  const stageActualMatchCount = new Map<MatchStage, number>();
  const stageActualMultiplierSum = new Map<MatchStage, number>();
  const matchStageById = new Map<string, MatchStage>();
  matches.forEach((match) => {
    matchStageById.set(match.id, match.stage);
    if (match.status === 'POSTPONED' || match.status === 'CANCELLED') return;
    stageActualMatchCount.set(match.stage, (stageActualMatchCount.get(match.stage) ?? 0) + 1);
    stageActualMultiplierSum.set(
      match.stage,
      (stageActualMultiplierSum.get(match.stage) ?? 0) + match.points_multiplier
    );
  });

  const userStagePoints = new Map<MatchStage, number>();
  points.forEach((point) => {
    const stage = matchStageById.get(point.match_id);
    if (!stage) return;
    userStagePoints.set(stage, (userStagePoints.get(stage) ?? 0) + point.total_points);
  });

  return Array.from(definitionsById.values())
    .map((definition) => {
      const userCard = userCardsByDefinitionId.get(definition.id) ?? null;
      const expectedMatches =
        expectedMatchesByStage.get(definition.award_stage) ??
        stageActualMatchCount.get(definition.award_stage) ??
        0;
      const actualMatches = stageActualMatchCount.get(definition.award_stage) ?? 0;
      const actualMultiplierSum = stageActualMultiplierSum.get(definition.award_stage) ?? 0;
      const defaultMultiplier = defaultMultiplierByStage.get(definition.award_stage) ?? 1;
      const missingMatches = Math.max(expectedMatches - actualMatches, 0);
      const totalPossiblePoints =
        maxBasePoints * (actualMultiplierSum + missingMatches * defaultMultiplier);
      const requiredPoints = totalPossiblePoints * (definition.threshold_percent / 100);
      const userPoints = userStagePoints.get(definition.award_stage) ?? 0;
      const unlocked = Boolean(userCard);
      const progressPercent = unlocked
        ? 100
        : requiredPoints > 0
          ? Math.min(100, (userPoints / requiredPoints) * 100)
          : 0;

      return {
        definition,
        userCard,
        status: getCollectionStatus(userCard),
        progressPercent,
        userStagePoints: userPoints,
        requiredPoints,
        totalPossiblePoints,
      };
    })
    .sort((a, b) => {
      const stageDiff = getStageRank(a.definition.award_stage) - getStageRank(b.definition.award_stage);
      if (stageDiff !== 0) return stageDiff;
      return new Date(a.definition.created_at).getTime() - new Date(b.definition.created_at).getTime();
    });
}

function CollectionCardTile({
  card,
  selected,
  width,
  fluid = false,
  onPress,
}: {
  card: CollectionCard;
  selected: boolean;
  width: number;
  fluid?: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const imageUrl = card.definition.image_url ?? null;
  const tone = getStatusTone(card.status);
  const locked = card.status === 'locked';
  const remainingUses = card.userCard?.uses_remaining ?? card.definition.max_uses;
  const maxUses = card.userCard?.max_uses ?? card.definition.max_uses;
  const artHeight = fluid ? undefined : getCardArtHeight(width);
  const cardHeight = fluid ? undefined : getCardMinHeight(width);
  const showViewDesignButton = Platform.OS === 'web' || fluid || width >= 220;
  const cardSizeStyle = fluid ? { width } : { width, height: cardHeight };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${card.definition.name}. ${getStatusLabel(card.status)} card. Boost plus ${card.definition.multiplier_bonus}. Uses ${remainingUses} of ${maxUses}.`}
      style={({ pressed }) => [
        styles.gameCard,
        fluid && styles.gameCardFluid,
        cardSizeStyle,
        selected && styles.gameCardSelected,
        locked && styles.gameCardLocked,
        pressed && styles.gameCardPressed,
      ]}
    >
      <LinearGradient
        colors={
          selected
            ? ['rgba(215,217,94,0.16)', 'rgba(34,34,34,0.98)', 'rgba(20,20,20,1)']
            : ['rgba(255,255,255,0.07)', 'rgba(34,34,34,0.98)', 'rgba(20,20,20,1)']
        }
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.gameArtFrame, fluid ? styles.gameArtFrameFluid : { height: artHeight }]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} resizeMode="contain" style={styles.gameArtImage} />
        ) : (
          <View style={styles.gameArtFallback}>
            <Icon name="gift" size={34} color={locked ? Colors.text.tertiary : Colors.accent.lime} />
          </View>
        )}

        {locked ? (
          <View style={styles.lockOverlay}>
            <View style={styles.lockMark}>
              <Icon name="lock" size={18} color={Colors.text.primary} fixed />
            </View>
          </View>
        ) : null}

        <View style={[styles.statusBadge, styles[`statusBadge_${tone}`]]}>
          <Text
            style={[styles.statusBadgeText, styles[`statusBadgeText_${tone}`]]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.82}
          >
            {getStatusLabel(card.status)}
          </Text>
        </View>

        {showViewDesignButton ? (
          <View style={styles.viewDesignButton} pointerEvents="none">
            <Icon name="eye" size={14} color={Colors.text.primary} fixed />
          </View>
        ) : null}
      </View>

      <View style={styles.gameNameBlock}>
        <Text style={styles.gameCardTitle} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.76}>
          {card.definition.name}
        </Text>
        <Text style={styles.gameCardStage} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {STAGE_LABELS[card.definition.award_stage]} card
        </Text>
      </View>

      <View style={styles.gameCardFooter}>
        <View style={styles.gameStat}>
          <Text style={styles.gameStatLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>
            Boost
          </Text>
          <Text style={styles.gameStatValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>
            +{card.definition.multiplier_bonus}
          </Text>
        </View>
        <View style={styles.gameStat}>
          <Text style={styles.gameStatLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>
            Uses
          </Text>
          <Text style={styles.gameStatValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>
            {remainingUses}/{maxUses}
          </Text>
        </View>
      </View>

      <View style={styles.miniProgressTrack}>
        <View
          style={[
            styles.miniProgressFill,
            {
              width: `${Math.max(0, Math.min(100, card.progressPercent))}%`,
              backgroundColor: locked ? 'rgba(255,255,255,0.3)' : Colors.accent.lime,
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

function CardDesignPreviewModal({
  card,
  visible,
  onClose,
}: {
  card: CollectionCard | null;
  visible: boolean;
  onClose: () => void;
}): React.JSX.Element | null {
  if (!card) return null;

  const imageUrl = card.definition.image_url ?? null;
  const locked = card.status === 'locked';
  const ready = card.status === 'ready';
  const requiredPointsLabel = Math.ceil(card.requiredPoints);
  const userPointsLabel = Math.floor(card.userStagePoints);
  const remainingUses = card.userCard?.uses_remaining ?? card.definition.max_uses;
  const maxUses = card.userCard?.max_uses ?? card.definition.max_uses;
  const progressPercent = Math.round(card.progressPercent);
  const lockedMessage =
    requiredPointsLabel > 0
      ? `${userPointsLabel}/${requiredPointsLabel} pts earned in ${STAGE_LABELS[card.definition.award_stage]}`
      : `Reach ${card.definition.threshold_percent}% of ${STAGE_LABELS[card.definition.award_stage]} points to unlock.`;
  const usageMessage = locked
    ? lockedMessage
    : card.status === 'used'
      ? `Used card. It was available from ${STAGE_LABELS[card.definition.usable_from_stage]} to ${STAGE_LABELS[card.definition.usable_until_stage]}.`
      : card.status === 'revoked'
        ? 'This card is no longer active.'
        : `Usable from ${STAGE_LABELS[card.definition.usable_from_stage]} to ${STAGE_LABELS[card.definition.usable_until_stage]}.`;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <SafeAreaView style={styles.previewSafeArea} edges={['top', 'bottom']}>
        <View style={styles.previewBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close card design preview"
          />
          <View style={styles.previewSheet}>
            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.previewSheetContent}
            >
              <View style={styles.previewHeader}>
                <View style={styles.previewTitleBlock}>
                  <Text style={styles.previewKicker}>Card details</Text>
                  <Text style={styles.previewTitle} numberOfLines={1}>
                    {card.definition.name}
                  </Text>
                </View>
                <Pressable
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel="Close card design preview"
                  hitSlop={10}
                  style={styles.previewCloseButton}
                >
                  <Icon name="close" size={18} color={Colors.text.primary} fixed />
                </Pressable>
              </View>

              <View style={styles.previewArt}>
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} resizeMode="contain" style={styles.previewArtImage} />
                ) : (
                  <View style={styles.previewFallback}>
                    <Icon name="gift" size={42} color={locked ? Colors.text.tertiary : Colors.accent.lime} />
                    <Text style={styles.previewFallbackText}>No artwork uploaded</Text>
                  </View>
                )}
              </View>

              <View style={styles.previewInfoBlock}>
                <Text style={styles.previewDescription}>{getCardDescription(card)}</Text>
                <Text style={styles.previewUsageText}>{usageMessage}</Text>
              </View>

              <View style={styles.previewMetaGrid}>
                <View style={styles.previewMetaChip}>
                  <Text style={styles.previewMetaLabel}>Boost</Text>
                  <Text style={styles.previewMetaValue}>+{card.definition.multiplier_bonus}</Text>
                </View>
                <View style={styles.previewMetaChip}>
                  <Text style={styles.previewMetaLabel}>Uses</Text>
                  <Text style={styles.previewMetaValue}>{remainingUses}/{maxUses}</Text>
                </View>
                <View style={styles.previewMetaChip}>
                  <Text style={styles.previewMetaLabel}>Progress</Text>
                  <Text style={styles.previewMetaValue}>{progressPercent}%</Text>
                </View>
                <View style={styles.previewMetaChip}>
                  <Text style={styles.previewMetaLabel}>Status</Text>
                  <Text style={styles.previewMetaValue}>{getStatusLabel(card.status)}</Text>
                </View>
              </View>

              <View style={styles.previewProgressTrack}>
                <View
                  style={[
                    styles.previewProgressFill,
                    {
                      width: `${Math.max(0, Math.min(100, card.progressPercent))}%`,
                      backgroundColor: ready ? Colors.accent.lime : 'rgba(255,255,255,0.34)',
                    },
                  ]}
                />
              </View>

              {locked ? (
                <View style={styles.previewLockedNotice}>
                  <View style={styles.previewLockedIcon}>
                    <Icon name="lock" size={15} color={Colors.text.primary} fixed />
                  </View>
                  <View style={styles.previewLockedCopy}>
                    <Text style={styles.previewLockedTitle}>Locked card</Text>
                    <Text style={styles.previewLockedText} numberOfLines={2}>
                      {lockedMessage}
                    </Text>
                  </View>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function CardSkeleton({
  width,
  fluid = false,
}: {
  width: number;
  fluid?: boolean;
}): React.JSX.Element {
  const artHeight = fluid ? undefined : getCardArtHeight(width);
  const cardHeight = fluid ? undefined : getCardMinHeight(width);
  const cardSizeStyle = fluid ? { width } : { width, height: cardHeight };

  return (
    <View
      style={[
        styles.gameCard,
        fluid && styles.gameCardFluid,
        cardSizeStyle,
      ]}
    >
      {fluid ? (
        <View style={styles.gameArtFrameFluid}>
          <SkeletonBox
            width="100%"
            height={1}
            borderRadius={18}
            style={styles.fluidSkeletonFill}
          />
        </View>
      ) : (
        <SkeletonBox width="100%" height={artHeight} borderRadius={18} />
      )}
      <SkeletonBox width="100%" height={56} borderRadius={12} />
      <View style={styles.gameCardFooter}>
        <SkeletonBox width="46%" height={40} borderRadius={12} />
        <SkeletonBox width="46%" height={40} borderRadius={12} />
      </View>
      <SkeletonBox width="100%" height={5} borderRadius={999} />
    </View>
  );
}

function SummaryMetric({
  icon,
  label,
  value,
  muted = false,
}: {
  icon: IconName;
  label: string;
  value: number;
  muted?: boolean;
}): React.JSX.Element {
  return (
    <View style={styles.metricPill}>
      <View style={[styles.metricIcon, muted && styles.metricIconMuted]}>
        <Icon name={icon} size={15} color={muted ? Colors.text.secondary : Colors.accent.lime} fixed />
      </View>
      <View style={styles.metricCopy}>
        <Text style={styles.metricLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.74}>
          {label}
        </Text>
        <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function CardsScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { width } = useResponsive();
  const carouselRef = useRef<ScrollView>(null);
  const layoutWidth = Platform.OS === 'web' ? Math.min(width, WEB_SHELL_MAX_WIDTH) : width;
  const contentHorizontalPadding = layoutWidth < 360 ? 14 : layoutWidth >= 768 ? 24 : 20;
  const contentWidth = Math.min(layoutWidth, MAX_CONTENT_WIDTH);
  const fallbackCarouselWidth = Math.max(0, contentWidth - contentHorizontalPadding * 2);
  const catalogQuery = useCardCatalog();
  const cardsQuery = useMyCards();
  const matchesQuery = useMatches();
  const pointsQuery = useMyPoints();
  const scoringRulesQuery = useScoringRules();
  const stageSettingsQuery = useStageCardSettings();
  const stageMultipliersQuery = useStageMultipliers();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [previewCard, setPreviewCard] = useState<CollectionCard | null>(null);
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);
  const [measuredCarouselWidth, setMeasuredCarouselWidth] = useState(0);
  const carouselWidth = Math.max(measuredCarouselWidth, fallbackCarouselWidth);
  const nativeCardWidth =
    fallbackCarouselWidth >= MIN_NATIVE_CARD_WIDTH
      ? Math.min(MAX_NATIVE_CARD_WIDTH, fallbackCarouselWidth)
      : Math.max(0, fallbackCarouselWidth);
  const cardWidth = Platform.OS === 'web' ? getCarouselCardWidth(carouselWidth) : nativeCardWidth;
  const carouselSidePadding = Math.max(0, Math.floor((carouselWidth - cardWidth) / 2));
  const carouselContentSidePadding = Platform.OS === 'web' ? carouselSidePadding : 0;
  const carouselSnapInterval = Platform.OS === 'web' ? cardWidth + CARD_GAP : carouselWidth;
  const refetchCatalog = catalogQuery.refetch;
  const refetchCards = cardsQuery.refetch;
  const refetchMatches = matchesQuery.refetch;
  const refetchPoints = pointsQuery.refetch;
  const refetchScoringRules = scoringRulesQuery.refetch;
  const refetchStageSettings = stageSettingsQuery.refetch;
  const refetchStageMultipliers = stageMultipliersQuery.refetch;

  const openCardPreview = useCallback((card: CollectionCard) => {
    setSelectedCardId(card.definition.id);
    setPreviewCard(card);
  }, []);

  const handleCarouselLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = Math.max(
      Math.floor(event.nativeEvent.layout.width),
      fallbackCarouselWidth
    );
    setMeasuredCarouselWidth((currentWidth) =>
      Math.abs(currentWidth - nextWidth) > 1 ? nextWidth : currentWidth
    );
  }, [fallbackCarouselWidth]);

  const refetchCardsPage = useCallback(async () => {
    await Promise.all([
      refetchCatalog(),
      refetchCards(),
      refetchMatches(),
      refetchPoints(),
      refetchScoringRules(),
      refetchStageSettings(),
      refetchStageMultipliers(),
    ]);
  }, [
    refetchCards,
    refetchCatalog,
    refetchMatches,
    refetchPoints,
    refetchScoringRules,
    refetchStageMultipliers,
    refetchStageSettings,
  ]);

  useFocusEffect(
    useCallback(() => {
      void refetchCardsPage();
    }, [refetchCardsPage])
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetchCardsPage();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchCardsPage]);

  const collection = useMemo(
    () =>
      buildCollection({
        definitions: catalogQuery.data ?? [],
        userCards: cardsQuery.data ?? [],
        matches: matchesQuery.data,
        points: pointsQuery.data,
        stageSettings: stageSettingsQuery.data,
        stageMultipliers: stageMultipliersQuery.data,
        winnerPoints: scoringRulesQuery.data?.winnerPoints ?? 0,
        exactBonusPoints: scoringRulesQuery.data?.exactBonusPoints ?? 0,
      }),
    [
      cardsQuery.data,
      catalogQuery.data,
      matchesQuery.data,
      pointsQuery.data,
      stageMultipliersQuery.data,
      stageSettingsQuery.data,
      scoringRulesQuery.data?.exactBonusPoints,
      scoringRulesQuery.data?.winnerPoints,
    ]
  );
  const loading =
    catalogQuery.isLoading ||
    cardsQuery.isLoading ||
    matchesQuery.isLoading ||
    pointsQuery.isLoading ||
    scoringRulesQuery.isLoading ||
    stageSettingsQuery.isLoading ||
    stageMultipliersQuery.isLoading;
  const readyCards = collection.filter((card) => card.status === 'ready').length;
  const lockedCards = collection.filter((card) => card.status === 'locked').length;
  const earnedCards = collection.length - lockedCards;
  const selectedCard =
    collection.find((card) => card.definition.id === selectedCardId) ??
    collection.find((card) => card.status === 'ready') ??
    collection[0] ??
    null;

  useEffect(() => {
    if (collection.length === 0) {
      setActiveCarouselIndex(0);
      if (selectedCardId !== null) setSelectedCardId(null);
      return;
    }

    const selectedIndex = selectedCardId
      ? collection.findIndex((card) => card.definition.id === selectedCardId)
      : -1;

    if (selectedIndex >= 0) {
      setActiveCarouselIndex(selectedIndex);
      return;
    }

    setActiveCarouselIndex(0);
    setSelectedCardId(collection[0]?.definition.id ?? null);
  }, [collection, selectedCardId]);

  const selectCarouselCard = useCallback((index: number, shouldScroll = false) => {
    if (collection.length === 0) return;

    const nextIndex = Math.max(0, Math.min(collection.length - 1, index));
    const nextCard = collection[nextIndex];
    if (!nextCard) return;

    setActiveCarouselIndex(nextIndex);
    setSelectedCardId(nextCard.definition.id);

    if (shouldScroll) {
      carouselRef.current?.scrollTo({
        x: nextIndex * carouselSnapInterval,
        animated: true,
      });
    }
  }, [carouselSnapInterval, collection]);

  const handleCarouselMomentumEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (carouselSnapInterval <= 0 || collection.length === 0) return;

    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / carouselSnapInterval);
    selectCarouselCard(nextIndex);
  }, [carouselSnapInterval, collection.length, selectCarouselCard]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <TabPageHeader
        title="My Cards"
        subtitle="Rewards, boosts, and unlocks"
        showBackButton
        fallbackHref="/profile"
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            maxWidth: MAX_CONTENT_WIDTH,
            paddingHorizontal: contentHorizontalPadding,
            paddingBottom: insets.bottom + TAB_BAR_CLEARANCE + 8,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.accent.lime}
            colors={[Colors.accent.lime]}
            progressBackgroundColor={Colors.background.card}
          />
        }
      >
        <View style={styles.collectionPanel}>
          <LinearGradient
            colors={['rgba(215,217,94,0.12)', 'rgba(255,255,255,0.035)', 'rgba(20,20,20,0.98)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.collectionHeader}>
            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>Inventory</Text>
              <Text style={styles.title}>Card collection</Text>
              <Text style={styles.subtitle}>
                Ready boosts, locked rewards, and stage progress in one place.
              </Text>
            </View>
            <View style={styles.totalBadge}>
              <Text style={styles.totalBadgeValue}>{collection.length}</Text>
              <Text style={styles.totalBadgeLabel}>Total</Text>
            </View>
          </View>

          <View style={styles.metricGrid}>
            <SummaryMetric icon="gift" label="Earned" value={earnedCards} />
            <SummaryMetric icon="zap" label="Ready" value={readyCards} />
            <SummaryMetric icon="lock" label="Locked" value={lockedCards} muted />
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Cards</Text>
          <Text style={styles.sectionHint}>{collection.length} total</Text>
        </View>

        {loading ? (
          <View style={styles.cardsCarouselViewport} onLayout={handleCarouselLayout}>
            {Platform.OS === 'web' ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                scrollEnabled={false}
                contentContainerStyle={[
                  styles.cardsCarouselContent,
                  { paddingHorizontal: carouselContentSidePadding },
                ]}
              >
                {CARD_SKELETON_ITEMS.map((item) => (
                  <CardSkeleton key={item} width={cardWidth} />
                ))}
              </ScrollView>
            ) : (
              <View style={styles.nativeShowcase}>
                <CardSkeleton width={cardWidth} fluid />
              </View>
            )}
          </View>
        ) : (
          <View style={styles.cardsCarouselViewport} onLayout={handleCarouselLayout}>
            {Platform.OS === 'web' ? (
              <ScrollView
                ref={carouselRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                disableIntervalMomentum
                snapToAlignment="start"
                snapToInterval={carouselSnapInterval}
                scrollEventThrottle={16}
                onMomentumScrollEnd={handleCarouselMomentumEnd}
                scrollEnabled={collection.length > 1}
                contentContainerStyle={[
                  styles.cardsCarouselContent,
                  { paddingHorizontal: carouselContentSidePadding },
                ]}
              >
                {collection.map((card) => {
                  const isSelected = selectedCard?.definition.id === card.definition.id;

                  return (
                    <View key={card.definition.id}>
                      <CollectionCardTile
                        card={card}
                        selected={isSelected}
                        width={cardWidth}
                        onPress={() => openCardPreview(card)}
                      />
                    </View>
                  );
                })}
              </ScrollView>
            ) : selectedCard ? (
              <View style={styles.nativeShowcase}>
                <CollectionCardTile
                  card={selectedCard}
                  selected
                  width={cardWidth}
                  fluid
                  onPress={() => openCardPreview(selectedCard)}
                />
              </View>
            ) : null}

            {collection.length > 1 ? (
              <View style={styles.carouselDots}>
                {collection.map((card, index) => (
                  <Pressable
                    key={card.definition.id}
                    onPress={() => selectCarouselCard(index, Platform.OS === 'web')}
                    accessibilityRole="button"
                    accessibilityLabel={`Show ${card.definition.name}`}
                    hitSlop={8}
                    style={[
                      styles.carouselDot,
                      index === activeCarouselIndex ? styles.carouselDotActive : styles.carouselDotInactive,
                    ]}
                  />
                ))}
              </View>
            ) : null}
          </View>
        )}

        {!loading && collection.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="sparkles" size={24} color={Colors.accent.lime} />
            <Text style={styles.emptyTitle}>No card rules yet</Text>
            <Text style={styles.emptyBody}>
              Cards created from the admin dashboard will appear here, even before they are unlocked.
            </Text>
          </View>
        ) : null}
      </ScrollView>
      <CardDesignPreviewModal
        visible={previewCard !== null}
        card={previewCard}
        onClose={() => setPreviewCard(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  content: {
    width: '100%',
    alignSelf: 'center',
    paddingTop: 16,
    paddingBottom: 24,
    gap: 16,
  },
  eyebrow: {
    color: Colors.accent.lime,
    fontSize: 12,
    fontWeight: Typography.weight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    color: Colors.text.primary,
    fontSize: 28,
    fontWeight: Typography.weight.black,
    lineHeight: 32,
  },
  subtitle: {
    color: Colors.text.secondary,
    fontSize: Typography.size.sm,
    lineHeight: 20,
  },
  collectionPanel: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    backgroundColor: Colors.background.card,
    padding: 16,
    gap: 16,
    ...(Shadows.card ?? {}),
  },
  collectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  totalBadge: {
    width: 64,
    minHeight: 64,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.accent.limeBorder,
    backgroundColor: Colors.accent.limeLight,
  },
  totalBadgeValue: {
    color: Colors.accent.lime,
    fontSize: 22,
    fontWeight: Typography.weight.black,
    lineHeight: 26,
  },
  totalBadgeLabel: {
    marginTop: 1,
    color: Colors.text.secondary,
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    textTransform: 'uppercase',
  },
  metricGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  metricPill: {
    flex: 1,
    minWidth: 0,
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    backgroundColor: 'rgba(255,255,255,0.045)',
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  metricIcon: {
    width: 34,
    height: 34,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: Colors.accent.limeLight,
  },
  metricIconMuted: {
    backgroundColor: 'rgba(255,255,255,0.055)',
  },
  metricCopy: {
    flex: 1,
    minWidth: 0,
  },
  metricLabel: {
    color: Colors.text.secondary,
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    lineHeight: 13,
    textTransform: 'uppercase',
  },
  metricValue: {
    marginTop: 2,
    color: Colors.text.primary,
    fontSize: 18,
    fontWeight: Typography.weight.black,
    lineHeight: 22,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  sectionTitle: {
    color: Colors.text.primary,
    fontSize: 18,
    fontWeight: Typography.weight.black,
  },
  sectionHint: {
    color: Colors.text.tertiary,
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    textTransform: 'uppercase',
  },
  cardsCarouselViewport: {
    width: '100%',
    alignSelf: 'stretch',
  },
  cardsCarouselContent: {
    alignItems: 'flex-start',
    gap: CARD_GAP,
    paddingVertical: 2,
  },
  nativeShowcase: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  carouselDots: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 12,
  },
  carouselDot: {
    height: 8,
    borderRadius: 999,
  },
  carouselDotActive: {
    width: 24,
    backgroundColor: Colors.accent.lime,
  },
  carouselDotInactive: {
    width: 8,
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  gameCard: {
    position: 'relative',
    alignSelf: 'flex-start',
    flexShrink: 0,
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    backgroundColor: Colors.background.card,
    padding: 9,
    gap: 8,
    ...(Platform.OS === 'android' ? {} : Shadows.card ?? {}),
  },
  gameCardFluid: {
    alignSelf: 'center',
    padding: 10,
    gap: 9,
  },
  gameCardSelected: {
    borderColor: Colors.accent.limeBorder,
  },
  gameCardLocked: {
    opacity: 1,
  },
  gameCardPressed: {
    opacity: 0.88,
  },
  gameArtFrame: {
    position: 'relative',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  gameArtFrameFluid: {
    aspectRatio: 1080 / 1500,
  },
  gameArtImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  fluidSkeletonFill: {
    width: '100%',
    height: '100%',
  },
  gameArtFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  gameNameBlock: {
    minHeight: 56,
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  gameCardTitle: {
    color: Colors.text.primary,
    fontSize: 14,
    fontWeight: Typography.weight.black,
    lineHeight: 17,
    textAlign: 'center',
  },
  gameCardStage: {
    marginTop: 3,
    color: Colors.accent.lime,
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    lineHeight: 12,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  gameCardFooter: {
    flexDirection: 'row',
    gap: 7,
  },
  gameStat: {
    flex: 1,
    minHeight: 40,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  gameStatLabel: {
    color: Colors.text.tertiary,
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    textTransform: 'uppercase',
  },
  gameStatValue: {
    marginTop: 2,
    color: Colors.text.primary,
    fontSize: 12,
    fontWeight: Typography.weight.black,
    lineHeight: 15,
  },
  miniProgressTrack: {
    height: 5,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 999,
  },
  previewSafeArea: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.76)',
  },
  previewBackdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  previewSheet: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '92%',
    alignSelf: 'center',
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    backgroundColor: Colors.background.card,
  },
  previewSheetContent: {
    padding: 14,
    gap: 14,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  previewKicker: {
    color: Colors.accent.lime,
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  previewTitle: {
    marginTop: 3,
    color: Colors.text.primary,
    fontSize: 18,
    fontWeight: Typography.weight.black,
  },
  previewCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  previewArt: {
    position: 'relative',
    width: '76%',
    maxWidth: 280,
    alignSelf: 'center',
    aspectRatio: 0.72,
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  previewArtImage: {
    width: '100%',
    height: '100%',
  },
  previewFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  previewFallbackText: {
    color: Colors.text.secondary,
    fontSize: 12,
    fontWeight: Typography.weight.bold,
    textTransform: 'uppercase',
  },
  previewInfoBlock: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 6,
  },
  previewDescription: {
    color: Colors.text.primary,
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    lineHeight: 18,
  },
  previewUsageText: {
    color: Colors.text.secondary,
    fontSize: 12,
    lineHeight: 17,
  },
  previewMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  previewMetaChip: {
    flexGrow: 1,
    flexBasis: '47%',
    minHeight: 50,
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
  },
  previewMetaLabel: {
    color: Colors.text.tertiary,
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    textTransform: 'uppercase',
  },
  previewMetaValue: {
    marginTop: 3,
    color: Colors.text.primary,
    fontSize: 14,
    fontWeight: Typography.weight.black,
  },
  previewProgressTrack: {
    height: 7,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  previewProgressFill: {
    height: '100%',
    borderRadius: 999,
  },
  previewLockedNotice: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(0,0,0,0.34)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  previewLockedIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  previewLockedCopy: {
    flex: 1,
    minWidth: 0,
  },
  previewLockedTitle: {
    color: Colors.text.primary,
    fontSize: 12,
    fontWeight: Typography.weight.black,
    textTransform: 'uppercase',
  },
  previewLockedText: {
    marginTop: 2,
    color: Colors.text.secondary,
    fontSize: 11,
    lineHeight: 15,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
    gap: 8,
  },
  lockMark: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minHeight: 28,
    maxWidth: 78,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusBadge_ready: {
    borderColor: Colors.accent.lime,
    backgroundColor: 'rgba(201,223,106,0.16)',
  },
  statusBadge_locked: {
    borderColor: 'rgba(255,255,255,0.24)',
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  statusBadge_muted: {
    borderColor: Colors.border.default,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: Typography.weight.black,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statusBadgeText_ready: {
    color: Colors.accent.lime,
  },
  statusBadgeText_locked: {
    color: Colors.text.primary,
  },
  statusBadgeText_muted: {
    color: Colors.text.tertiary,
  },
  viewDesignButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  empty: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 20,
  },
  emptyTitle: {
    color: Colors.text.primary,
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.black,
  },
  emptyBody: {
    color: Colors.text.secondary,
    fontSize: Typography.size.sm,
    textAlign: 'center',
  },
});

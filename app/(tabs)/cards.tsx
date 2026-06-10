import { useCallback, useMemo, useState } from 'react';
import {
  Image,
  Modal,
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
import { Icon } from '@/components/ui/Icon';
import { TAB_BAR_CLEARANCE } from '@/components/ui/FloatingTabBar';
import { TabPageHeader } from '@/components/ui/TabPageHeader';
import { Colors, Layout, Typography } from '@/constants';
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
const MIN_CARD_COLUMN_WIDTH = 150;
const MIN_THREE_COLUMN_GRID_WIDTH = 720;
const CARD_ART_ASPECT_RATIO = 1500 / 1080;
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

function getCardHeight(width: number): number {
  return getCardArtHeight(width) + 156;
}

function getGridColumnCount(gridWidth: number): number {
  const maxColumns = gridWidth >= MIN_THREE_COLUMN_GRID_WIDTH ? 3 : 2;

  for (let columns = maxColumns; columns > 1; columns -= 1) {
    const candidateWidth = Math.floor((gridWidth - CARD_GAP * (columns - 1)) / columns);
    if (candidateWidth >= MIN_CARD_COLUMN_WIDTH) return columns;
  }

  return 1;
}

function chunkItems<T>(items: T[], columns: number): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += columns) {
    rows.push(items.slice(index, index + columns));
  }
  return rows;
}

function getColumnSpacingStyle(columnIndex: number, columnCount: number): { marginRight: number } | null {
  return columnIndex < columnCount - 1 ? { marginRight: CARD_GAP } : null;
}

function renderGridSpacers(
  count: number,
  width: number,
  startColumn: number,
  columnCount: number
): React.JSX.Element[] {
  return Array.from({ length: count }, (_, index) => (
    <View
      key={`spacer-${index}`}
      style={[
        styles.cardSlotSpacer,
        { width },
        getColumnSpacingStyle(startColumn + index, columnCount),
      ]}
    />
  ));
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
  columnIndex,
  columnCount,
  onPress,
  onView,
}: {
  card: CollectionCard;
  selected: boolean;
  width: number;
  columnIndex: number;
  columnCount: number;
  onPress: () => void;
  onView: () => void;
}): React.JSX.Element {
  const imageUrl = card.definition.image_url ?? null;
  const tone = getStatusTone(card.status);
  const locked = card.status === 'locked';
  const remainingUses = card.userCard?.uses_remaining ?? card.definition.max_uses;
  const maxUses = card.userCard?.max_uses ?? card.definition.max_uses;
  const artHeight = getCardArtHeight(width);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.gameCard,
        { width, height: getCardHeight(width) },
        getColumnSpacingStyle(columnIndex, columnCount),
        selected && styles.gameCardSelected,
        locked && styles.gameCardLocked,
        pressed && styles.gameCardPressed,
      ]}
    >
      <LinearGradient
        colors={selected ? ['rgba(215,217,94,0.18)', 'rgba(20,20,20,0.98)'] : ['rgba(255,255,255,0.07)', 'rgba(20,20,20,0.98)']}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.gameArtFrame, { height: artHeight }]}>
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
          <Text style={[styles.statusBadgeText, styles[`statusBadgeText_${tone}`]]}>
            {getStatusLabel(card.status)}
          </Text>
        </View>

        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            onView();
          }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`View ${card.definition.name} card design`}
          style={({ pressed }) => [styles.viewDesignButton, pressed && styles.viewDesignButtonPressed]}
        >
          <Icon name="eye" size={16} color={Colors.text.primary} fixed />
        </Pressable>
      </View>

      <View style={styles.gameNameBlock}>
        <Text style={styles.gameCardTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>
          {card.definition.name}
        </Text>
        <Text style={styles.gameCardStage} numberOfLines={1}>
          {STAGE_LABELS[card.definition.award_stage]} card
        </Text>
      </View>

      <View style={styles.gameCardFooter}>
        <View style={styles.gameStat}>
          <Text style={styles.gameStatLabel}>Boost</Text>
          <Text style={styles.gameStatValue}>+{card.definition.multiplier_bonus}</Text>
        </View>
        <View style={styles.gameStat}>
          <Text style={styles.gameStatLabel}>Uses</Text>
          <Text style={styles.gameStatValue}>{remainingUses}/{maxUses}</Text>
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
        <Pressable style={styles.previewBackdrop} onPress={onClose}>
          <Pressable style={styles.previewSheet} onPress={(event) => event.stopPropagation()}>
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
          </Pressable>
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
}

function CardSkeleton({
  width,
  columnIndex,
  columnCount,
}: {
  width: number;
  columnIndex: number;
  columnCount: number;
}): React.JSX.Element {
  const artHeight = getCardArtHeight(width);

  return (
    <View
      style={[
        styles.gameCard,
        { width, height: getCardHeight(width) },
        getColumnSpacingStyle(columnIndex, columnCount),
      ]}
    >
      <SkeletonBox width="100%" height={artHeight} borderRadius={18} />
      <SkeletonBox width="82%" height={38} borderRadius={12} />
      <View style={styles.gameCardFooter}>
        <SkeletonBox width="46%" height={34} borderRadius={12} />
        <SkeletonBox width="46%" height={34} borderRadius={12} />
      </View>
      <SkeletonBox width="100%" height={5} borderRadius={999} />
    </View>
  );
}

export default function CardsScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { width } = useResponsive();
  const contentHorizontalPadding = 16;
  const fallbackGridWidth = Math.max(0, width - contentHorizontalPadding * 2);
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
  const [measuredGridWidth, setMeasuredGridWidth] = useState(0);
  const gridWidth = measuredGridWidth || fallbackGridWidth;
  const gridColumnCount = getGridColumnCount(gridWidth);
  const cardWidth = Math.max(
    0,
    gridColumnCount === 1
      ? gridWidth
      : Math.floor((gridWidth - CARD_GAP * (gridColumnCount - 1)) / gridColumnCount)
  );
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

  const handleGridLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = Math.floor(event.nativeEvent.layout.width);
    setMeasuredGridWidth((currentWidth) =>
      Math.abs(currentWidth - nextWidth) > 1 ? nextWidth : currentWidth
    );
  }, []);

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
  const cardRows = useMemo(() => {
    return chunkItems(collection, gridColumnCount);
  }, [collection, gridColumnCount]);
  const skeletonRows = useMemo(() => {
    return chunkItems(CARD_SKELETON_ITEMS, gridColumnCount);
  }, [gridColumnCount]);

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
          { paddingBottom: insets.bottom + TAB_BAR_CLEARANCE + 150 },
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
        <View style={styles.heroBand}>
          <LinearGradient
            colors={['rgba(215,217,94,0.16)', 'rgba(255,255,255,0.04)', 'rgba(13,13,13,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>Inventory</Text>
            <Text style={styles.title}>Your game cards</Text>
            <Text style={styles.subtitle}>
              Browse your rewards. Ready cards can boost match predictions.
            </Text>
          </View>

          <View style={styles.statStrip}>
            <View style={styles.statPill}>
              <View style={styles.statPillHeader}>
                <Icon name="gift" size={14} color={Colors.accent.lime} />
                <Text style={styles.statPillLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
                  Earned
                </Text>
              </View>
              <Text style={styles.statPillValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
                {earnedCards}
              </Text>
            </View>
            <View style={styles.statPill}>
              <View style={styles.statPillHeader}>
                <Icon name="zap" size={14} color={Colors.accent.lime} />
                <Text style={styles.statPillLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
                  Ready
                </Text>
              </View>
              <Text style={styles.statPillValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
                {readyCards}
              </Text>
            </View>
            <View style={styles.statPill}>
              <View style={styles.statPillHeader}>
                <Icon name="lock" size={14} color={Colors.text.tertiary} />
                <Text style={styles.statPillLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
                  Locked
                </Text>
              </View>
              <Text style={styles.statPillValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
                {lockedCards}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Cards</Text>
          <Text style={styles.sectionHint}>{collection.length} total</Text>
        </View>

        {loading ? (
          <View style={styles.cardsGrid} onLayout={handleGridLayout}>
            {skeletonRows.map((row) => (
              <View key={row.join('-')} style={styles.cardsRow}>
                {row.map((item, columnIndex) => (
                  <CardSkeleton
                    key={item}
                    width={cardWidth}
                    columnIndex={columnIndex}
                    columnCount={gridColumnCount}
                  />
                ))}
                {renderGridSpacers(gridColumnCount - row.length, cardWidth, row.length, gridColumnCount)}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.cardsGrid} onLayout={handleGridLayout}>
            {cardRows.map((row) => (
              <View key={row.map((card) => card.definition.id).join('-')} style={styles.cardsRow}>
                {row.map((card, columnIndex) => {
                  const isSelected = selectedCard?.definition.id === card.definition.id;
                  return (
                    <CollectionCardTile
                      key={card.definition.id}
                      card={card}
                      selected={isSelected}
                      width={cardWidth}
                      columnIndex={columnIndex}
                      columnCount={gridColumnCount}
                      onPress={() => openCardPreview(card)}
                      onView={() => openCardPreview(card)}
                    />
                  );
                })}
                {renderGridSpacers(gridColumnCount - row.length, cardWidth, row.length, gridColumnCount)}
              </View>
            ))}
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 16,
  },
  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
  },
  headerCompact: {
    flexDirection: 'column',
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
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
  heroBand: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    backgroundColor: Colors.background.card,
    padding: 16,
    gap: 14,
  },
  heroCopy: {
    gap: 6,
  },
  statStrip: {
    flexDirection: 'row',
    gap: 8,
  },
  statPill: {
    flex: 1,
    minWidth: 0,
    minHeight: 58,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    backgroundColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  statPillHeader: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statPillLabel: {
    flex: 1,
    minWidth: 0,
    color: Colors.text.secondary,
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    textTransform: 'uppercase',
  },
  statPillValue: {
    alignSelf: 'flex-start',
    color: Colors.text.primary,
    fontSize: 15,
    fontWeight: Typography.weight.black,
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
  cardsGrid: {
    width: '100%',
  },
  cardsRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    marginBottom: CARD_GAP,
  },
  cardSlotSpacer: {
    flexShrink: 0,
  },
  gameCard: {
    position: 'relative',
    alignSelf: 'stretch',
    flexShrink: 0,
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    backgroundColor: Colors.background.card,
    padding: 10,
    gap: 10,
  },
  gameCardSelected: {
    borderColor: Colors.accent.lime,
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
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  gameArtImage: {
    width: '92%',
    height: '92%',
    resizeMode: 'contain',
  },
  gameArtFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  gameNameBlock: {
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(0,0,0,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  gameCardTitle: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: Typography.weight.black,
    lineHeight: 20,
    textAlign: 'center',
  },
  gameCardStage: {
    marginTop: 3,
    color: Colors.accent.lime,
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  gameCardFooter: {
    flexDirection: 'row',
    gap: 8,
  },
  gameStat: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    paddingHorizontal: 10,
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
    fontSize: 13,
    fontWeight: Typography.weight.black,
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
  detailPanel: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    backgroundColor: Colors.background.card,
    padding: 14,
    gap: 12,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  detailKicker: {
    color: Colors.accent.lime,
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    textTransform: 'uppercase',
  },
  detailTitle: {
    marginTop: 3,
    color: Colors.text.primary,
    fontSize: 18,
    fontWeight: Typography.weight.black,
  },
  detailStatus: {
    minHeight: 30,
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
  },
  detailStatusReady: {
    borderColor: Colors.accent.lime,
    backgroundColor: Colors.accent.limeLight,
  },
  detailStatusLocked: {
    borderColor: Colors.border.subtle,
    backgroundColor: 'rgba(0,0,0,0.24)',
  },
  detailStatusMuted: {
    borderColor: Colors.border.subtle,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  detailStatusText: {
    fontSize: 10,
    fontWeight: Typography.weight.black,
    textTransform: 'uppercase',
  },
  detailStatusReadyText: {
    color: Colors.accent.lime,
  },
  detailStatusLockedText: {
    color: Colors.text.secondary,
  },
  detailStatusMutedText: {
    color: Colors.text.tertiary,
  },
  detailDescription: {
    color: Colors.text.secondary,
    fontSize: 12,
    lineHeight: 18,
  },
  detailStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  detailStatBox: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    backgroundColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  detailStatLabel: {
    color: Colors.text.tertiary,
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    textTransform: 'uppercase',
  },
  detailStatValue: {
    marginTop: 3,
    color: Colors.text.primary,
    fontSize: 15,
    fontWeight: Typography.weight.black,
  },
  detailProgressTrack: {
    height: 7,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  detailProgressFill: {
    height: '100%',
    borderRadius: 999,
  },
  detailHint: {
    color: Colors.text.tertiary,
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    textTransform: 'uppercase',
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
  previewCaption: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    gap: 4,
  },
  previewCardName: {
    color: Colors.text.primary,
    fontSize: 24,
    fontWeight: Typography.weight.black,
  },
  previewCardStage: {
    color: Colors.text.secondary,
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  previewMetaRow: {
    flexDirection: 'row',
    gap: 8,
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
  summaryCard: {
    minWidth: 118,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border.default,
    backgroundColor: 'rgba(13, 13, 13, 0.72)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    color: Colors.text.secondary,
    fontSize: 12,
    fontWeight: Typography.weight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    marginTop: 4,
    color: Colors.text.primary,
    fontSize: 40,
    fontWeight: Typography.weight.black,
    lineHeight: 46,
  },
  summaryHint: {
    marginTop: 2,
    color: Colors.text.tertiary,
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  typeStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    flexGrow: 1,
    flexBasis: '31%',
    minWidth: 92,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border.default,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  typeChipLabel: {
    flex: 1,
    color: Colors.text.primary,
    fontSize: 10,
    fontWeight: Typography.weight.black,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  typeChipCount: {
    color: Colors.text.primary,
    fontSize: 11,
    fontWeight: Typography.weight.black,
  },
  collectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cardTile: {
    backgroundColor: 'rgba(18, 24, 24, 0.94)',
    overflow: 'hidden',
  },
  cardTileSingle: {
    width: '100%',
  },
  cardTileGrid: {
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: 260,
  },
  cardTileLocked: {
    borderColor: 'rgba(255,255,255,0.14)',
  },
  cardArt: {
    position: 'relative',
    height: 230,
    backgroundColor: 'rgba(0,0,0,0.24)',
  },
  cardArtImage: {
    width: '100%',
    height: '100%',
  },
  cardArtFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201,223,106,0.09)',
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
  lockText: {
    color: Colors.text.primary,
    fontSize: 12,
    fontWeight: Typography.weight.black,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
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
    fontSize: 10,
    fontWeight: Typography.weight.black,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
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
    top: 10,
    left: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  viewDesignButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  artCaption: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    gap: 3,
  },
  cardTitle: {
    color: Colors.text.primary,
    fontSize: 20,
    fontWeight: Typography.weight.black,
    letterSpacing: 0.2,
  },
  cardSubtitle: {
    color: Colors.text.secondary,
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  cardBody: {
    padding: 14,
    gap: 12,
  },
  cardDescription: {
    color: Colors.text.secondary,
    fontSize: 12,
    lineHeight: 18,
  },
  metaGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  metaChip: {
    flex: 1,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    backgroundColor: 'rgba(0, 0, 0, 0.16)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  metaLabel: {
    color: Colors.text.tertiary,
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  metaValue: {
    marginTop: 3,
    color: Colors.text.primary,
    fontSize: 13,
    fontWeight: Typography.weight.black,
  },
  windowBox: {
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  windowValue: {
    marginTop: 3,
    color: Colors.text.primary,
    fontSize: 11,
    fontWeight: Typography.weight.black,
  },
  progressBlock: {
    gap: 6,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  progressLabel: {
    color: Colors.text.secondary,
    fontSize: 10,
    fontWeight: Typography.weight.black,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  progressValue: {
    color: Colors.text.primary,
    fontSize: 11,
    fontWeight: Typography.weight.black,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.09)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  progressHint: {
    color: Colors.text.tertiary,
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
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

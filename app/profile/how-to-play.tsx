import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  type LayoutChangeEvent,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  type StyleProp,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Container } from '@/components/ui/Container';
import { Icon, type IconName } from '@/components/ui/Icon';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import Theme from '@/constants/theme/design-system';
import { useScoringRules, useStageCardSettings, useStageMultipliers } from '@/hooks/useAdmin';
import { STAGE_LABELS } from '@/lib/constants';
import { useResponsive } from '@/lib/responsive';
import { DEFAULT_STAGE_MATCH_COUNTS, STAGE_ORDER } from '@/lib/stages';
import type { MatchStage } from '@/types';

type GuideTab = 'basics' | 'points' | 'cards' | 'stages';

const WORLD_CUP_BALL_SOURCE = require('@/assets/worldcup_ball_trionda_fab.png');
const GUIDE_GRID_GAP = 12;
const COMPACT_WIDTH = 340;
const GUIDE_NAV_COMPACT_WIDTH = 430;
const TABLET_WIDTH = 720;

const TABS: Array<{ key: GuideTab; label: string; icon: IconName }> = [
  { key: 'basics', label: 'Matches', icon: 'football' },
  { key: 'points', label: 'Points', icon: 'star' },
  { key: 'cards', label: 'Cards', icon: 'gift' },
  { key: 'stages', label: 'Stages', icon: 'trophy' },
];

const BASICS = [
  {
    title: 'Open a match',
    body: 'Choose any match that has not started yet. Once kickoff arrives, the prediction window closes.',
    icon: 'calendar' as IconName,
  },
  {
    title: 'Predict the score',
    body: 'Submit the 90-minute scoreline. In knockout matches, a draw also asks you to pick the qualifying team.',
    icon: 'target' as IconName,
  },
  {
    title: 'Track the result',
    body: 'When the match result is saved from the API or manually by admin, your prediction is scored automatically.',
    icon: 'checkCircle' as IconName,
  },
];

function chunkItems<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
}

function useMeasuredColumns(maxColumns = 2): number {
  const { width } = useResponsive();

  if (width < COMPACT_WIDTH) return 1;
  if (maxColumns >= 3 && width >= TABLET_WIDTH) return 3;
  return Math.min(maxColumns, 2);
}

function ResponsiveGuideGrid<T>({
  items,
  maxColumns = 2,
  minItemWidth = 156,
  style,
  keyExtractor,
  renderItem,
}: {
  items: T[];
  maxColumns?: number;
  minItemWidth?: number;
  style?: StyleProp<ViewStyle>;
  keyExtractor: (item: T) => string;
  renderItem: (item: T, info: { compact: boolean; columns: number; width: number }) => React.JSX.Element;
}): React.JSX.Element {
  const baseColumns = useMeasuredColumns(maxColumns);
  const [gridWidth, setGridWidth] = useState(0);
  const columns = useMemo(() => {
    if (gridWidth <= 0) return baseColumns;

    const columnsByWidth = Math.floor((gridWidth + GUIDE_GRID_GAP) / (minItemWidth + GUIDE_GRID_GAP));
    return Math.max(1, Math.min(baseColumns, maxColumns, columnsByWidth || 1));
  }, [baseColumns, gridWidth, maxColumns, minItemWidth]);
  const estimatedCellWidth =
    gridWidth > 0
      ? Math.floor((gridWidth - GUIDE_GRID_GAP * (columns - 1)) / columns)
      : 0;
  const rows = useMemo(() => chunkItems(items, columns), [columns, items]);

  return (
    <View
      style={[styles.responsiveGrid, style]}
      onLayout={(event) => {
        const nextWidth = Math.floor(event.nativeEvent.layout.width);
        setGridWidth((currentWidth) => (Math.abs(currentWidth - nextWidth) > 1 ? nextWidth : currentWidth));
      }}
    >
      {rows.map((row) => (
        <View key={row.map(keyExtractor).join('-')} style={styles.responsiveGridRow}>
          {row.map((item) => (
            <View key={keyExtractor(item)} style={styles.responsiveGridCell}>
              {renderItem(item, { compact: columns === 1, columns, width: estimatedCellWidth })}
            </View>
          ))}
          {columns > 1 && row.length < columns
            ? Array.from({ length: columns - row.length }, (_, index) => (
                <View key={`placeholder-${index}`} style={styles.responsiveGridCell} />
              ))
            : null}
        </View>
      ))}
    </View>
  );
}

const FEATURE_COPY: Record<
  GuideTab,
  {
    title: string;
    body: string;
    stat: string;
    icon: IconName;
  }
> = {
  basics: {
    title: 'Predict before kickoff',
    body: 'Scores lock when the match starts. You can review saved, pending, finished, and missed picks from My Predictions.',
    stat: '90 min',
    icon: 'lock',
  },
  points: {
    title: 'Score, then multiply',
    body: 'Base points are calculated first, then the match multiplier and any selected wild card boost are applied.',
    stat: 'X',
    icon: 'star',
  },
  cards: {
    title: 'Earn wild cards',
    body: 'Cards unlock when you reach their required percentage of the points available in a tournament stage.',
    stat: '+',
    icon: 'gift',
  },
  stages: {
    title: 'Every stage can change',
    body: 'Admin controls expected match counts and stage multipliers, so later World Cup rounds stay accurate.',
    stat: '32',
    icon: 'trophy',
  },
};

function useLoopedValue(duration: number, delay = 0): Animated.Value {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(value, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(value, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [delay, duration, value]);

  return value;
}

function formatStage(stage: MatchStage): string {
  return STAGE_LABELS[stage] ?? stage.replace(/_/g, ' ');
}

function AnimatedGuideHero(): React.JSX.Element {
  const { width } = useResponsive();
  const ball = useLoopedValue(1700);
  const card = useLoopedValue(2200, 150);
  const glow = useLoopedValue(1900, 250);
  const compactHero = width < 390;

  const ballTranslate = ball.interpolate({
    inputRange: [0, 1],
    outputRange: [-74, 74],
  });
  const cardTranslate = card.interpolate({
    inputRange: [0, 1],
    outputRange: [4, -9],
  });
  const cardRotate = card.interpolate({
    inputRange: [0, 1],
    outputRange: ['-5deg', '5deg'],
  });
  const glowScale = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.14],
  });
  const glowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.22, 0.48],
  });

  return (
    <View style={[styles.hero, compactHero && styles.heroCompact]}>
      <LinearGradient
        colors={['rgba(215,217,94,0.18)', 'rgba(34,34,34,0.96)', 'rgba(0,0,0,0.98)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.pitch}>
        <View style={styles.pitchLine} />
        <View style={styles.pitchCircle} />
        <Animated.View
          style={[
            styles.heroGlow,
            {
              opacity: glowOpacity,
              transform: [{ scale: glowScale }],
            },
          ]}
        />
        <Animated.View style={[styles.ball, { transform: [{ translateX: ballTranslate }] }]}>
          <Icon name="football" size={18} color={Theme.colors.accentDark} fixed />
        </Animated.View>
      </View>

      <View style={[styles.heroContent, compactHero && styles.heroContentCompact]}>
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>How to play</Text>
          <Text style={[styles.heroTitle, compactHero && styles.heroTitleCompact]}>
            World Cup predictions, cards, and points
          </Text>
          <Text style={styles.heroBody}>
            A quick animated guide for every core feature in the app.
          </Text>
        </View>

        <Animated.View
          style={[
            styles.heroBallBadge,
            compactHero && styles.heroBallBadgeCompact,
            {
              transform: [{ translateY: cardTranslate }, { rotateZ: cardRotate }],
            },
          ]}
        >
          <View style={[styles.heroBallBadgeGlow, compactHero && styles.heroBallBadgeGlowCompact]} />
          <Image
            source={WORLD_CUP_BALL_SOURCE}
            style={[styles.heroBallImage, compactHero && styles.heroBallImageCompact]}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    </View>
  );
}

function GuideNavCards({
  activeTab,
  onSelect,
}: {
  activeTab: GuideTab;
  onSelect: (tab: GuideTab) => void;
}): React.JSX.Element {
  const [hoveredTab, setHoveredTab] = useState<GuideTab | null>(null);
  const hoverProps =
    Platform.OS === 'web'
      ? {
          onHoverOut: () => setHoveredTab(null),
        }
      : {};

  return (
    <ResponsiveGuideGrid
      items={TABS}
      maxColumns={2}
      minItemWidth={GUIDE_NAV_COMPACT_WIDTH / 2}
      style={styles.guideNavGrid}
      keyExtractor={(tab) => tab.key}
      renderItem={(tab, { compact }) => {
        const active = activeTab === tab.key;
        const copy = FEATURE_COPY[tab.key];
        const hovered = hoveredTab === tab.key;

        return (
          <Pressable
            onPress={() => onSelect(tab.key)}
            {...hoverProps}
            onHoverIn={Platform.OS === 'web' ? () => setHoveredTab(tab.key) : undefined}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.guideNavCard,
              compact && styles.guideNavCardCompact,
              active && styles.guideNavCardActive,
              hovered && (active ? styles.guideNavCardActiveHovered : styles.guideNavCardHovered),
              pressed && styles.pressed,
            ]}
          >
            <View
              style={[
                styles.guideCardContent,
                compact && styles.guideCardContentCompact,
              ]}
            >
              <View style={[styles.guideNavIcon, active && styles.guideNavIconActive]}>
                <Icon
                  name={tab.icon}
                  size={18}
                  color={active ? Theme.colors.accentDark : Theme.colors.accent}
                  fixed
                />
              </View>
              <View style={[styles.guideNavText, !compact && styles.guideNavTextStack]}>
                <Text
                  numberOfLines={1}
                  style={[styles.guideNavLabel, active && styles.guideNavLabelActive]}
                >
                  {tab.label}
                </Text>
                <Text
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.84}
                  style={[styles.guideNavTitle, active && styles.guideNavTitleActive]}
                >
                  {copy.title}
                </Text>
              </View>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

function FeatureSpotlight({ activeTab }: { activeTab: GuideTab }): React.JSX.Element {
  const pulse = useLoopedValue(1300);
  const copy = FEATURE_COPY[activeTab];
  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  return (
    <View style={styles.spotlight}>
      <View style={styles.spotlightCopy}>
        <Text style={styles.spotlightKicker}>Selected guide</Text>
        <Text style={styles.spotlightTitle}>{copy.title}</Text>
        <Text style={styles.spotlightBody}>{copy.body}</Text>
      </View>
      <Animated.View style={[styles.spotlightIcon, { transform: [{ scale }] }]}>
        <Icon name={copy.icon} size={24} color={Theme.colors.accentDark} fixed />
      </Animated.View>
    </View>
  );
}

function GuideStep({
  index,
  title,
  body,
  icon,
}: {
  index: number;
  title: string;
  body: string;
  icon: IconName;
}): React.JSX.Element {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepIndex}>
        <Text style={styles.stepIndexText}>{index}</Text>
      </View>
      <View style={styles.stepContent}>
        <View style={styles.stepHeader}>
          <Icon name={icon} size={17} color={Theme.colors.accent} fixed />
          <Text style={styles.stepTitle}>{title}</Text>
        </View>
        <Text style={styles.bodyText}>{body}</Text>
      </View>
    </View>
  );
}

function PointsBreakdown({
  winnerPoints,
  exactBonusPoints,
  multiplierPreview,
}: {
  winnerPoints: number | null;
  exactBonusPoints: number | null;
  multiplierPreview: number;
}): React.JSX.Element {
  const hasScoringRules = winnerPoints !== null && exactBonusPoints !== null;
  const totalBase = hasScoringRules ? winnerPoints + exactBonusPoints : null;
  const previewTotal = totalBase !== null ? totalBase * multiplierPreview : null;
  const pointTiles = useMemo(
    () => [
      { label: 'Correct outcome', value: winnerPoints !== null ? `+${winnerPoints}` : 'Admin', icon: 'checkCircle' as IconName },
      { label: 'Exact score bonus', value: exactBonusPoints !== null ? `+${exactBonusPoints}` : 'Admin', icon: 'target' as IconName },
      { label: 'Base max', value: totalBase !== null ? `${totalBase}` : 'Admin', icon: 'star' as IconName },
      { label: `${multiplierPreview}x example`, value: previewTotal !== null ? `${previewTotal}` : 'Admin', icon: 'zap' as IconName },
    ],
    [exactBonusPoints, multiplierPreview, previewTotal, totalBase, winnerPoints]
  );

  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionTitle}>How points are calculated</Text>
      <ResponsiveGuideGrid
        items={pointTiles}
        maxColumns={2}
        minItemWidth={150}
        style={styles.pointsGrid}
        keyExtractor={(tile) => tile.label}
        renderItem={(tile) => (
          <PointTile
            label={tile.label}
            value={tile.value}
            icon={tile.icon}
          />
        )}
      />
      <Text style={styles.noteText}>
        Outcome means correct winner, draw, or the correct qualifying team in knockout matches.
        Exact score is based on the predicted match scoreline.
      </Text>
    </View>
  );
}

function PointTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: IconName;
}): React.JSX.Element {
  return (
    <View style={styles.pointTile}>
      <View style={styles.pointIcon}>
        <Icon name={icon} size={17} color={Theme.colors.accent} fixed />
      </View>
      <Text style={styles.pointValue}>{value}</Text>
      <Text style={styles.pointLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

function CardSystemSection(): React.JSX.Element {
  const float = useLoopedValue(1600);
  const translateY = float.interpolate({
    inputRange: [0, 1],
    outputRange: [3, -8],
  });
  const rotateZ = float.interpolate({
    inputRange: [0, 1],
    outputRange: ['-4deg', '4deg'],
  });

  return (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionKicker}>Wild cards</Text>
          <Text style={styles.sectionTitle}>Earn boosts by playing well</Text>
        </View>
        <Animated.View style={[styles.wildCard, { transform: [{ translateY }, { rotateZ }] }]}>
          <LinearGradient
            colors={['rgba(215,217,94,0.32)', 'rgba(26,26,26,0.98)']}
            style={StyleSheet.absoluteFill}
          />
          <Icon name="sparkles" size={19} color={Theme.colors.accent} fixed />
          <Text style={styles.wildCardText}>WILD</Text>
        </Animated.View>
      </View>

      <View style={styles.infoRows}>
        <InfoRow
          icon="barChart"
          title="Unlock"
          body="Each card has a stage, a required percentage, and a points target based on that stage's possible points."
        />
        <InfoRow
          icon="time"
          title="Use window"
          body="A card can only be selected during its configured usable stage range."
        />
        <InfoRow
          icon="zap"
          title="Boost"
          body="Pick one active card on a match to add its bonus to the match multiplier."
        />
      </View>

      <View style={styles.catalogPill}>
        <Icon name="gift" size={15} color={Theme.colors.accent} fixed />
        <Text style={styles.catalogText}>
          Wild card designs and unlock rules are controlled from admin and can change by stage.
        </Text>
      </View>
    </View>
  );
}

function InfoRow({
  icon,
  title,
  body,
}: {
  icon: IconName;
  title: string;
  body: string;
}): React.JSX.Element {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Icon name={icon} size={16} color={Theme.colors.accent} fixed />
      </View>
      <View style={styles.infoCopy}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.bodyText}>{body}</Text>
      </View>
    </View>
  );
}

function StageGuide({
  rows,
  compact,
}: {
  rows: Array<{ stage: MatchStage; expectedMatches: number; multiplier: number }>;
  compact: boolean;
}): React.JSX.Element {
  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionTitle}>Tournament stages</Text>
      <Text style={styles.bodyText}>
        These values follow the current admin setup, including expected matches and default multipliers.
      </Text>
      {compact ? (
        <View style={styles.stageList}>
          {rows.map((row) => (
            <View key={row.stage} style={styles.stageRow}>
              <View style={styles.stageNameWrap}>
                <Text style={styles.stageName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                  {formatStage(row.stage)}
                </Text>
                <Text style={styles.stageMeta}>{row.expectedMatches} matches</Text>
              </View>
              <View style={styles.stageMultiplier}>
                <Text style={styles.stageMultiplierText}>X{row.multiplier}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <ResponsiveGuideGrid
          items={rows}
          maxColumns={2}
          minItemWidth={190}
          style={styles.stageGrid}
          keyExtractor={(stageRow) => stageRow.stage}
          renderItem={(stageRow) => (
            <View style={styles.stageTile}>
              <View style={styles.stageNameWrap}>
                <Text style={styles.stageName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                  {formatStage(stageRow.stage)}
                </Text>
                <Text style={styles.stageMeta}>{stageRow.expectedMatches} matches</Text>
              </View>
              <View style={styles.stageMultiplier}>
                <Text style={styles.stageMultiplierText}>X{stageRow.multiplier}</Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const APP_FEATURES: Array<{
  icon: IconName;
  title: string;
  body: string;
  route: string;
}> = [
  {
    icon: 'home',
    title: 'Home',
    body: 'Next match, pending predictions, your cards, and favorite-team matches.',
    route: '/(tabs)/home',
  },
  {
    icon: 'matches',
    title: 'Matches',
    body: 'Browse fixtures, filter by teams and stages, then open a match to predict.',
    route: '/(tabs)/matches',
  },
  {
    icon: 'gift',
    title: 'Cards',
    body: 'See locked, ready, used, and revoked wild cards with progress.',
    route: '/(tabs)/cards',
  },
  {
    icon: 'leaderboard',
    title: 'Leaderboard',
    body: 'Compare total points, exact picks, and mini league rankings.',
    route: '/(tabs)/leaderboard',
  },
];

function AppFeaturesSection(): React.JSX.Element {
  const router = useRouter();

  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionTitle}>Where everything lives</Text>
      <ResponsiveGuideGrid
        items={APP_FEATURES}
        maxColumns={2}
        minItemWidth={180}
        style={styles.featureGrid}
        keyExtractor={(feature) => feature.route}
        renderItem={(feature) => (
          <MiniFeature
            icon={feature.icon}
            title={feature.title}
            body={feature.body}
            onPress={() => router.push(feature.route as never)}
          />
        )}
      />
    </View>
  );
}

function MiniFeature({
  icon,
  title,
  body,
  onPress,
}: {
  icon: IconName;
  title: string;
  body: string;
  onPress: () => void;
}): React.JSX.Element {
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={Platform.OS === 'web' ? () => setHovered(true) : undefined}
      onHoverOut={Platform.OS === 'web' ? () => setHovered(false) : undefined}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.miniFeature,
        hovered && styles.miniFeatureHovered,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.guideCardContent}>
        <View style={[styles.miniFeatureIcon, hovered && styles.miniFeatureIconHovered]}>
          <Icon name={icon} size={16} color={Theme.colors.accent} fixed />
        </View>
        <Text style={styles.miniFeatureTitle}>{title}</Text>
        <Text style={styles.miniFeatureBody}>{body}</Text>
        <View style={[styles.miniFeatureAction, hovered && styles.miniFeatureActionHovered]}>
          <Icon name="forward" size={14} color={Theme.colors.accent} fixed />
        </View>
      </View>
    </Pressable>
  );
}

export default function HowToPlayScreen(): React.JSX.Element {
  const { width, isSmall, isTablet } = useResponsive();
  const [activeTab, setActiveTab] = useState<GuideTab>('basics');
  const scrollRef = useRef<ScrollView>(null);
  const sectionYRef = useRef<Partial<Record<GuideTab, number>>>({});
  const scoringRulesQuery = useScoringRules();
  const stageMultipliersQuery = useStageMultipliers();
  const stageSettingsQuery = useStageCardSettings();

  const winnerPoints = scoringRulesQuery.data?.winnerPoints ?? null;
  const exactBonusPoints = scoringRulesQuery.data?.exactBonusPoints ?? null;
  const multiplierByStage = useMemo(
    () => new Map((stageMultipliersQuery.data ?? []).map((row) => [row.stage, row.multiplier])),
    [stageMultipliersQuery.data]
  );
  const expectedByStage = useMemo(
    () => new Map((stageSettingsQuery.data ?? []).map((row) => [row.stage, row.expected_matches])),
    [stageSettingsQuery.data]
  );
  const stageRows = useMemo(
    () =>
      STAGE_ORDER.map((stage) => ({
        stage,
        expectedMatches: expectedByStage.get(stage) ?? DEFAULT_STAGE_MATCH_COUNTS[stage],
        multiplier: multiplierByStage.get(stage) ?? 1,
      })),
    [expectedByStage, multiplierByStage]
  );
  const multiplierPreview = Math.max(2, stageRows.find((row) => row.multiplier > 1)?.multiplier ?? 2);
  const compact = width < 560;
  const registerSection = (key: GuideTab) => (event: LayoutChangeEvent): void => {
    sectionYRef.current[key] = event.nativeEvent.layout.y;
  };
  const scrollToSection = (key: GuideTab): void => {
    setActiveTab(key);
    const y = sectionYRef.current[key] ?? 0;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="How to Play" subtitle="Predictions, points, and wild cards" fallback="/(tabs)/profile" />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Container nested style={[styles.container, isSmall && styles.containerSmall, isTablet && styles.containerWide]}>
          <AnimatedGuideHero />
          <GuideNavCards activeTab={activeTab} onSelect={scrollToSection} />
          <FeatureSpotlight activeTab={activeTab} />

          <View style={styles.sectionBlock} onLayout={registerSection('basics')}>
            <Text style={styles.sectionTitle}>The basic flow</Text>
            {BASICS.map((step, index) => (
              <GuideStep
                key={step.title}
                index={index + 1}
                title={step.title}
                body={step.body}
                icon={step.icon}
              />
            ))}
          </View>

          <View onLayout={registerSection('points')}>
            <PointsBreakdown
              winnerPoints={winnerPoints}
              exactBonusPoints={exactBonusPoints}
              multiplierPreview={multiplierPreview}
            />
          </View>

          <View onLayout={registerSection('cards')}>
            <CardSystemSection />
          </View>
          <View onLayout={registerSection('stages')}>
            <StageGuide rows={stageRows} compact={compact} />
          </View>
          <AppFeaturesSection />
        </Container>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Theme.colors.bgDeep,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 44,
  },
  container: {
    paddingHorizontal: 24,
    gap: 20,
  },
  containerSmall: {
    paddingHorizontal: 18,
  },
  containerWide: {
    paddingHorizontal: 28,
  },
  hero: {
    minHeight: 246,
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Theme.colors.accentBorder,
    backgroundColor: Theme.colors.bgSurface2,
    ...Theme.shadows.md,
  },
  heroCompact: {
    minHeight: 232,
    borderRadius: 22,
  },
  pitch: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    height: 86,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  pitchLine: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  pitchCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
  },
  heroGlow: {
    position: 'absolute',
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: Theme.colors.accentDim,
  },
  ball: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.accent,
  },
  heroContent: {
    flex: 1,
    padding: 20,
    paddingTop: 118,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 14,
  },
  heroContentCompact: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    gap: 10,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: Theme.colors.accent,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 14,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  heroTitle: {
    marginTop: 5,
    color: Theme.colors.textPrimary,
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 31,
    letterSpacing: 0,
  },
  heroTitleCompact: {
    fontSize: 22,
    lineHeight: 27,
  },
  heroBody: {
    marginTop: 8,
    color: Theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
    letterSpacing: 0,
  },
  heroBallBadge: {
    width: 108,
    height: 108,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  heroBallBadgeCompact: {
    width: 82,
    height: 82,
  },
  heroBallBadgeGlow: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: Theme.colors.accent,
    backgroundColor: 'rgba(215,217,94,0.14)',
  },
  heroBallBadgeGlowCompact: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  heroBallImage: {
    width: 92,
    height: 92,
  },
  heroBallImageCompact: {
    width: 74,
    height: 74,
  },
  responsiveGrid: {
    width: '100%',
    alignSelf: 'stretch',
    gap: GUIDE_GRID_GAP,
  },
  responsiveGridRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: GUIDE_GRID_GAP,
  },
  responsiveGridCell: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'stretch',
  },
  guideNavGrid: {
    width: '100%',
  },
  guideNavCard: {
    position: 'relative',
    width: '100%',
    minHeight: 128,
    minWidth: 0,
    overflow: 'hidden',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.colors.bgBorder,
    backgroundColor: Theme.colors.bgSurface2,
  },
  guideNavCardCompact: {
    minHeight: 82,
    padding: 12,
    borderRadius: 14,
  },
  guideNavCardActive: {
    borderColor: Theme.colors.accent,
    backgroundColor: Theme.colors.accent,
    ...Theme.shadows.accentGlow,
  },
  guideNavCardHovered: {
    borderColor: Theme.colors.accent,
    backgroundColor: 'rgba(215,217,94,0.16)',
    transform: [{ translateY: -2 }],
    ...Theme.shadows.accentGlow,
  },
  guideNavCardActiveHovered: {
    borderColor: Theme.colors.textPrimary,
    backgroundColor: '#e4e765',
    transform: [{ translateY: -2 }],
    ...Theme.shadows.accentGlow,
  },
  guideCardContent: {
    flex: 1,
    zIndex: 1,
  },
  guideCardContentCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  guideNavIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: Theme.colors.accentDim,
  },
  guideNavIconActive: {
    backgroundColor: 'rgba(0,0,0,0.14)',
  },
  guideNavText: {
    flex: 1,
    minWidth: 0,
  },
  guideNavTextStack: {
    marginTop: 10,
  },
  guideNavLabel: {
    color: Theme.colors.accent,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 13,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  guideNavLabelActive: {
    color: Theme.colors.accentDark,
  },
  guideNavTitle: {
    marginTop: 4,
    color: Theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
    letterSpacing: 0,
  },
  guideNavTitleActive: {
    color: Theme.colors.accentDark,
  },
  pressed: {
    opacity: 0.78,
  },
  spotlight: {
    minHeight: 132,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Theme.colors.accentDark,
    backgroundColor: Theme.colors.accent,
    ...Theme.shadows.accentGlow,
  },
  spotlightCopy: {
    flex: 1,
    minWidth: 0,
  },
  spotlightTitle: {
    marginTop: 4,
    color: Theme.colors.accentDark,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 22,
    letterSpacing: 0,
  },
  spotlightKicker: {
    color: Theme.colors.accentDark,
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 12,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  spotlightBody: {
    color: Theme.colors.accentDark,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
    letterSpacing: 0,
  },
  spotlightIcon: {
    width: 56,
    height: 56,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.18)',
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  sectionBlock: {
    gap: 14,
    paddingTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  sectionHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  sectionKicker: {
    color: Theme.colors.accent,
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 12,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 24,
    letterSpacing: 0,
  },
  bodyText: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
    letterSpacing: 0,
  },
  noteText: {
    color: Theme.colors.textTertiary,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    letterSpacing: 0,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.colors.bgBorder,
    backgroundColor: Theme.colors.bgSurface2,
    ...Theme.shadows.sm,
  },
  stepIndex: {
    width: 30,
    height: 30,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: Theme.colors.accent,
  },
  stepIndexText: {
    color: Theme.colors.accentDark,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 15,
    letterSpacing: 0,
  },
  stepContent: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  stepTitle: {
    flex: 1,
    minWidth: 0,
    color: Theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 18,
    letterSpacing: 0,
  },
  pointsGrid: {
    width: '100%',
  },
  pointTile: {
    width: '100%',
    minHeight: 120,
    minWidth: 0,
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.colors.bgBorder,
    backgroundColor: Theme.colors.bgSurface2,
    ...Theme.shadows.sm,
  },
  pointIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: Theme.colors.accentDim,
  },
  pointValue: {
    color: Theme.colors.textPrimary,
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 30,
    letterSpacing: 0,
  },
  pointLabel: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 14,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  wildCard: {
    width: 66,
    height: 86,
    flexShrink: 0,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: Theme.colors.accentBorder,
    backgroundColor: Theme.colors.bgSurface2,
  },
  wildCardText: {
    color: Theme.colors.textPrimary,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 13,
    letterSpacing: 0,
  },
  infoRows: {
    gap: 10,
  },
  infoRow: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 13,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.colors.bgBorder,
    backgroundColor: Theme.colors.bgSurface2,
    ...Theme.shadows.sm,
  },
  infoIcon: {
    width: 34,
    height: 34,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: Theme.colors.accentDim,
  },
  infoCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  infoTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 17,
    letterSpacing: 0,
  },
  catalogPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Theme.colors.accentBorder,
    backgroundColor: Theme.colors.accentDim,
  },
  catalogText: {
    flex: 1,
    color: Theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
    letterSpacing: 0,
  },
  stageList: {
    gap: 8,
  },
  stageGrid: {
    width: '100%',
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Theme.colors.bgBorder,
    backgroundColor: Theme.colors.bgSurface2,
  },
  stageTile: {
    width: '100%',
    minHeight: 84,
    minWidth: 0,
    justifyContent: 'space-between',
    gap: 10,
    padding: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Theme.colors.bgBorder,
    backgroundColor: Theme.colors.bgSurface2,
  },
  stageNameWrap: {
    flex: 1,
    minWidth: 0,
  },
  stageName: {
    color: Theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 16,
    letterSpacing: 0,
  },
  stageMeta: {
    marginTop: 3,
    color: Theme.colors.textTertiary,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
    letterSpacing: 0,
  },
  stageMultiplier: {
    minWidth: 44,
    height: 32,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: Theme.colors.accent,
  },
  stageMultiplierText: {
    color: Theme.colors.accentDark,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 15,
    letterSpacing: 0,
  },
  featureGrid: {
    width: '100%',
  },
  miniFeature: {
    position: 'relative',
    width: '100%',
    minHeight: 142,
    minWidth: 0,
    overflow: 'hidden',
    padding: 13,
    paddingBottom: 34,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.colors.bgBorder,
    backgroundColor: Theme.colors.bgSurface2,
    ...Theme.shadows.sm,
  },
  miniFeatureHovered: {
    borderColor: Theme.colors.accent,
    backgroundColor: 'rgba(215,217,94,0.13)',
    transform: [{ translateY: -2 }],
    ...Theme.shadows.accentGlow,
  },
  miniFeatureIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: Theme.colors.accentDim,
  },
  miniFeatureIconHovered: {
    backgroundColor: 'rgba(215,217,94,0.24)',
  },
  miniFeatureTitle: {
    marginTop: 10,
    color: Theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 17,
    letterSpacing: 0,
  },
  miniFeatureBody: {
    marginTop: 5,
    color: Theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
    letterSpacing: 0,
  },
  miniFeatureAction: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: Theme.colors.accentDim,
  },
  miniFeatureActionHovered: {
    backgroundColor: 'rgba(215,217,94,0.24)',
    transform: [{ translateX: 2 }],
  },
});

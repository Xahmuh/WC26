// ============================================================
// WC2026 — READY-MADE COMPONENT SNIPPETS
// Copy into your components/ folder directly
// ============================================================

import React from 'react'
import {
  View, Text, TouchableOpacity, TextInput,
  Animated, StyleSheet, Pressable
} from 'react-native'
import { Theme, Colors, Radius, Spacing, FontSize, FontWeight } from './design-system'

// ─────────────────────────────────────────
// MATCH CARD
// ─────────────────────────────────────────
interface MatchCardProps {
  homeTeam:   string
  awayTeam:   string
  homeFlag:   string   // emoji or URI
  awayFlag:   string
  kickoff:    string   // formatted string e.g. "21:00 · Mon 12 Oct"
  stage:      string   // "Group A" | "Round of 16" etc.
  status:     'SCHEDULED' | 'FINISHED' | 'LIVE'
  homeScore?: number
  awayScore?: number
  predHome?:  number
  predAway?:  number
  pointsEarned?: number
  onPress:    () => void
}

export function MatchCard({
  homeTeam, awayTeam, homeFlag, awayFlag,
  kickoff, stage, status,
  homeScore, awayScore,
  predHome, predAway, pointsEarned,
  onPress
}: MatchCardProps) {
  const scale = new Animated.Value(1)

  const handlePressIn = () => Animated.spring(scale, {
    toValue: 0.97, useNativeDriver: true
  }).start()

  const handlePressOut = () => Animated.spring(scale, {
    toValue: 1, useNativeDriver: true
  }).start()

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[styles.matchCard, { transform: [{ scale }] }]}>
        {/* Header row: stage + status badge */}
        <View style={styles.matchCardHeader}>
          <Text style={styles.matchStage}>{stage}</Text>
          {status === 'LIVE' && (
            <View style={Theme.badges.live}>
              <Text style={Theme.badges.liveText}>● LIVE</Text>
            </View>
          )}
          {status === 'UPCOMING' && (
            <View style={Theme.badges.upcoming}>
              <Text style={Theme.badges.upcomingText}>{kickoff}</Text>
            </View>
          )}
          {status === 'FINISHED' && (
            <View style={Theme.badges.finished}>
              <Text style={Theme.badges.finishedText}>FT</Text>
            </View>
          )}
        </View>

        {/* Teams row */}
        <View style={styles.teamsRow}>
          {/* Home */}
          <View style={styles.teamBlock}>
            <View style={Theme.avatars.flagLg}>
              <Text style={styles.flagEmoji}>{homeFlag}</Text>
            </View>
            <Text style={styles.teamName} numberOfLines={1}>{homeTeam}</Text>
          </View>

          {/* Score or VS */}
          <View style={styles.scoreCenter}>
            {status === 'FINISHED' ? (
              <View style={styles.scoreDisplay}>
                <Text style={styles.scoreText}>{homeScore}</Text>
                <Text style={styles.scoreDash}> — </Text>
                <Text style={styles.scoreText}>{awayScore}</Text>
              </View>
            ) : (
              <View style={styles.vsBadge}>
                <Text style={styles.vsText}>vs</Text>
              </View>
            )}
          </View>

          {/* Away */}
          <View style={[styles.teamBlock, { alignItems: 'flex-end' }]}>
            <View style={Theme.avatars.flagLg}>
              <Text style={styles.flagEmoji}>{awayFlag}</Text>
            </View>
            <Text style={[styles.teamName, { textAlign: 'right' }]} numberOfLines={1}>
              {awayTeam}
            </Text>
          </View>
        </View>

        {/* Footer: prediction + points OR kickoff time */}
        {status === 'FINISHED' && predHome !== undefined ? (
          <View style={styles.predictionRow}>
            <Text style={styles.predLabel}>Your pick: </Text>
            <Text style={styles.predScore}>{predHome} – {predAway}</Text>
            {pointsEarned !== undefined && (
              <View style={[Theme.badges.points, { marginLeft: 'auto' }]}>
                <Text style={Theme.badges.pointsText}>+{pointsEarned} pts 🎯</Text>
              </View>
            )}
          </View>
        ) : status === 'SCHEDULED' ? (
          <TouchableOpacity style={styles.predictCTA} onPress={onPress}>
            <Text style={styles.predictCTAText}>Predict Now</Text>
          </TouchableOpacity>
        ) : null}
      </Animated.View>
    </Pressable>
  )
}

// ─────────────────────────────────────────
// SCORE INPUT (for prediction form)
// ─────────────────────────────────────────
interface ScoreInputProps {
  homeFlag:    string
  awayFlag:    string
  homeValue:   string
  awayValue:   string
  onChangeHome: (v: string) => void
  onChangeAway: (v: string) => void
}

export function ScoreInput({
  homeFlag, awayFlag, homeValue, awayValue,
  onChangeHome, onChangeAway
}: ScoreInputProps) {
  return (
    <View style={styles.scoreInputWrap}>
      <View style={styles.scoreTeam}>
        <Text style={styles.flagEmoji}>{homeFlag}</Text>
        <TextInput
          style={styles.scoreInputBox}
          value={homeValue}
          onChangeText={onChangeHome}
          keyboardType="number-pad"
          maxLength={2}
          placeholderTextColor={Colors.textTertiary}
          placeholder="0"
          selectionColor={Colors.accent}
        />
      </View>

      <Text style={styles.scoreDivider}>—</Text>

      <View style={styles.scoreTeam}>
        <Text style={styles.flagEmoji}>{awayFlag}</Text>
        <TextInput
          style={styles.scoreInputBox}
          value={awayValue}
          onChangeText={onChangeAway}
          keyboardType="number-pad"
          maxLength={2}
          placeholderTextColor={Colors.textTertiary}
          placeholder="0"
          selectionColor={Colors.accent}
        />
      </View>
    </View>
  )
}

// ─────────────────────────────────────────
// LEADERBOARD ROW
// ─────────────────────────────────────────
interface LeaderboardRowProps {
  rank:         number
  displayName:  string
  avatarLetter: string
  totalPoints:  number
  isCurrentUser?: boolean
}

export function LeaderboardRow({
  rank, displayName, avatarLetter, totalPoints, isCurrentUser = false
}: LeaderboardRowProps) {
  const rankColor =
    rank === 1 ? Colors.gold :
    rank === 2 ? Colors.silver :
    rank === 3 ? Colors.bronze :
    Colors.textSecondary

  return (
    <View style={[
      styles.lbRow,
      isCurrentUser && styles.lbRowHighlight
    ]}>
      <Text style={[styles.lbRank, { color: rankColor }]}>
        {rank <= 3 ? ['🥇','🥈','🥉'][rank - 1] : `#${rank}`}
      </Text>

      <View style={[Theme.avatars.sm, {
        backgroundColor: isCurrentUser ? Colors.accentDim : Colors.bgSurface3
      }]}>
        <Text style={{
          fontSize: 11,
          fontWeight: FontWeight.semibold,
          color: isCurrentUser ? Colors.accent : Colors.textSecondary
        }}>
          {avatarLetter.toUpperCase()}
        </Text>
      </View>

      <Text style={[styles.lbName, isCurrentUser && { color: Colors.accent }]}
        numberOfLines={1}>
        {displayName}
        {isCurrentUser && ' (You)'}
      </Text>

      <Text style={styles.lbPoints}>{totalPoints} pts</Text>
    </View>
  )
}

// ─────────────────────────────────────────
// SECTION HEADER
// ─────────────────────────────────────────
export function SectionHeader({ title, action, onAction }: {
  title: string
  action?: string
  onAction?: () => void
}) {
  return (
    <View style={Theme.layout.sectionHeader}>
      <Text style={Theme.textStyles.label}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction}>
          <Text style={{ fontSize: FontSize.sm, color: Colors.accent }}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

// ─────────────────────────────────────────
// POINTS BREAKDOWN CARD
// ─────────────────────────────────────────
export function PointsBreakdown({ winner, homeGoal, awayGoal, exactBonus, total }: {
  winner:     number
  homeGoal:   number
  awayGoal:   number
  exactBonus: number
  total:      number
}) {
  const Row = ({ label, pts }: { label: string; pts: number }) => (
    <View style={[Theme.layout.rowBetween, { marginBottom: 8 }]}>
      <Text style={Theme.textStyles.body}>{label}</Text>
      <Text style={{ color: pts > 0 ? Colors.success : Colors.textTertiary,
        fontSize: FontSize.base, fontWeight: FontWeight.semibold }}>
        {pts > 0 ? `+${pts}` : '—'}
      </Text>
    </View>
  )

  return (
    <View style={[Theme.cards.base, { marginTop: 12 }]}>
      <Row label="Correct winner"    pts={winner} />
      <Row label="Home score"        pts={homeGoal} />
      <Row label="Away score"        pts={awayGoal} />
      <Row label="Exact score bonus" pts={exactBonus} />
      <View style={Theme.layout.divider} />
      <View style={Theme.layout.rowBetween}>
        <Text style={Theme.textStyles.cardTitle}>Total</Text>
        <Text style={{ fontSize: FontSize.xl, fontWeight: FontWeight.bold,
          color: Colors.accent }}>{total} pts</Text>
      </View>
    </View>
  )
}


// ─────────────────────────────────────────
// INTERNAL STYLES
// ─────────────────────────────────────────
const styles = StyleSheet.create({
  // MatchCard
  matchCard: {
    ...Theme.cards.base,
    marginBottom: Spacing.md,
  },
  matchCardHeader: {
    ...Theme.layout.rowBetween,
    marginBottom: Spacing.md,
  },
  matchStage: {
    ...Theme.textStyles.label,
    textTransform: 'uppercase',
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  teamBlock: {
    flex: 1,
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  teamName: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    maxWidth: 100,
  },
  flagEmoji: {
    fontSize: 32,
  },
  scoreCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  scoreDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  scoreDash: {
    fontSize: FontSize.xl,
    color: Colors.textTertiary,
    marginHorizontal: 4,
  },
  vsBadge: {
    backgroundColor: Colors.accentDim,
    borderRadius: Radius.circle,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: Colors.accentBorder,
  },
  vsText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.accent,
  },
  predictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: Colors.bgBorder,
    paddingTop: Spacing.md,
  },
  predLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  predScore: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  predictCTA: {
    ...Theme.buttons.primary,
    paddingVertical: 10,
    alignSelf: 'center',
  },
  predictCTAText: {
    ...Theme.buttons.primaryText,
  },

  // ScoreInput
  scoreInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
    paddingVertical: Spacing.xl,
  },
  scoreTeam: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  scoreInputBox: {
    ...Theme.inputs.scoreBox,
    ...Theme.inputs.scoreText,
    textAlign: 'center',
  },
  scoreDivider: {
    fontSize: FontSize.xxl,
    color: Colors.textTertiary,
    fontWeight: FontWeight.bold,
  },

  // Leaderboard
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.bgBorder,
  },
  lbRowHighlight: {
    backgroundColor: Colors.accentDim,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 0,
    marginBottom: 1,
  },
  lbRank: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    width: 32,
    textAlign: 'center',
  },
  lbName: {
    flex: 1,
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
  },
  lbPoints: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.accent,
  },
})

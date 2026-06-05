// ============================================================================
// Icon — single flat (2D, monochrome) icon system for the whole app.
// ----------------------------------------------------------------------------
// Wraps @expo/vector-icons (Ionicons — clean flat line/solid set) behind a
// small set of SEMANTIC names so screens never reference glyph names or emoji.
// Colour comes from the design system; size is responsive by default.
//
//   <Icon name="trophy" />
//   <Icon name="back" size={22} color={Theme.colors.accent} />
// ============================================================================

import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import Theme from '@/constants/theme/design-system';
import { ms } from '@/lib/responsive';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/** Semantic icon name → Ionicons glyph. Flat 2D, consistent weight. */
const GLYPHS = {
  // navigation / chrome
  back: 'chevron-back',
  forward: 'chevron-forward',
  close: 'close',
  check: 'checkmark',
  add: 'add',
  search: 'search',
  settings: 'settings-outline',
  bell: 'notifications-outline',
  logout: 'log-out-outline',
  edit: 'create-outline',
  share: 'share-social-outline',
  copy: 'copy-outline',
  refresh: 'refresh',
  chevronDown: 'chevron-down',
  // tabs
  home: 'home-outline',
  homeActive: 'home',
  matches: 'football-outline',
  matchesActive: 'football',
  leaderboard: 'trophy-outline',
  leaderboardActive: 'trophy',
  profile: 'person-outline',
  profileActive: 'person',
  // domain
  trophy: 'trophy',
  target: 'locate',
  medal: 'medal',
  lock: 'lock-closed',
  time: 'time-outline',
  calendar: 'calendar-outline',
  stadium: 'location-outline',
  flame: 'flame',
  star: 'star',
  people: 'people-outline',
  group: 'people-circle-outline',
  shield: 'shield-checkmark-outline',
  ban: 'ban',
  google: 'logo-google',
  mail: 'mail-outline',
  key: 'key-outline',
  trendingUp: 'trending-up',
  info: 'information-circle-outline',
  warning: 'alert-circle-outline',
} as const satisfies Record<string, IoniconName>;

export type IconName = keyof typeof GLYPHS;

export interface IconProps {
  name: IconName;
  /** Baseline size in pt (responsively scaled). Default 20. */
  size?: number;
  /** Any design-system colour. Default textSecondary. */
  color?: string;
  /** Disable responsive scaling (use the raw size). */
  fixed?: boolean;
}

export function Icon({
  name,
  size = 20,
  color = Theme.colors.textSecondary,
  fixed = false,
}: IconProps): React.JSX.Element {
  return (
    <Ionicons
      name={GLYPHS[name]}
      size={fixed ? size : ms(size, 0.4)}
      color={color}
    />
  );
}

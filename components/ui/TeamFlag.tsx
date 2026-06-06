// ============================================================================
// TeamFlag — renders a national team crest next to the team name.
// ----------------------------------------------------------------------------
// football-data crests are mostly SVG (a few PNG). React Native <Image> cannot
// render SVG, so we branch:
//   • .svg  → react-native-svg <SvgUri>
//   • other → <Image>
//   • missing / load error → neutral chip with the 3-letter code
// Size is responsive (scales with screen width) unless overridden.
// ============================================================================

import { useState } from 'react';
import { Image, Text, View, Platform } from 'react-native';
import { SvgUri } from 'react-native-svg';

import Theme from '@/constants/theme/design-system';
import { scale } from '@/lib/responsive';
import type { Team } from '@/types';

interface TeamFlagProps {
  team: Team;
  /** Baseline diameter in pt (responsively scaled). Default 28. */
  size?: number;
  /** Disable responsive scaling. */
  fixed?: boolean;
}

function isSvg(url: string): boolean {
  return url.toLowerCase().split('?')[0]?.endsWith('.svg') ?? false;
}

export function TeamFlag({ team, size = 28, fixed = false }: TeamFlagProps): React.JSX.Element {
  const [failed, setFailed] = useState(false);
  const dim = fixed ? size : scale(size);
  const width = Math.round(dim * 1.4);
  const height = dim;
  const radius = 6;

  const fallback = (
    <View
      accessibilityLabel={team.name}
      style={{
        width: width,
        height: height,
        borderRadius: radius,
        backgroundColor: Theme.colors.bgSurface3,
        borderWidth: 1,
        borderColor: Theme.colors.bgBorder,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: Math.max(8, height / 2.8), fontWeight: '700', color: Theme.colors.textSecondary }}>
        {team.code ?? team.short_name?.slice(0, 3) ?? team.name.slice(0, 3)}
      </Text>
    </View>
  );

  if (!team.flag_url || failed) return fallback;

  // SVG crests
  if (isSvg(team.flag_url)) {
    if (Platform.OS === 'web') {
      return (
        <Image
          accessibilityLabel={`${team.name} flag`}
          source={{ uri: team.flag_url }}
          style={{ width: width, height: height, borderRadius: radius, backgroundColor: Theme.colors.bgSurface3 }}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      );
    }

    return (
      <View
        accessibilityLabel={`${team.name} flag`}
        style={{ width: width, height: height, borderRadius: radius, overflow: 'hidden', backgroundColor: Theme.colors.bgSurface3, alignItems: 'center', justifyContent: 'center' }}
      >
        <SvgUri
          uri={team.flag_url}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid slice"
          onError={() => setFailed(true)}
        />
      </View>
    );
  }

  // Raster crests (png/jpg)
  return (
    <Image
      accessibilityLabel={`${team.name} flag`}
      source={{ uri: team.flag_url }}
      style={{ width: width, height: height, borderRadius: radius, backgroundColor: Theme.colors.bgSurface3 }}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
}

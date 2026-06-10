// TeamFlag - renders a national team flag or crest while preserving the old
// team-based API.

import { useState } from 'react';
import { Image, Text, View, Platform } from 'react-native';

import Theme from '@/constants/theme/design-system';
import { getFlagUrl } from '@/constants';
import { scale } from '@/lib/responsive';
import type { Team } from '@/types';

interface TeamFlagProps {
  team?: Team;
  countryCode?: string;
  /** Baseline diameter in pt (responsively scaled). Default 28. */
  size?: number;
  /** Disable responsive scaling. */
  fixed?: boolean;
}

function isSvg(url: string): boolean {
  return url.toLowerCase().split('?')[0]?.endsWith('.svg') ?? false;
}

export function TeamFlag({
  team,
  countryCode,
  size = 28,
  fixed = false,
}: TeamFlagProps): React.JSX.Element {
  const [failed, setFailed] = useState(false);
  const dim = fixed ? size : scale(size);
  const width = Math.round(dim * 1.4);
  const height = dim;
  const radius = 6;
  const sourceUrl = team?.flag_url ?? (countryCode ? getFlagUrl(countryCode) : null);
  const nativeSvgFallbackUrl =
    team?.code ? getFlagUrl(team.code) : countryCode ? getFlagUrl(countryCode) : null;
  const label = team?.name ?? countryCode ?? 'team';

  const fallback = (
    <View
      accessibilityLabel={label}
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: Theme.colors.bgSurface3,
        borderWidth: 1,
        borderColor: Theme.colors.bgBorder,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontSize: Math.max(8, height / 2.8),
          fontWeight: '700',
          color: Theme.colors.textSecondary,
        }}
      >
        {team?.code ?? team?.short_name?.slice(0, 3) ?? label.slice(0, 3)}
      </Text>
    </View>
  );

  if (!sourceUrl || failed) return fallback;

  if (isSvg(sourceUrl)) {
    if (Platform.OS === 'web') {
      return (
        <Image
          accessibilityLabel={`${label} flag`}
          source={{ uri: sourceUrl }}
          style={{
            width,
            height,
            borderRadius: radius,
            backgroundColor: Theme.colors.bgSurface3,
          }}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      );
    }

    if (!nativeSvgFallbackUrl) return fallback;

    return (
      <Image
        accessibilityLabel={`${label} flag`}
        source={{ uri: nativeSvgFallbackUrl }}
        style={{
          width,
          height,
          borderRadius: radius,
          backgroundColor: Theme.colors.bgSurface3,
        }}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <Image
      accessibilityLabel={`${label} flag`}
      source={{ uri: sourceUrl }}
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: Theme.colors.bgSurface3,
      }}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
}

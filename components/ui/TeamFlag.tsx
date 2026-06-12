// TeamFlag - renders a national team flag or crest while preserving the old
// team-based API.

import { useMemo, useState } from 'react';
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

function uniqueUrls(urls: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  urls.forEach((url) => {
    const trimmed = url?.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    result.push(trimmed);
  });

  return result;
}

export function TeamFlag({
  team,
  countryCode,
  size = 28,
  fixed = false,
}: TeamFlagProps): React.JSX.Element {
  const [failedUrls, setFailedUrls] = useState<string[]>([]);
  const dim = fixed ? size : scale(size);
  const width = Math.round(dim * 1.5);
  const height = dim;
  const radius = 6;
  const candidateUrls = useMemo(() => {
    const urls = uniqueUrls([
      team?.code ? getFlagUrl(team.code) : null,
      team?.short_name ? getFlagUrl(team.short_name) : null,
      team?.name ? getFlagUrl(team.name) : null,
      countryCode ? getFlagUrl(countryCode) : null,
      team?.flag_url,
    ]);

    if (Platform.OS === 'web') return urls;
    return urls.filter((url) => !isSvg(url));
  }, [countryCode, team?.code, team?.flag_url, team?.name, team?.short_name]);
  const sourceUrl = candidateUrls.find((url) => !failedUrls.includes(url)) ?? null;
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

  if (!sourceUrl) return fallback;

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
      onError={() => {
        setFailedUrls((current) => (current.includes(sourceUrl) ? current : [...current, sourceUrl]));
      }}
    />
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { useActivePredictionNews } from '@/hooks/usePredictionNews';

const TICKER_BG = '#c7cb73';
const TICKER_TEXT = '#111111';
const ROTATE_MS = 4600;
const FADE_MS = 220;

export function PredictionNewsTicker({ enabled = true }: { enabled?: boolean }): React.JSX.Element | null {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const newsQuery = useActivePredictionNews(enabled);
  const items = useMemo(() => newsQuery.data ?? [], [newsQuery.data]);
  const [index, setIndex] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (index >= items.length) setIndex(0);
  }, [index, items.length]);

  useEffect(() => {
    if (!enabled || items.length <= 1) return;

    const timer = setInterval(() => {
      Animated.timing(fade, {
        toValue: 0,
        duration: FADE_MS,
        useNativeDriver: true,
      }).start(() => {
        setIndex((current) => (current + 1) % items.length);
        Animated.timing(fade, {
          toValue: 1,
          duration: FADE_MS,
          useNativeDriver: true,
        }).start();
      });
    }, ROTATE_MS);

    return () => clearInterval(timer);
  }, [enabled, fade, items.length]);

  const current = useMemo(() => items[index] ?? items[0] ?? null, [index, items]);

  if (!enabled || !current) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Breaking prediction news: ${current.message}`}
      onPress={() => router.push('/notifications' as never)}
      style={[
        styles.strip,
        {
          minHeight: 44 + insets.top,
          paddingTop: insets.top + 7,
        },
      ]}
    >
      <View style={styles.sideSlot}>
        <View style={styles.label}>
          <Icon name="flame" size={13} color={TICKER_TEXT} fixed />
          <Text style={styles.labelText} numberOfLines={1}>
            Breaking
          </Text>
        </View>
      </View>

      <Animated.View style={[styles.messageWrap, { opacity: fade }]}>
        <Text
          style={styles.message}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.82}
        >
          {current.message}
        </Text>
      </Animated.View>

      <View style={[styles.sideSlot, styles.rightSlot]}>
        {items.length > 1 ? (
          <Text style={styles.counter} numberOfLines={1}>
            {index + 1}/{items.length}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  strip: {
    minHeight: 44,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: TICKER_BG,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.18)',
  },
  sideSlot: {
    width: 86,
    flexShrink: 0,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  rightSlot: {
    alignItems: 'flex-end',
  },
  label: {
    height: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 13,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0,0,0,0.08)',
    flexShrink: 0,
  },
  labelText: {
    color: TICKER_TEXT,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  messageWrap: {
    minWidth: 0,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    color: TICKER_TEXT,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  counter: {
    color: TICKER_TEXT,
    fontSize: 10,
    fontWeight: '900',
    opacity: 0.72,
    textAlign: 'right',
  },
});

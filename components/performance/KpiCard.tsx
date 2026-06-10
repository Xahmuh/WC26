import { Text, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import Theme from '@/constants/theme/design-system';
import { useResponsive } from '@/lib/responsive';

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: IconName;
  accentColor?: string;
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon,
  accentColor = Theme.colors.accent,
}: KpiCardProps): React.JSX.Element {
  const { isSmall, scale: rs } = useResponsive();

  const padding = rs(isSmall ? 12 : 14);
  const minHeight = rs(isSmall ? 116 : 128);
  const titleSize = rs(isSmall ? 9 : 10);
  const valueSize = rs(isSmall ? 24 : 30);

  return (
    <Card
      className="overflow-hidden"
      style={[styles.card, { minHeight, backgroundColor: Theme.colors.bgSurface2 }]}
      padding={padding}
    >
      <LinearGradient
        colors={['rgba(201,223,106,0.14)', 'rgba(201,223,106,0.04)', 'rgba(255,255,255,0.00)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <Text
              style={[styles.title, { fontSize: titleSize }]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                style={styles.subtitle}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {subtitle}
              </Text>
            ) : null}
          </View>

          {icon ? (
            <View
              style={[
                styles.iconBadge,
                {
                  borderColor: accentColor + '33',
                  backgroundColor: Theme.colors.bgSurface3,
                },
              ]}
            >
              <Icon name={icon} size={16} color={accentColor} />
            </View>
          ) : null}
        </View>

        <View style={styles.metricRow}>
          <View style={[styles.metricRail, { backgroundColor: accentColor }]} />
          <Text
            style={[styles.value, { color: accentColor, fontSize: valueSize }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {value}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: Theme.colors.accentBorder,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  title: {
    color: Theme.colors.textTertiary,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    lineHeight: 14,
  },
  subtitle: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  metricRail: {
    width: 24,
    height: 3,
    borderRadius: 999,
    flexShrink: 0,
  },
  value: {
    flexShrink: 1,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 34,
    minWidth: 0,
  },
});

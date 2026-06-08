import { Image, Pressable, StyleSheet, Text } from 'react-native';

import { Colors, Typography } from '@/constants';

interface AvatarButtonProps {
  displayName?: string;
  avatarUrl?: string | null;
  size?: number;
  onPress?: () => void;
}

export function AvatarButton({
  displayName,
  avatarUrl,
  size = 40,
  onPress,
}: AvatarButtonProps): React.JSX.Element {
  const initial = displayName?.trim().charAt(0).toUpperCase() ?? '?';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      ) : (
        <Text style={styles.initial}>{initial}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.accent.lime,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initial: {
    color: Colors.background.primary,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.black,
  },
});


import { Image, Pressable, StyleSheet } from 'react-native';

import { Colors } from '@/constants';

const DEFAULT_AVATAR = require('@/assets/default_avatar.jpg');

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
  const avatarSource = avatarUrl ? { uri: avatarUrl } : DEFAULT_AVATAR;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${displayName ?? 'Player'} profile`}
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Image
        source={avatarSource}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
      />
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
});

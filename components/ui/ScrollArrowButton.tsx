import { Pressable, StyleSheet, View } from 'react-native';

import { Colors, Layout } from '@/constants';
import { Icon } from '@/components/ui/Icon';

interface ScrollArrowButtonProps {
  onPress?: () => void;
}

export function ScrollArrowButton({ onPress }: ScrollArrowButtonProps): React.JSX.Element {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.container}>
      <View style={styles.inner}>
        <Icon name="forward" size={18} color={Colors.text.secondary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 44,
    borderRadius: Layout.borderRadius.full,
    backgroundColor: Colors.background.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});


// ============================================================================
// JoinLeagueModal — paste an invite code or a shared deep link
// (e.g. wc26://league/join/WC26ABCD or https://.../league/join/WC26ABCD).
// ============================================================================

import { useState } from 'react';
import { Modal, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Theme from '@/constants/theme/design-system';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { resolveInviteCodeFromLink, useJoinLeague } from '@/hooks/useLeagues';
import { useResponsive } from '@/lib/responsive';

interface JoinLeagueModalProps {
  visible: boolean;
  onClose: () => void;
  onJoined?: (leagueId: string) => void;
  /** Pre-fill from a deep link the app was opened with. */
  initialCode?: string;
}

export function JoinLeagueModal({ visible, onClose, onJoined, initialCode }: JoinLeagueModalProps): React.JSX.Element {
  const [code, setCode] = useState(initialCode ?? '');
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const joinLeague = useJoinLeague();
  const insets = useSafeAreaInsets();
  const { height } = useResponsive();

  const overlayTopPadding = Math.max(16, insets.top + 16);
  const overlayBottomPadding = Math.max(16, insets.bottom + 16);
  const cardMaxHeight = Math.max(260, height - insets.top - insets.bottom - 48);
  const scrollBottomPadding = Math.max(16, insets.bottom + 12);

  const handleClose = () => {
    setCode('');
    setError(null);
    onClose();
  };

  const handleJoin = async () => {
    setError(null);
    const trimmed = code.trim();
    if (!trimmed) {
      setError('Enter an invite code or paste an invite link.');
      return;
    }

    try {
      const resolved = await resolveInviteCodeFromLink(trimmed);
      const league = await joinLeague.mutateAsync(resolved);
      setCode('');
      onJoined?.(league.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join the league.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[
          styles.overlay,
          { paddingTop: overlayTopPadding, paddingBottom: overlayBottomPadding },
        ]}
      >
        <Card
          className="w-full max-w-sm border border-bgBorder bg-bgSurface2 p-5 rounded-2xl shadow-2xl"
          style={{ maxHeight: cardMaxHeight }}
        >
          <ScrollView
            style={styles.modalScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.modalScrollContent,
              { paddingBottom: scrollBottomPadding },
            ]}
          >
          <View className="flex-row justify-between items-center pb-2 border-b border-bgBorder/50">
            <Text className="text-base font-bold text-textPrimary">Join League</Text>
            <Pressable onPress={handleClose} className="p-1.5 rounded-lg bg-bgSurface3 border border-bgBorder active:opacity-75">
              <Icon name="close" size={14} color={Theme.colors.textSecondary} />
            </Pressable>
          </View>

          <Text className="text-xs text-textSecondary">
            Ask the league owner for their invite code (e.g. WC26ABCD) or invite link, then enter it below.
          </Text>

          <View
            className="flex-row items-center rounded-xl px-3 h-12 gap-2.5"
            style={{
              borderWidth: 1,
              borderColor: focused ? Theme.colors.accent : Theme.colors.bgBorder,
              backgroundColor: focused ? Theme.colors.bgSurface1 : Theme.colors.bgSurface3,
            }}
          >
            <Icon name="key" size={18} color={focused ? Theme.colors.accent : Theme.colors.textTertiary} />
            <TextInput
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              placeholder="WC26ABCD"
              placeholderTextColor={Theme.colors.textTertiary}
              autoCapitalize="characters"
              autoCorrect={false}
              className="flex-1 text-[15px] tracking-[2px] text-textPrimary h-full font-extrabold"
              style={Platform.OS === 'web' ? ({ outlineStyle: 'none', borderWidth: 0 } as any) : { borderWidth: 0 }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
          </View>

          {error && (
            <View className="flex-row items-center gap-2 rounded-xl border border-live/30 bg-liveDim px-3 py-2.5">
              <Icon name="warning" size={16} color={Theme.colors.live} />
              <Text className="flex-1 text-xs font-semibold text-live">{error}</Text>
            </View>
          )}

          <Button
            label={joinLeague.isPending ? 'Joining…' : 'Join League'}
            loading={joinLeague.isPending}
            onPress={() => void handleJoin()}
          />
          </ScrollView>
        </Card>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalScrollContent: {
    gap: 16,
  },
  modalScroll: {
    flexShrink: 1,
  },
});

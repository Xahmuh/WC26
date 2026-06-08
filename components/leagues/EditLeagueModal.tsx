// ============================================================================
// EditLeagueModal — owner-only: rename, redescribe, change capacity.
// Same chrome as CreateLeagueModal; pre-fills from the current league.
// ============================================================================

import { useEffect, useState } from 'react';
import { Modal, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Theme from '@/constants/theme/design-system';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { useUpdateLeague } from '@/hooks/useLeagues';
import { useResponsive } from '@/lib/responsive';
import type { League } from '@/types';

interface EditLeagueModalProps {
  visible: boolean;
  league: League;
  onClose: () => void;
}

export function EditLeagueModal({ visible, league, onClose }: EditLeagueModalProps): React.JSX.Element {
  const [name, setName] = useState(league.name);
  const [description, setDescription] = useState(league.description ?? '');
  const [maxMembers, setMaxMembers] = useState(league.max_members ? String(league.max_members) : '');
  const [error, setError] = useState<string | null>(null);
  const updateLeague = useUpdateLeague();
  const insets = useSafeAreaInsets();
  const { height } = useResponsive();

  const overlayTopPadding = Math.max(16, insets.top + 16);
  const overlayBottomPadding = Math.max(16, insets.bottom + 16);
  const cardMaxHeight = Math.max(260, height - insets.top - insets.bottom - 48);
  const scrollBottomPadding = Math.max(16, insets.bottom + 12);

  // Re-sync fields whenever a different league is opened.
  useEffect(() => {
    if (visible) {
      setName(league.name);
      setDescription(league.description ?? '');
      setMaxMembers(league.max_members ? String(league.max_members) : '');
      setError(null);
    }
  }, [visible, league]);

  const handleSave = async () => {
    setError(null);
    const trimmed = name.trim();
    if (trimmed.length < 3) {
      setError('League name must be at least 3 characters.');
      return;
    }
    const max = maxMembers.trim() ? parseInt(maxMembers.trim(), 10) : null;
    if (maxMembers.trim() && (Number.isNaN(max) || (max as number) < 2)) {
      setError('Max members must be a number of 2 or more.');
      return;
    }

    try {
      await updateLeague.mutateAsync({
        leagueId: league.id,
        name: trimmed,
        description: description.trim() || null,
        maxMembers: max,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the league.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
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
            <Text className="text-base font-bold text-textPrimary">Edit League</Text>
            <Pressable onPress={onClose} className="p-1.5 rounded-lg bg-bgSurface3 border border-bgBorder active:opacity-75">
              <Icon name="close" size={14} color={Theme.colors.textSecondary} />
            </Pressable>
          </View>

          <Field label="League name" value={name} onChangeText={setName} maxLength={40} />
          <Field label="Description (optional)" value={description} onChangeText={setDescription} maxLength={280} multiline />
          <Field
            label="Max members (optional)"
            value={maxMembers}
            onChangeText={(t) => setMaxMembers(t.replace(/[^0-9]/g, ''))}
            placeholder="No limit"
            keyboardType="number-pad"
          />

          {error && (
            <View className="flex-row items-center gap-2 rounded-xl border border-live/30 bg-liveDim px-3 py-2.5">
              <Icon name="warning" size={16} color={Theme.colors.live} />
              <Text className="flex-1 text-xs font-semibold text-live">{error}</Text>
            </View>
          )}

          <Button label={updateLeague.isPending ? 'Saving…' : 'Save changes'} loading={updateLeague.isPending} onPress={() => void handleSave()} />
          </ScrollView>
        </Card>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  maxLength?: number;
  multiline?: boolean;
  keyboardType?: 'default' | 'number-pad';
}

function Field({ label, value, onChangeText, placeholder, maxLength, multiline, keyboardType }: FieldProps): React.JSX.Element {
  const [focused, setFocused] = useState(false);
  return (
    <View className="gap-1.5">
      <Text className="text-[11px] font-bold uppercase tracking-wide text-textSecondary">{label}</Text>
      <View
        className="rounded-xl px-3"
        style={{
          borderWidth: 1,
          borderColor: focused ? Theme.colors.accent : Theme.colors.bgBorder,
          backgroundColor: focused ? Theme.colors.bgSurface1 : Theme.colors.bgSurface3,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Theme.colors.textTertiary}
          maxLength={maxLength}
          multiline={multiline}
          keyboardType={keyboardType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`text-[13px] text-textPrimary font-semibold ${multiline ? 'h-20 py-2.5' : 'h-12'}`}
          style={Platform.OS === 'web' ? ({ outlineStyle: 'none', borderWidth: 0 } as any) : { borderWidth: 0 }}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
      </View>
    </View>
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

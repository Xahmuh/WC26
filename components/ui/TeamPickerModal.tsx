import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Text,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Modal,
  ScrollView,
  type NativeSyntheticEvent,
  type TextInputChangeEventData,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Theme from '@/constants/theme/design-system';
import { useResponsive } from '@/lib/responsive';
import { useTeams } from '@/hooks/useTeams';
import { TeamFlag } from './TeamFlag';
import { Button } from './Button';
import { Card } from './Card';
import { Icon } from './Icon';

interface TeamPickerModalProps {
  visible: boolean;
  onClose: () => void;
  selectedTeams: string[];
  onSave: (teams: string[]) => Promise<void>;
  saving: boolean;
  title?: string;
  isMandatory?: boolean;
}

const ITEMS_PER_PAGE = 8; // 4 rows of 2 columns keeps it very compact and responsive

function normalizeSearch(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function TeamPickerModal({
  visible,
  onClose,
  selectedTeams,
  onSave,
  saving,
  title = 'Select 3 Teams to Support',
  isMandatory = false,
}: TeamPickerModalProps): React.JSX.Element | null {
  const { data: teams = [], isLoading } = useTeams();
  const [search, setSearch] = useState('');
  const [localSelected, setLocalSelected] = useState<string[]>(selectedTeams || []);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFocused, setIsFocused] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();
  const { height } = useResponsive();

  const overlayTopPadding = Math.max(16, insets.top + 16);
  const overlayBottomPadding = Math.max(16, insets.bottom + 16);
  const cardMaxHeight = Math.max(260, height - insets.top - insets.bottom - 48);
  const listHeight = Math.min(250, Math.max(156, cardMaxHeight - 236));
  const normalizedSearch = normalizeSearch(search);

  useEffect(() => {
    if (!visible) return;
    setLocalSelected(selectedTeams || []);
  }, [selectedTeams, visible]);

  useEffect(() => {
    if (!visible) return;
    setSearch('');
    setCurrentPage(1);
  }, [visible]);

  const handleSearchChange = (text: string) => {
    setSearch(text);
    setCurrentPage(1); // Reset to page 1 when filter changes
  };

  const handleNativeSearchChange = (event: NativeSyntheticEvent<TextInputChangeEventData>) => {
    const nextSearch = event.nativeEvent.text;
    if (nextSearch !== search) {
      handleSearchChange(nextSearch);
    }
  };

  const filteredTeams = useMemo(() => {
    if (!normalizedSearch) return teams;

    return teams.filter((team) => {
      const haystack = [
        team.name,
        team.short_name,
        team.code,
        team.group_name,
      ].map(normalizeSearch);

      return haystack.some((value) => value.includes(normalizedSearch));
    });
  }, [teams, normalizedSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredTeams.length / ITEMS_PER_PAGE));

  useEffect(() => {
    setCurrentPage((page) => Math.min(Math.max(1, page), totalPages));
  }, [totalPages]);
  
  const paginatedTeams = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTeams.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTeams, currentPage]);

  const handleSelect = (teamId: string) => {
    if (localSelected.includes(teamId)) {
      setLocalSelected(localSelected.filter((id) => id !== teamId));
    } else {
      if (localSelected.length >= 3) {
        return;
      }
      setLocalSelected([...localSelected, teamId]);
    }
  };

  const handleSave = async () => {
    if (localSelected.length === 0) return;
    await onSave(localSelected);
  };

  // Rendered inside a real RN <Modal> so it always paints above the floating
  // tab bar (zIndex 100) and OS chrome. The card intentionally does not use
  // KeyboardAvoidingView: this picker should stay visually anchored while the
  // user types in search.
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.overlay,
          { paddingTop: overlayTopPadding, paddingBottom: overlayBottomPadding },
        ]}
      >
        <Card
          className="w-full max-w-sm border border-bgBorder bg-bgSurface2 p-5 rounded-2xl shadow-2xl"
          style={{ maxHeight: cardMaxHeight }}
        >
        <View style={styles.modalContent}>
        {/* Header */}
        <View className="flex-row justify-between items-center pb-2 border-b border-bgBorder/50">
          <View className="min-w-0 flex-1 gap-0.5 pr-2">
            <Text numberOfLines={1} className="text-base font-bold text-textPrimary">{title}</Text>
            <Text numberOfLines={1} className="text-[11px] text-textSecondary font-semibold">
              Choose up to 3 teams ({localSelected.length}/3 selected)
            </Text>
          </View>
          <Pressable onPress={onClose} className="shrink-0 p-1.5 rounded-lg bg-bgSurface3 border border-bgBorder active:opacity-75">
            <Text className="text-textSecondary text-[10px] font-bold">{isMandatory ? 'Skip' : 'Cancel'}</Text>
          </Pressable>
        </View>

        {/* Search Input */}
        <Pressable
          onPress={() => searchInputRef.current?.focus()}
          className="flex-row items-center rounded-xl px-3 h-12 gap-2.5"
          style={{
            borderWidth: 1,
            borderColor: isFocused ? Theme.colors.accent : Theme.colors.bgBorder,
            backgroundColor: isFocused ? Theme.colors.bgSurface1 : Theme.colors.bgSurface3,
            ...(isFocused ? {
              ...(Platform.OS === 'web'
                ? { boxShadow: '0 0 8px rgba(201, 223, 106, 0.15)' }
                : {
                    shadowColor: Theme.colors.accent,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.15,
                    shadowRadius: 8,
                    elevation: 4,
                  }),
            } : {}),
          }}
        >
          <Icon 
            name="search" 
            size={18} 
            color={isFocused ? Theme.colors.accent : Theme.colors.textTertiary} 
          />
          <TextInput
            ref={searchInputRef}
            value={search}
            onChangeText={handleSearchChange}
            onChange={handleNativeSearchChange}
            placeholder="Search teams..."
            placeholderTextColor={Theme.colors.textTertiary}
            className="flex-1 text-[13px] text-textPrimary h-full font-semibold"
            style={Platform.OS === 'web' ? { outlineStyle: 'none', borderWidth: 0 } as any : { borderWidth: 0 }}
            autoCapitalize="none"
            autoCorrect={false}
            blurOnSubmit={false}
            returnKeyType="search"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            testID="team-picker-search"
          />
          {search.length > 0 && (
            <Pressable 
              onPress={() => handleSearchChange('')} 
              className="p-1.5 rounded-full bg-bgSurface2 border border-bgBorder active:scale-95 active:opacity-75"
            >
              <Icon name="close" size={10} color={Theme.colors.textSecondary} />
            </Pressable>
          )}
        </Pressable>

        {/* Team List (Paginated Grid) */}
        {isLoading ? (
          <View style={[styles.teamList, { height: listHeight, alignItems: 'center', justifyContent: 'center' }]}>
            <ActivityIndicator size="small" color={Theme.colors.accent} />
          </View>
        ) : (
          <View style={[styles.teamList, { height: listHeight }]}>
            <ScrollView
              style={styles.teamGridScroller}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              contentContainerStyle={styles.teamGridContent}
            >
              {paginatedTeams.map((team) => {
                const isSelected = localSelected.includes(team.id);
                const disabled = !isSelected && localSelected.length >= 3;

                return (
                  <Pressable
                    key={team.id}
                    onPress={() => handleSelect(team.id)}
                    disabled={disabled && !isSelected}
                    style={{ width: '48%' }}
                    className={`flex-row items-center gap-1.5 border p-2.5 rounded-xl ${
                      isSelected
                        ? 'bg-accentDim border-accent'
                        : disabled
                        ? 'bg-bgSurface3/40 border-bgBorder/40 opacity-40'
                        : 'bg-bgSurface3 border-bgBorder active:opacity-85'
                    }`}
                  >
                    <TeamFlag team={team} size={18} fixed />
                    <View className="flex-1">
                      <Text
                        numberOfLines={1}
                        className={`text-[11px] font-bold ${
                          isSelected ? 'text-accent' : 'text-textPrimary'
                        }`}
                      >
                        {team.name}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
              {filteredTeams.length === 0 && (
                <Text className="text-xs text-textTertiary text-center w-full py-16">
                  No teams found matching search.
                </Text>
              )}
            </ScrollView>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <View className="flex-row justify-between items-center pt-2">
                <Pressable
                  disabled={currentPage === 1}
                  onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className={`px-2.5 py-1.5 rounded-lg border ${
                    currentPage === 1
                      ? 'border-bgBorder/35 opacity-40'
                      : 'bg-bgSurface3 border-bgBorder active:opacity-75'
                  }`}
                >
                  <Text className="text-[10px] font-bold text-textSecondary">Prev</Text>
                </Pressable>
                
                <Text className="text-[10px] text-textSecondary font-bold">
                  Page {currentPage} of {totalPages}
                </Text>

                <Pressable
                  disabled={currentPage === totalPages}
                  onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className={`px-2.5 py-1.5 rounded-lg border ${
                    currentPage === totalPages
                      ? 'border-bgBorder/35 opacity-40'
                      : 'bg-bgSurface3 border-bgBorder active:opacity-75'
                  }`}
                >
                  <Text className="text-[10px] font-bold text-textSecondary">Next</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* Save Button */}
        <View className="pt-2 border-t border-bgBorder/50">
          <Button
            label={saving ? 'Saving Choices...' : 'Confirm Selections'}
            disabled={localSelected.length === 0 || saving}
            loading={saving}
            onPress={handleSave}
          />
        </View>
        </View>
      </Card>
      </View>
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
  modalContent: {
    flexShrink: 1,
    gap: 16,
  },
  teamList: {
    gap: 8,
  },
  teamGridScroller: {
    flex: 1,
  },
  teamGridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 4,
  },
});

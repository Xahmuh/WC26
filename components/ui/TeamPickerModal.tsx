import { useState, useMemo } from 'react';
import {
  Text,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';

import Theme from '@/constants/theme/design-system';
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

  const handleSearchChange = (text: string) => {
    setSearch(text);
    setCurrentPage(1); // Reset to page 1 when filter changes
  };

  const filteredTeams = useMemo(() => {
    return teams.filter((t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.short_name && t.short_name.toLowerCase().includes(search.toLowerCase())) ||
      (t.code && t.code.toLowerCase().includes(search.toLowerCase()))
    );
  }, [teams, search]);

  const totalPages = Math.ceil(filteredTeams.length / ITEMS_PER_PAGE);
  
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
  // tab bar (zIndex 100) and OS chrome, and a KeyboardAvoidingView keeps the
  // "Confirm" button visible when the search keyboard is open on mobile.
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
      <Card className="w-full max-w-sm border border-bgBorder bg-bgSurface2 p-5 gap-4 rounded-2xl shadow-2xl">
        {/* Header */}
        <View className="flex-row justify-between items-center pb-2 border-b border-bgBorder/50">
          <View className="gap-0.5">
            <Text className="text-base font-bold text-textPrimary">{title}</Text>
            <Text className="text-[11px] text-textSecondary font-semibold">
              Choose up to 3 teams ({localSelected.length}/3 selected)
            </Text>
          </View>
          <Pressable onPress={onClose} className="p-1.5 rounded-lg bg-bgSurface3 border border-bgBorder active:opacity-75">
            <Text className="text-textSecondary text-[10px] font-bold">{isMandatory ? 'Skip' : 'Cancel'}</Text>
          </Pressable>
        </View>

        {/* Search Input */}
        <View 
          className="flex-row items-center rounded-xl px-3 h-12 gap-2.5"
          style={{
            borderWidth: 1,
            borderColor: isFocused ? Theme.colors.accent : Theme.colors.bgBorder,
            backgroundColor: isFocused ? Theme.colors.bgSurface1 : Theme.colors.bgSurface3,
            ...(isFocused ? {
              shadowColor: Theme.colors.accent,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
              elevation: 4,
            } : {}),
          }}
        >
          <Icon 
            name="search" 
            size={18} 
            color={isFocused ? Theme.colors.accent : Theme.colors.textTertiary} 
          />
          <TextInput
            value={search}
            onChangeText={handleSearchChange}
            placeholder="Search teams..."
            placeholderTextColor={Theme.colors.textTertiary}
            className="flex-1 text-[13px] text-textPrimary h-full font-semibold"
            style={Platform.OS === 'web' ? { outlineStyle: 'none', borderWidth: 0 } as any : { borderWidth: 0 }}
            autoCapitalize="none"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
          {search.length > 0 && (
            <Pressable 
              onPress={() => handleSearchChange('')} 
              className="p-1.5 rounded-full bg-bgSurface2 border border-bgBorder active:scale-95 active:opacity-75"
            >
              <Icon name="close" size={10} color={Theme.colors.textSecondary} />
            </Pressable>
          )}
        </View>

        {/* Team List (Paginated Grid) */}
        {isLoading ? (
          <View className="h-[210px] items-center justify-center">
            <ActivityIndicator size="small" color={Theme.colors.accent} />
          </View>
        ) : (
          <View className="h-[210px] justify-between">
            <View className="flex-row flex-wrap gap-2">
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
            </View>

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
                  <Text className="text-[10px] font-bold text-textSecondary">← Prev</Text>
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
                  <Text className="text-[10px] font-bold text-textSecondary">Next →</Text>
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
});

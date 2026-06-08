import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import Theme from '@/constants/theme/design-system';
import { useResponsive } from '@/lib/responsive';

interface CalendarModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: string | null; // Format: 'YYYY-MM-DD'
  onSelectDate: (date: string | null) => void;
  matchDates: Set<string>; // Dates containing matches
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function CalendarModal({
  visible,
  onClose,
  selectedDate,
  onSelectDate,
  matchDates,
}: CalendarModalProps): React.JSX.Element {
  // World Cup 2026 is in June 2026, so default calendar to June 2026
  const [currentDate, setCurrentDate] = useState(new Date(2026, 5, 1));
  const insets = useSafeAreaInsets();
  const { height } = useResponsive();

  const overlayTopPadding = Math.max(16, insets.top + 16);
  const overlayBottomPadding = Math.max(16, insets.bottom + 16);
  const cardMaxHeight = Math.max(260, height - insets.top - insets.bottom - 48);
  const scrollBottomPadding = Math.max(16, insets.bottom + 12);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const totalDays = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();

  const days: (number | null)[] = [];

  // Add blank cells for padding at the start
  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }

  // Add month days
  for (let i = 1; i <= totalDays; i++) {
    days.push(i);
  }

  // Switch month helper
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const formatDateStr = (day: number): string => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={[
          styles.overlay,
          { paddingTop: overlayTopPadding, paddingBottom: overlayBottomPadding },
        ]}
      >
        <Pressable
          className="bg-bgSurface2 border border-bgBorder rounded-2xl w-full max-w-sm p-5 shadow-lg"
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
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-bgBorder pb-2">
            <Text className="text-base font-bold text-textPrimary">Select Match Date</Text>
            <Pressable onPress={onClose} className="p-1">
              <Icon name="close" size={20} color={Theme.colors.textSecondary} />
            </Pressable>
          </View>

          {/* Month Navigator */}
          <View className="flex-row items-center justify-between">
            <Pressable onPress={handlePrevMonth} className="p-2 border border-bgBorder rounded-lg bg-bgSurface1">
              <Icon name="back" size={14} color={Theme.colors.accent} />
            </Pressable>
            <Text className="text-sm font-bold text-textPrimary">
              {MONTH_NAMES[month]} {year}
            </Text>
            <Pressable onPress={handleNextMonth} className="p-2 border border-bgBorder rounded-lg bg-bgSurface1">
              <Icon name="forward" size={14} color={Theme.colors.accent} />
            </Pressable>
          </View>

          {/* Calendar Grid */}
          <View className="gap-2">
            {/* Weekdays */}
            <View className="flex-row justify-between">
              {WEEKDAYS.map((day) => (
                <Text key={day} className="w-10 text-center text-[10px] font-bold text-textTertiary uppercase">
                  {day}
                </Text>
              ))}
            </View>

            {/* Days */}
            <View className="flex-row flex-wrap justify-start">
              {days.map((day, index) => {
                if (day === null) {
                  return <View key={`empty-${index}`} className="w-10 h-10" />;
                }

                const dateStr = formatDateStr(day);
                const hasMatches = matchDates.has(dateStr);
                const isSelected = selectedDate === dateStr;

                return (
                  <Pressable
                    key={`day-${day}`}
                    onPress={() => {
                      onSelectDate(dateStr);
                      onClose();
                    }}
                    className={`w-10 h-10 items-center justify-center rounded-full relative my-0.5 ${
                      isSelected
                        ? 'bg-accent'
                        : hasMatches
                        ? 'bg-accentDim/30 border border-accentBorder'
                        : 'bg-transparent'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isSelected
                          ? 'text-accentDark'
                          : hasMatches
                          ? 'text-accent'
                          : 'text-textSecondary'
                      }`}
                    >
                      {day}
                    </Text>
                    {/* Small dot below day indicating matches */}
                    {hasMatches && !isSelected && (
                      <View className="absolute bottom-1 w-1 h-1 rounded-full bg-accent" />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Action buttons */}
          <View className="flex-row gap-3 mt-2 border-t border-bgBorder pt-4">
            <Button
              label="Clear Filter"
              variant="secondary"
              onPress={() => {
                onSelectDate(null);
                onClose();
              }}
              className="flex-1"
            />
            <Button
              label="Close"
              onPress={onClose}
              className="flex-1"
            />
          </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 24,
  },
  modalScrollContent: {
    gap: 16,
  },
  modalScroll: {
    flexShrink: 1,
  },
});

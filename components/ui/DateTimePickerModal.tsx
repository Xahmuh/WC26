import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import Theme from '@/constants/theme/design-system';
import { useResponsive } from '@/lib/responsive';

interface DateTimePickerModalProps {
  visible: boolean;
  onClose: () => void;
  /** Currently selected value (local time). Null defaults to "now". */
  value: Date | null;
  /** Called with the chosen local Date when the user confirms. */
  onConfirm: (date: Date) => void;
  title?: string;
  /** Optional lower bound — days/times before this are disabled. */
  minDate?: Date;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

const pad = (n: number): string => String(n).padStart(2, '0');

export function DateTimePickerModal({
  visible,
  onClose,
  value,
  onConfirm,
  title = 'Select Date & Time',
  minDate,
}: DateTimePickerModalProps): React.JSX.Element {
  const initial = value ?? new Date();
  const insets = useSafeAreaInsets();
  const { height } = useResponsive();

  const overlayTopPadding = Math.max(16, insets.top + 16);
  const overlayBottomPadding = Math.max(16, insets.bottom + 16);
  const cardMaxHeight = Math.max(260, height - insets.top - insets.bottom - 48);
  const scrollBottomPadding = Math.max(16, insets.bottom + 12);

  // The selected day (year/month/day) and time (hour/minute) kept separately.
  const [selected, setSelected] = useState<Date>(initial);
  const [hour, setHour] = useState<number>(initial.getHours());
  const [minute, setMinute] = useState<number>(
    // snap to nearest 5-min slot
    Math.round(initial.getMinutes() / 5) * 5 % 60
  );
  // Which month the calendar is showing.
  const [viewDate, setViewDate] = useState<Date>(
    new Date(initial.getFullYear(), initial.getMonth(), 1)
  );

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const totalDays = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  const handlePrevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const isSameDay = (day: number): boolean =>
    selected.getFullYear() === year &&
    selected.getMonth() === month &&
    selected.getDate() === day;

  const dayIsDisabled = (day: number): boolean => {
    if (!minDate) return false;
    const end = new Date(year, month, day, 23, 59, 59, 999);
    return end.getTime() < minDate.getTime();
  };

  const buildResult = (): Date =>
    new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), hour, minute, 0, 0);

  const result = buildResult();
  const isBeforeMin = minDate ? result.getTime() < minDate.getTime() : false;

  const handleConfirm = () => {
    if (isBeforeMin) return;
    onConfirm(buildResult());
    onClose();
  };

  const previewText = result.toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  }) + ` · ${pad(hour)}:${pad(minute)}`;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
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
            <Text className="text-base font-bold text-textPrimary">{title}</Text>
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
            <View className="flex-row justify-between">
              {WEEKDAYS.map((d) => (
                <Text key={d} className="w-10 text-center text-[10px] font-bold text-textTertiary uppercase">
                  {d}
                </Text>
              ))}
            </View>

            <View className="flex-row flex-wrap justify-start">
              {cells.map((day, index) => {
                if (day === null) {
                  return <View key={`empty-${index}`} className="w-10 h-10" />;
                }
                const disabled = dayIsDisabled(day);
                const isSelected = isSameDay(day);

                return (
                  <Pressable
                    key={`day-${day}`}
                    disabled={disabled}
                    onPress={() => setSelected(new Date(year, month, day))}
                    className={`w-10 h-10 items-center justify-center rounded-full my-0.5 ${
                      isSelected ? 'bg-accent' : 'bg-transparent'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isSelected
                          ? 'text-accentDark'
                          : disabled
                          ? 'text-textTertiary/40'
                          : 'text-textSecondary'
                      }`}
                    >
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Time picker */}
          <View className="gap-3 border-t border-bgBorder pt-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-bold text-textSecondary uppercase">Time</Text>
              <Text className="text-sm font-bold text-accent">{pad(hour)}:{pad(minute)}</Text>
            </View>

            {/* Hours */}
            <View className="gap-1">
              <Text className="text-[10px] text-textTertiary uppercase font-semibold">Hour</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-1.5 py-0.5">
                {HOURS.map((h) => {
                  const active = h === hour;
                  return (
                    <Pressable
                      key={h}
                      onPress={() => setHour(h)}
                      className={`w-10 h-9 items-center justify-center rounded-lg border ${
                        active ? 'bg-accentDim border-accent' : 'bg-bgSurface1 border-bgBorder'
                      }`}
                    >
                      <Text className={`text-xs font-bold ${active ? 'text-accent' : 'text-textSecondary'}`}>
                        {pad(h)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Minutes */}
            <View className="gap-1">
              <Text className="text-[10px] text-textTertiary uppercase font-semibold">Minute</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-1.5 py-0.5">
                {MINUTES.map((m) => {
                  const active = m === minute;
                  return (
                    <Pressable
                      key={m}
                      onPress={() => setMinute(m)}
                      className={`w-10 h-9 items-center justify-center rounded-lg border ${
                        active ? 'bg-accentDim border-accent' : 'bg-bgSurface1 border-bgBorder'
                      }`}
                    >
                      <Text className={`text-xs font-bold ${active ? 'text-accent' : 'text-textSecondary'}`}>
                        {pad(m)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>

          {/* Preview + error */}
          <View className="bg-bgSurface1 border border-bgBorder rounded-xl p-3">
            <Text className="text-[10px] text-textTertiary uppercase font-semibold">Selected</Text>
            <Text className="text-sm font-bold text-textPrimary mt-0.5">{previewText}</Text>
            {isBeforeMin && (
              <Text className="text-[10px] text-live font-semibold mt-1">
                Must be in the future.
              </Text>
            )}
          </View>

          {/* Actions */}
          <View className="flex-row gap-3 border-t border-bgBorder pt-4">
            <View className="flex-1">
              <Button label="Cancel" variant="secondary" onPress={onClose} />
            </View>
            <View className="flex-1">
              <Button label="Confirm" onPress={handleConfirm} disabled={isBeforeMin} />
            </View>
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

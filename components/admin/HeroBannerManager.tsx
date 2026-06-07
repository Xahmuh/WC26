import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, Switch, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import Theme from '@/constants/theme/design-system';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getHeroSlideImageUrl } from '@/services/admin.service';
import {
  useHeroSlides,
  useUploadHeroSlideImage,
  useCreateHeroSlide,
  useUpdateHeroSlide,
  useDeleteHeroSlide,
  useReorderHeroSlides,
} from '@/hooks/useAdmin';
import type { HeroSlide } from '@/types';

interface SlideFormState {
  imagePath: string | null;
  localPreviewUri: string | null;
  backgroundColor: string;
  title: string;
  subtitle: string;
  linkUrl: string;
  isActive: boolean;
}

const EMPTY_FORM: SlideFormState = {
  imagePath: null,
  localPreviewUri: null,
  backgroundColor: '#13214a',
  title: '',
  subtitle: '',
  linkUrl: '',
  isActive: true,
};

function SlideEditorCard({
  initial,
  busy,
  onCancel,
  onSubmit,
  submitLabel,
}: {
  initial: SlideFormState;
  busy: boolean;
  onCancel?: () => void;
  onSubmit: (form: SlideFormState) => void;
  submitLabel: string;
}): React.JSX.Element {
  const [form, setForm] = useState<SlideFormState>(initial);
  const uploadMutation = useUploadHeroSlideImage();

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need storage permission to pick a banner image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;
    const localUri = result.assets[0].uri;
    setForm((f) => ({ ...f, localPreviewUri: localUri }));

    uploadMutation.mutate(localUri, {
      onSuccess: (path) => setForm((f) => ({ ...f, imagePath: path })),
      onError: (err: any) => {
        Alert.alert('Upload Failed', err.message || 'Could not upload the image.');
        setForm((f) => ({ ...f, localPreviewUri: null }));
      },
    });
  };

  const handleSubmit = () => {
    if (!form.imagePath) {
      Alert.alert('Error', 'Please pick a banner image first.');
      return;
    }
    onSubmit(form);
  };

  const previewUri = form.localPreviewUri || (form.imagePath ? getHeroSlideImageUrl(form.imagePath) : null);

  return (
    <Card className="p-4 border border-bgBorder bg-bgSurface2 gap-4">
      {/* Image picker / preview */}
      <Pressable
        onPress={handlePickImage}
        className="h-32 rounded-lg border border-dashed border-bgBorder bg-bgSurface1 items-center justify-center overflow-hidden"
        style={{ backgroundColor: form.backgroundColor }}
      >
        {uploadMutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : previewUri ? (
          <Image source={{ uri: previewUri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
        ) : (
          <View className="items-center gap-1">
            <Text className="text-xs text-textTertiary">Tap to pick a banner image</Text>
            <Text className="text-[10px] text-textTertiary">16:9 recommended</Text>
          </View>
        )}
      </Pressable>

      {/* Background color */}
      <View className="gap-1.5">
        <Text className="text-xs font-semibold text-textSecondary uppercase">Background Color (hex)</Text>
        <TextInput
          value={form.backgroundColor}
          onChangeText={(t) => setForm((f) => ({ ...f, backgroundColor: t }))}
          placeholder="#13214a"
          placeholderTextColor={Theme.colors.textTertiary}
          autoCapitalize="none"
          className="h-11 rounded-lg border border-bgBorder bg-bgSurface1 px-3 text-sm text-textPrimary"
        />
      </View>

      {/* Title */}
      <View className="gap-1.5">
        <Text className="text-xs font-semibold text-textSecondary uppercase">Title (optional)</Text>
        <TextInput
          value={form.title}
          onChangeText={(t) => setForm((f) => ({ ...f, title: t }))}
          placeholder="e.g. Double Points Weekend!"
          placeholderTextColor={Theme.colors.textTertiary}
          className="h-11 rounded-lg border border-bgBorder bg-bgSurface1 px-3 text-sm text-textPrimary"
        />
      </View>

      {/* Subtitle */}
      <View className="gap-1.5">
        <Text className="text-xs font-semibold text-textSecondary uppercase">Subtitle (optional)</Text>
        <TextInput
          value={form.subtitle}
          onChangeText={(t) => setForm((f) => ({ ...f, subtitle: t }))}
          placeholder="e.g. Predict the quarter-finals now"
          placeholderTextColor={Theme.colors.textTertiary}
          className="h-11 rounded-lg border border-bgBorder bg-bgSurface1 px-3 text-sm text-textPrimary"
        />
      </View>

      {/* Link URL */}
      <View className="gap-1.5">
        <Text className="text-xs font-semibold text-textSecondary uppercase">Tap Link (optional)</Text>
        <TextInput
          value={form.linkUrl}
          onChangeText={(t) => setForm((f) => ({ ...f, linkUrl: t }))}
          placeholder="/match/abc123 or https://…"
          placeholderTextColor={Theme.colors.textTertiary}
          autoCapitalize="none"
          className="h-11 rounded-lg border border-bgBorder bg-bgSurface1 px-3 text-sm text-textPrimary"
        />
        <Text className="text-[10px] text-textTertiary">
          Use an in-app path like /match/&lt;id&gt; or a full https:// URL.
        </Text>
      </View>

      {/* Active toggle */}
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-textPrimary">Visible to users</Text>
        <Switch
          value={form.isActive}
          onValueChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
          trackColor={{ false: Theme.colors.bgBorder, true: Theme.colors.accent }}
        />
      </View>

      <View className="flex-row gap-2">
        {onCancel && (
          <Button label="Cancel" variant="secondary" onPress={onCancel} className="flex-1" />
        )}
        <Button
          label={submitLabel}
          onPress={handleSubmit}
          loading={busy}
          disabled={uploadMutation.isPending}
          className="flex-1"
        />
      </View>
    </Card>
  );
}

function SlideRow({
  slide,
  index,
  total,
  onMove,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  slide: HeroSlide;
  index: number;
  total: number;
  onMove: (direction: 'up' | 'down') => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: (value: boolean) => void;
}): React.JSX.Element {
  return (
    <Card className="p-3 border border-bgBorder bg-bgSurface2 flex-row items-center gap-3">
      <Image
        source={{ uri: getHeroSlideImageUrl(slide.image_path) }}
        style={{ width: 64, height: 40, borderRadius: 8, backgroundColor: slide.background_color }}
        resizeMode="contain"
      />
      <View className="flex-1 gap-0.5">
        <Text className="text-sm font-bold text-textPrimary" numberOfLines={1}>
          {slide.title || 'Untitled slide'}
        </Text>
        {slide.subtitle ? (
          <Text className="text-xs text-textSecondary" numberOfLines={1}>{slide.subtitle}</Text>
        ) : null}
        <Text className="text-[10px] text-textTertiary">
          Order #{slide.sort_order} · {slide.is_active ? 'Visible' : 'Hidden'}
        </Text>
      </View>

      <View className="items-center gap-1">
        <Pressable onPress={() => onMove('up')} disabled={index === 0} className="p-1">
          <Text className={`text-xs font-bold ${index === 0 ? 'text-textTertiary' : 'text-textPrimary'}`}>▲</Text>
        </Pressable>
        <Pressable onPress={() => onMove('down')} disabled={index === total - 1} className="p-1">
          <Text className={`text-xs font-bold ${index === total - 1 ? 'text-textTertiary' : 'text-textPrimary'}`}>▼</Text>
        </Pressable>
      </View>

      <Switch
        value={slide.is_active}
        onValueChange={onToggleActive}
        trackColor={{ false: Theme.colors.bgBorder, true: Theme.colors.accent }}
      />

      <Pressable onPress={onEdit} className="p-1.5">
        <Icon name="edit" size={16} color={Theme.colors.accent} fixed />
      </Pressable>
      <Pressable onPress={onDelete} className="p-1.5">
        <Icon name="trash" size={16} color={Theme.colors.live} fixed />
      </Pressable>
    </Card>
  );
}

export function HeroBannerManager(): React.JSX.Element {
  const { data: slides, isLoading } = useHeroSlides();
  const createMutation = useCreateHeroSlide();
  const updateMutation = useUpdateHeroSlide();
  const deleteMutation = useDeleteHeroSlide();
  const reorderMutation = useReorderHeroSlides();

  const [isAdding, setIsAdding] = useState(false);
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);

  const orderedSlides = (slides || []).slice().sort((a, b) => a.sort_order - b.sort_order);

  const handleCreate = (form: SlideFormState) => {
    createMutation.mutate(
      {
        imagePath: form.imagePath!,
        backgroundColor: form.backgroundColor.trim() || '#13214a',
        title: form.title.trim() || null,
        subtitle: form.subtitle.trim() || null,
        linkUrl: form.linkUrl.trim() || null,
        sortOrder: orderedSlides.length,
        isActive: form.isActive,
      },
      {
        onSuccess: () => {
          setIsAdding(false);
          Alert.alert('Success', 'Hero slide added.');
        },
        onError: (err: any) => Alert.alert('Error', err.message || 'Failed to add slide.'),
      }
    );
  };

  const handleUpdate = (slideId: string, form: SlideFormState) => {
    updateMutation.mutate(
      {
        slideId,
        updates: {
          imagePath: form.imagePath || undefined,
          backgroundColor: form.backgroundColor.trim() || '#13214a',
          title: form.title.trim() || null,
          subtitle: form.subtitle.trim() || null,
          linkUrl: form.linkUrl.trim() || null,
          isActive: form.isActive,
        },
      },
      {
        onSuccess: () => {
          setEditingSlideId(null);
          Alert.alert('Success', 'Hero slide updated.');
        },
        onError: (err: any) => Alert.alert('Error', err.message || 'Failed to update slide.'),
      }
    );
  };

  const handleDelete = (slide: HeroSlide) => {
    Alert.alert('Delete Slide', 'Are you sure you want to permanently delete this banner slide?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteMutation.mutate(slide.id, {
            onError: (err: any) => Alert.alert('Error', err.message || 'Failed to delete slide.'),
          });
        },
      },
    ]);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= orderedSlides.length) return;

    const reordered = orderedSlides.slice();
    const moved = reordered[index];
    const swapped = reordered[targetIndex];
    if (!moved || !swapped) return;
    reordered[index] = swapped;
    reordered[targetIndex] = moved;
    reorderMutation.mutate(reordered.map((s) => s.id), {
      onError: (err: any) => Alert.alert('Error', err.message || 'Failed to reorder slides.'),
    });
  };

  return (
    <View className="gap-4">
      <Text className="text-sm text-textSecondary">
        Control the home screen hero banner. Add, reorder, edit, or hide slides — changes apply to users immediately.
      </Text>

      {isLoading ? (
        <LoadingSpinner label="Loading hero slides..." />
      ) : (
        <View className="gap-3">
          {orderedSlides.map((slide, index) =>
            editingSlideId === slide.id ? (
              <SlideEditorCard
                key={slide.id}
                submitLabel="Save Changes"
                busy={updateMutation.isPending}
                initial={{
                  imagePath: slide.image_path,
                  localPreviewUri: null,
                  backgroundColor: slide.background_color,
                  title: slide.title || '',
                  subtitle: slide.subtitle || '',
                  linkUrl: slide.link_url || '',
                  isActive: slide.is_active,
                }}
                onCancel={() => setEditingSlideId(null)}
                onSubmit={(form) => handleUpdate(slide.id, form)}
              />
            ) : (
              <SlideRow
                key={slide.id}
                slide={slide}
                index={index}
                total={orderedSlides.length}
                onMove={(direction) => handleMove(index, direction)}
                onEdit={() => setEditingSlideId(slide.id)}
                onDelete={() => handleDelete(slide)}
                onToggleActive={(value) =>
                  updateMutation.mutate(
                    { slideId: slide.id, updates: { isActive: value } },
                    { onError: (err: any) => Alert.alert('Error', err.message || 'Failed to update slide.') }
                  )
                }
              />
            )
          )}

          {orderedSlides.length === 0 && !isAdding && (
            <Text className="text-xs text-textTertiary text-center py-6 italic">
              No hero slides yet. Add one to take over the home screen banner.
            </Text>
          )}
        </View>
      )}

      {isAdding ? (
        <SlideEditorCard
          submitLabel="Add Slide"
          busy={createMutation.isPending}
          initial={EMPTY_FORM}
          onCancel={() => setIsAdding(false)}
          onSubmit={handleCreate}
        />
      ) : (
        <Button label="+ Add Hero Slide" variant="secondary" onPress={() => setIsAdding(true)} />
      )}
    </View>
  );
}

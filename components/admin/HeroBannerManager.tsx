import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, Switch, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import Theme from '@/constants/theme/design-system';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getHeroSlideImageUrl } from '@/services/admin.service';
import {
  DEFAULT_HOME_BANNER_POSITION,
  getHomeBannerPositionLabel,
  HOME_BANNER_POSITIONS,
  type HomeBannerPosition,
} from '@/lib/bannerPositions';
import {
  useHeroSlides,
  useUploadHeroSlideImage,
  useCreateHeroSlide,
  useUpdateHeroSlide,
  useDeleteHeroSlide,
  useReorderHeroSlides,
  useBannerCollections,
  useCreateBannerCollection,
  useUpdateBannerCollection,
  useDeleteBannerCollection,
} from '@/hooks/useAdmin';
import type { BannerPlacement, HeroSlide } from '@/types';

type AdminDialogAction = {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'lime';
  onPress?: () => void;
};

type ShowAdminDialog = (dialog: {
  title: string;
  message?: string;
  variant?: 'success' | 'error' | 'warning' | 'info' | 'danger';
  actions?: AdminDialogAction[];
}) => void;

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

const CURRENT_FALLBACK_HERO = require('../../assets/herob.jpg');

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
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need storage permission to pick a banner image.');
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.75,
    });

    const asset = result.assets?.[0];
    if (result.canceled || !asset?.uri) return;
    const localUri = asset.uri;
    setForm((f) => ({ ...f, localPreviewUri: localUri }));

    uploadMutation.mutate({
      localUri,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      webFile: asset.file ?? null,
    }, {
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
        className="rounded-lg border border-dashed border-bgBorder bg-bgSurface1 items-center justify-center overflow-hidden"
        style={{ backgroundColor: form.backgroundColor, width: '100%', aspectRatio: 9 / 4 }}
      >
        {uploadMutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : previewUri ? (
          <>
            <Image source={{ uri: previewUri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
            <View className="absolute bottom-2 self-center rounded-full bg-black/70 px-3 py-1">
              <Text className="text-[10px] font-bold uppercase tracking-wide text-accent">
                Tap image to replace
              </Text>
            </View>
          </>
        ) : (
          <View className="items-center gap-1">
            <Text className="text-xs text-textTertiary">Tap to pick a banner image</Text>
            <Text className="text-[10px] text-textTertiary">1440 x 640 recommended (9:4)</Text>
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
        style={{ width: 72, height: 32, borderRadius: 8, backgroundColor: slide.background_color }}
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

export function HeroBannerManager({
  onDialog,
  placement = 'top',
  collectionId = null,
  heading = 'Top slider',
  description = 'Control the top home screen banner. Add, reorder, edit, or hide slides.',
  addLabel = '+ Add Slide',
}: {
  onDialog?: ShowAdminDialog;
  placement?: BannerPlacement;
  collectionId?: string | null;
  heading?: string;
  description?: string;
  addLabel?: string;
}): React.JSX.Element {
  const { data: slides, isLoading } = useHeroSlides(placement, collectionId);
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
        placement,
        collectionId,
        sortOrder: orderedSlides.length,
        isActive: form.isActive,
      },
      {
        onSuccess: () => {
          setIsAdding(false);
          if (onDialog) {
            onDialog({ title: 'Saved', message: 'Banner slide added.', variant: 'success' });
          } else {
            Alert.alert('Success', 'Banner slide added.');
          }
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
          placement,
          collectionId,
          isActive: form.isActive,
        },
      },
      {
        onSuccess: () => {
          setEditingSlideId(null);
          if (onDialog) {
            onDialog({ title: 'Saved', message: 'Banner slide updated.', variant: 'success' });
          } else {
            Alert.alert('Success', 'Banner slide updated.');
          }
        },
        onError: (err: any) => Alert.alert('Error', err.message || 'Failed to update slide.'),
      }
    );
  };

  const handleDelete = (slide: HeroSlide) => {
    const deleteSlide = () => {
      deleteMutation.mutate(slide.id, {
        onSuccess: () => {
          onDialog?.({ title: 'Deleted', message: 'Hero slide permanently deleted.', variant: 'success' });
        },
        onError: (err: any) => {
          const message = err.message || 'Failed to delete slide.';
          if (onDialog) {
            onDialog({ title: 'Error', message, variant: 'error' });
          } else {
            Alert.alert('Error', message);
          }
        },
      });
    };

    if (onDialog) {
      onDialog({
        title: 'Delete hero slide?',
        message: 'This will permanently delete the slide from the home hero banner. This cannot be undone.',
        variant: 'danger',
        actions: [
          { label: 'Cancel', variant: 'secondary' },
          { label: 'Delete', variant: 'danger', onPress: deleteSlide },
        ],
      });
      return;
    }

    Alert.alert('Delete Slide', 'Are you sure you want to permanently delete this banner slide?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: deleteSlide,
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
      <View className="gap-1">
        <Text className="text-base font-bold text-textPrimary">{heading}</Text>
        <Text className="text-sm text-textSecondary">{description}</Text>
      </View>
      <Text className="text-sm text-textSecondary">
        Add, reorder, edit, or hide slides. Changes apply to users immediately.
      </Text>

      {isLoading ? (
        <LoadingSpinner label="Loading banner slides..." />
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

          {placement === 'top' && orderedSlides.length === 0 && !isAdding && (
            <Card className="overflow-hidden border border-bgBorder bg-bgSurface2">
              <Image
                source={CURRENT_FALLBACK_HERO}
                style={{ width: '100%', aspectRatio: 9 / 4, backgroundColor: '#13214a' }}
                resizeMode="contain"
              />
              <View className="gap-3 p-4">
                <View className="gap-1">
                  <Text className="text-sm font-bold text-textPrimary">Current default hero image</Text>
                  <Text className="text-xs text-textSecondary">
                    This is the built-in fallback image. Replace it by creating the first managed hero slide.
                  </Text>
                </View>
                <Button
                  label="Replace Current Hero Image"
                  variant="secondary"
                  onPress={() => setIsAdding(true)}
                />
              </View>
            </Card>
          )}
          {placement === 'bottom' && orderedSlides.length === 0 && !isAdding ? (
            <Card className="border border-bgBorder bg-bgSurface2 p-4">
              <Text className="text-sm font-bold text-textPrimary">No slides in this group</Text>
              <Text className="mt-1 text-xs text-textSecondary">
                Add at least one active slide for this group to appear on the Home screen.
              </Text>
            </Card>
          ) : null}
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
        orderedSlides.length > 0 || placement === 'bottom' ? (
          <Button label={addLabel} variant="secondary" onPress={() => setIsAdding(true)} />
        ) : null
      )}
    </View>
  );
}

export function FixedHeroBannerManager({
  onDialog,
}: {
  onDialog?: ShowAdminDialog;
}): React.JSX.Element {
  const { data: slides, isLoading } = useHeroSlides('top', null);
  const createMutation = useCreateHeroSlide();
  const updateMutation = useUpdateHeroSlide();
  const deleteMutation = useDeleteHeroSlide();
  const [isEditing, setIsEditing] = useState(false);

  const orderedSlides = (slides || []).slice().sort((a, b) => a.sort_order - b.sort_order);
  const primarySlide = orderedSlides.find((slide) => slide.is_active) ?? orderedSlides[0] ?? null;
  const ignoredSlidesCount = primarySlide ? orderedSlides.filter((slide) => slide.id !== primarySlide.id).length : 0;

  const showMessage = (
    title: string,
    message: string,
    variant: 'success' | 'error' | 'warning' | 'info' = 'success'
  ) => {
    if (onDialog) {
      onDialog({ title, message, variant });
      return;
    }
    Alert.alert(title, message);
  };

  const handleSave = (form: SlideFormState) => {
    if (primarySlide) {
      updateMutation.mutate(
        {
          slideId: primarySlide.id,
          updates: {
            imagePath: form.imagePath || undefined,
            backgroundColor: form.backgroundColor.trim() || '#13214a',
            title: form.title.trim() || null,
            subtitle: form.subtitle.trim() || null,
            linkUrl: form.linkUrl.trim() || null,
            placement: 'top',
            collectionId: null,
            sortOrder: 0,
            isActive: form.isActive,
          },
        },
        {
          onSuccess: () => {
            setIsEditing(false);
            showMessage('Saved', 'Fixed hero banner updated.');
          },
          onError: (err: any) => showMessage('Error', err.message || 'Failed to update banner.', 'error'),
        }
      );
      return;
    }

    createMutation.mutate(
      {
        imagePath: form.imagePath!,
        backgroundColor: form.backgroundColor.trim() || '#13214a',
        title: form.title.trim() || null,
        subtitle: form.subtitle.trim() || null,
        linkUrl: form.linkUrl.trim() || null,
        placement: 'top',
        collectionId: null,
        sortOrder: 0,
        isActive: form.isActive,
      },
      {
        onSuccess: () => {
          setIsEditing(false);
          showMessage('Saved', 'Fixed hero banner created.');
        },
        onError: (err: any) => showMessage('Error', err.message || 'Failed to create banner.', 'error'),
      }
    );
  };

  const handleDelete = () => {
    if (!primarySlide) return;

    const deleteBanner = () => {
      deleteMutation.mutate(primarySlide.id, {
        onSuccess: () => showMessage('Deleted', 'Fixed hero banner deleted. The built-in fallback will show.'),
        onError: (err: any) => showMessage('Error', err.message || 'Failed to delete banner.', 'error'),
      });
    };

    if (onDialog) {
      onDialog({
        title: 'Delete fixed hero banner?',
        message: 'This will remove the managed Home hero banner and show the built-in fallback image.',
        variant: 'danger',
        actions: [
          { label: 'Cancel', variant: 'secondary' },
          { label: 'Delete', variant: 'danger', onPress: deleteBanner },
        ],
      });
      return;
    }

    Alert.alert('Delete fixed hero banner?', 'The built-in fallback image will show instead.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: deleteBanner },
    ]);
  };

  if (isLoading) {
    return <LoadingSpinner label="Loading fixed hero banner..." />;
  }

  if (isEditing) {
    return (
      <SlideEditorCard
        submitLabel={primarySlide ? 'Save Banner' : 'Create Banner'}
        busy={createMutation.isPending || updateMutation.isPending}
        initial={
          primarySlide
            ? {
                imagePath: primarySlide.image_path,
                localPreviewUri: null,
                backgroundColor: primarySlide.background_color,
                title: primarySlide.title || '',
                subtitle: primarySlide.subtitle || '',
                linkUrl: primarySlide.link_url || '',
                isActive: primarySlide.is_active,
              }
            : EMPTY_FORM
        }
        onCancel={() => setIsEditing(false)}
        onSubmit={handleSave}
      />
    );
  }

  return (
    <View className="gap-4">
      <View className="gap-1">
        <Text className="text-base font-bold text-textPrimary">Fixed Home Hero Banner</Text>
        <Text className="text-sm text-textSecondary">
          One static banner shown under the Home stats. No rotation, no swipe, no dots.
        </Text>
      </View>

      {primarySlide ? (
        <Card className="overflow-hidden border border-bgBorder bg-bgSurface2">
          <Image
            source={{ uri: getHeroSlideImageUrl(primarySlide.image_path) }}
            style={{ width: '100%', aspectRatio: 9 / 4, backgroundColor: primarySlide.background_color }}
            resizeMode="contain"
          />
          <View className="gap-3 p-4">
            <View className="flex-row flex-wrap items-center justify-between gap-3">
              <View className="min-w-0 flex-1">
                <Text className="text-sm font-bold text-textPrimary" numberOfLines={1}>
                  {primarySlide.title || 'Home hero banner'}
                </Text>
                <Text className="mt-1 text-xs text-textSecondary">
                  {primarySlide.is_active ? 'Visible to users' : 'Hidden. Users see the built-in fallback.'}
                </Text>
                {ignoredSlidesCount > 0 ? (
                  <Text className="mt-1 text-[10px] text-textTertiary">
                    {ignoredSlidesCount} older top slide{ignoredSlidesCount === 1 ? '' : 's'} ignored by the fixed banner.
                  </Text>
                ) : null}
              </View>
              <Switch
                value={primarySlide.is_active}
                onValueChange={(isActive) =>
                  updateMutation.mutate(
                    { slideId: primarySlide.id, updates: { isActive, sortOrder: 0 } },
                    { onError: (err: any) => showMessage('Error', err.message || 'Failed to update visibility.', 'error') }
                  )
                }
                trackColor={{ false: Theme.colors.bgBorder, true: Theme.colors.accent }}
              />
            </View>
            <View className="flex-row flex-wrap gap-2">
              <Button
                label="Edit Banner"
                variant="secondary"
                onPress={() => setIsEditing(true)}
                className="flex-1 min-w-[130px]"
              />
              <Button
                label="Delete"
                variant="danger"
                loading={deleteMutation.isPending}
                onPress={handleDelete}
                className="flex-1 min-w-[110px]"
              />
            </View>
          </View>
        </Card>
      ) : (
        <Card className="overflow-hidden border border-bgBorder bg-bgSurface2">
          <Image
            source={CURRENT_FALLBACK_HERO}
            style={{ width: '100%', aspectRatio: 9 / 4, backgroundColor: '#13214a' }}
            resizeMode="contain"
          />
          <View className="gap-3 p-4">
            <Text className="text-sm font-bold text-textPrimary">Built-in fallback banner</Text>
            <Text className="text-xs text-textSecondary">
              Create a managed fixed banner to replace this default image.
            </Text>
            <Button label="Create Fixed Banner" variant="secondary" onPress={() => setIsEditing(true)} />
          </View>
        </Card>
      )}
    </View>
  );
}

function HomePositionPicker({
  value,
  onChange,
}: {
  value: HomeBannerPosition;
  onChange: (position: HomeBannerPosition) => void;
}): React.JSX.Element {
  return (
    <View className="gap-2">
      <Text className="text-xs font-semibold uppercase text-textSecondary">Home screen position</Text>
      <View className="flex-row flex-wrap gap-2">
        {HOME_BANNER_POSITIONS.map((position) => {
          const selected = value === position.key;
          return (
            <Pressable
              key={position.key}
              onPress={() => onChange(position.key)}
              className={`rounded-lg border px-3 py-2 ${
                selected ? 'border-accent bg-accentDim' : 'border-bgBorder bg-bgSurface1'
              }`}
            >
              <Text className={`text-[10px] font-bold uppercase ${selected ? 'text-accent' : 'text-textSecondary'}`}>
                {position.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function BottomBannerCollectionsManager({ onDialog }: { onDialog?: ShowAdminDialog }): React.JSX.Element {
  const collectionsQuery = useBannerCollections();
  const createMutation = useCreateBannerCollection();
  const updateMutation = useUpdateBannerCollection();
  const deleteMutation = useDeleteBannerCollection();
  const [newTitle, setNewTitle] = useState('');
  const [newHomePosition, setNewHomePosition] = useState<HomeBannerPosition>(DEFAULT_HOME_BANNER_POSITION);
  const [titleDrafts, setTitleDrafts] = useState<Record<string, string>>({});

  const collections = (collectionsQuery.data ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);

  const showError = (message: string) => {
    if (onDialog) {
      onDialog({ title: 'Error', message, variant: 'error' });
      return;
    }
    Alert.alert('Error', message);
  };

  const handleCreateGroup = () => {
    const title = newTitle.trim();
    if (!title) {
      showError('Group name is required.');
      return;
    }

    createMutation.mutate(
      { title, sortOrder: collections.length, homePosition: newHomePosition, isActive: true },
      {
        onSuccess: () => {
          setNewTitle('');
          setNewHomePosition(DEFAULT_HOME_BANNER_POSITION);
          onDialog?.({ title: 'Created', message: 'Bottom slider group created.', variant: 'success' });
        },
        onError: (err: any) => showError(err.message || 'Failed to create group.'),
      }
    );
  };

  const handleDeleteGroup = (collectionId: string, title: string) => {
    const deleteGroup = () => {
      deleteMutation.mutate(collectionId, {
        onSuccess: () => {
          onDialog?.({ title: 'Deleted', message: 'Bottom slider group deleted.', variant: 'success' });
        },
        onError: (err: any) => showError(err.message || 'Failed to delete group.'),
      });
    };

    if (onDialog) {
      onDialog({
        title: 'Delete bottom slider group?',
        message: `${title} and all slides inside it will be permanently deleted. This cannot be undone.`,
        variant: 'danger',
        actions: [
          { label: 'Cancel', variant: 'secondary' },
          { label: 'Delete', variant: 'danger', onPress: deleteGroup },
        ],
      });
      return;
    }

    Alert.alert('Delete group?', `${title} and all slides inside it will be permanently deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: deleteGroup },
    ]);
  };

  return (
    <View className="gap-4">
      <View className="gap-1">
        <Text className="text-base font-bold text-textPrimary">Home slider groups</Text>
        <Text className="text-sm text-textSecondary">
          Create named slider groups, choose their slides, and place each group around Home screen sections.
        </Text>
      </View>

      <Card className="border border-bgBorder bg-bgSurface2 p-4 gap-3">
        <Text className="text-xs font-semibold uppercase text-textSecondary">New group name</Text>
        <TextInput
          value={newTitle}
          onChangeText={setNewTitle}
          placeholder="Group name"
          placeholderTextColor={Theme.colors.textTertiary}
          className="h-11 rounded-lg border border-bgBorder bg-bgSurface1 px-3 text-sm text-textPrimary"
        />
        <HomePositionPicker value={newHomePosition} onChange={setNewHomePosition} />
        <Button
          label="Add Bottom Slider Group"
          variant="secondary"
          onPress={handleCreateGroup}
          loading={createMutation.isPending}
        />
      </Card>

      {collectionsQuery.isLoading ? (
        <LoadingSpinner label="Loading bottom slider groups..." />
      ) : collections.length === 0 ? (
        <Card className="border border-bgBorder bg-bgSurface2 p-4">
          <Text className="text-sm text-textSecondary">No bottom slider groups created yet.</Text>
        </Card>
      ) : (
        <View className="gap-5">
          {collections.map((collection) => {
            const titleValue = titleDrafts[collection.id] ?? collection.title;
            const trimmedTitle = titleValue.trim();
            const titleChanged = Boolean(trimmedTitle) && trimmedTitle !== collection.title;

            return (
              <Card key={collection.id} className="border border-bgBorder bg-bgSurface2 p-4 gap-4">
                <View className="gap-3">
                  <View className="flex-row items-center justify-between gap-3">
                    <View className="min-w-0 flex-1">
                      <Text className="text-xs font-semibold uppercase text-textSecondary">Group title</Text>
                      <TextInput
                        value={titleValue}
                        onChangeText={(title) =>
                          setTitleDrafts((prev) => ({ ...prev, [collection.id]: title }))
                        }
                        placeholder="Group title"
                        placeholderTextColor={Theme.colors.textTertiary}
                        className="mt-1 h-11 rounded-lg border border-bgBorder bg-bgSurface1 px-3 text-sm text-textPrimary"
                      />
                    </View>
                    <Switch
                      value={collection.is_active}
                      onValueChange={(isActive) =>
                        updateMutation.mutate(
                          { collectionId: collection.id, updates: { isActive } },
                          { onError: (err: any) => showError(err.message || 'Failed to update group.') }
                        )
                      }
                      trackColor={{ false: Theme.colors.bgBorder, true: Theme.colors.accent }}
                    />
                  </View>

                  <HomePositionPicker
                    value={collection.home_position}
                    onChange={(homePosition) =>
                      updateMutation.mutate(
                        { collectionId: collection.id, updates: { homePosition } },
                        { onError: (err: any) => showError(err.message || 'Failed to update group position.') }
                      )
                    }
                  />

                  <View className="flex-row gap-2">
                    <Button
                      label="Save Name"
                      variant="secondary"
                      disabled={!titleChanged}
                      loading={updateMutation.isPending}
                      onPress={() =>
                        updateMutation.mutate(
                          { collectionId: collection.id, updates: { title: trimmedTitle } },
                          {
                            onSuccess: () =>
                              setTitleDrafts((prev) => {
                                const next = { ...prev };
                                delete next[collection.id];
                                return next;
                              }),
                            onError: (err: any) => showError(err.message || 'Failed to rename group.'),
                          }
                        )
                      }
                      className="flex-1"
                    />
                    <Button
                      label="Delete Group"
                      variant="danger"
                      loading={deleteMutation.isPending}
                      onPress={() => handleDeleteGroup(collection.id, collection.title)}
                      className="flex-1"
                    />
                  </View>
                </View>

                <HeroBannerManager
                  onDialog={onDialog}
                  placement="bottom"
                  collectionId={collection.id}
                  heading={`${collection.title} slides`}
                  description={`These slides appear ${getHomeBannerPositionLabel(collection.home_position).toLowerCase()}.`}
                  addLabel="+ Add Group Slide"
                />
              </Card>
            );
          })}
        </View>
      )}
    </View>
  );
}

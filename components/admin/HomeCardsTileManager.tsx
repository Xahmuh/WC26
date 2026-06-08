import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ImageBackground, Platform, Pressable, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import Theme from '@/constants/theme/design-system';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  useHomeCardsTileSettings,
  useUploadHomeCardsTileImage,
  useUpdateHomeCardsTileSettings,
} from '@/hooks/useAdmin';

export function HomeCardsTileManager(): React.JSX.Element {
  const settingsQuery = useHomeCardsTileSettings();
  const uploadMutation = useUploadHomeCardsTileImage();
  const updateMutation = useUpdateHomeCardsTileSettings();
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [localPreviewUri, setLocalPreviewUri] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState('#141414');

  useEffect(() => {
    if (!settingsQuery.data) return;
    setImagePath(settingsQuery.data.image_path);
    setBackgroundColor(settingsQuery.data.background_color || '#141414');
  }, [settingsQuery.data]);

  const previewUri = localPreviewUri || settingsQuery.data?.image_url || null;

  const handlePickImage = async (): Promise<void> => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need storage permission to pick a My Cards tile image.');
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [27, 25],
      quality: 0.75,
    });

    const asset = result.assets?.[0];
    if (result.canceled || !asset?.uri) return;

    setLocalPreviewUri(asset.uri);
    uploadMutation.mutate(
      { localUri: asset.uri, fileName: asset.fileName, mimeType: asset.mimeType, webFile: asset.file ?? null },
      {
        onSuccess: (path) => setImagePath(path),
        onError: (err: Error) => {
          Alert.alert('Upload Failed', err.message || 'Could not upload the tile image.');
          setLocalPreviewUri(null);
        },
      }
    );
  };

  const handleSave = (): void => {
    updateMutation.mutate(
      { imagePath, backgroundColor: backgroundColor.trim() || '#141414' },
      {
        onSuccess: () => {
          setLocalPreviewUri(null);
          Alert.alert('Success', 'My Cards tile image updated.');
        },
        onError: (err: Error) => {
          const message = err.message || 'Failed to update My Cards tile.';
          const needsMigration =
            message.includes('home_cards_tile_settings') ||
            message.toLowerCase().includes('schema cache') ||
            message.toLowerCase().includes('does not exist');

          Alert.alert(
            'Error',
            needsMigration
              ? 'Please apply migration 034_home_cards_tile_settings.sql, then try saving again.'
              : message
          );
        },
      }
    );
  };

  return (
    <Card className="gap-4 border border-bgBorder bg-bgSurface2 p-4">
      <View className="gap-1">
        <Text className="text-sm font-bold text-textPrimary">My Cards Home Tile</Text>
        <Text className="text-xs text-textSecondary">
          Upload the background artwork shown behind the My Cards cell on the home screen.
        </Text>
      </View>

      <Pressable
        onPress={handlePickImage}
        className="overflow-hidden rounded-lg border border-dashed border-bgBorder bg-bgSurface1"
        style={{ width: '100%', aspectRatio: 1.08, backgroundColor }}
      >
        {uploadMutation.isPending || settingsQuery.isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={Theme.colors.accent} />
          </View>
        ) : previewUri ? (
          <ImageBackground source={{ uri: previewUri }} resizeMode="cover" style={{ flex: 1 }}>
            <View className="absolute bottom-2 self-center rounded-full bg-black/70 px-3 py-1">
              <Text className="text-[10px] font-bold uppercase tracking-wide text-accent">
                Tap image to replace
              </Text>
            </View>
          </ImageBackground>
        ) : (
          <View className="flex-1 items-center justify-center gap-1">
            <Text className="text-xs text-textTertiary">Tap to upload My Cards tile image</Text>
            <Text className="text-[10px] text-textTertiary">Recommended 1080 x 1000 px</Text>
          </View>
        )}
      </Pressable>

      <View className="gap-1.5">
        <Text className="text-xs font-semibold uppercase text-textSecondary">Fallback background color</Text>
        <TextInput
          value={backgroundColor}
          onChangeText={setBackgroundColor}
          placeholder="#141414"
          placeholderTextColor={Theme.colors.textTertiary}
          autoCapitalize="none"
          className="h-11 rounded-lg border border-bgBorder bg-bgSurface1 px-3 text-sm text-textPrimary"
        />
      </View>

      <View className="flex-row gap-2">
        <Button
          label="Clear Image"
          variant="secondary"
          onPress={() => {
            setImagePath(null);
            setLocalPreviewUri(null);
          }}
          className="flex-1"
        />
        <Button
          label="Save Tile"
          onPress={handleSave}
          loading={updateMutation.isPending}
          disabled={uploadMutation.isPending}
          className="flex-1"
        />
      </View>
    </Card>
  );
}

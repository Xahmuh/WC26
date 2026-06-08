import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ImageBackground, Platform, Pressable, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import Theme from '@/constants/theme/design-system';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  useMatchesHeroSettings,
  useUploadMatchesHeroImage,
  useUpdateMatchesHeroSettings,
} from '@/hooks/useAdmin';

const DEFAULT_BACKGROUND = '#13214a';

export function MatchesHeroManager(): React.JSX.Element {
  const settingsQuery = useMatchesHeroSettings();
  const uploadMutation = useUploadMatchesHeroImage();
  const updateMutation = useUpdateMatchesHeroSettings();
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [localPreviewUri, setLocalPreviewUri] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState(DEFAULT_BACKGROUND);

  useEffect(() => {
    if (!settingsQuery.data) return;
    setImagePath(settingsQuery.data.image_path);
    setBackgroundColor(settingsQuery.data.background_color || DEFAULT_BACKGROUND);
  }, [settingsQuery.data]);

  const previewUri = localPreviewUri || settingsQuery.data?.image_url || null;

  const handlePickImage = async (): Promise<void> => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need storage permission to pick a Matches hero image.');
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

    setLocalPreviewUri(asset.uri);
    uploadMutation.mutate(
      { localUri: asset.uri, fileName: asset.fileName, mimeType: asset.mimeType, webFile: asset.file ?? null },
      {
        onSuccess: (path) => setImagePath(path),
        onError: (err: Error) => {
          Alert.alert('Upload Failed', err.message || 'Could not upload the Matches hero image.');
          setLocalPreviewUri(null);
        },
      }
    );
  };

  const handleSave = (): void => {
    updateMutation.mutate(
      { imagePath, backgroundColor: backgroundColor.trim() || DEFAULT_BACKGROUND },
      {
        onSuccess: () => {
          setLocalPreviewUri(null);
          Alert.alert('Success', 'Matches hero banner updated.');
        },
        onError: (err: Error) => {
          const message = err.message || 'Failed to update Matches hero banner.';
          const needsMigration =
            message.includes('matches_hero_settings') ||
            message.toLowerCase().includes('schema cache') ||
            message.toLowerCase().includes('does not exist');

          Alert.alert(
            'Error',
            needsMigration
              ? 'Please apply the matches_hero_settings migration, then try saving again.'
              : message
          );
        },
      }
    );
  };

  return (
    <Card className="gap-4 border border-bgBorder bg-bgSurface2 p-4">
      <View className="gap-1">
        <Text className="text-sm font-bold text-textPrimary">Matches Hero Banner</Text>
        <Text className="text-xs text-textSecondary">
          Upload the artwork shown at the top of the Matches screen.
        </Text>
      </View>

      <Pressable
        onPress={handlePickImage}
        className="overflow-hidden rounded-lg border border-dashed border-bgBorder bg-bgSurface1"
        style={{ width: '100%', aspectRatio: 9 / 4, backgroundColor }}
      >
        {uploadMutation.isPending || settingsQuery.isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={Theme.colors.accent} />
          </View>
        ) : previewUri ? (
          <ImageBackground source={{ uri: previewUri }} resizeMode="contain" style={{ flex: 1 }}>
            <View className="absolute bottom-2 self-center rounded-full bg-black/70 px-3 py-1">
              <Text className="text-[10px] font-bold uppercase tracking-wide text-accent">
                Tap image to replace
              </Text>
            </View>
          </ImageBackground>
        ) : (
          <View className="flex-1 items-center justify-center gap-1 px-4">
            <Text className="text-xs text-textTertiary text-center">Tap to upload Matches hero image</Text>
            <Text className="text-[10px] text-textTertiary text-center">Recommended 1800 x 800 px</Text>
          </View>
        )}
      </Pressable>

      <View className="gap-1.5">
        <Text className="text-xs font-semibold uppercase text-textSecondary">Fallback background color</Text>
        <TextInput
          value={backgroundColor}
          onChangeText={setBackgroundColor}
          placeholder={DEFAULT_BACKGROUND}
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
          label="Save Banner"
          onPress={handleSave}
          loading={updateMutation.isPending}
          disabled={uploadMutation.isPending}
          className="flex-1"
        />
      </View>
    </Card>
  );
}

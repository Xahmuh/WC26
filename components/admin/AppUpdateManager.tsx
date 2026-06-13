import Constants from 'expo-constants';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import Theme from '@/constants/theme/design-system';
import { useAppUpdateSettings, useUpdateAppUpdateSettings } from '@/hooks/useAppUpdateSettings';
import { isVersionOlderThan } from '@/lib/versioning';

type DialogVariant = 'success' | 'error' | 'warning' | 'info' | 'danger';

type ShowAdminDialog = (dialog: {
  title: string;
  message?: string;
  variant?: DialogVariant;
}) => void;

function getProjectVersion(): string {
  return Constants.expoConfig?.version || '1.0.0';
}

function FieldLabel({ children }: { children: string }): React.JSX.Element {
  return (
    <Text className="text-xs font-bold uppercase text-textSecondary">
      {children}
    </Text>
  );
}

export function AppUpdateManager({ onDialog }: { onDialog?: ShowAdminDialog }): React.JSX.Element {
  const settingsQuery = useAppUpdateSettings(true);
  const updateMutation = useUpdateAppUpdateSettings();
  const [latestVersion, setLatestVersion] = useState('1.0.0');
  const [minimumVersion, setMinimumVersion] = useState('1.0.0');
  const [updateRequired, setUpdateRequired] = useState(false);
  const [updateUrl, setUpdateUrl] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('A new version is available. Please update to continue.');

  useEffect(() => {
    const settings = settingsQuery.data;
    if (!settings) return;
    setLatestVersion(settings.latest_version);
    setMinimumVersion(settings.minimum_supported_version);
    setUpdateRequired(settings.update_required);
    setUpdateUrl(settings.update_url ?? '');
    setReleaseNotes(settings.release_notes);
  }, [settingsQuery.data]);

  const projectVersion = getProjectVersion();
  const previewWillBlockCurrent = useMemo(
    () => updateRequired && isVersionOlderThan(projectVersion, minimumVersion || projectVersion),
    [minimumVersion, projectVersion, updateRequired]
  );
  const canSave =
    latestVersion.trim().length > 0 &&
    minimumVersion.trim().length > 0 &&
    releaseNotes.trim().length >= 8 &&
    !updateMutation.isPending;

  const handleSave = (): void => {
    if (!canSave) {
      onDialog?.({
        title: 'Missing update settings',
        message: 'Add latest version, minimum supported version, and at least 8 characters for the update message.',
        variant: 'warning',
      });
      return;
    }

    if (updateRequired && !updateUrl.trim()) {
      onDialog?.({
        title: 'Update link missing',
        message: 'Required updates should include a download or store URL, otherwise users will be blocked without a path forward.',
        variant: 'warning',
      });
      return;
    }

    updateMutation.mutate(
      {
        latestVersion,
        minimumSupportedVersion: minimumVersion,
        updateRequired,
        updateUrl,
        releaseNotes,
      },
      {
        onSuccess: () => {
          onDialog?.({
            title: 'Update settings saved',
            message: updateRequired
              ? 'Older mobile builds below the minimum version will be blocked until users open the update link.'
              : 'The update gate is configured but currently not forcing users to update.',
            variant: 'success',
          });
        },
        onError: (err) => {
          onDialog?.({
            title: 'Error',
            message: err instanceof Error ? err.message : 'Could not save update settings.',
            variant: 'error',
          });
        },
      }
    );
  };

  return (
    <View className="gap-4">
      <View className="gap-2">
        <Text className="text-base font-black text-textPrimary">Mobile App Updates</Text>
        <Text className="text-sm leading-5 text-textSecondary">
          Force old installed Android builds to update before entering the app. Web stays live through Vercel.
        </Text>
      </View>

      <View className="rounded-2xl border border-bgBorder bg-bgSurface1 p-3">
        {settingsQuery.isLoading ? (
          <View className="min-h-20 items-center justify-center">
            <ActivityIndicator color={Theme.colors.accent} />
          </View>
        ) : settingsQuery.isError ? (
          <Text className="text-sm font-bold text-live">
            {settingsQuery.error?.message ?? 'Could not load update settings.'}
          </Text>
        ) : (
          <View className="gap-4">
            <View className="flex-row flex-wrap gap-2">
              <View className="flex-1 min-w-[130px] rounded-xl border border-bgBorder bg-bgSurface2 p-3">
                <Text className="text-[10px] font-black uppercase text-textTertiary">Project version</Text>
                <Text className="mt-1 text-xl font-black text-textPrimary">{projectVersion}</Text>
              </View>
              <View
                className={[
                  'flex-1 min-w-[130px] rounded-xl border p-3',
                  previewWillBlockCurrent ? 'border-live/40 bg-liveDim' : 'border-accentBorder bg-accentDim',
                ].join(' ')}
              >
                <Text
                  className={[
                    'text-[10px] font-black uppercase',
                    previewWillBlockCurrent ? 'text-live' : 'text-accent',
                  ].join(' ')}
                >
                  Current build
                </Text>
                <Text
                  className={[
                    'mt-1 text-sm font-black',
                    previewWillBlockCurrent ? 'text-live' : 'text-accent',
                  ].join(' ')}
                >
                  {previewWillBlockCurrent ? 'Will be blocked' : 'Allowed'}
                </Text>
              </View>
            </View>

            <View className="flex-row gap-3">
              <View className="min-w-0 flex-1 gap-1.5">
                <FieldLabel>Latest version</FieldLabel>
                <TextInput
                  value={latestVersion}
                  onChangeText={setLatestVersion}
                  placeholder="1.0.1"
                  placeholderTextColor={Theme.colors.textTertiary}
                  autoCapitalize="none"
                  className="h-12 rounded-xl border border-bgBorder bg-bgSurface2 px-3 text-sm font-bold text-textPrimary"
                />
              </View>

              <View className="min-w-0 flex-1 gap-1.5">
                <FieldLabel>Minimum version</FieldLabel>
                <TextInput
                  value={minimumVersion}
                  onChangeText={setMinimumVersion}
                  placeholder="1.0.1"
                  placeholderTextColor={Theme.colors.textTertiary}
                  autoCapitalize="none"
                  className="h-12 rounded-xl border border-bgBorder bg-bgSurface2 px-3 text-sm font-bold text-textPrimary"
                />
              </View>
            </View>

            <View className="gap-1.5">
              <FieldLabel>Update link</FieldLabel>
              <TextInput
                value={updateUrl}
                onChangeText={setUpdateUrl}
                placeholder="https://expo.dev/artifacts/...apk"
                placeholderTextColor={Theme.colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                className="min-h-12 rounded-xl border border-bgBorder bg-bgSurface2 px-3 py-3 text-sm font-semibold text-textPrimary"
              />
            </View>

            <View className="gap-1.5">
              <FieldLabel>Update message</FieldLabel>
              <TextInput
                value={releaseNotes}
                onChangeText={setReleaseNotes}
                placeholder="A new version is available. Please update to continue."
                placeholderTextColor={Theme.colors.textTertiary}
                multiline
                textAlignVertical="top"
                className="min-h-[92px] rounded-xl border border-bgBorder bg-bgSurface2 px-3 py-3 text-sm leading-5 text-textPrimary"
              />
            </View>

            <Pressable
              onPress={() => setUpdateRequired((value) => !value)}
              className="flex-row items-center justify-between rounded-xl border border-bgBorder bg-bgSurface2 px-3 py-3 active:opacity-80"
            >
              <View className="min-w-0 flex-1">
                <Text className="text-sm font-bold text-textPrimary">Force update before app entry</Text>
                <Text className="mt-0.5 text-[11px] text-textTertiary">
                  When enabled, old native builds cannot continue until they open the update link.
                </Text>
              </View>
              <View className={['h-6 w-11 rounded-full p-1', updateRequired ? 'bg-accent' : 'bg-bgSurface1'].join(' ')}>
                <View className={['h-4 w-4 rounded-full bg-black', updateRequired ? 'ml-5' : 'ml-0'].join(' ')} />
              </View>
            </Pressable>

            {updateRequired ? (
              <View className="flex-row items-start gap-2 rounded-xl border border-accentBorder bg-accentDim p-3">
                <Icon name="warning" size={15} color={Theme.colors.accent} fixed />
                <Text className="min-w-0 flex-1 text-xs font-semibold leading-5 text-accent">
                  Raise the minimum version only after a working APK/store link is ready.
                </Text>
              </View>
            ) : null}

            <Button
              label={updateMutation.isPending ? 'Saving...' : 'Save Update Settings'}
              variant="lime"
              loading={updateMutation.isPending}
              disabled={!canSave}
              onPress={handleSave}
            />
          </View>
        )}
      </View>
    </View>
  );
}

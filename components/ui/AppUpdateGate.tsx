import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { Modal, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import Theme from '@/constants/theme/design-system';
import { useAppUpdateSettings } from '@/hooks/useAppUpdateSettings';
import { isVersionOlderThan } from '@/lib/versioning';

function getCurrentAppVersion(): string {
  return (
    Constants.nativeApplicationVersion ||
    Constants.expoConfig?.version ||
    '1.0.0'
  );
}

export function AppUpdateGate(): React.JSX.Element | null {
  const isNativeApp = Platform.OS !== 'web';
  const settingsQuery = useAppUpdateSettings(isNativeApp);

  if (!isNativeApp) return null;

  const currentVersion = getCurrentAppVersion();
  const settings = settingsQuery.data;
  const updateUrl = settings?.update_url?.trim() ?? '';
  const isBlocked =
    Boolean(settings?.update_required) &&
    Boolean(settings?.minimum_supported_version) &&
    isVersionOlderThan(currentVersion, settings?.minimum_supported_version ?? currentVersion);

  if (settingsQuery.isError) {
    console.warn('[AppUpdateGate] update check failed:', settingsQuery.error);
    return null;
  }

  if (!settingsQuery.isLoading && !isBlocked) return null;

  const openUpdate = async (): Promise<void> => {
    if (!updateUrl) return;
    try {
      await Linking.openURL(updateUrl);
    } catch (err) {
      console.warn('[AppUpdateGate] failed to open update URL:', err);
    }
  };

  return (
    <Modal visible transparent={false} animationType="fade" statusBarTranslucent>
      <LinearGradient colors={Theme.gradients.carbonApp as [string, string, string, string]} style={styles.screen}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <Icon
                name={settingsQuery.isLoading ? 'refresh' : 'warning'}
                size={28}
                color={Theme.colors.accent}
                fixed
              />
            </View>

            <View style={styles.copy}>
              <Text style={styles.eyebrow}>
                {settingsQuery.isLoading ? 'Checking version' : 'Update required'}
              </Text>
              <Text style={styles.title}>
                {settingsQuery.isLoading ? 'Preparing the latest experience' : 'New version available'}
              </Text>
              <Text style={styles.body}>
                {settingsQuery.isLoading
                  ? 'We are checking if this app version is still supported.'
                  : settings?.release_notes || 'Please update the app to continue.'}
              </Text>
            </View>

            {!settingsQuery.isLoading ? (
              <View style={styles.versionBox}>
                <View style={styles.versionRow}>
                  <Text style={styles.versionLabel}>Installed</Text>
                  <Text style={styles.versionValue}>{currentVersion}</Text>
                </View>
                <View style={styles.versionRow}>
                  <Text style={styles.versionLabel}>Required</Text>
                  <Text style={styles.versionValue}>{settings?.minimum_supported_version}</Text>
                </View>
                <View style={styles.versionRow}>
                  <Text style={styles.versionLabel}>Latest</Text>
                  <Text style={styles.versionValue}>{settings?.latest_version}</Text>
                </View>
              </View>
            ) : null}

            {!settingsQuery.isLoading ? (
              <View style={styles.actions}>
                <Button
                  label={updateUrl ? 'Update Now' : 'Update Link Missing'}
                  variant="lime"
                  disabled={!updateUrl}
                  onPress={openUpdate}
                />
                {!updateUrl ? (
                  <Text style={styles.missingUrl}>
                    Ask the admin to add an update link in the dashboard.
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    gap: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Theme.colors.accentBorder,
    backgroundColor: Theme.colors.bgSurface2,
    padding: 20,
    ...Platform.select({
      web: { boxShadow: '0 18px 42px rgba(0,0,0,0.55)' },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.42,
        shadowRadius: 22,
      },
      android: { elevation: 16 },
    }),
  },
  iconWrap: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Theme.colors.accentBorder,
    backgroundColor: Theme.colors.accentDim,
  },
  copy: {
    gap: 8,
  },
  eyebrow: {
    color: Theme.colors.accent,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: Theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0,
  },
  body: {
    color: Theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },
  versionBox: {
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.colors.bgBorder,
    backgroundColor: Theme.colors.bgSurface1,
    padding: 14,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  versionLabel: {
    color: Theme.colors.textTertiary,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  versionValue: {
    color: Theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '900',
  },
  actions: {
    gap: 10,
  },
  missingUrl: {
    color: Theme.colors.live,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});

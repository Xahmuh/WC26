// ============================================================================
// ErrorBoundary — last-resort guard so a render-time throw shows a recoverable
// screen instead of a white crash. Wrap the app root with it.
// ============================================================================

import { Component, type ReactNode } from 'react';
import { Text, View, Pressable } from 'react-native';

import Theme from '@/constants/theme/design-system';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error): void {
    // Surface in dev / crash reporting (wire to Sentry etc. in production).
    console.error('[ErrorBoundary]', error);
  }

  reset = (): void => this.setState({ error: null });

  override render(): ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <View
        style={{ flex: 1, backgroundColor: Theme.colors.bgDeep }}
        className="items-center justify-center px-8"
      >
        <Text className="text-4xl mb-4">⚠️</Text>
        <Text className="text-xl font-bold text-textPrimary text-center">
          Something went wrong
        </Text>
        <Text className="text-sm text-textSecondary text-center mt-2">
          The screen hit an unexpected error. You can try again.
        </Text>
        <Pressable
          onPress={this.reset}
          className="mt-6 rounded-xl bg-accent px-6 py-3 active:opacity-80"
        >
          <Text className="font-bold" style={{ color: Theme.colors.accentDark }}>
            Try again
          </Text>
        </Pressable>
      </View>
    );
  }
}

import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Switch, Text, TextInput, View } from 'react-native';

import Theme from '@/constants/theme/design-system';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  useAuthQuotesAdmin,
  useAuthScreenSettingsAdmin,
  useCreateAuthQuote,
  useDeleteAuthQuote,
  useUpdateAuthQuote,
  useUpdateAuthScreenSettings,
} from '@/hooks/useAdmin';
import type { AuthQuote } from '@/types';

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

interface QuoteDraft {
  quoteText: string;
  author: string;
  sortOrder: string;
  isActive: boolean;
}

function toQuoteDraft(quote: AuthQuote): QuoteDraft {
  return {
    quoteText: quote.quote_text,
    author: quote.author,
    sortOrder: String(quote.sort_order),
    isActive: quote.is_active,
  };
}

function parseSortOrder(value: string): number | null {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function AuthContentManager({ onDialog }: { onDialog?: ShowAdminDialog }): React.JSX.Element {
  const settingsQuery = useAuthScreenSettingsAdmin();
  const quotesQuery = useAuthQuotesAdmin();
  const updateSettingsMutation = useUpdateAuthScreenSettings();
  const createQuoteMutation = useCreateAuthQuote();
  const updateQuoteMutation = useUpdateAuthQuote();
  const deleteQuoteMutation = useDeleteAuthQuote();

  const [developerName, setDeveloperName] = useState('');
  const [newQuoteText, setNewQuoteText] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newIsActive, setNewIsActive] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, QuoteDraft>>({});

  const quotes = useMemo(
    () => (quotesQuery.data ?? []).slice().sort((a, b) => a.sort_order - b.sort_order),
    [quotesQuery.data]
  );

  const nextSortOrder = quotes.length > 0
    ? Math.max(...quotes.map((quote) => quote.sort_order)) + 1
    : 0;

  useEffect(() => {
    if (settingsQuery.data?.developer_name) {
      setDeveloperName(settingsQuery.data.developer_name);
    }
  }, [settingsQuery.data?.developer_name]);

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

  const showError = (message: string) => showMessage('Error', message, 'error');

  const setDraftValue = (quote: AuthQuote, patch: Partial<QuoteDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [quote.id]: {
        ...(prev[quote.id] ?? toQuoteDraft(quote)),
        ...patch,
      },
    }));
  };

  const clearDraft = (quoteId: string) => {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[quoteId];
      return next;
    });
  };

  const handleSaveDeveloperName = () => {
    const trimmed = developerName.trim();
    if (!trimmed) {
      showError('Developer name is required.');
      return;
    }

    updateSettingsMutation.mutate(
      { developerName: trimmed },
      {
        onSuccess: () => showMessage('Saved', 'Developer credit updated on the auth screens.'),
        onError: (err: Error) => showError(err.message || 'Failed to update developer name.'),
      }
    );
  };

  const handleCreateQuote = () => {
    const quoteText = newQuoteText.trim();
    const author = newAuthor.trim();

    if (!quoteText || !author) {
      showError('Quote and author are required.');
      return;
    }

    createQuoteMutation.mutate(
      {
        quoteText,
        author,
        sortOrder: nextSortOrder,
        isActive: newIsActive,
      },
      {
        onSuccess: () => {
          setNewQuoteText('');
          setNewAuthor('');
          setNewIsActive(true);
          showMessage('Created', 'Quote added to the login/register screens.');
        },
        onError: (err: Error) => showError(err.message || 'Failed to create quote.'),
      }
    );
  };

  const handleSaveQuote = (quote: AuthQuote, draft: QuoteDraft) => {
    const quoteText = draft.quoteText.trim();
    const author = draft.author.trim();
    const sortOrder = parseSortOrder(draft.sortOrder);

    if (!quoteText || !author) {
      showError('Quote and author are required.');
      return;
    }

    if (sortOrder === null) {
      showError('Sort order must be a whole number.');
      return;
    }

    updateQuoteMutation.mutate(
      {
        quoteId: quote.id,
        input: {
          quoteText,
          author,
          sortOrder,
          isActive: draft.isActive,
        },
      },
      {
        onSuccess: () => {
          clearDraft(quote.id);
          showMessage('Saved', 'Quote updated.');
        },
        onError: (err: Error) => showError(err.message || 'Failed to update quote.'),
      }
    );
  };

  const handleDeleteQuote = (quote: AuthQuote) => {
    const deleteQuote = () => {
      deleteQuoteMutation.mutate(quote.id, {
        onSuccess: () => showMessage('Deleted', 'Quote deleted.'),
        onError: (err: Error) => showError(err.message || 'Failed to delete quote.'),
      });
    };

    if (onDialog) {
      onDialog({
        title: 'Delete quote?',
        message: 'This quote will be removed from the auth screens permanently.',
        variant: 'danger',
        actions: [
          { label: 'Cancel', variant: 'secondary' },
          { label: 'Delete', variant: 'danger', onPress: deleteQuote },
        ],
      });
      return;
    }

    Alert.alert('Delete quote?', 'This quote will be removed permanently.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: deleteQuote },
    ]);
  };

  return (
    <View className="gap-4">
      <Card className="gap-4 border border-bgBorder bg-bgSurface2 p-4">
        <View className="gap-1">
          <Text className="text-base font-bold text-textPrimary">Auth Screen Details</Text>
          <Text className="text-sm text-textSecondary">
            Control the developer credit and the quote ticker shown on Login and Register.
          </Text>
        </View>

        <View className="gap-1.5">
          <Text className="text-xs font-semibold uppercase text-textSecondary">Developer name</Text>
          <TextInput
            value={developerName}
            onChangeText={setDeveloperName}
            placeholder="Developer name"
            placeholderTextColor={Theme.colors.textTertiary}
            className="h-11 rounded-lg border border-bgBorder bg-bgSurface1 px-3 text-sm text-textPrimary"
          />
        </View>

        <Button
          label="Save Developer Name"
          onPress={handleSaveDeveloperName}
          loading={updateSettingsMutation.isPending}
        />
      </Card>

      <Card className="gap-4 border border-bgBorder bg-bgSurface2 p-4">
        <View className="gap-1">
          <Text className="text-base font-bold text-textPrimary">Add Quote</Text>
          <Text className="text-sm text-textSecondary">
            New quotes are added to the end of the rotation. You can adjust order below.
          </Text>
        </View>

        <View className="gap-3 md:flex-row md:flex-wrap">
          <View className="min-w-[220px] flex-1 gap-1.5">
            <Text className="text-xs font-semibold uppercase text-textSecondary">Quote</Text>
            <TextInput
              value={newQuoteText}
              onChangeText={setNewQuoteText}
              placeholder="Quote text"
              placeholderTextColor={Theme.colors.textTertiary}
              multiline
              className="min-h-20 rounded-lg border border-bgBorder bg-bgSurface1 px-3 py-2 text-sm text-textPrimary"
            />
          </View>

          <View className="min-w-[180px] flex-1 gap-1.5">
            <Text className="text-xs font-semibold uppercase text-textSecondary">Author</Text>
            <TextInput
              value={newAuthor}
              onChangeText={setNewAuthor}
              placeholder="Author"
              placeholderTextColor={Theme.colors.textTertiary}
              className="h-11 rounded-lg border border-bgBorder bg-bgSurface1 px-3 text-sm text-textPrimary"
            />

            <View className="flex-row items-center justify-between rounded-lg border border-bgBorder bg-bgSurface1 px-3 py-2">
              <Text className="text-xs font-semibold text-textSecondary">Visible</Text>
              <Switch
                value={newIsActive}
                onValueChange={setNewIsActive}
                trackColor={{ false: Theme.colors.bgBorder, true: Theme.colors.accent }}
              />
            </View>
          </View>
        </View>

        <Button
          label="Add Quote"
          variant="secondary"
          onPress={handleCreateQuote}
          loading={createQuoteMutation.isPending}
        />
      </Card>

      {quotesQuery.isLoading ? (
        <LoadingSpinner label="Loading quotes..." />
      ) : quotesQuery.isError ? (
        <Card className="border border-live/30 bg-liveDim p-4">
          <Text className="text-sm font-semibold text-live">
            {(quotesQuery.error as Error).message || 'Failed to load quotes.'}
          </Text>
        </Card>
      ) : quotes.length === 0 ? (
        <Card className="border border-bgBorder bg-bgSurface2 p-4">
          <Text className="text-sm text-textSecondary">No quotes created yet.</Text>
        </Card>
      ) : (
        <View className="gap-3">
          {quotes.map((quote) => {
            const draft = drafts[quote.id] ?? toQuoteDraft(quote);
            const sortOrder = parseSortOrder(draft.sortOrder);
            const changed =
              draft.quoteText !== quote.quote_text ||
              draft.author !== quote.author ||
              sortOrder !== quote.sort_order ||
              draft.isActive !== quote.is_active;
            const isMutating =
              updateQuoteMutation.isPending && updateQuoteMutation.variables?.quoteId === quote.id;

            return (
              <Card key={quote.id} className="gap-3 border border-bgBorder bg-bgSurface2 p-4">
                <View className="flex-row flex-wrap items-center justify-between gap-3">
                  <View className="gap-1">
                    <Text className="text-xs font-semibold uppercase text-textSecondary">Quote row</Text>
                    <Text className="text-[10px] text-textTertiary">
                      {quote.is_active ? 'Visible on auth screens' : 'Hidden from auth screens'}
                    </Text>
                  </View>
                  <Switch
                    value={draft.isActive}
                    onValueChange={(isActive) => setDraftValue(quote, { isActive })}
                    trackColor={{ false: Theme.colors.bgBorder, true: Theme.colors.accent }}
                  />
                </View>

                <View className="gap-3 md:flex-row md:flex-wrap">
                  <View className="min-w-[220px] flex-1 gap-1.5">
                    <Text className="text-xs font-semibold uppercase text-textSecondary">Quote</Text>
                    <TextInput
                      value={draft.quoteText}
                      onChangeText={(quoteText) => setDraftValue(quote, { quoteText })}
                      multiline
                      placeholder="Quote text"
                      placeholderTextColor={Theme.colors.textTertiary}
                      className="min-h-20 rounded-lg border border-bgBorder bg-bgSurface1 px-3 py-2 text-sm text-textPrimary"
                    />
                  </View>

                  <View className="min-w-[180px] flex-1 gap-3">
                    <View className="gap-1.5">
                      <Text className="text-xs font-semibold uppercase text-textSecondary">Author</Text>
                      <TextInput
                        value={draft.author}
                        onChangeText={(author) => setDraftValue(quote, { author })}
                        placeholder="Author"
                        placeholderTextColor={Theme.colors.textTertiary}
                        className="h-11 rounded-lg border border-bgBorder bg-bgSurface1 px-3 text-sm text-textPrimary"
                      />
                    </View>

                    <View className="gap-1.5">
                      <Text className="text-xs font-semibold uppercase text-textSecondary">Sort order</Text>
                      <TextInput
                        value={draft.sortOrder}
                        onChangeText={(sortOrderValue) => setDraftValue(quote, { sortOrder: sortOrderValue })}
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor={Theme.colors.textTertiary}
                        className="h-11 rounded-lg border border-bgBorder bg-bgSurface1 px-3 text-sm text-textPrimary"
                      />
                    </View>
                  </View>
                </View>

                <View className="flex-row flex-wrap gap-2">
                  <Button
                    label={isMutating ? 'Saving...' : 'Save Quote'}
                    variant="secondary"
                    disabled={!changed || sortOrder === null || isMutating}
                    loading={isMutating}
                    onPress={() => handleSaveQuote(quote, draft)}
                    className="min-w-[130px] flex-1"
                  />
                  {changed ? (
                    <Button
                      label="Cancel"
                      variant="ghost"
                      onPress={() => clearDraft(quote.id)}
                      className="min-w-[110px] flex-1"
                    />
                  ) : null}
                  <Button
                    label="Delete"
                    variant="danger"
                    onPress={() => handleDeleteQuote(quote)}
                    loading={deleteQuoteMutation.isPending && deleteQuoteMutation.variables === quote.id}
                    className="min-w-[110px] flex-1"
                  />
                </View>

                {isMutating ? (
                  <View className="flex-row items-center gap-2">
                    <ActivityIndicator size="small" color={Theme.colors.accent} />
                    <Text className="text-xs text-textSecondary">Updating quote...</Text>
                  </View>
                ) : null}
              </Card>
            );
          })}
        </View>
      )}
    </View>
  );
}

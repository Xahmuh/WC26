import { supabase } from '@/lib/supabase';
import type { AuthContent, AuthQuote, AuthScreenSettings } from '@/types';

export interface AuthQuoteInput {
  quoteText: string;
  author: string;
  sortOrder: number;
  isActive: boolean;
}

function normalizeMissingTable(error: { code?: string; message?: string } | null): boolean {
  return Boolean(
    error &&
      (error.code === '42P01' ||
        error.message?.toLowerCase().includes('does not exist') ||
        error.message?.toLowerCase().includes('schema cache'))
  );
}

export async function getAuthQuotes(options?: { includeInactive?: boolean }): Promise<AuthQuote[]> {
  let query = (supabase as any)
    .from('auth_quotes')
    .select('id, quote_text, author, sort_order, is_active, created_by, created_at, updated_at')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (!options?.includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    if (normalizeMissingTable(error)) return [];
    throw new Error(error.message);
  }

  return (data ?? []) as AuthQuote[];
}

export async function getAuthScreenSettings(): Promise<AuthScreenSettings | null> {
  const { data, error } = await (supabase as any)
    .from('auth_screen_settings')
    .select('id, developer_name, updated_by, updated_at')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    if (normalizeMissingTable(error)) return null;
    throw new Error(error.message);
  }

  return (data ?? null) as AuthScreenSettings | null;
}

export async function getAuthContent(): Promise<AuthContent> {
  const [quotes, settings] = await Promise.all([
    getAuthQuotes(),
    getAuthScreenSettings(),
  ]);

  return { quotes, settings };
}

export async function createAuthQuote(input: AuthQuoteInput): Promise<AuthQuote> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await (supabase as any)
    .from('auth_quotes')
    .insert({
      quote_text: input.quoteText,
      author: input.author,
      sort_order: input.sortOrder,
      is_active: input.isActive,
      created_by: user?.id ?? null,
    })
    .select('id, quote_text, author, sort_order, is_active, created_by, created_at, updated_at')
    .single();

  if (error) throw new Error(error.message);
  return data as AuthQuote;
}

export async function updateAuthQuote(quoteId: string, input: AuthQuoteInput): Promise<AuthQuote> {
  const { data, error } = await (supabase as any)
    .from('auth_quotes')
    .update({
      quote_text: input.quoteText,
      author: input.author,
      sort_order: input.sortOrder,
      is_active: input.isActive,
    })
    .eq('id', quoteId)
    .select('id, quote_text, author, sort_order, is_active, created_by, created_at, updated_at')
    .single();

  if (error) throw new Error(error.message);
  return data as AuthQuote;
}

export async function deleteAuthQuote(quoteId: string): Promise<void> {
  const { error, count } = await (supabase as any)
    .from('auth_quotes')
    .delete({ count: 'exact' })
    .eq('id', quoteId);

  if (error) throw new Error(error.message);
  if (count === 0) {
    throw new Error('Quote was not deleted. It may already be missing or your account does not have permission.');
  }
}

export async function updateAuthScreenSettings(input: { developerName: string }): Promise<AuthScreenSettings> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await (supabase as any)
    .from('auth_screen_settings')
    .upsert(
      {
        id: 1,
        developer_name: input.developerName,
        updated_by: user?.id ?? null,
      },
      { onConflict: 'id' }
    )
    .select('id, developer_name, updated_by, updated_at')
    .single();

  if (error) throw new Error(error.message);
  return data as AuthScreenSettings;
}

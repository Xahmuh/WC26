import { supabase } from '@/lib/supabase';
import type { PredictionNews } from '@/types';

export interface PredictionNewsInput {
  message: string;
  isActive: boolean;
  sendNotification: boolean;
}

function normalizePredictionNews(row: any): PredictionNews {
  return {
    id: row.id,
    message: row.message,
    is_active: Boolean(row.is_active),
    sort_order: Number(row.sort_order ?? 0),
    created_by: row.created_by ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getActivePredictionNews(): Promise<PredictionNews[]> {
  const { data, error } = await (supabase as any)
    .from('prediction_news')
    .select('id, message, is_active, sort_order, created_by, created_at, updated_at')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    if (error.code === '42P01') return [];
    throw new Error(error.message);
  }

  return (data ?? []).map(normalizePredictionNews);
}

export async function getPredictionNewsAdmin(): Promise<PredictionNews[]> {
  const { data, error } = await (supabase as any)
    .from('prediction_news')
    .select('id, message, is_active, sort_order, created_by, created_at, updated_at')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    if (error.code === '42P01') return [];
    throw new Error(error.message);
  }

  return (data ?? []).map(normalizePredictionNews);
}

export async function createPredictionNews(input: PredictionNewsInput): Promise<PredictionNews> {
  const message = input.message.trim();
  const { data: userResult } = await supabase.auth.getUser();

  const { data: latestRow, error: latestError } = await (supabase as any)
    .from('prediction_news')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    if (latestError.code === '42P01') {
      throw new Error('Please apply the prediction news migration, then try again.');
    }
    throw new Error(latestError.message);
  }

  const nextSortOrder = Number(latestRow?.sort_order ?? -1) + 1;
  const { data, error } = await (supabase as any)
    .from('prediction_news')
    .insert({
      message,
      is_active: input.isActive,
      sort_order: nextSortOrder,
      created_by: userResult.user?.id ?? null,
    })
    .select('id, message, is_active, sort_order, created_by, created_at, updated_at')
    .single();

  if (error) {
    if (error.code === '42P01') {
      throw new Error('Please apply the prediction news migration, then try again.');
    }
    throw new Error(error.message);
  }

  if (input.sendNotification) {
    const { error: notificationError } = await (supabase as any).rpc('admin_broadcast', {
      p_type: 'prediction_news',
      p_title: 'Breaking prediction news',
      p_body: message,
    });

    if (notificationError) {
      throw new Error(
        `Breaking news was added, but notifications could not be sent: ${notificationError.message}`
      );
    }
  }

  return normalizePredictionNews(data);
}

export async function updatePredictionNews(
  newsId: string,
  updates: { message?: string; isActive?: boolean; sortOrder?: number }
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (updates.message !== undefined) payload.message = updates.message.trim();
  if (updates.isActive !== undefined) payload.is_active = updates.isActive;
  if (updates.sortOrder !== undefined) payload.sort_order = updates.sortOrder;

  const { error } = await (supabase as any)
    .from('prediction_news')
    .update(payload)
    .eq('id', newsId);

  if (error) throw new Error(error.message);
}

export async function deletePredictionNews(newsId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('prediction_news')
    .delete()
    .eq('id', newsId);

  if (error) throw new Error(error.message);
}

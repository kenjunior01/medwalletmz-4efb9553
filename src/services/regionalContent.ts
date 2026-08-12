/**
 * Regional Content Service
 * CMS for per-country health campaigns, emergency notices, holiday schedules.
 *
 * Tables: regional_content
 */

import { supabase as typedSupabase } from '@/integrations/supabase/client';
// Cast para acesso a tabelas ainda não presentes nos tipos gerados
const supabase = typedSupabase as any;

export type ContentType = 'health_campaign' | 'partner_highlight' | 'emergency_notice' | 'holiday_schedule' | 'local_tip';

export interface RegionalContent {
  id?: string;
  country_code: string;
  content_type: ContentType;
  title: string;
  description?: string;
  content_body?: Record<string, any>;
  audience_tags?: string[];
  language?: string;
  starts_at?: string;
  ends_at?: string;
  is_active?: boolean;
  is_pinned?: boolean;
  image_url?: string;
  accent_color?: string;
  cta_label?: string;
  cta_url?: string;
  views_count?: number;
  clicks_count?: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ContentMetrics {
  total: number;
  active: number;
  pinned: number;
  by_type: Record<ContentType, number>;
  total_views: number;
  total_clicks: number;
}

const CONTENT_TYPES: ContentType[] = ['health_campaign', 'partner_highlight', 'emergency_notice', 'holiday_schedule', 'local_tip'];

/** Get content for a country (active only, sorted: pinned first, then start date desc). */
export async function getContent(countryCode: string, opts?: { includeInactive?: boolean; type?: ContentType }): Promise<RegionalContent[]> {
  let q = supabase
    .from('regional_content')
    .select('*')
    .eq('country_code', countryCode)
    .order('is_pinned', { ascending: false })
    .order('starts_at', { ascending: false, nullsFirst: false });
  if (!opts?.includeInactive) q = q.eq('is_active', true);
  if (opts?.type) q = q.eq('content_type', opts.type);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Get a single content item by ID. */
export async function getContentById(id: string): Promise<RegionalContent | null> {
  const { data, error } = await supabase
    .from('regional_content')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Create new content. */
export async function createContent(userId: string, item: Omit<RegionalContent, 'id' | 'created_by' | 'created_at' | 'updated_at' | 'views_count' | 'clicks_count'>): Promise<RegionalContent> {
  const { data, error } = await supabase
    .from('regional_content')
    .insert({ ...item, created_by: userId })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/** Update content. */
export async function updateContent(id: string, patch: Partial<RegionalContent>): Promise<RegionalContent> {
  const { data, error } = await supabase
    .from('regional_content')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/** Soft-delete (deactivate) content. */
export async function deactivateContent(id: string): Promise<void> {
  const { error } = await supabase
    .from('regional_content')
    .update({ is_active: false })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/** Hard delete content. */
export async function deleteContent(id: string): Promise<void> {
  const { error } = await supabase
    .from('regional_content')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/** Increment views counter. */
export async function recordView(id: string): Promise<void> {
  const { error } = await supabase.rpc('increment_content_views', { content_id: id });
  if (error) {
    // Fallback: read + update
    try {
      const cur = await getContentById(id);
      if (cur) {
        await updateContent(id, { views_count: (cur.views_count ?? 0) + 1 });
      }
    } catch { /* noop */ }
  }
}

/** Increment clicks counter. */
export async function recordClick(id: string): Promise<void> {
  const { error } = await supabase.rpc('increment_content_clicks', { content_id: id });
  if (error) {
    try {
      const cur = await getContentById(id);
      if (cur) {
        await updateContent(id, { clicks_count: (cur.clicks_count ?? 0) + 1 });
      }
    } catch { /* noop */ }
  }
}

/** Toggle pinned status. */
export async function togglePinned(id: string, pinned: boolean): Promise<void> {
  const { error } = await supabase
    .from('regional_content')
    .update({ is_pinned: pinned })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/** Toggle active status. */
export async function toggleActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase
    .from('regional_content')
    .update({ is_active: active })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/** Get aggregate metrics for a country. */
export async function getContentMetrics(countryCode: string): Promise<ContentMetrics> {
  const all = await getContent(countryCode, { includeInactive: true });
  const byType: Record<ContentType, number> = {
    health_campaign: 0,
    partner_highlight: 0,
    emergency_notice: 0,
    holiday_schedule: 0,
    local_tip: 0,
  };
  let active = 0;
  let pinned = 0;
  let totalViews = 0;
  let totalClicks = 0;
  for (const c of all) {
    if (c.content_type) byType[c.content_type] = (byType[c.content_type] ?? 0) + 1;
    if (c.is_active) active++;
    if (c.is_pinned) pinned++;
    totalViews += c.views_count ?? 0;
    totalClicks += c.clicks_count ?? 0;
  }
  return { total: all.length, active, pinned, by_type: byType, total_views: totalViews, total_clicks: totalClicks };
}

/* ---------- Helpers ---------- */

export const CONTENT_TYPE_LABELS: Record<ContentType, { label: string; emoji: string; color: string }> = {
  health_campaign: { label: 'Campanha de Saúde', emoji: '📢', color: '#3B82F6' },
  partner_highlight: { label: 'Parceiro em Destaque', emoji: '🤝', color: '#10B981' },
  emergency_notice: { label: 'Aviso de Emergência', emoji: '🚨', color: '#EF4444' },
  holiday_schedule: { label: 'Horário de Feriado', emoji: '📅', color: '#F59E0B' },
  local_tip: { label: 'Dica Local', emoji: '💡', color: '#8B5CF6' },
};

export const AUDIENCE_TAG_OPTIONS = [
  'diabetic', 'pregnant', 'elderly', 'children', 'mental_health',
  'maternal', 'cardiac', 'hypertension', 'students', 'rural', 'urban',
];

export const COUNTRY_OPTIONS = [
  { code: 'MZ', name: 'Moçambique', flag: '🇲🇿' },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'ZA', name: 'África do Sul', flag: '🇿🇦' },
  { code: 'KE', name: 'Quénia', flag: '🇰🇪' },
  { code: 'NG', name: 'Nigéria', flag: '🇳🇬' },
  { code: 'IN', name: 'Índia', flag: '🇮🇳' },
  { code: 'ET', name: 'Etiópia', flag: '🇪🇹' },
  { code: 'GH', name: 'Gana', flag: '🇬🇭' },
  { code: 'TZ', name: 'Tanzânia', flag: '🇹🇿' },
  { code: 'AO', name: 'Angola', flag: '🇦🇴' },
  { code: 'CV', name: 'Cabo Verde', flag: '🇨🇻' },
];

export function formatContentType(type: ContentType): string {
  return CONTENT_TYPE_LABELS[type]?.label ?? type;
}

export function isContentLive(c: RegionalContent, now = new Date()): boolean {
  if (!c.is_active) return false;
  if (c.starts_at && new Date(c.starts_at) > now) return false;
  if (c.ends_at && new Date(c.ends_at) < now) return false;
  return true;
}

/**
 * Global Ranking Service
 * Leaderboard between regions — motivates regional CEOs through
 * healthy competition.
 *
 * Tables: regional_rankings
 */

import { supabase } from '@/integrations/supabase/client';

// Cliente sem tipagem estrita para tabelas ainda não presentes nos tipos gerados.
const sb: any = supabase;

export interface RegionalRanking {
  id?: string;
  period: string; // '2026-W30' or '2026-Q3' or '2026'
  country_code: string;
  // Metrics
  health_score?: number; // 0-100 composite
  medication_adherence_pct?: number;
  active_users_count?: number;
  consultations_per_1000?: number;
  partner_satisfaction_score?: number;
  sos_response_time_avg_min?: number;
  // Rankings
  rank_overall?: number;
  rank_adherence?: number;
  rank_growth?: number;
  // Badges
  badges?: string[];
  created_at?: string;
  // Joined (computed)
  country_name?: string;
  country_flag?: string;
  trend?: 'up' | 'down' | 'same'; // vs previous period
}

export interface PeriodOption {
  value: string;
  label: string;
}

export interface BadgeDefinition {
  key: string;
  label: string;
  emoji: string;
  description: string;
  color: string;
}

export const BADGES: BadgeDefinition[] = [
  { key: 'top_adherence', label: 'Adesão Top', emoji: '🏆', description: 'Maior taxa de adesão a medicação', color: '#F59E0B' },
  { key: 'fastest_growth', label: 'Crescimento Rápido', emoji: '🚀', description: 'Mais rápido crescimento de utilizadores', color: '#3B82F6' },
  { key: 'most_improved', label: 'Mais Melhorado', emoji: '📈', description: 'Maior subida no ranking', color: '#10B981' },
  { key: 'best_sos', label: 'SOS Rápido', emoji: '⚡', description: 'Menor tempo de resposta SOS', color: '#EF4444' },
  { key: 'champion', label: 'Campeão Trimestral', emoji: '👑', description: '1º lugar no ranking geral do trimestre', color: '#8B5CF6' },
  { key: 'community_heart', label: 'Coração Comunitário', emoji: '❤️', description: 'Mais círculos de apoio activos', color: '#EC4899' },
  { key: 'jobs_creator', label: 'Criador de Empregos', emoji: '💼', description: 'Mais postos de trabalho criados (riders + workers)', color: '#06B6D4' },
  { key: 'rising_star', label: 'Estrela em Ascensão', emoji: '⭐', description: 'Região nova com performance promissora', color: '#F97316' },
];

export const COUNTRY_INFO: Record<string, { name: string; flag: string }> = {
  MZ: { name: 'Moçambique', flag: '🇲🇿' },
  AO: { name: 'Angola', flag: '🇦🇴' },
  BR: { name: 'Brasil', flag: '🇧🇷' },
  PT: { name: 'Portugal', flag: '🇵🇹' },
  ZA: { name: 'África do Sul', flag: '🇿🇦' },
  KE: { name: 'Quénia', flag: '🇰🇪' },
  NG: { name: 'Nigéria', flag: '🇳🇬' },
  IN: { name: 'Índia', flag: '🇮🇳' },
  ET: { name: 'Etiópia', flag: '🇪🇹' },
  GH: { name: 'Gana', flag: '🇬🇭' },
  TZ: { name: 'Tanzânia', flag: '🇹🇿' },
  CV: { name: 'Cabo Verde', flag: '🇨🇻' },
};

/** Get available periods (last 12 weeks + 4 quarters + 2 years). */
export function getAvailablePeriods(): PeriodOption[] {
  const now = new Date();
  const periods: PeriodOption[] = [];

  // Last 12 weeks
  for (let i = 0; i < 12; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const year = d.getFullYear();
    const start = new Date(year, 0, 1);
    const week = Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
    const value = `${year}-W${String(week).padStart(2, '0')}`;
    periods.push({ value, label: `Semana ${week} · ${year}` });
  }

  // 4 quarters
  const q = Math.floor(now.getMonth() / 3) + 1;
  for (let i = 0; i < 4; i++) {
    let year = now.getFullYear();
    let quarter = q - i;
    if (quarter < 1) { quarter += 4; year--; }
    periods.push({ value: `${year}-Q${quarter}`, label: `Q${quarter} · ${year}` });
  }

  // 2 years
  for (let i = 0; i < 2; i++) {
    const y = now.getFullYear() - i;
    periods.push({ value: `${y}`, label: `Ano ${y}` });
  }

  return periods;
}

/** Get rankings for a period. */
export async function getRankings(period: string): Promise<RegionalRanking[]> {
  const { data, error } = await sb
    .from('regional_rankings')
    .select('*')
    .eq('period', period)
    .order('rank_overall', { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);

  return (data ?? []).map((r) => ({
    ...r,
    country_name: COUNTRY_INFO[r.country_code]?.name ?? r.country_code,
    country_flag: COUNTRY_INFO[r.country_code]?.flag ?? '🏳️',
  }));
}

/** Get rankings for a specific country across all periods (history). */
export async function getCountryRankingHistory(countryCode: string, limit = 12): Promise<RegionalRanking[]> {
  const { data, error } = await sb
    .from('regional_rankings')
    .select('*')
    .eq('country_code', countryCode)
    .order('period', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    ...r,
    country_name: COUNTRY_INFO[r.country_code]?.name ?? r.country_code,
    country_flag: COUNTRY_INFO[r.country_code]?.flag ?? '🏳️',
  }));
}

/** Compute trend (up/down/same) vs previous period for each country. */
export function computeTrends(rankings: RegionalRanking[], previousRankings: RegionalRanking[]): Map<string, 'up' | 'down' | 'same'> {
  const map = new Map<string, 'up' | 'down' | 'same'>();
  for (const r of rankings) {
    const prev = previousRankings.find((p) => p.country_code === r.country_code);
    if (!prev || prev.rank_overall == null || r.rank_overall == null) {
      map.set(r.country_code, 'same');
      continue;
    }
    if (r.rank_overall < prev.rank_overall) map.set(r.country_code, 'up');
    else if (r.rank_overall > prev.rank_overall) map.set(r.country_code, 'down');
    else map.set(r.country_code, 'same');
  }
  return map;
}

/** Generate mock rankings if database is empty (for demo). */
export function getMockRankings(period: string): RegionalRanking[] {
  const mock: Omit<RegionalRanking, 'period' | 'country_name' | 'country_flag'>[] = [
    { country_code: 'MZ', health_score: 78, medication_adherence_pct: 82, active_users_count: 15420, consultations_per_1000: 45, partner_satisfaction_score: 4.3, sos_response_time_avg_min: 12, rank_overall: 1, rank_adherence: 2, rank_growth: 1, badges: ['top_adherence', 'community_heart', 'jobs_creator'] },
    { country_code: 'BR', health_score: 75, medication_adherence_pct: 85, active_users_count: 32100, consultations_per_1000: 62, partner_satisfaction_score: 4.5, sos_response_time_avg_min: 8, rank_overall: 2, rank_adherence: 1, rank_growth: 3, badges: ['top_adherence', 'champion'] },
    { country_code: 'PT', health_score: 72, medication_adherence_pct: 79, active_users_count: 8900, consultations_per_1000: 51, partner_satisfaction_score: 4.4, sos_response_time_avg_min: 6, rank_overall: 3, rank_adherence: 3, rank_growth: 4, badges: ['best_sos'] },
    { country_code: 'AO', health_score: 68, medication_adherence_pct: 71, active_users_count: 6800, consultations_per_1000: 38, partner_satisfaction_score: 4.1, sos_response_time_avg_min: 15, rank_overall: 4, rank_adherence: 5, rank_growth: 2, badges: ['fastest_growth', 'rising_star'] },
    { country_code: 'ZA', health_score: 66, medication_adherence_pct: 74, active_users_count: 11200, consultations_per_1000: 42, partner_satisfaction_score: 4.0, sos_response_time_avg_min: 11, rank_overall: 5, rank_adherence: 4, rank_growth: 5, badges: ['most_improved'] },
    { country_code: 'KE', health_score: 63, medication_adherence_pct: 68, active_users_count: 9400, consultations_per_1000: 35, partner_satisfaction_score: 3.9, sos_response_time_avg_min: 18, rank_overall: 6, rank_adherence: 6, rank_growth: 2, badges: ['rising_star'] },
    { country_code: 'IN', health_score: 61, medication_adherence_pct: 65, active_users_count: 28500, consultations_per_1000: 28, partner_satisfaction_score: 3.8, sos_response_time_avg_min: 14, rank_overall: 7, rank_adherence: 7, rank_growth: 6, badges: [] },
    { country_code: 'NG', health_score: 58, medication_adherence_pct: 62, active_users_count: 17800, consultations_per_1000: 22, partner_satisfaction_score: 3.7, sos_response_time_avg_min: 22, rank_overall: 8, rank_adherence: 8, rank_growth: 7, badges: [] },
  ];
  return mock.map((r) => ({
    ...r,
    period,
    country_name: COUNTRY_INFO[r.country_code]?.name ?? r.country_code,
    country_flag: COUNTRY_INFO[r.country_code]?.flag ?? '🏳️',
  }));
}

/** Get the user's country ranking position with details. */
export async function getMyCountryRanking(countryCode: string, period: string): Promise<RegionalRanking | null> {
  const { data, error } = await sb
    .from('regional_rankings')
    .select('*')
    .eq('country_code', countryCode)
    .eq('period', period)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    ...data,
    country_name: COUNTRY_INFO[data.country_code]?.name ?? data.country_code,
    country_flag: COUNTRY_INFO[data.country_code]?.flag ?? '🏳️',
  };
}

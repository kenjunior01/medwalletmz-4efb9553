import { supabase as typedSupabase } from '@/integrations/supabase/client';
// Cast para acesso a tabelas ainda não presentes nos tipos gerados
const supabase = typedSupabase as any;

// ─── Types ────────────────────────────────────────────────────────────────

export interface RegionalKPI {
  id: string;
  country_code: string;
  kpi_key: string;       // active_users, revenue_mtd, partners_onboarded, consultations_booked, prescriptions_filled, avg_response_time_sos
  value: number;
  target: number | null;
  previous_period: number | null;
  yoy: number | null;
  period: string;         // '2025-Q2' etc.
  trend_data: number[];  // last 30 days for sparkline
  unit: string;           // 'users', 'MZN', 'partners', 'consultations', 'prescriptions', 'seconds'
  updated_at: string;
}

export interface RegionalGoal {
  id: string;
  country_code: string;
  quarter: string;        // '2025-Q2'
  goal_key: string;
  goal_label: string;
  target_value: number;
  current_value: number;
  unit: string;
  status: 'on_track' | 'at_risk' | 'behind' | 'achieved' | 'exceeded';
  owner: string;
  updated_at: string;
}

export interface RankingEntry {
  country_code: string;
  country_name: string;
  rank: number;
  score: number;
  badges: string[];
  metrics: Record<string, number>;
}

export interface ActiveCampaign {
  id: string;
  country_code: string;
  title: string;
  type: string;
  status: string;
  impressions: number | null;
  clicks: number | null;
  start_date: string;
  end_date: string | null;
  created_at: string;
}

export interface PriorityAction {
  id: string;
  type: 'partner_pending' | 'kpi_behind' | 'goal_at_risk' | 'campaign_ending' | 'low_engagement' | 'onboarding_stalled';
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  link?: string;
  created_at: string;
}

// ─── Service ──────────────────────────────────────────────────────────────

const KPI_KEYS = [
  'active_users', 'revenue_mtd', 'partners_onboarded',
  'consultations_booked', 'prescriptions_filled', 'avg_response_time_sos',
] as const;

export function getQuarterKey(d?: Date): string {
  const now = d ?? new Date();
  const y = now.getFullYear();
  const q = Math.floor(now.getMonth() / 3) + 1;
  return `${y}-Q${q}`;
}

export function getPeriodMTD(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Fetch KPIs for a country with sparkline trend data */
export async function getKPIs(countryCode: string, period?: string) {
  const p = period ?? getPeriodMTD();
  const { data, error } = await supabase
    .from('regional_kpis' as any)
    .select('*')
    .eq('country_code', countryCode)
    .eq('period', p)
    .order('kpi_key');

  if (error) throw error;
  return (data || []) as RegionalKPI[];
}

/** Fetch quarterly goals with progress */
export async function getGoals(countryCode: string, quarter?: string) {
  const q = quarter ?? getQuarterKey();
  const { data, error } = await supabase
    .from('regional_goals' as any)
    .select('*')
    .eq('country_code', countryCode)
    .eq('quarter', q)
    .order('goal_key');

  if (error) throw error;
  return (data || []) as RegionalGoal[];
}

/** Create or update a quarterly goal */
export async function upsertGoal(
  countryCode: string,
  quarter: string,
  goalKey: string,
  value: number,
  unit: string,
  label?: string,
) {
  const { data, error } = await supabase
    .from('regional_goals' as any)
    .upsert({
      country_code: countryCode,
      quarter,
      goal_key: goalKey,
      goal_label: label || goalKey,
      target_value: value,
      current_value: 0,
      unit,
      status: 'on_track',
    }, { onConflict: 'country_code,quarter,goal_key' } as any);

  if (error) throw error;
  return data;
}

/** Get this region's ranking vs others */
export async function getRanking(period: string, countryCode: string) {
  const { data, error } = await supabase
    .from('regional_rankings' as any)
    .select('*')
    .eq('period', period)
    .order('score', { ascending: false });

  if (error) throw error;
  const entries = (data || []) as RankingEntry[];
  const myRank = entries.find(e => e.country_code === countryCode);
  return { entries, myRank };
}

/** Fetch active health campaigns for a country */
export async function getActiveCampaigns(countryCode: string) {
  const { data, error } = await supabase
    .from('regional_content' as any)
    .select('*')
    .eq('country_code', countryCode)
    .eq('type', 'health_campaign')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) throw error;
  return (data || []) as ActiveCampaign[];
}

/** Fetch global ranking for leaderboard */
export async function getGlobalRanking(period: string) {
  const { data, error } = await supabase
    .from('regional_rankings' as any)
    .select('*')
    .eq('period', period)
    .order('score', { ascending: false });

  if (error) throw error;
  return (data || []) as RankingEntry[];
}

/** Aggregate priority actions needing CEO attention */
export async function getPriorityActions(countryCode: string): Promise<PriorityAction[]> {
  const actions: PriorityAction[] = [];

  // 1. Partners pending verification
  const { count: pendingPartners } = await supabase
    .from('partner_applications' as any)
    .select('id', { count: 'exact', head: true })
    .eq('country_code', countryCode)
    .eq('status', 'pending');

  if ((pendingPartners || 0) > 0) {
    actions.push({
      id: 'pending-partners',
      type: 'partner_pending',
      title: `${pendingPartners} parceiros aguardando verificação`,
      description: 'Existem candidaturas de parceiros que precisam de aprovação.',
      severity: 'high',
      link: '/admin/curation',
      created_at: new Date().toISOString(),
    });
  }

  // 2. KPIs behind target
  const { data: kpis } = await supabase
    .from('regional_kpis' as any)
    .select('*')
    .eq('country_code', countryCode)
    .eq('period', getPeriodMTD());

  if (kpis) {
    for (const kpi of kpis) {
      if (kpi.target && kpi.value < kpi.target * 0.7) {
        actions.push({
          id: `kpi-${kpi.kpi_key}`,
          type: 'kpi_behind',
          title: `KPI ${kpi.kpi_key} abaixo de 70% do alvo`,
          description: `Actual: ${kpi.value} | Alvo: ${kpi.target} (${Math.round((kpi.value / kpi.target) * 100)}%)`,
          severity: 'critical',
          created_at: kpi.updated_at,
        });
      }
    }
  }

  // 3. Goals at risk
  const { data: goals } = await supabase
    .from('regional_goals' as any)
    .select('*')
    .eq('country_code', countryCode)
    .eq('quarter', getQuarterKey())
    .in('status', ['at_risk', 'behind']);

  if (goals) {
    for (const g of goals) {
      actions.push({
        id: `goal-${g.goal_key}`,
        type: 'goal_at_risk',
        title: `Meta "${g.goal_label || g.goal_key}" em risco`,
        description: `Estado: ${g.status} | Progresso: ${g.current_value}/${g.target_value} ${g.unit}`,
        severity: g.status === 'behind' ? 'critical' : 'high',
        created_at: g.updated_at,
      });
    }
  }

  // 4. Campaigns ending soon
  const soon = new Date();
  soon.setDate(soon.getDate() + 7);
  const { data: endingCampaigns } = await supabase
    .from('regional_content' as any)
    .select('*')
    .eq('country_code', countryCode)
    .eq('type', 'health_campaign')
    .eq('is_active', true)
    .lt('end_date', soon.toISOString())
    .gt('end_date', new Date().toISOString());

  if (endingCampaigns && endingCampaigns.length > 0) {
    actions.push({
      id: 'campaigns-ending',
      type: 'campaign_ending',
      title: `${endingCampaigns.length} campanha(s) a terminar em breve`,
      description: 'Revisão necessária antes do encerramento.',
      severity: 'medium',
      created_at: new Date().toISOString(),
    });
  }

  // Sort by severity
  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  actions.sort((a, b) => (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99));

  return actions;
}

/** Fetch all countries for the global admin country selector */
export async function getAllCountryRankings() {
  const { data, error } = await supabase
    .from('countries' as any)
    .select('id, name, flag_url, region');

  if (error) throw error;
  return (data || []) as { id: string; name: string; flag_url?: string; region?: string }[];
}

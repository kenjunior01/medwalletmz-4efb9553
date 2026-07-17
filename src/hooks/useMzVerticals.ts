/**
 * useMzVerticals — Hook for accessing MZ-specific vertical health data
 * Covers: APE visits, TB DOT, ART adherence, Malaria cases, Maternal profiles
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ApeVisit = {
  id: string;
  ape_user_id?: string;
  patient_user_id?: string;
  province?: string;
  district?: string;
  village?: string;
  visit_date: string;
  visit_type: 'malaria'|'tb_screen'|'hiv_test'|'anc'|'pnc'|'vaccination'|'general'|'referral';
  symptoms?: any;
  rdt_result?: 'positive'|'negative'|'not_tested';
  diagnosis?: string;
  treatment_given?: any;
  referral_to?: string;
  gps_lat?: number;
  gps_lng?: number;
  offline_synced?: boolean;
  notes?: string;
};

export type TbDotRecord = {
  id: string;
  patient_user_id?: string;
  observer_user_id?: string;
  province?: string;
  tb_case_id?: string;
  treatment_phase: 'intensive'|'continuation'|'follow_up';
  start_date: string;
  end_date?: string;
  daily_meds?: any;
  adherence_pct?: number;
  last_taken_at?: string;
  missed_doses?: number;
  abandonment_risk?: 'low'|'medium'|'high';
  notes?: string;
};

export type ArtAdherenceLog = {
  id: string;
  patient_user_id?: string;
  province?: string;
  art_regimen?: string;
  art_start_date?: string;
  last_viral_load?: number;
  last_viral_load_date?: string;
  last_cd4_count?: number;
  last_cd4_date?: string;
  adherence_pct?: number;
  refill_due_date?: string;
  last_refill_date?: string;
  missed_doses_30d?: number;
};

export type MalariaCase = {
  id: string;
  patient_user_id?: string;
  ape_user_id?: string;
  province?: string;
  district?: string;
  case_date: string;
  age_years?: number;
  sex?: 'M'|'F';
  pregnant?: boolean;
  rdt_result: 'positive'|'negative';
  species?: 'falciparum'|'vivax'|'mixed'|'unknown';
  severity?: 'uncomplicated'|'severe';
  treatment_given?: string;
  treatment_start?: string;
  treatment_completed?: boolean;
  outcome?: 'recovering'|'cured'|'referred'|'death'|'lost';
  gps_lat?: number;
  gps_lng?: number;
};

export type MaternalProfile = {
  id: string;
  patient_user_id?: string;
  province?: string;
  district?: string;
  lmp_date?: string;
  edd_date?: string;
  gravida?: number;
  para?: number;
  blood_type?: string;
  risk_level?: 'low'|'medium'|'high';
  anc_visits_done?: number;
  anc_visits_due?: any;
  partner_name?: string;
  partner_phone?: string;
  preferred_facility?: string;
  last_bp_systolic?: number;
  last_bp_diastolic?: number;
  last_weight_kg?: number;
};

// =================== APE VISITS ===================
export function useApeVisits(province?: string) {
  return useQuery<ApeVisit[]>({
    queryKey: ['ape-visits', province],
    queryFn: async () => {
      let q = (supabase as any).from('ape_visits').select('*').order('visit_date', { ascending: false }).limit(100);
      if (province) q = q.eq('province', province);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    staleTime: 15_000,
  });
}

export function useCreateApeVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (visit: Partial<ApeVisit>) => {
      const { data, error } = await (supabase as any).from('ape_visits').insert(visit).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ape-visits'] });
    },
  });
}

// =================== TB DOT ===================
export function useTbDotRecords(province?: string) {
  return useQuery<TbDotRecord[]>({
    queryKey: ['tb-dot-records', province],
    queryFn: async () => {
      let q = (supabase as any).from('tb_dot_records').select('*').order('start_date', { ascending: false }).limit(100);
      if (province) q = q.eq('province', province);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });
}

export function useLogTbDose() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ recordId, taken }: { recordId: string; taken: boolean }) => {
      const { data: existing } = await (supabase as any)
        .from('tb_dot_records')
        .select('daily_meds, last_taken_at, missed_doses')
        .eq('id', recordId)
        .single();
      const today = new Date().toISOString().split('T')[0];
      const dailyMeds = Array.isArray(existing?.daily_meds) ? existing.daily_meds : [];
      dailyMeds.push({ day: today, taken, observed_at: new Date().toISOString(), method: 'video' });
      const missedDoses = taken ? (existing?.missed_doses || 0) : (existing?.missed_doses || 0) + 1;
      const { data, error } = await (supabase as any)
        .from('tb_dot_records')
        .update({
          daily_meds: dailyMeds,
          last_taken_at: taken ? new Date().toISOString() : existing?.last_taken_at,
          missed_doses: missedDoses,
          abandonment_risk: missedDoses > 5 ? 'high' : missedDoses > 2 ? 'medium' : 'low',
          updated_at: new Date().toISOString(),
        })
        .eq('id', recordId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tb-dot-records'] });
    },
  });
}

// =================== ART ADHERENCE ===================
export function useArtAdherenceLogs(province?: string) {
  return useQuery<ArtAdherenceLog[]>({
    queryKey: ['art-adherence', province],
    queryFn: async () => {
      let q = (supabase as any).from('art_adherence_logs').select('*').order('created_at', { ascending: false }).limit(100);
      if (province) q = q.eq('province', province);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });
}

// =================== MALARIA CASES ===================
export function useMalariaCases(province?: string, limit = 100) {
  return useQuery<MalariaCase[]>({
    queryKey: ['malaria-cases', province, limit],
    queryFn: async () => {
      let q = (supabase as any).from('malaria_cases').select('*').order('case_date', { ascending: false }).limit(limit);
      if (province) q = q.eq('province', province);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    staleTime: 15_000,
  });
}

export function useCreateMalariaCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: Partial<MalariaCase>) => {
      const { data, error } = await (supabase as any).from('malaria_cases').insert(c).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['malaria-case'] });
    },
  });
}

// =================== MATERNAL PROFILES ===================
export function useMaternalProfiles(province?: string) {
  return useQuery<MaternalProfile[]>({
    queryKey: ['maternal-profiles', province],
    queryFn: async () => {
      let q = (supabase as any).from('maternal_profiles').select('*').order('edd_date', { ascending: true }).limit(100);
      if (province) q = q.eq('province', province);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });
}

// =================== ESSENTIAL MEDICINES ===================
export function useEssentialMedicines(category?: string) {
  return useQuery<any[]>({
    queryKey: ['essential-medicines', category],
    queryFn: async () => {
      let q = (supabase as any).from('essential_medicines').select('*').order('name', { ascending: true });
      if (category && category !== 'all') q = q.eq('category', category);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    staleTime: 300_000,
  });
}

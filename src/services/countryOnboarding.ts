/**
 * Country Onboarding Service
 * 9-step wizard to activate a new region (country) in the platform.
 *
 * Tables: country_onboarding
 */

import { supabase } from '@/integrations/supabase/client';

export type OnboardingStep =
  | 'basics'
  | 'currency'
  | 'partners'
  | 'regulator'
  | 'translations'
  | 'emergency_numbers'
  | 'holidays'
  | 'review'
  | 'completed';

export interface CountryOnboarding {
  id?: string;
  country_code: string;
  country_name: string;
  current_step?: OnboardingStep;
  progress_percentage?: number;
  wizard_data?: Record<string, any>;
  is_activated?: boolean;
  activated_at?: string;
  regional_ceo_user_id?: string;
  q1_targets?: Record<string, any>;
  started_by?: string;
  started_at?: string;
  updated_at?: string;
}

export const STEP_ORDER: OnboardingStep[] = [
  'basics', 'currency', 'partners', 'regulator', 'translations',
  'emergency_numbers', 'holidays', 'review', 'completed',
];

export const STEP_LABELS: Record<OnboardingStep, { label: string; emoji: string; description: string }> = {
  basics: { label: 'Básicos', emoji: '📋', description: 'Nome, código ISO, capital, população' },
  currency: { label: 'Moeda', emoji: '💰', description: 'Moeda local, símbolo, casas decimais' },
  partners: { label: 'Parceiros', emoji: '🤝', description: 'Operadores MNO, bancos, seguradoras' },
  regulator: { label: 'Regulador', emoji: '⚖️', description: 'Entidade reguladora de saúde' },
  translations: { label: 'Traduções', emoji: '🌐', description: 'Línguas oficiais e locais' },
  emergency_numbers: { label: 'Emergências', emoji: '🚨', description: 'Números de emergência locais' },
  holidays: { label: 'Feriados', emoji: '📅', description: 'Feriados nacionais e horários' },
  review: { label: 'Rever', emoji: '✅', description: 'Confirmar dados e activar' },
  completed: { label: 'Concluído', emoji: '🎉', description: 'Região activada' },
};

export interface OnboardingListItem extends CountryOnboarding {
  // Computed
  steps_completed?: number;
  total_steps?: number;
}

/** Get all onboarding records (admin view). */
export async function getOnboardings(): Promise<OnboardingListItem[]> {
  const { data, error } = await (supabase as any)
    .from('country_onboarding')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);

  return (data ?? []).map((o) => ({
    ...o,
    steps_completed: STEP_ORDER.indexOf(o.current_step ?? 'basics'),
    total_steps: STEP_ORDER.length - 1, // exclude 'completed'
  }));
}

/** Get a single onboarding record. */
export async function getOnboarding(id: string): Promise<CountryOnboarding | null> {
  const { data, error } = await (supabase as any)
    .from('country_onboarding')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getOnboardingByCountry(countryCode: string): Promise<CountryOnboarding | null> {
  const { data, error } = await (supabase as any)
    .from('country_onboarding')
    .select('*')
    .eq('country_code', countryCode)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Create new onboarding record. */
export async function createOnboarding(userId: string, countryCode: string, countryName: string): Promise<CountryOnboarding> {
  const { data, error } = await (supabase as any)
    .from('country_onboarding')
    .insert({
      country_code: countryCode,
      country_name: countryName,
      started_by: userId,
      current_step: 'basics',
      progress_percentage: 0,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/** Update wizard data for a step. */
export async function saveStep(onboardingId: string, step: OnboardingStep, stepData: Record<string, any>): Promise<CountryOnboarding> {
  // 1. Get current wizard_data
  const cur = await getOnboarding(onboardingId);
  if (!cur) throw new Error('Onboarding not found');

  // 2. Merge step data
  const wizardData = { ...(cur.wizard_data ?? {}), [step]: stepData };

  // 3. Compute next step
  const curIdx = STEP_ORDER.indexOf(step);
  const nextStep = STEP_ORDER[Math.min(curIdx + 1, STEP_ORDER.length - 1)];
  const progress = Math.round(((curIdx + 1) / (STEP_ORDER.length - 1)) * 100);

  // 4. Update
  const { data, error } = await (supabase as any)
    .from('country_onboarding')
    .update({
      wizard_data: wizardData,
      current_step: nextStep,
      progress_percentage: progress,
    })
    .eq('id', onboardingId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/** Activate a country (final step). */
export async function activateCountry(onboardingId: string, q1Targets?: Record<string, any>): Promise<CountryOnboarding> {
  const { data, error } = await (supabase as any)
    .from('country_onboarding')
    .update({
      is_activated: true,
      activated_at: new Date().toISOString(),
      current_step: 'completed',
      progress_percentage: 100,
      q1_targets: q1Targets,
    })
    .eq('id', onboardingId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/** Assign regional CEO. */
export async function assignRegionalCEO(onboardingId: string, ceoUserId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('country_onboarding')
    .update({ regional_ceo_user_id: ceoUserId })
    .eq('id', onboardingId);
  if (error) throw new Error(error.message);
}

/** Delete onboarding record. */
export async function deleteOnboarding(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('country_onboarding')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/* ---------- Country templates ---------- */

export const COUNTRY_TEMPLATES: Record<string, {
  code: string;
  name: string;
  capital: string;
  population: number;
  currency_code: string;
  currency_symbol: string;
  currency_decimals: number;
  locale: string;
  languages: string[];
  emergency: Record<string, string>;
  regulator: string;
}> = {
  AO: {
    code: 'AO', name: 'Angola', capital: 'Luanda', population: 35000000,
    currency_code: 'AOA', currency_symbol: 'Kz', currency_decimals: 2,
    locale: 'pt-AO', languages: ['pt', 'umb', 'kmb'],
    emergency: { police: '113', ambulance: '116', fire: '115' },
    regulator: 'Direção Nacional de Saúde Pública',
  },
  BR: {
    code: 'BR', name: 'Brasil', capital: 'Brasília', population: 215000000,
    currency_code: 'BRL', currency_symbol: 'R$', currency_decimals: 2,
    locale: 'pt-BR', languages: ['pt'],
    emergency: { police: '190', ambulance: '192', fire: '193' },
    regulator: 'ANVISA',
  },
  PT: {
    code: 'PT', name: 'Portugal', capital: 'Lisboa', population: 10300000,
    currency_code: 'EUR', currency_symbol: '€', currency_decimals: 2,
    locale: 'pt-PT', languages: ['pt'],
    emergency: { police: '112', ambulance: '112', fire: '112' },
    regulator: 'DGS (Direção-Geral da Saúde)',
  },
  ZA: {
    code: 'ZA', name: 'África do Sul', capital: 'Pretória', population: 60000000,
    currency_code: 'ZAR', currency_symbol: 'R', currency_decimals: 2,
    locale: 'en-ZA', languages: ['en', 'zu', 'xh', 'af'],
    emergency: { police: '10111', ambulance: '10177', fire: '10111' },
    regulator: 'National Department of Health',
  },
  KE: {
    code: 'KE', name: 'Quénia', capital: 'Nairobi', population: 54000000,
    currency_code: 'KES', currency_symbol: 'KSh', currency_decimals: 2,
    locale: 'sw-KE', languages: ['sw', 'en'],
    emergency: { police: '999', ambulance: '999', fire: '999' },
    regulator: 'Ministry of Health Kenya',
  },
  NG: {
    code: 'NG', name: 'Nigéria', capital: 'Abuja', population: 220000000,
    currency_code: 'NGN', currency_symbol: '₦', currency_decimals: 2,
    locale: 'en-NG', languages: ['en', 'ha', 'yo', 'ig'],
    emergency: { police: '199', ambulance: '199', fire: '199' },
    regulator: 'NAFDAC',
  },
  GH: {
    code: 'GH', name: 'Gana', capital: 'Accra', population: 34000000,
    currency_code: 'GHS', currency_symbol: '₵', currency_decimals: 2,
    locale: 'en-GH', languages: ['en', 'tw', 'ga'],
    emergency: { police: '191', ambulance: '193', fire: '192' },
    regulator: 'Ghana Health Service',
  },
  TZ: {
    code: 'TZ', name: 'Tanzânia', capital: 'Dodoma', population: 63000000,
    currency_code: 'TZS', currency_symbol: 'TSh', currency_decimals: 0,
    locale: 'sw-TZ', languages: ['sw', 'en'],
    emergency: { police: '112', ambulance: '114', fire: '115' },
    regulator: 'Ministry of Health Tanzania',
  },
  CV: {
    code: 'CV', name: 'Cabo Verde', capital: 'Praia', population: 590000,
    currency_code: 'CVE', currency_symbol: '$', currency_decimals: 2,
    locale: 'pt-CV', languages: ['pt'],
    emergency: { police: '132', ambulance: '130', fire: '131' },
    regulator: 'Ministério da Saúde de Cabo Verde',
  },
};

/**
 * User Types Service
 *
 * User types selected at registration:
 *   - patient       → someone seeking healthcare (default)
 *   - health_worker → ALL health professionals: médicos, enfermeiros, técnicos de enfermagem,
 *                     técnicos de saúde, parteiras, APEs, curandeiros tradicionais
 *   - rider         → courier / Health Rider (deliveries)
 *   - promoter      → community health promoter (referrals + outreach)
 *
 * Stored in: profiles.user_type (denormalized, fast read)
 *            user_types (full history)
 *
 * RPC: set_user_primary_type(user_id, type) — atomic switch
 */

import { supabase as typedSupabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
// Cast para acesso a tabelas ainda não presentes nos tipos gerados
const supabase = typedSupabase as any;

export type UserType = 'patient' | 'health_worker' | 'rider' | 'promoter';

export interface UserTypeOption {
  id: UserType;
  labelKey: string;
  emoji: string;
  descriptionKey: string;
  ctaKey: string;
  featuresKey: string;
  color: string;
  bg: string;
  border: string;
}

export const USER_TYPES: UserTypeOption[] = [
  {
    id: 'patient',
    labelKey: 'userType.patient.label',
    emoji: '🧑',
    descriptionKey: 'userType.patient.description',
    ctaKey: 'userType.patient.cta',
    featuresKey: 'userType.patient.features',
    color: 'text-blue-700',
    bg: 'from-blue-50 to-cyan-50',
    border: 'border-blue-200',
  },
  {
    id: 'health_worker',
    labelKey: 'userType.health_worker.label',
    emoji: '🩺',
    descriptionKey: 'userType.health_worker.description',
    ctaKey: 'userType.health_worker.cta',
    featuresKey: 'userType.health_worker.features',
    color: 'text-purple-700',
    bg: 'from-purple-50 to-fuchsia-50',
    border: 'border-purple-200',
  },
  {
    id: 'rider',
    labelKey: 'userType.rider.label',
    emoji: '🛵',
    descriptionKey: 'userType.rider.description',
    ctaKey: 'userType.rider.cta',
    featuresKey: 'userType.rider.features',
    color: 'text-emerald-700',
    bg: 'from-emerald-50 to-teal-50',
    border: 'border-emerald-200',
  },
  {
    id: 'promoter',
    labelKey: 'userType.promoter.label',
    emoji: '📢',
    descriptionKey: 'userType.promoter.description',
    ctaKey: 'userType.promoter.cta',
    featuresKey: 'userType.promoter.features',
    color: 'text-amber-700',
    bg: 'from-amber-50 to-orange-50',
    border: 'border-amber-200',
  },
];

/** Get the primary user type for the current user. */
export async function getUserType(userId: string): Promise<UserType> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return (data?.user_type as UserType) ?? 'patient';
  } catch (e) {
    logger.warn('getUserType failed, defaulting to patient', { error: e });
    return 'patient';
  }
}

/** Set the user's primary type (creates or updates). */
export async function setUserType(userId: string, type: UserType): Promise<void> {
  try {
    const { error } = await supabase.rpc('set_user_primary_type', {
      p_user_id: userId,
      p_type: type,
    });
    if (error) throw error;
  } catch (e: any) {
    // Fallback: try direct update on profiles
    logger.warn('set_user_primary_type RPC failed, falling back', { error: e });
    await supabase.from('profiles').update({ user_type: type }).eq('user_id', userId);
    // Best-effort insert into user_types
    await supabase.from('user_types').upsert({
      user_id: userId,
      user_type: type,
      is_primary: true,
    });
  }
}

/* ============================================================
 * Verification queue (admin)
 * ============================================================ */

export interface PendingVerification {
  kind: 'rider' | 'worker';
  entity_id: string;
  user_id: string;
  country_code: string;
  full_name: string;
  phone?: string | null;
  created_at: string;
  onboarding_step?: string;
  onboarding_progress?: number;
  details: Record<string, any>;
}

export async function getPendingVerifications(): Promise<PendingVerification[]> {
  try {
    const { data, error } = await supabase
      .from('pending_verifications')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as PendingVerification[];
  } catch (e: any) {
    logger.warn('getPendingVerifications failed (view may not exist yet)', { error: e });
    return [];
  }
}

export async function approveRider(riderId: string, adminId: string): Promise<void> {
  const { error } = await supabase
    .from('health_riders')
    .update({
      is_verified: true,
      verified_at: new Date().toISOString(),
      verified_by: adminId,
      rejection_reason: null,
    })
    .eq('id', riderId);
  if (error) throw error;
}

export async function rejectRider(riderId: string, adminId: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from('health_riders')
    .update({
      is_verified: false,
      verified_at: new Date().toISOString(),
      verified_by: adminId,
      rejection_reason: reason,
      onboarding_step: 'review',
    })
    .eq('id', riderId);
  if (error) throw error;
}

export async function approveWorker(workerId: string, adminId: string): Promise<void> {
  const { error } = await supabase
    .from('health_worker_profiles')
    .update({
      is_verified: true,
      verified_at: new Date().toISOString(),
      verified_by: adminId,
      verification_notes: null,
      rejection_reason: null,
    })
    .eq('id', workerId);
  if (error) throw error;
}

export async function rejectWorker(workerId: string, adminId: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from('health_worker_profiles')
    .update({
      is_verified: false,
      verified_at: new Date().toISOString(),
      verified_by: adminId,
      rejection_reason: reason,
      onboarding_step: 'review',
    })
    .eq('id', workerId);
  if (error) throw error;
}

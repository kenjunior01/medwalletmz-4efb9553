/**
 * Family Hub Service
 * Care for family members at a distance — add relatives, track their
 * medications, get alerts when a dose is missed, share updates with
 * other caretakers.
 *
 * Tables: family_members, family_medication_logs
 */

import { supabase } from '@/integrations/supabase/client';

// Cliente sem tipagem estrita para tabelas ainda não presentes nos tipos gerados.
const sb: any = supabase;

export type Relationship = 'parent' | 'child' | 'spouse' | 'sibling' | 'grandparent' | 'other';

export interface FamilyMember {
  id?: string;
  caretaker_user_id?: string;
  full_name: string;
  relationship: Relationship;
  birth_date?: string;
  gender?: 'male' | 'female' | 'other';
  blood_type?: string;
  allergies?: string[];
  chronic_conditions?: string[];
  medications?: string[];
  emergency_contact?: string;
  can_view_medical?: boolean;
  can_book_appointments?: boolean;
  can_receive_medication_alerts?: boolean;
  medication_alerts_enabled?: boolean;
  missed_dose_threshold_minutes?: number;
  avatar_url?: string;
  color?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FamilyMedicationLog {
  id?: string;
  family_member_id: string;
  caretaker_user_id?: string;
  medication_name: string;
  scheduled_time: string; // 'HH:MM'
  taken_at?: string;
  skipped_at?: string;
  skipped_reason?: string;
  notes?: string;
  created_at?: string;
}

export interface MedicationSchedule {
  medication_name: string;
  scheduled_time: string;
  status: 'pending' | 'taken' | 'skipped' | 'missed';
  log_id?: string;
  taken_at?: string;
  skipped_reason?: string;
}

/** Add a new family member under the caretaker's account. */
export async function addFamilyMember(userId: string, member: Omit<FamilyMember, 'id' | 'caretaker_user_id'>): Promise<FamilyMember> {
  const { data, error } = await sb
    .from('family_members')
    .insert({ caretaker_user_id: userId, ...member })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/** Update an existing family member. */
export async function updateFamilyMember(memberId: string, patch: Partial<FamilyMember>): Promise<FamilyMember> {
  const { data, error } = await sb
    .from('family_members')
    .update(patch)
    .eq('id', memberId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/** Soft-deactivate (or hard-delete) a family member. */
export async function removeFamilyMember(memberId: string, hardDelete = false): Promise<void> {
  if (hardDelete) {
    const { error } = await sb.from('family_members').delete().eq('id', memberId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await sb.from('family_members').update({ is_active: false }).eq('id', memberId);
    if (error) throw new Error(error.message);
  }
}

/** Get all family members for a caretaker. */
export async function getFamilyMembers(userId: string, includeInactive = false): Promise<FamilyMember[]> {
  let q = sb.from('family_members').select('*').eq('caretaker_user_id', userId).order('created_at', { ascending: true });
  if (!includeInactive) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Get one family member by ID. */
export async function getFamilyMember(memberId: string): Promise<FamilyMember | null> {
  const { data, error } = await sb
    .from('family_members')
    .select('*')
    .eq('id', memberId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Mark a scheduled medication as taken now (or at a specific time). */
export async function markMedicationTaken(logId: string, takenAt: Date = new Date()): Promise<void> {
  const { error } = await sb
    .from('family_medication_logs')
    .update({ taken_at: takenAt.toISOString() })
    .eq('id', logId);
  if (error) throw new Error(error.message);
}

/** Mark a scheduled medication as skipped (with reason). */
export async function markMedicationSkipped(logId: string, reason: string): Promise<void> {
  const { error } = await sb
    .from('family_medication_logs')
    .update({ skipped_at: new Date().toISOString(), skipped_reason: reason })
    .eq('id', logId);
  if (error) throw new Error(error.message);
}

/** Schedule a recurring-ish medication log for today. */
export async function scheduleMedicationToday(
  userId: string,
  memberId: string,
  medicationName: string,
  scheduledTime: string,
  notes?: string,
): Promise<FamilyMedicationLog> {
  const { data, error } = await sb
    .from('family_medication_logs')
    .insert({
      family_member_id: memberId,
      caretaker_user_id: userId,
      medication_name: medicationName,
      scheduled_time: scheduledTime,
      notes,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/** Get today's medication schedule for a family member. */
export async function getTodaySchedule(memberId: string): Promise<MedicationSchedule[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const { data, error } = await sb
    .from('family_medication_logs')
    .select('*')
    .eq('family_member_id', memberId)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
    .order('scheduled_time', { ascending: true });
  if (error) throw new Error(error.message);

  const now = new Date();
  return (data ?? []).map((log) => {
    const scheduledDateTime = parseScheduledDateTime(log.scheduled_time, new Date(log.created_at));
    let status: MedicationSchedule['status'] = 'pending';
    if (log.taken_at) status = 'taken';
    else if (log.skipped_at) status = 'skipped';
    else if (scheduledDateTime < now) status = 'missed';
    return {
      medication_name: log.medication_name,
      scheduled_time: log.scheduled_time,
      status,
      log_id: log.id,
      taken_at: log.taken_at,
      skipped_reason: log.skipped_reason,
    };
  });
}

/** Get a 7-day adherence summary for a family member. */
export async function getAdherenceSummary(memberId: string): Promise<{
  total: number;
  taken: number;
  skipped: number;
  missed: number;
  adherence_rate: number;
}> {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const { data, error } = await sb
    .from('family_medication_logs')
    .select('taken_at, skipped_at, scheduled_time, created_at')
    .eq('family_member_id', memberId)
    .gte('created_at', since.toISOString());
  if (error) throw new Error(error.message);

  const now = new Date();
  let taken = 0;
  let skipped = 0;
  let missed = 0;
  for (const log of data ?? []) {
    if (log.taken_at) taken++;
    else if (log.skipped_at) skipped++;
    else {
      const scheduled = parseScheduledDateTime(log.scheduled_time, new Date(log.created_at));
      if (scheduled < now) missed++;
    }
  }
  const total = taken + skipped + missed;
  return {
    total,
    taken,
    skipped,
    missed,
    adherence_rate: total === 0 ? 0 : Math.round((taken / total) * 100),
  };
}

/** Get a quick dashboard summary across all family members. */
export async function getFamilyDashboard(userId: string): Promise<{
  total_members: number;
  pending_today: number;
  missed_today: number;
  avg_adherence: number;
  upcoming_alerts: { member_name: string; medication_name: string; scheduled_time: string; member_id: string }[];
}> {
  const members = await getFamilyMembers(userId);
  let pending = 0;
  let missed = 0;
  let totalAdherence = 0;
  let adherenceCount = 0;
  const upcoming: { member_name: string; medication_name: string; scheduled_time: string; member_id: string }[] = [];

  for (const m of members) {
    try {
      const schedule = await getTodaySchedule(m.id!);
      for (const s of schedule) {
        if (s.status === 'pending') {
          pending++;
          upcoming.push({ member_name: m.full_name, medication_name: s.medication_name, scheduled_time: s.scheduled_time, member_id: m.id! });
        } else if (s.status === 'missed') {
          missed++;
        }
      }
      const adh = await getAdherenceSummary(m.id!);
      if (adh.total > 0) {
        totalAdherence += adh.adherence_rate;
        adherenceCount++;
      }
    } catch {
      /* ignore per-member errors */
    }
  }
  upcoming.sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));
  return {
    total_members: members.length,
    pending_today: pending,
    missed_today: missed,
    avg_adherence: adherenceCount === 0 ? 0 : Math.round(totalAdherence / adherenceCount),
    upcoming_alerts: upcoming.slice(0, 5),
  };
}

/** Helper: parse 'HH:MM' into a Date on the same day as the log's created_at. */
function parseScheduledDateTime(time: string, baseDate: Date): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(baseDate);
  d.setHours(h, m, 0, 0);
  return d;
}

/** Calculate age from birth_date. */
export function calculateAge(birthDate?: string): number | null {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

/** Generate a friendly relationship label. */
export function relationshipLabel(rel: Relationship): string {
  const labels: Record<Relationship, string> = {
    parent: 'Pai / Mãe',
    child: 'Filho(a)',
    spouse: 'Cônjuge',
    sibling: 'Irmão(ã)',
    grandparent: 'Avó(ô)',
    other: 'Outro',
  };
  return labels[rel];
}

/** Pick a friendly color for a new family member (cycles through palette). */
export function pickFamilyColor(index: number): string {
  const palette = ['#3B82F6', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#EF4444', '#84CC16'];
  return palette[index % palette.length];
}

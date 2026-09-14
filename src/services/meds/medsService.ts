/**
 * Meds Service — plano diário de medicação + registo de tomas
 * (paridade 1:1 com o app Flutter lib/features/meds/data/meds_repository.dart)
 *
 * Fontes de dados (todas existentes, zero alterações de backend):
 *  - prescriptions (patient_id, created_at) — receitas dos últimos 60 dias
 *  - prescription_items (medication_name, dosage, frequency)
 *  - medication_logs — UNIQUE (user_id, prescription_item_id, logged_date)
 *
 * Inclui cache offline em localStorage: sem internet, o plano continua
 * disponível (igual ao OfflineCache do app).
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

// ─── Tipos ──────────────────────────────────────────────────────────────

export interface PlannedMedication {
  prescriptionItemId: string;
  name: string;
  dosage?: string | null;
  frequency?: string | null;
}

export interface MedicationLog {
  id: string;
  loggedDate: string; // yyyy-mm-dd
  prescriptionItemId?: string | null;
  medicationName?: string | null;
  dosage?: string | null;
  takenAt?: string | null;
  skipped?: boolean;
  skippedReason?: string | null;
}

export const isTaken = (log: MedicationLog) => Boolean(log.takenAt);

// ─── Cache offline (localStorage) ───────────────────────────────────────

const CACHE_KEY = 'medwallet.meds.planned.v1';

interface CacheShape {
  items: PlannedMedication[];
  savedAt: string;
}

function readCache(): PlannedMedication[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CacheShape;
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

function writeCache(items: PlannedMedication[]) {
  try {
    const payload: CacheShape = { items, savedAt: new Date().toISOString() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // storage cheio/indisponível — silencioso
  }
}

// Cache dos registos (dia actual + histórico) para pintura instantânea e
// leitura offline — mesma filosofia do cache do plano, acima.
const LOGS_TODAY_KEY = 'medwallet.meds.logs.today.v1';
const LOGS_RECENT_KEY = 'medwallet.meds.logs.recent.v1';

function writeLogsCache(key: string, logs: MedicationLog[]) {
  try {
    localStorage.setItem(key, JSON.stringify({ logs, savedAt: new Date().toISOString() }));
  } catch {
    // silencioso
  }
}

function readLogsCache(key: string): MedicationLog[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { logs?: MedicationLog[] };
    return Array.isArray(parsed.logs) ? parsed.logs : [];
  } catch {
    return [];
  }
}


// ─── Helpers de data ────────────────────────────────────────────────────

export function todayKey(d = new Date()): string {
  // yyyy-mm-dd no fuso local (igual ao app)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dayKeyOffset(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return todayKey(d);
}

/**
 * Utilizador autenticado (padrão web — a sessão vive no storage local).
 */
async function currentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * medication_logs ainda não está no mapa de tipos gerado do Supabase —
 * consultas sem tipos, mesma abordagem do widget PillTracker da Home.
 */
function logsDb(): any {
  return (supabase as any).from('medication_logs');
}

// ─── Repositório ────────────────────────────────────────────────────────

/**
 * Medicamentos de receitas recentes (últimos 60 dias).
 * Em caso de falha de rede serve o último plano guardado (cache offline).
 */
export async function fetchPlanned(): Promise<PlannedMedication[]> {
  const uid = await currentUserId();
  if (!uid) return [];
  try {
    const since = dayKeyOffset(60);
    const { data: prescriptions, error: e1 } = await supabase
      .from('prescriptions')
      .select('id')
      .eq('patient_id', uid)
      .gte('created_at', since);
    if (e1) throw e1;
    const ids = (prescriptions ?? []).map(p => p.id as string);
    if (ids.length === 0) {
      writeCache([]);
      return [];
    }
    const { data: items, error: e2 } = await supabase
      .from('prescription_items')
      .select('id, medication_name, dosage, frequency')
      .in('prescription_id', ids);
    if (e2) throw e2;
    const planned: PlannedMedication[] = (items ?? []).map(it => ({
      prescriptionItemId: it.id as string,
      name: (it.medication_name ?? '') as string,
      dosage: (it.dosage ?? null) as string | null,
      frequency: (it.frequency ?? null) as string | null,
    }));
    writeCache(planned);
    return planned;
  } catch (err) {
    logger.warn('meds: plano a partir da cache offline', err);
    return readCache();
  }
}

/**
 * Leituras de um dia (yyyy-mm-dd). Em falha de rede serve a última cópia
 * guardada (cache offline) — o dia de hoje nunca fica em branco.
 */
export async function fetchDay(day: string): Promise<MedicationLog[]> {
  const uid = await currentUserId();
  if (!uid) return [];
  try {
    const { data, error } = await logsDb()
      .select('*')
      .eq('user_id', uid)
      .eq('logged_date', day);
    if (error) throw error;
    const logs = (data ?? []).map(fromRow);
    writeLogsCache(LOGS_TODAY_KEY, logs);
    return logs;
  } catch (err) {
    logger.warn('meds: fetchDay a partir da cache offline', err);
    return readLogsCache(LOGS_TODAY_KEY);
  }
}

/**
 * Histórico dos últimos N dias (streak, faixa semanal, adesão).
 * Também com cache offline: a última versão bem-sucedida fica guardada.
 */
export async function fetchRecent(days = 30): Promise<MedicationLog[]> {
  const uid = await currentUserId();
  if (!uid) return [];
  try {
    const since = dayKeyOffset(days);
    const { data, error } = await logsDb()
      .select('*')
      .eq('user_id', uid)
      .gte('logged_date', since)
      .order('logged_date', { ascending: false });
    if (error) throw error;
    const logs = (data ?? []).map(fromRow);
    writeLogsCache(LOGS_RECENT_KEY, logs);
    return logs;
  } catch (err) {
    logger.warn('meds: fetchRecent a partir da cache offline', err);
    return readLogsCache(LOGS_RECENT_KEY);
  }
}

/** Marca um medicamento do plano como tomado / não tomado. */
export async function togglePlanned(opts: {
  prescriptionItemId: string;
  name: string;
  dosage?: string | null;
  taken: boolean;
}): Promise<void> {
  const uid = await currentUserId();
  if (!uid) return;
  const { error } = await logsDb()
    .upsert(
      {
        user_id: uid,
        prescription_item_id: opts.prescriptionItemId,
        medication_name: opts.name,
        ...(opts.dosage ? { dosage: opts.dosage } : {}),
        logged_date: todayKey(),
        taken_at: opts.taken ? new Date().toISOString() : null,
        skipped: false,
      },
      { onConflict: 'user_id,prescription_item_id,logged_date' },
    );
  if (error) {
    logger.error('meds: togglePlanned', error);
    throw error;
  }
}

/** Marca como "não tomei" (com razão opcional). */
export async function skipPlanned(opts: {
  prescriptionItemId: string;
  name: string;
  reason?: string;
}): Promise<void> {
  const uid = await currentUserId();
  if (!uid) return;
  const { error } = await logsDb()
    .upsert(
      {
        user_id: uid,
        prescription_item_id: opts.prescriptionItemId,
        medication_name: opts.name,
        logged_date: todayKey(),
        taken_at: null,
        skipped: true,
        ...(opts.reason ? { skipped_reason: opts.reason } : {}),
      },
      { onConflict: 'user_id,prescription_item_id,logged_date' },
    );
  if (error) {
    logger.error('meds: skipPlanned', error);
    throw error;
  }
}

/** Adiciona medicação ad-hoc (sem receita) para hoje. */
export async function addAdHoc(opts: {
  name: string;
  dosage?: string;
}): Promise<void> {
  const uid = await currentUserId();
  if (!uid) return;
  const { error } = await logsDb().insert({
    user_id: uid,
    medication_name: opts.name,
    ...(opts.dosage && opts.dosage.trim() ? { dosage: opts.dosage.trim() } : {}),
    logged_date: todayKey(),
  });
  if (error) {
    logger.error('meds: addAdHoc', error);
    throw error;
  }
}

/** Remove um registo ad-hoc. */
export async function removeAdHoc(logId: string): Promise<void> {
  const { error } = await logsDb()
    .delete()
    .eq('id', logId);
  if (error) {
    logger.error('meds: removeAdHoc', error);
    throw error;
  }
}

/** Marca/desmarca um registo ad-hoc existente. */
export async function toggleAdHoc(log: MedicationLog): Promise<void> {
  const taken = !log.takenAt;
  const { error } = await logsDb()
    .update({ taken_at: taken ? new Date().toISOString() : null, skipped: false })
    .eq('id', log.id);
  if (error) {
    logger.error('meds: toggleAdHoc', error);
    throw error;
  }
}

// ─── Streak (dias consecutivos com toma) ────────────────────────────────

/** Igual ao computeStreak do app: hoje conta se já houve toma. */
export function computeStreak(recent: MedicationLog[]): number {
  const byDay = new Map<string, boolean>();
  for (const l of recent) {
    if (l.takenAt) byDay.set(l.loggedDate, true);
  }
  let streak = 0;
  const day = new Date();
  if (!byDay.has(todayKey(day))) day.setDate(day.getDate() - 1);
  for (let i = 0; i < 60; i++) {
    const key = todayKey(day);
    if (byDay.get(key)) streak++;
    else break;
    day.setDate(day.getDate() - 1);
  }
  return streak;
}

/**
 * Melhor sequência dentro da janela fornecida (por omissão 30 dias):
 * o maior número de dias consecutivos com pelo menos uma toma registada.
 */
export function computeBestStreak(recent: MedicationLog[], windowDays = 30): number {
  const days = new Set(recent.filter(l => l.takenAt).map(l => l.loggedDate));
  let best = 0;
  for (let i = 0; i < windowDays; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (!days.has(todayKey(d))) continue;
    let run = 0;
    const cur = new Date(d);
    while (days.has(todayKey(cur)) && run < windowDays) {
      run++;
      cur.setDate(cur.getDate() - 1);
    }
    if (run > best) best = run;
  }
  return best;
}

/**
 * Adesão dos últimos 7 dias: tomas registadas vs. doses planeadas
 * (número de medicamentos do plano × 7 dias). Apenas tomas ligadas a
 * receita contam para o numerador — registos ad-hoc não fazem parte do plano.
 */
export function weekAdherence(
  recent: MedicationLog[],
  plannedCount: number,
): { taken: number; planned: number; pct: number | null } {
  const planned = plannedCount * 7;
  if (plannedCount <= 0 || planned <= 0) return { taken: 0, planned: 0, pct: null };
  const since = dayKeyOffset(6);
  const taken = recent.filter(
    l => l.takenAt && l.prescriptionItemId && l.loggedDate >= since,
  ).length;
  const pct = Math.max(0, Math.min(100, Math.round((taken / planned) * 100)));
  return { taken, planned, pct };
}

// ─── Internos ───────────────────────────────────────────────────────────

function fromRow(row: Record<string, unknown>): MedicationLog {
  return {
    id: row.id as string,
    loggedDate: (row.logged_date as string) ?? todayKey(),
    prescriptionItemId: (row.prescription_item_id as string | null) ?? null,
    medicationName: (row.medication_name as string | null) ?? null,
    dosage: (row.dosage as string | null) ?? null,
    takenAt: (row.taken_at as string | null) ?? null,
    skipped: Boolean(row.skipped),
    skippedReason: (row.skipped_reason as string | null) ?? null,
  };
}

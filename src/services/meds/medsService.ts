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

// ─── Fila offline de escritas (replay automático ao voltar a rede) ──────
// Sem internet, um toque em "tomei" continuava a falhar e o registo perdia-
// se. Agora a escrita fica em fila no dispositivo, o UI mantém o estado
// optimista e a fila é reenviada sozinha quando a rede regressa.

const PENDING_KEY = 'medwallet.meds.pending.v1';

type PendingWrite =
  | { kind: 'upsert'; row: Record<string, unknown>; onConflict: string }
  | { kind: 'insert'; row: Record<string, unknown> }
  | { kind: 'update'; id: string; patch: Record<string, unknown> }
  | { kind: 'delete'; id: string };

function readPending(): PendingWrite[] {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { writes?: PendingWrite[] };
    return Array.isArray(parsed.writes) ? parsed.writes : [];
  } catch {
    return [];
  }
}

function writePending(list: PendingWrite[]) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ writes: list, savedAt: new Date().toISOString() }));
  } catch {
    // storage cheio/indisponível — silencioso
  }
}

function enqueuePending(w: PendingWrite) {
  const list = readPending();
  list.push(w);
  writePending(list);
  try {
    window.dispatchEvent(new CustomEvent('meds:pending-sync', { detail: { pending: list.length } }));
  } catch {
    // ambiente sem window (testes) — silencioso
  }
}

/** Nº de escritas à espera de rede (para badges no UI). */
export function pendingMedsWrites(): number {
  return readPending().length;
}

/**
 * True quando o erro parece falha de rede (e não violação de RLS/negócio) —
 * só nestes casos a escrita entra na fila offline.
 */
function looksOffline(err: unknown): boolean {
  try {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  } catch {
    // navigator indisponível — segue para a inspecção da mensagem
  }
  const msg = String((err as { message?: string })?.message ?? err ?? '').toLowerCase();
  return /failed to fetch|fetch failed|load failed|networkerror|network error|err_(name|internet|connection)|timed?\s?out|aborted/.test(msg);
}

async function replayOp(w: PendingWrite): Promise<void> {
  if (w.kind === 'upsert') {
    const { error } = await logsDb().upsert(w.row, { onConflict: w.onConflict });
    if (error) throw error;
    return;
  }
  if (w.kind === 'insert') {
    const { error } = await logsDb().insert(w.row);
    if (error) throw error;
    return;
  }
  if (w.kind === 'update') {
    const { error } = await logsDb().update(w.patch).eq('id', w.id);
    if (error) throw error;
    return;
  }
  const { error } = await logsDb().delete().eq('id', w.id);
  if (error) throw error;
}

/**
 * Reenvia as escritas feitas offline. Chamado ao arrancar, no evento
 * 'online' e quando a aba volta a ficar visível. Devolve o nº reenviado.
 * Erros que NÃO são de rede (ex.: violação de política) são descartados
 * com aviso — nunca ficam presos na fila para sempre.
 */
export async function flushPendingWrites(): Promise<number> {
  const list = readPending();
  if (list.length === 0) return 0;
  const remaining: PendingWrite[] = [];
  let sent = 0;
  for (const w of list) {
    try {
      await replayOp(w);
      sent++;
    } catch (err) {
      if (looksOffline(err)) remaining.push(w);
      else logger.warn('meds: escrita pendente descartada (erro não-offline)', err);
    }
  }
  writePending(remaining);
  return sent;
}

// Liga o replay automático: volta de rede, aba visível outra vez e arranque.
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { void flushPendingWrites(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void flushPendingWrites();
  });
  // Arranque: flush suave, sem bloquear o primeiro render.
  setTimeout(() => { void flushPendingWrites(); }, 2500);
}

/**
 * Aplica uma mutação às duas caches de registos (hoje + histórico) para que
 * uma escrita feita offline seja imediatamente visível em leituras offline.
 */
function patchLogsCaches(mutate: (logs: MedicationLog[]) => MedicationLog[]) {
  for (const key of [LOGS_TODAY_KEY, LOGS_RECENT_KEY]) {
    writeLogsCache(key, mutate(readLogsCache(key)));
  }
}

let pendingSeq = 0;
function tempId(): string {
  pendingSeq = (pendingSeq + 1) % 100000;
  return `pending-${Date.now()}-${pendingSeq}`;
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
  const row = {
    user_id: uid,
    prescription_item_id: opts.prescriptionItemId,
    medication_name: opts.name,
    ...(opts.dosage ? { dosage: opts.dosage } : {}),
    logged_date: todayKey(),
    taken_at: opts.taken ? new Date().toISOString() : null,
    skipped: false,
  };
  try {
    const { error } = await logsDb()
      .upsert(row, { onConflict: 'user_id,prescription_item_id,logged_date' });
    if (error) throw error;
  } catch (err) {
    if (!looksOffline(err)) throw err;
    // Offline: fila + espelho nas caches — o toque nunca se perde.
    enqueuePending({ kind: 'upsert', row, onConflict: 'user_id,prescription_item_id,logged_date' });
    const day = row.logged_date as string;
    patchLogsCaches(logs => {
      const idx = logs.findIndex(l => l.prescriptionItemId === opts.prescriptionItemId && l.loggedDate === day);
      if (idx >= 0) {
        const next = [...logs];
        next[idx] = { ...next[idx], takenAt: (row.taken_at as string | null) ?? null, skipped: false, skippedReason: null };
        return next;
      }
      return [...logs, {
        id: tempId(),
        loggedDate: day,
        prescriptionItemId: opts.prescriptionItemId,
        medicationName: opts.name,
        dosage: opts.dosage ?? null,
        takenAt: (row.taken_at as string | null) ?? null,
        skipped: false,
        skippedReason: null,
      }];
    });
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
  const row = {
    user_id: uid,
    prescription_item_id: opts.prescriptionItemId,
    medication_name: opts.name,
    logged_date: todayKey(),
    taken_at: null,
    skipped: true,
    ...(opts.reason ? { skipped_reason: opts.reason } : {}),
  };
  try {
    const { error } = await logsDb()
      .upsert(row, { onConflict: 'user_id,prescription_item_id,logged_date' });
    if (error) throw error;
  } catch (err) {
    if (!looksOffline(err)) throw err;
    enqueuePending({ kind: 'upsert', row, onConflict: 'user_id,prescription_item_id,logged_date' });
    const day = row.logged_date as string;
    patchLogsCaches(logs => {
      const idx = logs.findIndex(l => l.prescriptionItemId === opts.prescriptionItemId && l.loggedDate === day);
      if (idx >= 0) {
        const next = [...logs];
        next[idx] = { ...next[idx], takenAt: null, skipped: true, skippedReason: opts.reason ?? null };
        return next;
      }
      return [...logs, {
        id: tempId(),
        loggedDate: day,
        prescriptionItemId: opts.prescriptionItemId,
        medicationName: opts.name,
        dosage: null,
        takenAt: null,
        skipped: true,
        skippedReason: opts.reason ?? null,
      }];
    });
  }
}

/** Adiciona medicação ad-hoc (sem receita) para hoje. */
export async function addAdHoc(opts: {
  name: string;
  dosage?: string;
}): Promise<void> {
  const uid = await currentUserId();
  if (!uid) return;
  const row = {
    user_id: uid,
    medication_name: opts.name,
    ...(opts.dosage && opts.dosage.trim() ? { dosage: opts.dosage.trim() } : {}),
    logged_date: todayKey(),
  };
  try {
    const { error } = await logsDb().insert(row);
    if (error) throw error;
  } catch (err) {
    if (!looksOffline(err)) throw err;
    enqueuePending({ kind: 'insert', row });
    const day = row.logged_date as string;
    patchLogsCaches(logs => [...logs, {
      id: tempId(),
      loggedDate: day,
      prescriptionItemId: null,
      medicationName: opts.name,
      dosage: (row as { dosage?: string }).dosage ?? null,
      takenAt: null,
      skipped: false,
      skippedReason: null,
    }]);
  }
}

/** Remove um registo ad-hoc. */
export async function removeAdHoc(logId: string): Promise<void> {
  try {
    const { error } = await logsDb()
      .delete()
      .eq('id', logId);
    if (error) throw error;
  } catch (err) {
    if (!looksOffline(err)) throw err;
    // Id temporário (criado offline) só existe nas caches — nada a reenviar.
    if (!logId.startsWith('pending-')) {
      enqueuePending({ kind: 'delete', id: logId });
    }
    patchLogsCaches(logs => logs.filter(l => l.id !== logId));
  }
}

/** Marca/desmarca um registo ad-hoc existente. */
export async function toggleAdHoc(log: MedicationLog): Promise<void> {
  const taken = !log.takenAt;
  const patch = { taken_at: taken ? new Date().toISOString() : null, skipped: false };
  try {
    const { error } = await logsDb()
      .update(patch)
      .eq('id', log.id);
    if (error) throw error;
  } catch (err) {
    if (!looksOffline(err)) throw err;
    // Id temporário (criado offline): o replay do insert original já leva
    // o estado — só actualizar as caches locais.
    if (!log.id.startsWith('pending-')) {
      enqueuePending({ kind: 'update', id: log.id, patch });
    }
    patchLogsCaches(logs => logs.map(l =>
      l.id === log.id
        ? { ...l, takenAt: (patch.taken_at as string | null) ?? null, skipped: false, skippedReason: null }
        : l,
    ));
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

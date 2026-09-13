/**
 * Meds Reminders — lembretes de medicação por notificação do navegador
 * (paridade com lib/core/reminders/meds_reminder_service.dart do app).
 *
 * Enquanto a MedWallet estiver aberta (aba ou PWA activa), um relógio
 * verifica de minuto a minuto as horas de toma derivadas da frequência
 * da receita e dispara uma notificação do sistema para cada dose ainda
 * não marcada como tomada. Sem servidores novos: usa a Notification API
 * do navegador e o plano guardado em cache (funciona offline).
 */

import { logger } from '@/lib/logger';
import { fetchPlanned, fetchDay, isTaken, todayKey, type PlannedMedication } from './medsService';

// ─── Horas de toma (mapeamento idêntico ao app) ─────────────────────────

/**
 * Horas do dia (0–23) derivadas da frequência textual da receita.
 *   "3x ao dia"        → 08:00 · 14:00 · 20:00
 *   "2x ao dia"        → 08:00 · 20:00
 *   "a cada 8 horas"   → 08:00 · 16:00
 *   "a cada 6 horas"   → 08:00 · 14:00 · 20:00 · 02:00
 *   "a cada 12 horas"  → 08:00 · 20:00
 *   "à noite"          → 21:00
 *   "de manhã"         → 08:00
 *   outro/sem frequência → 08:00
 */
export function hoursForFrequency(frequency?: string | null): number[] {
  const f = (frequency ?? '').toLowerCase();
  if (f.includes('3x') || f.includes('3 vezes') || f.includes('terci')) return [8, 14, 20];
  if (f.includes('2x') || f.includes('2 vezes') || f.includes('duas')) return [8, 20];
  if (f.includes('8 horas')) return [8, 16];
  if (f.includes('6 horas')) return [8, 14, 20, 2];
  if (f.includes('12 horas')) return [8, 20];
  if (f.includes('noite') || f.includes('dormir')) return [21];
  if (f.includes('manhã') || f.includes('manha')) return [8];
  return [8];
}

/** Rótulo curto da frequência para chips na UI. */
export function frequencyLabel(frequency?: string | null): string {
  const hours = hoursForFrequency(frequency);
  const byHours: Record<string, string> = {
    '8': '1x ao dia',
    '8,20': '2x ao dia',
    '8,14,20': '3x ao dia',
    '8,16': 'A cada 8 horas',
    '8,14,20,2': 'A cada 6 horas',
    '21': 'À noite',
  };
  return byHours[hours.join(',')] ?? (frequency?.trim() || '1x ao dia');
}

/** Próximas doses de hoje (hora ≤ 24), por ordem cronológica. */
export function nextDoses(meds: PlannedMedication[], now = new Date()): Array<{ at: string; name: string }> {
  const out: Array<{ at: string; name: string; minutes: number }> = [];
  for (const med of meds.slice(0, 12)) {
    for (const h of hoursForFrequency(med.frequency)) {
      const minutes = h * 60;
      if (minutes >= now.getHours() * 60 + now.getMinutes()) {
        out.push({
          at: `${String(h).padStart(2, '0')}:00`,
          name: med.name,
          minutes,
        });
      }
    }
  }
  return out
    .sort((a, b) => a.minutes - b.minutes)
    .slice(0, 4)
    .map(({ at, name }) => ({ at, name }));
}

// ─── Preferência (ligado/desligado) ─────────────────────────────────────

const ENABLED_KEY = 'medwallet.meds_reminders.enabled';

export function remindersEnabled(): boolean {
  try {
    return localStorage.getItem(ENABLED_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function setRemindersEnabled(value: boolean): void {
  try {
    localStorage.setItem(ENABLED_KEY, value ? 'true' : 'false');
  } catch {
    // ignore
  }
  if (!value) stopScheduler();
  else void startScheduler();
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

/** Pede permissão ao utilizador (deve partir de um gesto do utilizador). */
export async function requestPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch (err) {
    logger.warn('[meds-reminders] requestPermission falhou', err);
    return Notification.permission;
  }
}

// ─── Agendador (relógio em execução enquanto a app estiver aberta) ──────

const DEDUPE_PREFIX = 'medwallet.meds_notified.'; // + yyyy-mm-dd + '.' + hour + '.' + itemId
const TICK_MS = 30_000;
/** Janela (em minutos) dentro da hora em que o lembrete pode disparar. */
const FIRE_WINDOW_MIN = 5;

let tickTimer: ReturnType<typeof setInterval> | null = null;
let currentMeds: PlannedMedication[] = [];
let starting: Promise<void> | null = null;

function alreadyNotified(dateKey: string, hour: number, itemId: string): boolean {
  try {
    return localStorage.getItem(`${DEDUPE_PREFIX}${dateKey}.${hour}.${itemId}`) === '1';
  } catch {
    return false;
  }
}

function markNotified(dateKey: string, hour: number, itemId: string): void {
  try {
    localStorage.setItem(`${DEDUPE_PREFIX}${dateKey}.${hour}.${itemId}`, '1');
  } catch {
    // ignore
  }
}

function pruneDedupeKeys(): void {
  // remove chaves de dias anteriores para o localStorage não crescer
  try {
    const today = todayKey();
    const stale: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(DEDUPE_PREFIX) && !k.includes(today)) stale.push(k);
    }
    stale.forEach(k => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

/** Dispara uma notificação do sistema (silencioso se bloqueada). */
export function showMedNotification(title: string, body: string, silent = false): boolean {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return false;
  if (Notification.permission !== 'granted') return false;
  try {
    const n = new Notification(title, {
      body,
      tag: silent ? undefined : 'medwallet-meds',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
    });
    n.onclick = () => {
      window.focus();
      if (!window.location.pathname.startsWith('/health/meds')) {
        window.location.assign('/health/meds');
      }
    };
    return true;
  } catch (err) {
    // Alguns navegadores exigem ServiceWorkerRegistration.showNotification
    logger.warn('[meds-reminders] new Notification falhou', err);
    return false;
  }
}

/** Notificação de demonstração (botão "Testar"). */
export function testNotification(): boolean {
  return showMedNotification(
    'Hora do medicamento',
    'Exemplo: Paracetamol · 500mg — abre o teu plano de medicação.',
    true,
  );
}

async function tick(): Promise<void> {
  if (!remindersEnabled()) return;
  if (typeof document !== 'undefined' && document.hidden) return; // aba escondida: poupa recursos
  const now = new Date();
  if (now.getMinutes() >= FIRE_WINDOW_MIN) return; // só nos primeiros minutos da hora

  const hour = now.getHours();
  const dateKey = todayKey(now);
  const due = currentMeds.filter(m => hoursForFrequency(m.frequency).includes(hour));
  if (due.length === 0) return;

  // consulta as tomas de hoje para não avisar o que já foi tomado
  const logs = await fetchDay(dateKey);
  const takenIds = new Set(logs.filter(isTaken).map(l => l.prescriptionItemId));

  for (const med of due) {
    if (med.prescriptionItemId && takenIds.has(med.prescriptionItemId)) continue;
    if (alreadyNotified(dateKey, hour, med.prescriptionItemId)) continue;
    const body = `${med.name}${med.dosage ? ` · ${med.dosage}` : ''} — toque para registar a toma no plano de hoje.`;
    showMedNotification('Hora do medicamento', body);
    markNotified(dateKey, hour, med.prescriptionItemId);
  }
}

/**
 * Arranca o agendador (idempotente). Chamar no mount da página Medicação
 * e no widget PillTracker da Home — cobre os pontos de entrada principais.
 */
export async function startScheduler(): Promise<void> {
  if (starting) return starting;
  if (tickTimer) {
    // já corre — só refresca a lista de medicamentos
    currentMeds = await fetchPlanned();
    return;
  }
  starting = (async () => {
    try {
      currentMeds = await fetchPlanned();
      if (notificationPermission() !== 'granted' || !remindersEnabled()) return;
      pruneDedupeKeys();
      await tick();
      tickTimer = setInterval(() => { void tick(); }, TICK_MS);
      logger.info('[meds-reminders] activo', { medicamentos: currentMeds.length });
    } catch (err) {
      logger.warn('[meds-reminders] arranque falhou', err);
    } finally {
      starting = null;
    }
  })();
  return starting;
}

/** Para o relógio (logout, preferência desligada). */
export function stopScheduler(): void {
  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
}

/** Recarrega o plano (depois de adicionar/remover medicamentos). */
export async function refreshSchedulerMeds(): Promise<void> {
  if (!tickTimer) return;
  currentMeds = await fetchPlanned();
}

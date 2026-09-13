/**
 * MedsTracker — Plano de Medicação (página completa)
 * Paridade com o ecrã /meds do app Flutter: checklist diária da receita,
 * medicação ad-hoc, streak de toma, faixa dos últimos 7 dias e
 * lembretes por notificação do navegador.
 *
 * Dados: medication_logs + prescription_items (zero alterações de backend).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Pill, Flame, BellRing, CheckCircle2, XCircle, Plus, Trash2,
  Clock, Loader2, ArrowLeft, RefreshCw, X, Check, BellOff,
} from '@/components/icons/lucide-compat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  addAdHoc, computeStreak, fetchDay, fetchPlanned, fetchRecent,
  isTaken, removeAdHoc, skipPlanned, toggleAdHoc, togglePlanned,
  todayKey, type MedicationLog, type PlannedMedication,
} from '@/services/meds/medsService';
import {
  frequencyLabel, hoursForFrequency, nextDoses, notificationPermission,
  refreshSchedulerMeds, remindersEnabled, requestPermission,
  setRemindersEnabled, showMedNotification, startScheduler, testNotification,
} from '@/services/meds/medsReminders';

const QUICK_REASONS = ['Esqueci-me', 'Estou sem o medicamento', 'Efeitos secundários', 'Já não preciso'];

const DOW_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function MedsTracker() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [planned, setPlanned] = useState<PlannedMedication[]>([]);
  const [todayLogs, setTodayLogs] = useState<MedicationLog[]>([]);
  const [recent, setRecent] = useState<MedicationLog[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // dialogs
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState('');
  const [addDosage, setAddDosage] = useState('');
  const [skipTarget, setSkipTarget] = useState<PlannedMedication | null>(null);
  const [skipReason, setSkipReason] = useState('');

  // lembretes
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>('default');
  const [enabled, setEnabled] = useState(true);
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const [p, t, r] = await Promise.all([
        fetchPlanned(),
        fetchDay(todayKey()),
        fetchRecent(30),
      ]);
      setPlanned(p);
      setTodayLogs(t);
      setRecent(r);
    } finally {
      setLoading(false);
      if (showSpinner) setRefreshing(false);
    }
  }, []);

  // carga inicial + arranque dos lembretes + relógio da UI
  useEffect(() => {
    if (!user) return;
    void load();
    setPerm(notificationPermission());
    setEnabled(remindersEnabled());
    void startScheduler();
    const clock = setInterval(() => setNow(new Date()), 30_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(clock);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user, load]);

  // ─── derivados ────────────────────────────────────────────────────────
  const takenIds = useMemo(
    () => new Set(todayLogs.filter(l => isTaken(l) && l.prescriptionItemId).map(l => l.prescriptionItemId)),
    [todayLogs],
  );
  const adHocLogs = useMemo(() => todayLogs.filter(l => !l.prescriptionItemId), [todayLogs]);
  const totalDoses = planned.length;
  const takenCount = planned.filter(p => takenIds.has(p.prescriptionItemId)).length;
  const streak = useMemo(() => computeStreak(recent), [recent]);
  const upcoming = useMemo(() => nextDoses(planned, now), [planned, now]);

  const last7 = useMemo(() => {
    const days: Array<{ key: string; label: string; taken: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = todayKey(d);
      const taken = recent.filter(l => l.loggedDate === key && isTaken(l)).length;
      days.push({ key, label: DOW_LABELS[d.getDay()], taken });
    }
    return days;
  }, [recent]);
  const maxDay = Math.max(1, ...last7.map(d => d.taken));

  // ─── ações ────────────────────────────────────────────────────────────
  const handleTogglePlanned = async (med: PlannedMedication) => {
    const taken = !takenIds.has(med.prescriptionItemId);
    setBusyId(med.prescriptionItemId);
    // optimista
    setTodayLogs(prev =>
      prev.some(l => l.prescriptionItemId === med.prescriptionItemId)
        ? prev.map(l =>
            l.prescriptionItemId === med.prescriptionItemId
              ? { ...l, taken_at: taken ? new Date().toISOString() : null, skipped: false }
              : l,
          )
        : [
            ...prev,
            {
              id: `tmp-${med.prescriptionItemId}`,
              loggedDate: todayKey(),
              prescriptionItemId: med.prescriptionItemId,
              medicationName: med.name,
              dosage: med.dosage ?? null,
              taken_at: taken ? new Date().toISOString() : null,
            },
          ],
    );
    try {
      await togglePlanned({
        prescriptionItemId: med.prescriptionItemId,
        name: med.name,
        dosage: med.dosage,
        taken,
      });
      if (taken) toast.success(`${med.name} marcado como tomado`);
      await load();
    } catch {
      toast.error('Não foi possível registar. Tenta novamente.');
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const handleSkip = async () => {
    if (!skipTarget) return;
    setBusyId(skipTarget.prescriptionItemId);
    try {
      await skipPlanned({
        prescriptionItemId: skipTarget.prescriptionItemId,
        name: skipTarget.name,
        reason: skipReason.trim() || undefined,
      });
      toast.success('Registado como "não tomei"');
      setSkipTarget(null);
      setSkipReason('');
      await load();
    } catch {
      toast.error('Não foi possível registar.');
    } finally {
      setBusyId(null);
    }
  };

  const handleAddAdHoc = async () => {
    if (!addName.trim()) return;
    try {
      await addAdHoc({ name: addName.trim(), dosage: addDosage.trim() || undefined });
      toast.success('Medicação extra adicionada a hoje');
      setAddName('');
      setAddDosage('');
      setShowAdd(false);
      await load();
      await refreshSchedulerMeds();
    } catch {
      toast.error('Não foi possível adicionar.');
    }
  };

  const handleToggleAdHoc = async (log: MedicationLog) => {
    setBusyId(log.id);
    try {
      await toggleAdHoc(log);
      await load();
    } catch {
      toast.error('Não foi possível atualizar.');
    } finally {
      setBusyId(null);
    }
  };

  const handleRemoveAdHoc = async (log: MedicationLog) => {
    setBusyId(log.id);
    try {
      await removeAdHoc(log.id);
      await load();
    } catch {
      toast.error('Não foi possível remover.');
    } finally {
      setBusyId(null);
    }
  };

  const handleEnableReminders = async () => {
    const result = await requestPermission();
    setPerm(result);
    if (result === 'granted') {
      setRemindersEnabled(true);
      setEnabled(true);
      void startScheduler();
      toast.success('Lembretes activados — avisamos na hora de cada toma');
      showMedNotification('Lembretes de medicação activos', 'Vais receber um aviso na hora de cada toma enquanto a MedWallet estiver aberta.', true);
    } else if (result === 'denied') {
      toast.error('Permissão de notificações negada no navegador.');
    }
  };

  const handleDisableReminders = () => {
    setRemindersEnabled(false);
    setEnabled(false);
    toast.info('Lembretes desligados.');
  };

  // ─── estados de guarda ────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <Pill className="h-10 w-10 text-sky-400" />
        <h1 className="text-xl font-bold">Plano de Medicação</h1>
        <p className="max-w-sm text-sm text-slate-400">
          Entra na tua conta para ver o plano diário, registar tomas e receber
          lembretes na hora certa.
        </p>
        <Button onClick={() => navigate('/auth')} className="rounded-xl bg-sky-600 hover:bg-sky-500">
          Entrar
        </Button>
      </div>
    );
  }

  const empty = !loading && planned.length === 0 && adHocLogs.length === 0;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-4">
      {/* Header */}
      <header className="flex items-center gap-3 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="rounded-xl border border-white/10 bg-white/5 p-2 transition hover:bg-white/10"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold">Medicação</h1>
          <p className="text-xs text-slate-500">Plano diário · tomas · lembretes</p>
        </div>
        <button
          onClick={() => void load(true)}
          className="rounded-xl border border-white/10 bg-white/5 p-2 transition hover:bg-white/10"
          aria-label="Atualizar"
        >
          <RefreshCw className={cn('h-5 w-5 text-slate-300', refreshing && 'animate-spin')} />
        </button>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-24" role="status" aria-busy="true">
          <Loader2 className="h-7 w-7 animate-spin text-sky-500" />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Hero: streak + progresso de hoje */}
          <section className="rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-600/20 to-slate-900 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400">Hoje</p>
                <p className="mt-1 text-2xl font-bold">
                  {takenCount} de {totalDoses}{' '}
                  <span className="text-sm font-medium text-slate-400">tomas registadas</span>
                </p>
                <div className="mt-2 h-2 w-40 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-sky-500"
                    initial={{ width: 0 }}
                    animate={{ width: totalDoses === 0 ? 0 : `${(takenCount / totalDoses) * 100}%` }}
                    transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                  />
                </div>
              </div>
              <div className="shrink-0 rounded-xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-center">
                <Flame className="mx-auto h-5 w-5 text-orange-400" />
                <p className="mt-1 text-xl font-bold text-orange-300">{streak}</p>
                <p className="text-[10px] uppercase tracking-wide text-orange-400/80">
                  {streak === 1 ? 'dia seguido' : 'dias seguidos'}
                </p>
              </div>
            </div>
          </section>

          {/* Lembretes */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 font-semibold">
                  <BellRing className="h-4 w-4 text-sky-400" /> Lembretes de toma
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {perm === 'granted' && enabled
                    ? 'Activos — avisamos na hora de cada toma enquanto a MedWallet estiver aberta (aba ou app instalada).'
                    : perm === 'unsupported'
                      ? 'Este navegador não suporta notificações. Instala a app para lembretes mesmo com a MedWallet fechada.'
                      : perm === 'denied'
                        ? 'Notificações bloqueadas nas permissões do navegador — desbloqueia no cadeado do endereço.'
                        : 'Recebe um aviso do sistema na hora de cada toma, com as horas calculadas a partir da frequência da receita.'}
                </p>
              </div>
              {perm === 'granted' && enabled ? (
                <button
                  onClick={handleDisableReminders}
                  className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
                >
                  <BellOff className="mr-1 inline h-3.5 w-3.5" /> Desligar
                </button>
              ) : perm !== 'unsupported' ? (
                <Button
                  onClick={handleEnableReminders}
                  className="shrink-0 rounded-xl bg-sky-600 hover:bg-sky-500"
                  disabled={perm === 'denied'}
                >
                  <BellRing className="mr-1.5 h-4 w-4" /> Activar
                </Button>
              ) : null}
            </div>

            {upcoming.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2" aria-label="Próximas doses">
                {upcoming.map((d, i) => (
                  <span
                    key={`${d.at}-${i}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300"
                  >
                    <Clock className="h-3 w-3" /> {d.at} · {d.name}
                  </span>
                ))}
              </div>
            )}

            {perm === 'granted' && (
              <button
                onClick={() => {
                  const ok = testNotification();
                  toast[ok ? 'info' : 'error'](ok ? 'Notificação de teste enviada.' : 'O navegador bloqueou a notificação.');
                }}
                className="mt-3 text-xs font-semibold text-sky-400 underline-offset-4 hover:underline"
              >
                Enviar notificação de teste
              </button>
            )}
          </section>

          {/* Checklist do plano */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Plano de hoje
              </h3>
              <button
                onClick={() => setShowAdd(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
              >
                <Plus className="h-3.5 w-3.5" /> Medicação extra
              </button>
            </div>

            {empty ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
                <div className="text-4xl">💊</div>
                <p className="mt-2 font-semibold">Sem medicação no plano</p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-slate-400">
                  Quando um profissional de saúde te emitir uma receita na MedWallet,
                  os medicamentos aparecem aqui automaticamente com lembretes.
                </p>
                <Button
                  className="mt-4 rounded-xl bg-sky-600 hover:bg-sky-500"
                  onClick={() => navigate('/health/prescriptions')}
                >
                  Ver as minhas receitas
                </Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {planned.map((med, idx) => {
                  const taken = takenIds.has(med.prescriptionItemId);
                  const skippedLog = todayLogs.find(
                    l => l.prescriptionItemId === med.prescriptionItemId && l.skipped,
                  );
                  const busy = busyId === med.prescriptionItemId;
                  return (
                    <motion.li
                      key={med.prescriptionItemId}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                    >
                      <div
                        className={cn(
                          'rounded-2xl border p-4 transition',
                          taken
                            ? 'border-emerald-500/30 bg-emerald-500/10'
                            : skippedLog
                              ? 'border-amber-500/20 bg-amber-500/5'
                              : 'border-white/10 bg-white/5',
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => void handleTogglePlanned(med)}
                            disabled={busy}
                            className={cn(
                              'mt-0.5 shrink-0 rounded-full p-1 transition disabled:opacity-50',
                              taken ? 'bg-emerald-500/20' : 'bg-white/5 hover:bg-white/10',
                            )}
                            aria-label={taken ? `Desmarcar ${med.name}` : `Marcar ${med.name} como tomado`}
                            aria-pressed={taken}
                          >
                            {taken ? (
                              <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                            ) : (
                              <span className="block h-6 w-6 rounded-full border-2 border-slate-500" />
                            )}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className={cn('truncate font-semibold', taken && 'text-emerald-300')}>
                              {med.name}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              {med.dosage && (
                                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                                  {med.dosage}
                                </span>
                              )}
                              <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                                {frequencyLabel(med.frequency)}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {hoursForFrequency(med.frequency).map(h => `${String(h).padStart(2, '0')}:00`).join(' · ')}
                              </span>
                            </div>
                            {skippedLog && (
                              <p className="mt-1.5 text-xs text-amber-400/90">
                                Não tomei{skippedLog.skippedReason ? ` — ${skippedLog.skippedReason}` : ''}
                              </p>
                            )}
                          </div>
                          {!taken && (
                            <button
                              onClick={() => { setSkipTarget(med); setSkipReason(''); }}
                              className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 transition hover:bg-white/5 hover:text-amber-400"
                              disabled={busy}
                            >
                              Não tomei
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.li>
                  );
                })}

                {/* Ad-hoc de hoje */}
                {adHocLogs.map(log => {
                  const taken = isTaken(log);
                  const busy = busyId === log.id;
                  return (
                    <li key={log.id}>
                      <div
                        className={cn(
                          'rounded-2xl border p-4 transition',
                          taken ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-dashed border-white/15 bg-white/5',
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => void handleToggleAdHoc(log)}
                            disabled={busy}
                            className="mt-0.5 shrink-0 disabled:opacity-50"
                            aria-label={taken ? `Desmarcar ${log.medicationName}` : `Marcar ${log.medicationName} como tomado`}
                            aria-pressed={taken}
                          >
                            {taken ? (
                              <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                            ) : (
                              <span className="block h-6 w-6 rounded-full border-2 border-slate-500" />
                            )}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className={cn('truncate font-semibold', taken && 'text-emerald-300')}>
                              {log.medicationName}
                              <span className="ml-2 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                                extra
                              </span>
                            </p>
                            {log.dosage && (
                              <p className="text-xs text-slate-400">{log.dosage}</p>
                            )}
                          </div>
                          <button
                            onClick={() => void handleRemoveAdHoc(log)}
                            disabled={busy}
                            className="shrink-0 rounded-lg p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-rose-400"
                            aria-label={`Remover ${log.medicationName}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Últimos 7 dias */}
          {!empty && (
            <section>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                Últimos 7 dias
              </h3>
              <div className="flex items-end justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                {last7.map((d, i) => (
                  <div key={d.key} className="flex flex-1 flex-col items-center gap-1.5">
                    <div className="flex h-16 w-full items-end justify-center">
                      <motion.div
                        className={cn(
                          'w-6 rounded-t-md',
                          i === 6 ? 'bg-sky-500' : 'bg-sky-500/40',
                        )}
                        initial={{ height: 4 }}
                        animate={{ height: Math.max(4, (d.taken / maxDay) * 60) }}
                        transition={{ delay: i * 0.05, type: 'spring', stiffness: 120, damping: 18 }}
                        title={`${d.taken} tomas`}
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400">{d.label}</span>
                    <span className="text-[10px] text-slate-600">{d.taken > 0 ? d.taken : '·'}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Dialog: medicação extra */}
      {showAdd && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Adicionar medicação extra"
          onClick={() => setShowAdd(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-bold">
                <Pill className="h-4 w-4 text-sky-400" /> Medicação extra
              </h3>
              <button onClick={() => setShowAdd(false)} aria-label="Fechar" className="rounded-lg p-1 hover:bg-white/5">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Sem receita na MedWallet? Regista aqui e marca a toma de hoje.
            </p>
            <div className="mt-4 space-y-3">
              <Input
                value={addName}
                onChange={e => setAddName(e.target.value)}
                placeholder="Nome do medicamento *"
                aria-label="Nome do medicamento"
                autoFocus
              />
              <Input
                value={addDosage}
                onChange={e => setAddDosage(e.target.value)}
                placeholder="Dose (ex.: 500mg)"
                aria-label="Dose"
              />
              <Button
                onClick={() => void handleAddAdHoc()}
                disabled={!addName.trim()}
                className="w-full rounded-xl bg-sky-600 hover:bg-sky-500"
              >
                <Check className="mr-1.5 h-4 w-4" /> Adicionar a hoje
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Dialog: não tomei */}
      {skipTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Registar que não tomou o medicamento"
          onClick={() => setSkipTarget(null)}
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-bold">
                <XCircle className="h-4 w-4 text-amber-400" /> Não tomei
              </h3>
              <button onClick={() => setSkipTarget(null)} aria-label="Fechar" className="rounded-lg p-1 hover:bg-white/5">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-sm text-slate-300">{skipTarget.name}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {QUICK_REASONS.map(r => (
                <button
                  key={r}
                  onClick={() => setSkipReason(r)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                    skipReason === r
                      ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10',
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
            <Input
              className="mt-3"
              value={skipReason}
              onChange={e => setSkipReason(e.target.value)}
              placeholder="Outra razão (opcional)"
              aria-label="Outra razão"
            />
            <Button
              onClick={() => void handleSkip()}
              className="mt-4 w-full rounded-xl bg-amber-600 hover:bg-amber-500"
            >
              Registar
            </Button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

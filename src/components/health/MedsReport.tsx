/**
 * MedsReport — Relatório de adesão à medicação (últimos 30 dias).
 *
 * Usa a ReportShell genérica (portal + folha A4 + "Guardar como PDF"
 * via window.print() — ZERO dependências novas).
 *
 * Honestidade de dados (padrão F24/F25): consistência baseada apenas em
 * registos reais; dias sem registo nunca são apresentados como falhas.
 */

import { useMemo } from 'react';
import { ReportBrand, ReportFooter, ReportShell } from '@/components/health/ReportShell';
import { frequencyLabel } from '@/services/meds/medsReminders';
import { todayKey, type MedicationLog, type PlannedMedication } from '@/services/meds/medsService';

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** "5 Set 2026" a partir de yyyy-mm-dd (sem desvio de fuso). */
function fmtFull(key: string): string {
  const d = parseKey(key);
  return `${d.getDate()} ${MONTHS_PT[d.getMonth()]} ${d.getFullYear()}`;
}

/** "5 Set" a partir de yyyy-mm-dd. */
function fmtShort(key: string): string {
  const d = parseKey(key);
  return `${d.getDate()} ${MONTHS_PT[d.getMonth()]}`;
}

function fmtFullDate(d: Date): string {
  return `${d.getDate()} ${MONTHS_PT[d.getMonth()]} ${d.getFullYear()}`;
}

interface ReportProps {
  open: boolean;
  onClose: () => void;
  planned: PlannedMedication[];
  recent: MedicationLog[];
  adherence: { pct: number | null; taken: number; planned: number };
  streak: number;
  bestStreak: number;
}

export function MedsReport({ open, onClose, planned, recent, adherence, streak, bestStreak }: ReportProps) {
  const data = useMemo(() => {
    const todayStr = todayKey();
    const dayMs = 86_400_000;

    // Janela de 30 dias: chaves + contagens por dia (só tomas reais).
    const days: Array<{ key: string; taken: number }> = [];
    const start = new Date();
    start.setDate(start.getDate() - 29);
    const startKey = todayKey(start);
    const byDay = new Map<string, number>();
    let taken30 = 0;
    for (const l of recent) {
      if (!l.takenAt || l.loggedDate < startKey || l.loggedDate > todayStr) continue;
      byDay.set(l.loggedDate, (byDay.get(l.loggedDate) ?? 0) + 1);
      taken30++;
    }
    let maxDay = 0;
    for (const v of byDay.values()) maxDay = Math.max(maxDay, v);
    for (let i = 0; i < 30; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = todayKey(d);
      days.push({ key, taken: byDay.get(key) ?? 0 });
    }

    // Por medicamento — mesma métrica de consistência da página (F25).
    const meds = planned.map(med => {
      const daySet = new Set(
        recent.filter(l => l.prescriptionItemId === med.prescriptionItemId && l.takenAt).map(l => l.loggedDate),
      );
      const sorted = [...daySet].sort();
      const first = sorted[0] ?? null;
      const last = sorted[sorted.length - 1] ?? null;
      let span = 1;
      if (first) {
        span = Math.min(84, Math.max(1, Math.round((Date.parse(todayStr) - Date.parse(first)) / dayMs) + 1));
      }
      const pct = first ? Math.round((daySet.size / span) * 100) : null;
      return { med, count: daySet.size, pct, last };
    });

    return { days, maxDay, taken30, meds, startKey, todayStr, generated: fmtFullDate(new Date()) };
  }, [planned, recent]);

  // Nível de cor do dia (tema claro, fiel à impressão).
  const dayLevel = (taken: number): 0 | 1 | 2 | 3 | 4 => {
    if (taken === 0 || data.maxDay === 0) return 0;
    const r = taken / data.maxDay;
    return r <= 0.34 ? 1 : r <= 0.67 ? 2 : r < 1 ? 3 : 4;
  };
  const DAY_STYLES = [
    'bg-slate-100',
    'bg-sky-200',
    'bg-sky-300',
    'bg-sky-500',
    'bg-sky-700',
  ] as const;

  const pctClass = (pct: number) =>
    pct >= 80 ? 'text-emerald-700' : pct >= 50 ? 'text-amber-700' : 'text-rose-700';

  const hasData = data.taken30 > 0;

  return (
    <ReportShell open={open} onClose={onClose} label="Relatório de adesão à medicação">
      {/* Cabeçalho */}
      <ReportBrand
        title="Relatório de adesão à medicação"
        meta={
          <>
            <p className="font-semibold text-slate-700">Período</p>
            <p>{fmtFull(data.startKey)} — {fmtFull(data.todayStr)}</p>
            <p className="mt-1">Gerado em {data.generated}</p>
          </>
        }
      />

      {/* Resumo */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Tomas registadas · 30 dias', value: String(data.taken30), tone: 'text-sky-700' },
          {
            label: 'Adesão · 7 dias',
            value: adherence.pct === null ? '—' : `${adherence.pct}%`,
            tone: 'text-sky-700',
          },
          { label: 'Sequência actual', value: `${streak} ${streak === 1 ? 'dia' : 'dias'}`, tone: 'text-slate-900' },
          { label: 'Melhor sequência · 30 dias', value: `${bestStreak} ${bestStreak === 1 ? 'dia' : 'dias'}`, tone: 'text-slate-900' },
        ].map(c => (
          <div key={c.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{c.label}</p>
            <p className={`mt-1 text-xl font-bold leading-tight ${c.tone}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Registos diários */}
      <h4 className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-500">
        Registos diários · últimos 30 dias
      </h4>
      <div className="mt-2 grid grid-cols-10 gap-1.5">
        {data.days.map(d => {
          const level = dayLevel(d.taken);
          const isToday = d.key === data.todayStr;
          const dt = parseKey(d.key);
          return (
            <div key={d.key} className="flex flex-col items-center gap-0.5">
              <div
                title={`${fmtShort(d.key)} — ${d.taken === 0 ? 'sem registo' : `${d.taken} ${d.taken === 1 ? 'toma' : 'tomas'}`}`}
                className={`h-5 w-full rounded-md ${DAY_STYLES[level]}${isToday ? ' ring-2 ring-sky-800' : ''}`}
              />
              <span className="text-[8px] text-slate-400">{dt.getDate()}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex items-center justify-end gap-1">
        <span className="text-[9px] text-slate-500">menos</span>
        {DAY_STYLES.map((s, i) => (
          <span key={i} className={`h-2 w-3 rounded-sm ${s}`} />
        ))}
        <span className="text-[9px] text-slate-500">mais</span>
      </div>

      {/* Por medicamento */}
      <h4 className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-500">
        Por medicamento
      </h4>
      {data.meds.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">Sem medicamentos no plano de medicação.</p>
      ) : (
        <table className="mt-2 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-left text-[10px] uppercase tracking-wide text-slate-500">
              <th className="py-2 pr-2 font-semibold">Medicamento</th>
              <th className="py-2 pr-2 text-right font-semibold">Tomas</th>
              <th className="py-2 pr-2 text-right font-semibold">Consistência</th>
              <th className="py-2 text-right font-semibold">Última toma</th>
            </tr>
          </thead>
          <tbody>
            {data.meds.map(({ med, count, pct, last }) => (
              <tr key={med.prescriptionItemId} className="border-b border-slate-100">
                <td className="py-2.5 pr-2">
                  <p className="font-semibold leading-tight">{med.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {[med.dosage, frequencyLabel(med.frequency)].filter(Boolean).join(' · ')}
                  </p>
                </td>
                <td className="py-2.5 pr-2 text-right tabular-nums">{count}</td>
                <td className={`py-2.5 pr-2 text-right font-bold tabular-nums ${pct !== null ? pctClass(pct) : 'text-slate-400'}`}>
                  {pct === null ? '—' : `${pct}%`}
                </td>
                <td className="py-2.5 text-right text-slate-600">
                  {last === null ? 'sem registo' : last === data.todayStr ? 'hoje' : fmtShort(last)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Notas + rodapé */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">
        <p>
          <span className="font-semibold text-slate-700">Como ler este relatório:</span> a consistência é
          dias com toma registada ÷ dias desde o 1.º registo (máx. 84 dias). Dias sem registo não são
          contados como falhas — o plano no passado pode ter sido diferente. Adesão de 7 dias = tomas
          registadas ÷ tomas planeadas nos últimos 7 dias.
        </p>
      </div>
      {!hasData && (
        <p className="mt-2 text-[11px] text-slate-500">
          Ainda sem tomas registadas neste período — o relatório ganha conteúdo à medida que marcas as tuas tomas.
        </p>
      )}
      <ReportFooter />
    </ReportShell>
  );
}

/**
 * MedsHeatmap — mapa de adesão tipo "calendário" das últimas N semanas
 * (padrão visual GitHub contributions, paleta sky do app).
 *
 * Cada coluna = 1 semana (Seg → Dom); a cor do quadrado mostra quantas
 * tomas registadas houve no dia (relativo ao dia mais forte da janela).
 * Dias sem registos ficam neutros — não afirmamos "falhou", porque o plano
 * histórico pode ter sido diferente.
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays } from '@/components/icons/lucide-compat';
import { todayKey, type MedicationLog } from '@/services/meds/medsService';

const WEEKS = 12;
const CELL = 14; // px — quadrado + gap 3

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
// Semana começa na segunda (PT): S T Q Q S S D
const DOW_LABELS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

const LEVEL_STYLES = [
  'bg-white/5 border border-white/5', // sem registos
  'bg-sky-500/25',
  'bg-sky-500/45',
  'bg-sky-500/70',
  'bg-sky-400',
];

interface DayCell {
  key: string; // yyyy-mm-dd
  count: number;
  level: number; // 0..4
  future: boolean;
}

function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function MedsHeatmap({ logs, weeks = WEEKS }: { logs: MedicationLog[]; weeks?: number }) {
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of logs) {
      if (l.takenAt) m.set(l.loggedDate, (m.get(l.loggedDate) ?? 0) + 1);
    }
    return m;
  }, [logs]);

  const { columns, monthLabels, maxTaken } = useMemo(() => {
    const today = new Date();
    const todayStr = todayKey(today);

    // Segunda-feira da semana actual
    const monday = new Date(today);
    const dow = (monday.getDay() + 6) % 7; // 0 = Seg
    monday.setDate(monday.getDate() - dow);

    // Início da janela: (weeks-1) semanas antes
    const start = new Date(monday);
    start.setDate(start.getDate() - (weeks - 1) * 7);

    let maxTaken = 0;
    for (const v of counts.values()) maxTaken = Math.max(maxTaken, v);

    const cols: DayCell[][] = [];
    const labels: Array<{ index: number; label: string } | null> = [];
    let lastMonth = -1;

    for (let w = 0; w < weeks; w++) {
      const col: DayCell[] = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(start);
        day.setDate(start.getDate() + w * 7 + d);
        const key = dateKey(day);
        const future = key > todayStr;
        const count = future ? 0 : (counts.get(key) ?? 0);
        const ratio = maxTaken > 0 ? count / maxTaken : 0;
        const level = future || count === 0 ? 0 : ratio <= 0.34 ? 1 : ratio <= 0.67 ? 2 : ratio < 1 ? 3 : 4;
        col.push({ key, count, level, future });
      }
      const mondayKey = new Date(start);
      mondayKey.setDate(start.getDate() + w * 7);
      const month = mondayKey.getMonth();
      labels.push(month !== lastMonth ? { index: w, label: MONTHS_PT[month] } : null);
      lastMonth = month;
      cols.push(col);
    }

    return { columns: cols, monthLabels: labels, maxTaken };
  }, [counts, weeks]);

  const levelFor = (cell: DayCell) => (cell.future ? -1 : cell.level);

  return (
    <section aria-label="Mapa de adesão das últimas 12 semanas">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
        Mapa de adesão · 12 semanas
      </h3>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        {/* Rótulos dos meses */}
        <div className="mb-1.5 flex gap-[3px] pl-6">
          {columns.map((_, w) => {
            const label = monthLabels[w];
            return (
              <div key={w} className="relative" style={{ width: CELL }}>
                {label && (
                  <span className="absolute left-0 top-0 whitespace-nowrap text-[9px] font-semibold text-slate-500">
                    {label.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-2">
          {/* Rótulos dos dias da semana */}
          <div className="flex w-4 flex-col gap-[3px]">
            {DOW_LABELS.map((d, i) => (
              <span
                key={i}
                className="flex items-center justify-center text-[8px] font-semibold text-slate-600"
                style={{ height: CELL }}
              >
                {d}
              </span>
            ))}
          </div>

          {/* Grade: 12 semanas × 7 dias */}
          <div className="flex gap-[3px]">
            {columns.map((col, w) => (
              <motion.div
                key={w}
                className="flex flex-col gap-[3px]"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: w * 0.03 }}
              >
                {col.map(cell => {
                  const level = levelFor(cell);
                  const isToday = cell.key === todayKey();
                  const d = parseKey(cell.key);
                  const title = cell.future
                    ? ''
                    : `${d.getDate()} ${MONTHS_PT[d.getMonth()]} — ${cell.count === 0 ? 'sem registo' : `${cell.count} ${cell.count === 1 ? 'toma' : 'tomas'}`}`;
                  return (
                    <div
                      key={cell.key}
                      title={title || undefined}
                      aria-hidden={cell.future}
                      className={
                        level < 0
                          ? 'bg-transparent'
                          : `h-3.5 w-3.5 rounded-[4px] ${LEVEL_STYLES[level]}${isToday ? ' ring-1 ring-sky-300/70' : ''}`
                      }
                      style={{ height: CELL - 2, width: CELL - 2 }}
                    />
                  );
                })}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Legenda */}
        <div className="mt-3 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <CalendarDays className="h-3 w-3" /> Tomas registadas por dia
          </p>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-slate-600">menos</span>
            {LEVEL_STYLES.map((s, i) => (
              <span key={i} className={`h-2.5 w-2.5 rounded-[3px] ${s}`} />
            ))}
            <span className="text-[9px] text-slate-600">mais</span>
          </div>
        </div>
        {maxTaken === 0 && (
          <p className="mt-2 text-[10px] text-slate-600">
            Sem tomas registadas nesta janela — marca a tua primeira toma para ver o mapa ganhar cor.
          </p>
        )}
      </div>
    </section>
  );
}

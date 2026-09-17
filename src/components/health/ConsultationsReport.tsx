/**
 * ConsultationsReport — Relatório de consultas (PDF via ReportShell).
 *
 * Histórico da tabela `consultations` (zero alterações de backend) com
 * resumo por estado e lista ordenada da mais recente para a mais antiga.
 * Rótulos PT fixos — o relatório é um documento, não uma UI traduzida.
 */

import { useMemo } from 'react';
import { ReportBrand, ReportFooter, ReportShell } from '@/components/health/ReportShell';
import { cn } from '@/lib/utils';

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${MONTHS_PT[d.getMonth()]} ${d.getFullYear()} · ${hh}:${mm}`;
}

const STATUS_PT: Record<string, string> = {
  scheduled: 'Agendada',
  confirmed: 'Confirmada',
  pending: 'Pendente',
  in_progress: 'Em curso',
  completed: 'Realizada',
  cancelled: 'Cancelada',
  no_show: 'Falta',
};

const TYPE_PT: Record<string, string> = {
  video: 'Vídeo',
  chat: 'Chat',
  in_person: 'Presencial',
  'in-person': 'Presencial',
};

function statusCls(label: string): string {
  if (label === 'Realizada') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (label === 'Cancelada' || label === 'Falta') return 'bg-rose-50 text-rose-700 border-rose-200';
  if (label === 'Pendente') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-sky-50 text-sky-700 border-sky-200';
}

export interface ConsultationRow {
  id: string;
  scheduled_at: string;
  status: string;
  consultation_type: string;
  duration_minutes?: number | null;
  doctor_name?: string | null;
  doctor_specialty?: { name: string; icon: string } | null;
  reason?: string | null;
}

interface ReportProps {
  open: boolean;
  onClose: () => void;
  items: ConsultationRow[];
}

export function ConsultationsReport({ open, onClose, items }: ReportProps) {
  const data = useMemo(() => {
    const sorted = [...items].sort((a, b) => (a.scheduled_at < b.scheduled_at ? 1 : -1));
    const done = items.filter(c => c.status === 'completed').length;
    const scheduled = items.filter(c => ['scheduled', 'confirmed', 'pending', 'in_progress'].includes(c.status)).length;
    const lost = items.filter(c => c.status === 'cancelled' || c.status === 'no_show').length;
    const specialties = new Set<string>();
    for (const c of items) {
      if (c.doctor_specialty?.name) specialties.add(c.doctor_specialty.name);
    }
    const minutes = items
      .filter(c => c.status === 'completed')
      .reduce((acc, c) => acc + (c.duration_minutes ?? 0), 0);
    return {
      sorted,
      total: items.length,
      done,
      scheduled,
      lost,
      specialties: specialties.size,
      minutes,
      generated: fmtDateTime(new Date().toISOString()).split(' · ')[0],
    };
  }, [items]);

  return (
    <ReportShell open={open} onClose={onClose} label="Relatório de consultas">
      <ReportBrand
        title="Relatório de consultas"
        meta={
          <>
            <p className="font-semibold text-slate-700">Resumo</p>
            <p>{data.total} {data.total === 1 ? 'consulta' : 'consultas'}</p>
            <p className="mt-1">Gerado em {data.generated}</p>
          </>
        }
      />

      {/* Resumo */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Realizadas', value: String(data.done), tone: 'text-emerald-700' },
          { label: 'Agendadas / em curso', value: String(data.scheduled), tone: 'text-sky-700' },
          { label: 'Canceladas / faltas', value: String(data.lost), tone: 'text-slate-500' },
          {
            label: 'Tempo total realizado',
            value: data.minutes >= 60 ? `${Math.floor(data.minutes / 60)}h${data.minutes % 60 ? ` ${data.minutes % 60}m` : ''}` : `${data.minutes}m`,
            tone: 'text-slate-900',
          },
        ].map(c => (
          <div key={c.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{c.label}</p>
            <p className={cn('mt-1 text-xl font-bold leading-tight', c.tone)}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Tabela de consultas */}
      <h4 className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-500">
        Histórico ({data.sorted.length} {data.sorted.length === 1 ? 'consulta' : 'consultas'} · da mais recente)
      </h4>
      {data.sorted.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">
          Sem consultas registadas na tua conta — quando marcares uma consulta na MedWallet, ela
          aparece neste histórico.
        </p>
      ) : (
        <table className="mt-2 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-left text-[10px] uppercase tracking-wide text-slate-500">
              <th className="py-2 pr-2 font-semibold">Data · hora</th>
              <th className="py-2 pr-2 font-semibold">Tipo</th>
              <th className="py-2 pr-2 font-semibold">Especialidade · médico</th>
              <th className="py-2 text-right font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {data.sorted.map(c => {
              const label = STATUS_PT[c.status] ?? c.status;
              const spec = c.doctor_specialty?.name ?? null;
              return (
                <tr key={c.id} className="border-b border-slate-100">
                  <td className="py-2.5 pr-2 whitespace-nowrap tabular-nums">{fmtDateTime(c.scheduled_at)}</td>
                  <td className="py-2.5 pr-2 text-slate-600">{TYPE_PT[c.consultation_type] ?? c.consultation_type}</td>
                  <td className="py-2.5 pr-2">
                    <p className="font-semibold leading-tight">{spec ?? 'Consulta'}</p>
                    {c.doctor_name && <p className="text-[11px] text-slate-500">{c.doctor_name}</p>}
                  </td>
                  <td className="py-2.5 text-right">
                    <span className={cn('inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold', statusCls(label))}>
                      {label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Notas + rodapé */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">
        <p>
          <span className="font-semibold text-slate-700">Notas:</span> o tempo total realizado soma a
          duração planeada das consultas com estado "Realizada".
          {data.specialties > 0 && ` Envolvem-se ${data.specialties} ${data.specialties === 1 ? 'especialidade' : 'especialidades'} distintas.`}
        </p>
      </div>
      <ReportFooter>Apresenta este relatório a um profissional de saúde como histórico de acompanhamento.</ReportFooter>
    </ReportShell>
  );
}

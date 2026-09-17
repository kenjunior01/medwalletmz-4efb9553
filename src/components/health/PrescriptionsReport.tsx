/**
 * PrescriptionsReport — Relatório de receitas médicas (PDF via ReportShell).
 *
 * Lista todas as receitas do utilizador (tabelas `prescriptions` +
 * `prescription_items`, zero alterações de backend) com estado calculado:
 * Activa / Expirada / Cancelada — o mesmo critério dos separadores da página.
 */

import { useMemo } from 'react';
import { ReportBrand, ReportFooter, ReportShell } from '@/components/health/ReportShell';
import { cn } from '@/lib/utils';

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${MONTHS_PT[d.getMonth()]} ${d.getFullYear()}`;
}

/** Estado da receita — mesmo critério dos tabs "activas/expiradas". */
function statusOf(p: PrescriptionRow): { label: string; cls: string } {
  if (p.status === 'cancelled') return { label: 'Cancelada', cls: 'bg-rose-50 text-rose-700 border-rose-200' };
  const expired = p.expires_at && new Date(p.expires_at) < new Date();
  if (expired) return { label: 'Expirada', cls: 'bg-slate-100 text-slate-600 border-slate-200' };
  return { label: 'Activa', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
}

interface PrescriptionItemRow {
  medication_name?: string | null;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
}

interface PrescriptionRow {
  id: string;
  status?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
  doctor_name?: string | null;
  notes?: string | null;
  prescription_items?: PrescriptionItemRow[] | null;
}

interface ReportProps {
  open: boolean;
  onClose: () => void;
  list: PrescriptionRow[];
}

export function PrescriptionsReport({ open, onClose, list }: ReportProps) {
  const data = useMemo(() => {
    const active = list.filter(p => statusOf(p).label === 'Activa').length;
    const inactive = list.length - active;
    const meds = new Set<string>();
    for (const p of list) {
      for (const it of p.prescription_items ?? []) {
        if (it.medication_name) meds.add(it.medication_name);
      }
    }
    const lastDate = list.reduce<string | null>((acc, p) => {
      const c = p.created_at ?? null;
      if (!c) return acc;
      return !acc || c > acc ? c : acc;
    }, null);
    return {
      total: list.length,
      active,
      inactive,
      distinctMeds: meds.size,
      lastDate,
      generated: fmtDate(new Date().toISOString()),
    };
  }, [list]);

  return (
    <ReportShell open={open} onClose={onClose} label="Relatório de receitas médicas">
      <ReportBrand
        title="Relatório de receitas médicas"
        meta={
          <>
            <p className="font-semibold text-slate-700">Resumo</p>
            <p>{data.total} {data.total === 1 ? 'receita' : 'receitas'}</p>
            <p className="mt-1">Gerado em {data.generated}</p>
          </>
        }
      />

      {/* Resumo */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Receitas', value: String(data.total), tone: 'text-slate-900' },
          { label: 'Activas', value: String(data.active), tone: 'text-emerald-700' },
          { label: 'Expiradas / canceladas', value: String(data.inactive), tone: 'text-slate-500' },
          { label: 'Medicamentos distintos', value: String(data.distinctMeds), tone: 'text-sky-700' },
        ].map(c => (
          <div key={c.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{c.label}</p>
            <p className={cn('mt-1 text-xl font-bold leading-tight', c.tone)}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Tabela de receitas */}
      <h4 className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-500">
        Receitas ({data.total === 1 ? 'mais recente primeiro' : 'da mais recente para a mais antiga'})
      </h4>
      {list.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">
          Sem receitas registadas na tua conta — quando um profissional de saúde te emitir uma
          receita na MedWallet, ela aparece aqui.
        </p>
      ) : (
        <table className="mt-2 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-left text-[10px] uppercase tracking-wide text-slate-500">
              <th className="py-2 pr-2 font-semibold">Medicamentos</th>
              <th className="py-2 pr-2 font-semibold">Médico</th>
              <th className="py-2 pr-2 font-semibold">Emitida</th>
              <th className="py-2 pr-2 font-semibold">Válida até</th>
              <th className="py-2 text-right font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {list.map(p => {
              const st = statusOf(p);
              const items = p.prescription_items ?? [];
              return (
                <tr key={p.id} className="border-b border-slate-100 align-top">
                  <td className="py-2.5 pr-2">
                    {items.length === 0 ? (
                      <p className="text-slate-400">—</p>
                    ) : (
                      <ul className="space-y-0.5">
                        {items.map((it, i) => (
                          <li key={i} className="leading-tight">
                            <span className="font-semibold">{it.medication_name ?? 'Medicamento'}</span>
                            {(it.dosage || it.frequency) && (
                              <span className="text-[11px] text-slate-500">
                                {' '}
                                {[it.dosage, it.frequency].filter(Boolean).join(' · ')}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="py-2.5 pr-2 text-slate-700">{p.doctor_name || '—'}</td>
                  <td className="py-2.5 pr-2 whitespace-nowrap text-slate-600">{fmtDate(p.created_at)}</td>
                  <td className="py-2.5 pr-2 whitespace-nowrap text-slate-600">{fmtDate(p.expires_at)}</td>
                  <td className="py-2.5 text-right">
                    <span className={cn('inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold', st.cls)}>
                      {st.label}
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
          <span className="font-semibold text-slate-700">Notas:</span> o estado "Activa" segue o mesmo
          critério da página de receitas (não expirada e não cancelada). As datas reflectem o que foi
          registado pelo profissional de saúde na MedWallet.
          {data.lastDate && ` Última receita emitida em ${fmtDate(data.lastDate)}.`}
        </p>
      </div>
      <ReportFooter>Apresenta este relatório ao teu médico ou farmacêutico quando precisares mostrar o histórico.</ReportFooter>
    </ReportShell>
  );
}

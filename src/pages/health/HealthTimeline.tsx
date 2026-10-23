/**
 * F46 — Linha Temporal de Saúde 📜
 * Padrão MyChart/Epic (o melhor portal de paciente do mundo): TODA a vida
 * clínica numa única linha temporal — consultas, análises (com estado do
 * resultado), prescrições, registos clínicos e diário de saúde.
 * Tudo vem do servidor num único round-trip via RPC health_timeline()
 * (SECURITY DEFINER com auth.uid() — o paciente só vê a sua vida).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Stethoscope, FlaskConical, Pill, FileText, HeartPulse, Info,
  RefreshCw, LogIn, ChevronRight, CheckCircle2,
} from '@/components/icons/lucide-compat';

/* ─────────────────────────────── Tipos ─────────────────────────────────── */

interface TimelineItem {
  kind: 'consultation' | 'lab' | 'prescription' | 'record' | 'journal' | string;
  title: string;
  detail: string | null;
  at: string;
  meta?: {
    status?: string;
    fee?: number;
    total?: number;
    has_result?: boolean;
    record_type?: string;
    file_url?: string;
    mood?: number;
    energy?: number;
  };
}

interface TimelineResult {
  success: boolean;
  items?: TimelineItem[];
  error?: string;
}

/* ───────────────────────────── Constantes ──────────────────────────────── */

const KIND_META: Record<string, { icon: typeof Stethoscope; label: string; dot: string; text: string }> = {
  consultation: { icon: Stethoscope,   label: 'Consulta',     dot: 'bg-[#5B6CFF]',      text: 'text-[#8B9CFF]' },
  lab:          { icon: FlaskConical,  label: 'Análises',     dot: 'bg-sky-400',        text: 'text-sky-300' },
  prescription: { icon: Pill,          label: 'Prescrição',   dot: 'bg-emerald-400',    text: 'text-emerald-300' },
  record:       { icon: FileText,      label: 'Registo',      dot: 'bg-amber-400',      text: 'text-amber-300' },
  journal:      { icon: HeartPulse,     label: 'Diário',       dot: 'bg-rose-400',       text: 'text-rose-300' },
};

const FILTERS: { key: string; label: string }[] = [
  { key: 'all',           label: 'Tudo' },
  { key: 'consultation',  label: 'Consultas' },
  { key: 'lab',           label: 'Análises' },
  { key: 'prescription',  label: 'Prescrições' },
  { key: 'record',        label: 'Registos' },
  { key: 'journal',       label: 'Diário' },
];

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' · ' + d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
};

const fmtMonth = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const s = d.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/* ─────────────────────────────── Página ────────────────────────────────── */

export default function HealthTimeline() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<TimelineResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: rpcError } = await (supabase as any)
        .rpc('health_timeline', { p_limit: 120 });
      if (rpcError) throw rpcError;
      setData(res as TimelineResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar a linha temporal');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const items = useMemo(() => {
    const all = data?.items ?? [];
    return filter === 'all' ? all : all.filter(i => i.kind === filter);
  }, [data, filter]);

  const monthGroups = useMemo(() => {
    const groups: { month: string; items: TimelineItem[] }[] = [];
    for (const it of items) {
      const m = fmtMonth(it.at);
      const last = groups[groups.length - 1];
      if (last && last.month === m) last.items.push(it);
      else groups.push({ month: m, items: [it] });
    }
    return groups;
  }, [items]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#1A1D2B] flex flex-col items-center justify-center px-6 text-center">
        <HeartPulse className="h-12 w-12 text-rose-400 mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Linha Temporal de Saúde</h1>
        <p className="text-sm text-white/60 mb-6">Entre na sua conta para ver o seu histórico clínico completo.</p>
        <button
          onClick={() => navigate('/auth')}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#5B6CFF] to-[#7C5CFF] text-white font-bold flex items-center gap-2"
        >
          <LogIn className="h-4 w-4" /> Entrar
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1D2B] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-[#1A1D2B]/80 border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg hover:bg-white/5 transition-colors">
            <ChevronRight className="h-5 w-5 text-white rotate-180" />
          </button>
          <h1 className="font-bold text-white flex-1">Linha Temporal de Saúde</h1>
          <button onClick={load} className="p-2 rounded-lg hover:bg-white/5 transition-colors" aria-label="Atualizar">
            <RefreshCw className={'h-4 w-4 text-white/60' + (loading ? ' animate-spin' : '')} />
          </button>
        </div>
        {/* Filtros por tipo — padrão MyChart */}
        <div className="max-w-3xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={'shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ' + (
                filter === f.key
                  ? 'bg-gradient-to-r from-[#5B6CFF] to-[#7C5CFF] text-white border-transparent'
                  : 'border-white/10 bg-white/[0.04] text-white/60 hover:text-white'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4">
        {loading && !data ? (
          <div className="pt-6 space-y-3">
            {[0, 1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />)}
          </div>
        ) : error ? (
          <div className="pt-16 text-center">
            <Info className="h-10 w-10 text-amber-400 mx-auto mb-3" />
            <p className="text-white/70 mb-4">{error}</p>
            <button onClick={load} className="px-5 py-2.5 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/15">
              Tentar novamente
            </button>
            <p className="text-xs text-white/40 mt-4 max-w-md mx-auto">
              Se o erro persistir, o RPC <code>health_timeline()</code> ainda não foi aplicado
              no Supabase — aplique a migração F46 no SQL Editor.
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="pt-16 text-center px-6">
            <HeartPulse className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/70 font-semibold">Ainda não há episódios por aqui</p>
            <p className="text-sm text-white/40 mt-1">
              Consultas, análises, prescrições e entradas do diário aparecem aqui automaticamente.
            </p>
          </div>
        ) : (
          <div className="pt-6">
            {monthGroups.map(group => (
              <div key={group.month} className="mb-6">
                <p className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3">{group.month}</p>
                <div className="relative">
                  {/* Linha vertical contínua — a «espinha» da timeline */}
                  <div className="absolute left-[19px] top-2 bottom-2 w-px bg-white/10" />
                  <div className="space-y-3">
                    {group.items.map((it, idx) => {
                      const km = KIND_META[it.kind] ?? KIND_META.record;
                      const Icon = km.icon;
                      return (
                        <div key={it.kind + it.at + idx} className="relative flex gap-3">
                          <div className={'relative z-10 w-10 h-10 rounded-full border-4 border-[#1A1D2B] flex items-center justify-center shrink-0 ' + km.dot}>
                            <Icon className="h-4.5 w-4.5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white">{it.title}</p>
                                {it.detail && (
                                  <p className="text-xs text-white/50 mt-0.5 line-clamp-2">{it.detail}</p>
                                )}
                              </div>
                              <span className={'shrink-0 text-[10px] font-bold uppercase tracking-wide ' + km.text}>
                                {km.label}
                              </span>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className="text-[11px] text-white/40">{fmtDate(it.at)}</span>
                              {it.meta?.has_result && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-emerald-300">
                                  <CheckCircle2 className="h-3 w-3" /> Resultado disponível
                                </span>
                              )}
                              {typeof it.meta?.fee === 'number' && it.meta.fee > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] text-white/50">
                                  {it.meta.fee.toLocaleString('pt-PT')} MT
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}

            <div className="mt-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex items-start gap-3">
              <Info className="h-4 w-4 text-white/40 mt-0.5 shrink-0" />
              <p className="text-xs text-white/50">
                A sua linha temporal reúne consultas, análises, prescrições, registos e diário num
                só lugar — como os melhores portais de paciente do mundo. Os dados são seus e
                privados: só você vê esta vista.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

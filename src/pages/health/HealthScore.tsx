/**
 * F44 — Índice de Saúde (Health Score) 🫀
 * Padrão Vitality dos melhores platforms do nicho: um índice 0–100 que resume
 * a saúde digital do utilizador em 4 pilares, calculado 100% NO SERVIDOR via
 * RPC health_index() — o cliente não envia nada, apenas renderiza.
 *
 * Pilares: Perfil de Emergência (25) · Adesão à Medicação (30) ·
 *          Hábitos (25) · Cuidado Contínuo (20)
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  ShieldCheck, HeartPulse, Pill, ClipboardList,
  ChevronRight, CheckCircle2, RefreshCw, LogIn, Info, Activity, History,
} from '@/components/icons/lucide-compat';

/* ─────────────────────────────── Tipos ─────────────────────────────────── */

interface Pillar {
  key: string;
  label: string;
  score: number;
  max: number;
  tips: string[];
}

interface HealthIndex {
  success: boolean;
  score?: number;
  grade?: string;
  has_profile?: boolean;
  components?: Pillar[];
  error?: string;
}

const PILLAR_ICONS: Record<string, typeof ShieldCheck> = {
  perfil: ShieldCheck,
  adesao: Pill,
  habitos: HeartPulse,
  cuidado: ClipboardList,
};

const GRADE_STYLE: Record<string, { ring: string; text: string; bg: string }> = {
  'Excelente':   { ring: '#10b981', text: 'text-emerald-400',  bg: 'bg-emerald-500/10 border-emerald-500/30' },
  'Bom':         { ring: '#38bdf8', text: 'text-sky-400',      bg: 'bg-sky-500/10 border-sky-500/30' },
  'Atenção':     { ring: '#f59e0b', text: 'text-amber-400',    bg: 'bg-amber-500/10 border-amber-500/30' },
  'A melhorar':  { ring: '#fb7185', text: 'text-rose-400',     bg: 'bg-rose-500/10 border-rose-500/30' },
};

const CTA_BY_PILLAR: Record<string, { to: string; label: string }> = {
  perfil:  { to: '/health/profile',  label: 'Completar perfil' },
  adesao:  { to: '/health/meds',     label: 'Abrir Medicação' },
  habitos: { to: '/health/education', label: 'Educação em Saúde' },
  cuidado: { to: '/health/consultations', label: 'Ver consultas' },
};

/* ─────────────────────── Gauge radial (SVG puro) ───────────────────────── */

function Gauge({ score, grade }: { score: number; grade: string }) {
  const [shown, setShown] = useState(0);
  const R = 84;
  const C = 2 * Math.PI * R;
  const style = GRADE_STYLE[grade] ?? GRADE_STYLE['A melhorar'];

  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 900);
      setShown(Math.round(score * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  return (
    <div className="relative w-[220px] h-[220px] mx-auto">
      <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
        <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" />
        <circle
          cx="100" cy="100" r={R} fill="none"
          stroke={style.ring} strokeWidth="14" strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - shown / 100)}
          style={{ transition: 'stroke-dashoffset 0.25s ease-out', filter: 'drop-shadow(0 0 10px ' + style.ring + '66)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-6xl font-black text-white tabular-nums leading-none">{shown}</span>
        <span className="text-xs text-white/50 mt-1">de 100</span>
        <span className={'mt-2 text-sm font-bold px-3 py-1 rounded-full border ' + style.bg + ' ' + style.text}>
          {grade}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────── Página ────────────────────────────────── */

export default function HealthScore() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<HealthIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: rpcError } = await (supabase as any)
        .rpc('health_index');
      if (rpcError) throw rpcError;
      setData(res as HealthIndex);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao calcular o índice');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#1A1D2B] flex flex-col items-center justify-center px-6 text-center">
        <HeartPulse className="h-12 w-12 text-rose-400 mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Índice de Saúde</h1>
        <p className="text-sm text-white/60 mb-6">Entre na sua conta para ver o seu índice de saúde.</p>
        <button
          onClick={() => navigate('/auth')}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#5B6CFF] to-[#7C5CFF] text-white font-bold flex items-center gap-2"
        >
          <LogIn className="h-4 w-4" /> Entrar
        </button>
      </div>
    );
  }

  const score = data?.score ?? 0;
  const grade = data?.grade ?? '…';
  const pillars = data?.components ?? [];

  return (
    <div className="min-h-screen bg-[#1A1D2B] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-[#1A1D2B]/80 border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg hover:bg-white/5 transition-colors">
            <ChevronRight className="h-5 w-5 text-white rotate-180" />
          </button>
          <h1 className="font-bold text-white flex-1">Índice de Saúde</h1>
          <button onClick={load} className="p-2 rounded-lg hover:bg-white/5 transition-colors" aria-label="Recalcular">
            <RefreshCw className={'h-4 w-4 text-white/60' + (loading ? ' animate-spin' : '')} />
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4">
        {loading && !data ? (
          <div className="pt-10 space-y-4">
            <div className="h-[220px] w-[220px] mx-auto rounded-full bg-white/5 animate-pulse" />
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="h-28 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="pt-16 text-center">
            <Info className="h-10 w-10 text-amber-400 mx-auto mb-3" />
            <p className="text-white/70 mb-4">{error}</p>
            <button onClick={load} className="px-5 py-2.5 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/15">
              Tentar novamente
            </button>
            <p className="text-xs text-white/40 mt-4 max-w-md mx-auto">
              Se o erro persistir, o RPC <code>health_index()</code> ainda não foi aplicado no Supabase — aplique a migração F44 no SQL Editor.
            </p>
          </div>
        ) : (
          <>
            {/* Gauge */}
            <div className="pt-8 pb-2">
              <Gauge score={score} grade={grade} />
              <p className="text-center text-white/50 text-xs mt-4 max-w-sm mx-auto">
                Calculado no servidor a partir do seu perfil, medicação, check-ins,
                quizzes e cuidados reais na plataforma.
              </p>
            </div>

            {/* Pilares */}
            <div className="mt-6 grid gap-3">
              {pillars.map(p => {
                const Icon = PILLAR_ICONS[p.key] ?? Activity;
                const pct = p.max > 0 ? Math.round((p.score / p.max) * 100) : 0;
                const cta = CTA_BY_PILLAR[p.key];
                return (
                  <div key={p.key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5B6CFF]/30 to-[#7C5CFF]/20 flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-[#8B9CFF]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white text-sm">{p.label}</h3>
                        <span className="text-xs text-white/50">{p.score} de {p.max} pontos</span>
                      </div>
                      <span className="text-lg font-black text-white tabular-nums">{pct}%</span>
                    </div>

                    <div className="mt-3 h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#5B6CFF] to-[#7C5CFF] transition-all duration-700"
                        style={{ width: pct + '%' }}
                      />
                    </div>

                    {p.tips?.length > 0 && (
                      <ul className="mt-3 space-y-1.5">
                        {p.tips.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-white/60">
                            <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-[#8B9CFF] shrink-0" />
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {cta && (
                      <button
                        onClick={() => navigate(cta.to)}
                        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#8B9CFF] hover:text-white transition-colors"
                      >
                        {cta.label} <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* F46 — Linha Temporal (padrão MyChart) */}
            <button
              onClick={() => navigate('/health/timeline')}
              className="mt-6 w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex items-center gap-3 hover:border-[#5B6CFF]/40 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5B6CFF]/30 to-[#7C5CFF]/20 flex items-center justify-center shrink-0">
                <History className="h-5 w-5 text-[#8B9CFF]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white text-sm">Linha Temporal de Saúde</h3>
                <p className="text-xs text-white/50">Consultas, análises, prescrições e diário num só lugar</p>
              </div>
              <ChevronRight className="h-5 w-5 text-white/40" />
            </button>

            {/* Nota */}
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex items-start gap-3">
              <Info className="h-4 w-4 text-white/40 mt-0.5 shrink-0" />
              <p className="text-xs text-white/50">
                O índice é recalculado a cada abertura e nunca partilha dados clínicos —
                é seu e privado. Suba os pilares com ações reais de saúde na plataforma.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

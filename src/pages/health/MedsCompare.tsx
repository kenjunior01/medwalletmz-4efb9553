/**
 * F46 — Comparador de Preços de Medicamentos 💊
 * Padrão GoodRx (o melhor do mundo em transparência de preços de medicamentos):
 * pesquisar o medicamento → comparar preços em TODAS as farmácias → ver a
 * poupança → escolher a farmácia. Tudo calculado NO SERVIDOR via RPC
 * compare_med_prices() — o cliente nunca agrega preços.
 *
 * Bónus MISAU/WHO: quando há correspondência no catálogo de medicamentos
 * essenciais, mostra o preço de referência oficial e a poupança vs referência.
 */
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCountry } from '@/contexts/CountryContext';
import {
  Search, Pill, Star, MapPin, Truck, TrendingDown, Info,
  RefreshCw, ChevronRight, X, Clock, Zap, Package,
} from '@/components/icons/lucide-compat';

/* ─────────────────────────────── Tipos ─────────────────────────────────── */

interface MedOffer {
  product_id: string;
  product_name: string;
  price: number;
  image_url: string | null;
  category: string | null;
  store_id: string;
  store_name: string;
  city: string | null;
  rating: number | null;
  delivery_fee: number | null;
  delivery_time: string | null;
  store_image: string | null;
}

interface MedReference {
  name: string;
  generic_name: string | null;
  form: string | null;
  strength: string | null;
  reference_price_mzn: number | null;
  savings_vs_reference_pct: number | null;
}

interface CompareStats {
  count: number;
  lowest?: number;
  highest?: number;
  average?: number;
  savings_pct?: number;
}

interface CompareResult {
  success: boolean;
  query?: string;
  offers?: MedOffer[];
  stats?: CompareStats;
  reference?: MedReference | null;
  error?: string;
}

const SUGGESTIONS = ['Paracetamol', 'Amoxicilina', 'Ibuprofeno', 'Coartem', 'Azigesic', 'Vitamina C'];

/* ─────────────────────────────── Página ────────────────────────────────── */

export default function MedsCompare() {
  const navigate = useNavigate();
  const { country } = useCountry();
  const [term, setTerm] = useState('');
  const [data, setData] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (q: string) => {
    const query = q.trim();
    if (query.length < 2) return;
    setTerm(query);
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const { data: res, error: rpcError } = await (supabase as any)
        .rpc('compare_med_prices', { p_query: query, p_country_id: country?.id ?? null, p_limit: 30 });
      if (rpcError) throw rpcError;
      setData(res as CompareResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao comparar preços');
    } finally {
      setLoading(false);
    }
  }, [country?.id]);

  const fmt = (v?: number | null) =>
    v == null ? '—' : `${Number(v).toLocaleString('pt-PT', { maximumFractionDigits: 0 })} MT`;

  const stats = data?.stats;
  const offers = data?.offers ?? [];
  const reference = data?.reference ?? null;

  return (
    <div className="min-h-screen bg-[#1A1D2B] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-[#1A1D2B]/80 border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg hover:bg-white/5 transition-colors">
            <ChevronRight className="h-5 w-5 text-white rotate-180" />
          </button>
          <h1 className="font-bold text-white flex-1">Comparar Preços de Medicamentos</h1>
          {searched && (
            <button onClick={() => search(term)} className="p-2 rounded-lg hover:bg-white/5 transition-colors" aria-label="Atualizar">
              <RefreshCw className={'h-4 w-4 text-white/60' + (loading ? ' animate-spin' : '')} />
            </button>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4">
        {/* Pesquisa — padrão GoodRx: tudo começa pela caixa de pesquisa */}
        <div className="pt-5">
          <form
            onSubmit={(e) => { e.preventDefault(); search(term); }}
            className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 focus-within:border-[#5B6CFF]/60 transition-colors"
          >
            <Search className="h-5 w-5 text-white/40 shrink-0" />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Ex.: Paracetamol, Amoxicilina, Coartem…"
              className="flex-1 bg-transparent text-white placeholder:text-white/30 outline-none text-sm"
              aria-label="Medicamento a pesquisar"
            />
            {term && (
              <button type="button" onClick={() => { setTerm(''); setData(null); setSearched(false); }} aria-label="Limpar">
                <X className="h-4 w-4 text-white/40 hover:text-white" />
              </button>
            )}
            <button
              type="submit"
              disabled={loading || term.trim().length < 2}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#5B6CFF] to-[#7C5CFF] text-white text-sm font-bold disabled:opacity-40"
            >
              Comparar
            </button>
          </form>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => search(s)}
                className="shrink-0 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] text-xs text-white/70 hover:text-white hover:border-[#5B6CFF]/50 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {!searched && (
          <div className="mt-10 text-center px-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#5B6CFF]/30 to-[#7C5CFF]/20 flex items-center justify-center">
              <Pill className="h-8 w-8 text-[#8B9CFF]" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-white">Poupe no seu medicamento</h2>
            <p className="mt-2 text-sm text-white/50 max-w-md mx-auto">
              O mesmo medicamento pode ter preços muito diferentes entre farmácias.
              Pesquise, compare e escolha o melhor preço — com o preço de referência
              oficial MISAU/WHO como bússola.
            </p>
          </div>
        )}

        {loading && (
          <div className="mt-6 space-y-3">
            <div className="h-24 rounded-2xl bg-white/5 animate-pulse" />
            {[0, 1, 2].map(i => <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />)}
          </div>
        )}

        {!loading && error && (
          <div className="mt-10 text-center">
            <Info className="h-10 w-10 text-amber-400 mx-auto mb-3" />
            <p className="text-white/70 mb-4">{error}</p>
            <button onClick={() => search(term)} className="px-5 py-2.5 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/15">
              Tentar novamente
            </button>
            <p className="text-xs text-white/40 mt-4 max-w-md mx-auto">
              Se o erro persistir, o RPC <code>compare_med_prices()</code> ainda não foi aplicado
              no Supabase — aplique a migração F46 no SQL Editor.
            </p>
          </div>
        )}

        {!loading && !error && searched && data && (
          <>
            {offers.length === 0 ? (
              <div className="mt-10 text-center">
                <Pill className="h-10 w-10 text-white/30 mx-auto mb-3" />
                <p className="text-white/70 font-semibold">Nenhuma farmácia tem «{data.query}» ainda</p>
                <p className="text-sm text-white/40 mt-1">Tente outro nome (genérico ou marca) ou remova filtros.</p>
              </div>
            ) : (
              <>
                {/* Estatísticas — o momento «poupança» do GoodRx */}
                <div className="mt-5 grid grid-cols-3 gap-2">
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center">
                    <p className="text-[11px] text-emerald-300/80 font-medium">Melhor preço</p>
                    <p className="text-lg font-black text-emerald-300 tabular-nums">{fmt(stats?.lowest)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center">
                    <p className="text-[11px] text-white/50 font-medium">Preço médio</p>
                    <p className="text-lg font-black text-white tabular-nums">{fmt(stats?.average)}</p>
                  </div>
                  <div className="rounded-2xl border border-[#5B6CFF]/30 bg-[#5B6CFF]/10 p-3 text-center">
                    <p className="text-[11px] text-[#8B9CFF] font-medium">Poupança até</p>
                    <p className="text-lg font-black text-[#8B9CFF] tabular-nums">{stats?.savings_pct ?? 0}%</p>
                  </div>
                </div>

                {/* Referência oficial MISAU/WHO */}
                {reference && reference.reference_price_mzn != null && (
                  <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C5CFF]/30 to-[#5B6CFF]/20 flex items-center justify-center shrink-0">
                      <Zap className="h-5 w-5 text-[#8B9CFF]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white">
                        {reference.generic_name || reference.name}
                        {reference.strength ? ` ${reference.strength}` : ''}
                        {reference.form ? ` · ${reference.form}` : ''}
                      </p>
                      <p className="text-xs text-white/50 mt-0.5">
                        Preço de referência oficial MISAU/WHO: <span className="text-white/80 font-semibold">{fmt(reference.reference_price_mzn)}</span>
                      </p>
                    </div>
                    {(reference.savings_vs_reference_pct ?? 0) > 0 && (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-xs font-bold text-emerald-300">
                        <TrendingDown className="h-3.5 w-3.5" />
                        -{reference.savings_vs_reference_pct}% vs referência
                      </span>
                    )}
                  </div>
                )}

                {/* Ofertas por farmácia — ordenadas por preço (servidor) */}
                <div className="mt-4 grid gap-3">
                  {offers.map((o, i) => (
                    <button
                      key={o.product_id}
                      onClick={() => navigate(`/store/${o.store_id}`)}
                      className="text-left rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:border-[#5B6CFF]/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {i === 0 && (
                          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-bold text-emerald-300">
                            <Zap className="h-3 w-3" /> Melhor preço
                          </span>
                        )}
                        <p className="flex-1 min-w-0 font-bold text-white text-sm truncate">{o.product_name}</p>
                        <p className="shrink-0 text-lg font-black text-white tabular-nums">{fmt(o.price)}</p>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/50">
                        <span className="inline-flex items-center gap-1 font-semibold text-white/70">
                          <MapPin className="h-3.5 w-3.5 text-[#8B9CFF]" /> {o.store_name}
                          {o.city ? ` · ${o.city}` : ''}
                        </span>
                        {o.rating != null && o.rating > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 text-amber-400" /> {Number(o.rating).toFixed(1)}
                          </span>
                        )}
                        {o.delivery_time && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" /> {o.delivery_time}
                          </span>
                        )}
                        {o.delivery_fee != null && (
                          <span className="inline-flex items-center gap-1">
                            <Truck className="h-3.5 w-3.5" /> {o.delivery_fee > 0 ? `Entrega ${fmt(o.delivery_fee)}` : 'Entrega grátis'}
                          </span>
                        )}
                        <span className="ml-auto inline-flex items-center text-[#8B9CFF] font-semibold">
                          Ver farmácia <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* F47 — cross-link: disponibilidade de stock (padrão mPharma) */}
                <button
                  onClick={() => navigate('/health/meds-availability')}
                  className="mt-4 w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex items-center gap-3 hover:border-[#5B6CFF]/40 transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#5B6CFF]/30 to-[#7C5CFF]/20 flex items-center justify-center shrink-0">
                    <Package className="h-5 w-5 text-[#8B9CFF]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-sm">Onde há stock?</h3>
                    <p className="text-xs text-white/50">Veja em que farmácias existe agora e reserve para levantar com código (24h)</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-white/40" />
                </button>

                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex items-start gap-3">
                  <Info className="h-4 w-4 text-white/40 mt-0.5 shrink-0" />
                  <p className="text-xs text-white/50">
                    Preços fornecidos pelas farmácias registadas na plataforma e podem variar
                    com stock e campanhas. A referência MISAU/WHO é o preço oficial do
                    medicamento essencial em Moçambique — use-a para negociar e decidir.
                  </p>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

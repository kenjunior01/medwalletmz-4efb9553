/**
 * F47 — Onde há stock? 💊📦
 * Padrão mPharma (o melhor do mundo em acesso a medicamentos em África):
 * 1) DISPONIBILIDADE — pesquisar o medicamento → ver em QUE farmácias existe
 *    AGORA (em stock / últimas unidades / esgotado), porquanto, e onde.
 * 2) RESERVAS — reservar para levantar na farmácia com CÓDIGO, válido 24h
 *    (o stock é reservado para o paciente — padrão mPharma "pele já").
 * 3) VIGIAR PREÇO — padrão GoodRx Price Alert: avisar quando o melhor preço
 *    desce abaixo do alvo.
 *
 * Tudo calculado NO SERVIDOR via RPCs med_availability(), reserve_med_pickup(),
 * my_med_reservations(), cancel_med_reservation(), add_price_watch(),
 * my_price_watches() — o cliente nunca agrega stock nem preços.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import {
  Search, Pill, Package, Star, MapPin, Truck, Info, RefreshCw, ChevronRight,
  X, Clock, Zap, BellRing, Trash2, Copy, Check, Phone, ShoppingBag,
} from '@/components/icons/lucide-compat';
import { toast } from 'sonner';

/* ─────────────────────────────── Tipos ─────────────────────────────────── */

interface AvailabilityOffer {
  product_id: string;
  product_name: string;
  price: number;
  image_url: string | null;
  category: string | null;
  stock_quantity: number | null;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
  store_id: string;
  store_name: string;
  city: string | null;
  phone: string | null;
  rating: number | null;
  delivery_fee: number | null;
  delivery_time: string | null;
}

interface MedReference {
  name: string;
  generic_name: string | null;
  form: string | null;
  strength: string | null;
  reference_price_mzn: number | null;
}

interface MedAlternative {
  name: string;
  generic_name: string | null;
  form: string | null;
  strength: string | null;
  reference_price_mzn: number | null;
}

interface AvailabilityStats {
  count: number;
  pharmacies_with_stock: number;
  lowest_available?: number | null;
}

interface AvailabilityResult {
  success: boolean;
  query?: string;
  offers?: AvailabilityOffer[];
  stats?: AvailabilityStats;
  reference?: MedReference | null;
  alternatives?: MedAlternative[];
  error?: string;
}

interface Reservation {
  id: string;
  status: string;
  quantity: number;
  pickup_code: string;
  price: number | null;
  created_at: string;
  expires_at: string;
  product_id: string;
  product_name: string;
  product_image: string | null;
  store_id: string;
  store_name: string;
  store_city: string | null;
  store_phone: string | null;
}

interface PriceWatch {
  id: string;
  query: string;
  target_price: number | null;
  active: boolean;
  created_at: string;
  current_lowest: number | null;
  triggered: boolean;
}

type Tab = 'availability' | 'reservations' | 'watch';

const SUGGESTIONS = ['Paracetamol', 'Amoxicilina', 'Coartem', 'Ibuprofeno', 'Metformina', 'Amlodipina'];

const stockBadge: Record<string, { label: string; cls: string }> = {
  in_stock:     { label: 'Em stock',          cls: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' },
  low_stock:    { label: 'Últimas unidades',  cls: 'bg-amber-500/15 border-amber-500/30 text-amber-300' },
  out_of_stock: { label: 'Esgotado',          cls: 'bg-red-500/15 border-red-500/30 text-red-300' },
};

const statusLabel: Record<string, { label: string; cls: string }> = {
  reserved:  { label: 'Reservada',  cls: 'bg-[#5B6CFF]/15 border-[#5B6CFF]/30 text-[#8B9CFF]' },
  ready:     { label: 'Pronta',     cls: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' },
  collected: { label: 'Levantada',  cls: 'bg-white/10 border-white/20 text-white/60' },
  cancelled: { label: 'Cancelada',  cls: 'bg-white/5 border-white/10 text-white/40' },
  expired:   { label: 'Expirada',   cls: 'bg-amber-500/10 border-amber-500/20 text-amber-300/70' },
};

/* ─────────────────────────────── Página ────────────────────────────────── */

export default function MedsAvailability() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { country } = useCountry();
  const [tab, setTab] = useState<Tab>('availability');

  /* Disponibilidade */
  const [term, setTerm] = useState('');
  const [city, setCity] = useState('');
  const [data, setData] = useState<AvailabilityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Reserva em curso (código de levantamento) */
  const [lastReservation, setLastReservation] = useState<Reservation | null>(null);

  /* Minhas reservas */
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [resLoading, setResLoading] = useState(false);
  const [reservingId, setReservingId] = useState<string | null>(null);

  /* Vigiar preço */
  const [watches, setWatches] = useState<PriceWatch[]>([]);
  const [watchLoading, setWatchLoading] = useState(false);
  const [watchQuery, setWatchQuery] = useState('');
  const [watchTarget, setWatchTarget] = useState('');

  const fmt = (v?: number | null) =>
    v == null ? '—' : `${Number(v).toLocaleString('pt-PT', { maximumFractionDigits: 0 })} MT`;

  /* ── Pesquisa de disponibilidade ── */
  const search = useCallback(async (q: string) => {
    const query = q.trim();
    if (query.length < 2) return;
    setTerm(query);
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const { data: res, error: rpcError } = await (supabase as any)
        .rpc('med_availability', {
          p_query: query, p_city: city.trim() || null,
          p_country_id: country?.id ?? null, p_limit: 40,
        });
      if (rpcError) throw rpcError;
      setData(res as AvailabilityResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao pesquisar stock');
    } finally {
      setLoading(false);
    }
  }, [city, country?.id]);

  /* ── Minhas reservas ── */
  const loadReservations = useCallback(async () => {
    if (!user) return;
    setResLoading(true);
    try {
      const { data: res, error: rpcError } = await (supabase as any)
        .rpc('my_med_reservations');
      if (rpcError) throw rpcError;
      setReservations(((res as any)?.items ?? []) as Reservation[]);
    } catch {
      /* silencioso — o utilizador vê estado vazio */
    } finally {
      setResLoading(false);
    }
  }, [user]);

  /* ── Vigiadores de preço ── */
  const loadWatches = useCallback(async () => {
    if (!user) return;
    setWatchLoading(true);
    try {
      const { data: res, error: rpcError } = await (supabase as any)
        .rpc('my_price_watches');
      if (rpcError) throw rpcError;
      setWatches(((res as any)?.items ?? []) as PriceWatch[]);
    } catch {
      /* silencioso */
    } finally {
      setWatchLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (tab === 'reservations') void loadReservations();
    if (tab === 'watch') void loadWatches();
  }, [tab, loadReservations, loadWatches]);

  /* ── Reservar ── */
  const reserve = async (o: AvailabilityOffer) => {
    if (!user) {
      toast.info('Inicie sessão para reservar', { description: 'A reserva garante o medicamento na farmácia por 24h.' });
      navigate('/auth');
      return;
    }
    if (o.stock_status === 'out_of_stock') return;
    setReservingId(o.product_id);
    try {
      const { data: res, error: rpcError } = await (supabase as any)
        .rpc('reserve_med_pickup', { p_product_id: o.product_id, p_quantity: 1 });
      if (rpcError) throw rpcError;
      const r = res as any;
      if (!r?.success) {
        const msg: Record<string, string> = {
          out_of_stock: 'O stock acabou de se esgotar nesta farmácia.',
          insufficient_stock: `Só restam ${r?.available ?? 0} unidades.`,
          too_many_active_reservations: 'Tem 3 reservas activas. Cancele uma antes de reservar outra.',
          not_a_pharmacy: 'Esta loja não é uma farmácia.',
          product_not_found: 'Medicamento não encontrado.',
          not_authenticated: 'Inicie sessão para reservar.',
        };
        toast.error(msg[r?.error] ?? 'Não foi possível reservar.');
        void search(term);
        return;
      }
      setLastReservation(r.reservation as Reservation);
      toast.success('Medicamento reservado! 🎉', { description: `Código ${r.reservation.pickup_code} · válido 24h` });
      void search(term);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao reservar');
    } finally {
      setReservingId(null);
    }
  };

  /* ── Cancelar reserva ── */
  const cancelReservation = async (id: string) => {
    try {
      const { data: res, error: rpcError } = await (supabase as any)
        .rpc('cancel_med_reservation', { p_reservation_id: id });
      if (rpcError) throw rpcError;
      if (!(res as any)?.success) {
        toast.error('Não foi possível cancelar (a reserva pode já ter sido levantada).');
      } else {
        toast.success('Reserva cancelada. Stock reposto na farmácia.');
      }
      void loadReservations();
    } catch {
      toast.error('Erro ao cancelar reserva');
    }
  };

  /* ── Adicionar vigia de preço ── */
  const addWatch = async () => {
    if (!user) { navigate('/auth'); return; }
    const q = watchQuery.trim();
    if (q.length < 2) return;
    const target = watchTarget.trim() ? Number(watchTarget.replace(',', '.')) : null;
    try {
      const { data: res, error: rpcError } = await (supabase as any)
        .rpc('add_price_watch', { p_query: q, p_target_price: target });
      if (rpcError) throw rpcError;
      if (!(res as any)?.success) {
        toast.error('Não foi possível criar o vigia (máx. 10 activos).');
        return;
      }
      setWatchQuery('');
      setWatchTarget('');
      toast.success(`A vigiar «${q}»`, { description: target != null ? `Aviso quando o melhor preço ≤ ${fmt(target)}` : undefined });
      void loadWatches();
    } catch {
      toast.error('Erro ao criar vigia de preço');
    }
  };

  const removeWatch = async (id: string) => {
    try {
      await (supabase as any).rpc('remove_price_watch', { p_watch_id: id });
      setWatches((w) => w.filter((x) => x.id !== id));
    } catch {
      toast.error('Erro ao remover vigia');
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Código copiado');
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  const offers = data?.offers ?? [];
  const stats = data?.stats;
  const reference = data?.reference ?? null;
  const alternatives = data?.alternatives ?? [];

  return (
    <div className="min-h-screen bg-[#1A1D2B] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-[#1A1D2B]/80 border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg hover:bg-white/5 transition-colors" aria-label="Voltar">
            <ChevronRight className="h-5 w-5 text-white rotate-180" />
          </button>
          <h1 className="font-bold text-white flex-1">Onde há stock?</h1>
          {tab === 'availability' && searched && (
            <button onClick={() => search(term)} className="p-2 rounded-lg hover:bg-white/5 transition-colors" aria-label="Atualizar">
              <RefreshCw className={'h-4 w-4 text-white/60' + (loading ? ' animate-spin' : '')} />
            </button>
          )}
        </div>
        {/* Tabs */}
        <div className="max-w-3xl mx-auto px-4 flex gap-1 -mb-px">
          {([
            ['availability', 'Disponibilidade', Package],
            ['reservations', `Reservas${reservations.length ? ` (${reservations.length})` : ''}`, ShoppingBag],
            ['watch', 'Vigiar preço', BellRing],
          ] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key as Tab)}
              className={'flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors ' +
                (tab === key
                  ? 'border-[#5B6CFF] text-white'
                  : 'border-transparent text-white/40 hover:text-white/70')}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4">
        {/* ══════════ TAB: DISPONIBILIDADE ══════════ */}
        {tab === 'availability' && (
          <>
            <div className="pt-5">
              <form
                onSubmit={(e) => { e.preventDefault(); search(term); }}
                className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 focus-within:border-[#5B6CFF]/60 transition-colors"
              >
                <Search className="h-5 w-5 text-white/40 shrink-0" />
                <input
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Ex.: Paracetamol, Coartem, Insulina…"
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
                  Procurar
                </button>
              </form>

              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Cidade (opcional) — ex.: Maputo, Matola, Beira…"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#5B6CFF]/60 transition-colors"
                aria-label="Filtrar por cidade"
              />

              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {SUGGESTIONS.map((s) => (
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
                  <Package className="h-8 w-8 text-[#8B9CFF]" />
                </div>
                <h2 className="mt-4 text-lg font-bold text-white">Pare de andar à procura do medicamento</h2>
                <p className="mt-2 text-sm text-white/50 max-w-md mx-auto">
                  Pesquise uma vez e veja EM QUE farmácias o medicamento está em stock
                  agora, porquanto, e reserve para levantar com código — vale 24h.
                  Padrão mPharma, feito para Moçambique.
                </p>
              </div>
            )}

            {loading && (
              <div className="mt-6 space-y-3">
                <div className="h-24 rounded-2xl bg-white/5 animate-pulse" />
                {[0, 1, 2].map((i) => <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />)}
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
                  Se o erro persistir, o RPC <code>med_availability()</code> ainda não foi aplicado
                  no Supabase — aplique a migração F47 no SQL Editor.
                </p>
              </div>
            )}

            {!loading && !error && searched && data && (
              <>
                {offers.length === 0 ? (
                  <div className="mt-10 text-center">
                    <Package className="h-10 w-10 text-white/30 mx-auto mb-3" />
                    <p className="text-white/70 font-semibold">Nenhuma farmácia registada tem «{data.query}»</p>
                    <p className="text-sm text-white/40 mt-1">Tente o nome genérico, outra grafia, ou remova o filtro de cidade.</p>
                  </div>
                ) : (
                  <>
                    {/* Estatísticas — o momento mPharma: "há stock em X farmácias" */}
                    <div className="mt-5 grid grid-cols-3 gap-2">
                      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center">
                        <p className="text-[11px] text-emerald-300/80 font-medium">Farmácias com stock</p>
                        <p className="text-lg font-black text-emerald-300 tabular-nums">{stats?.pharmacies_with_stock ?? 0}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center">
                        <p className="text-[11px] text-white/50 font-medium">Desde</p>
                        <p className="text-lg font-black text-white tabular-nums">{fmt(stats?.lowest_available)}</p>
                      </div>
                      <div className="rounded-2xl border border-[#5B6CFF]/30 bg-[#5B6CFF]/10 p-3 text-center">
                        <p className="text-[11px] text-[#8B9CFF] font-medium">Farmácias</p>
                        <p className="text-lg font-black text-[#8B9CFF] tabular-nums">{stats?.count ?? 0}</p>
                      </div>
                    </div>

                    {/* Referência MISAU/WHO */}
                    {reference && reference.generic_name && (
                      <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C5CFF]/30 to-[#5B6CFF]/20 flex items-center justify-center shrink-0">
                          <Pill className="h-5 w-5 text-[#8B9CFF]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white">
                            {reference.generic_name}{reference.strength ? ` ${reference.strength}` : ''}
                            {reference.form ? ` · ${reference.form}` : ''}
                          </p>
                          <p className="text-xs text-white/50 mt-0.5">
                            Catálogo MISAU/WHO{reference.reference_price_mzn != null ? <> · preço de referência <span className="text-white/80 font-semibold">{fmt(reference.reference_price_mzn)}</span></> : null}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Reserva activa — código de levantamento em destaque */}
                    {lastReservation && (
                      <div className="mt-4 rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/10 p-4">
                        <div className="flex items-center gap-2">
                          <Check className="h-5 w-5 text-emerald-300" />
                          <p className="font-bold text-white text-sm flex-1">Reservada: {lastReservation.product_name} × {lastReservation.quantity}</p>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <code className="flex-1 text-center text-2xl font-black tracking-widest text-emerald-300 bg-emerald-500/10 rounded-xl py-2 border border-emerald-500/30">
                            {lastReservation.pickup_code}
                          </code>
                          <button onClick={() => copyCode(lastReservation.pickup_code)} className="p-3 rounded-xl bg-white/10 hover:bg-white/15 transition-colors" aria-label="Copiar código">
                            <Copy className="h-5 w-5 text-white" />
                          </button>
                        </div>
                        <p className="mt-2 text-xs text-white/60">
                          Mostre este código em <span className="font-bold text-white/90">{lastReservation.store_name}</span>
                          {lastReservation.store_city ? `, ${lastReservation.store_city}` : ''} · válido 24h
                          {lastReservation.store_phone ? <> · <a href={`tel:${lastReservation.store_phone}`} className="underline text-emerald-300">ligar à farmácia</a></> : null}
                        </p>
                        <button onClick={() => setLastReservation(null)} className="mt-2 text-xs text-white/40 hover:text-white/70 underline">
                          Fechar
                        </button>
                      </div>
                    )}

                    {/* Ofertas por farmácia */}
                    <div className="mt-4 grid gap-3">
                      {offers.map((o) => {
                        const b = stockBadge[o.stock_status] ?? stockBadge.in_stock;
                        const canReserve = o.stock_status !== 'out_of_stock';
                        return (
                          <div key={o.product_id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:border-[#5B6CFF]/40 transition-colors">
                            <div className="flex items-center gap-2">
                              <p className="flex-1 min-w-0 font-bold text-white text-sm truncate">{o.product_name}</p>
                              <span className={'shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] font-bold ' + b.cls}>
                                {b.label}
                              </span>
                              <p className="shrink-0 text-lg font-black text-white tabular-nums">{fmt(o.price)}</p>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/50">
                              <button onClick={() => navigate(`/store/${o.store_id}`)} className="inline-flex items-center gap-1 font-semibold text-white/70 hover:text-white">
                                <MapPin className="h-3.5 w-3.5 text-[#8B9CFF]" /> {o.store_name}
                                {o.city ? ` · ${o.city}` : ''}
                              </button>
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
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                              <button
                                onClick={() => reserve(o)}
                                disabled={!canReserve || reservingId === o.product_id}
                                className={'flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ' +
                                  (canReserve
                                    ? 'bg-gradient-to-r from-[#5B6CFF] to-[#7C5CFF] text-white hover:opacity-90 disabled:opacity-50'
                                    : 'bg-white/5 text-white/30 cursor-not-allowed')}
                              >
                                {reservingId === o.product_id
                                  ? 'A reservar…'
                                  : canReserve
                                    ? '📦 Reservar para levantar (24h)'
                                    : 'Esgotado — sem reserva'}
                              </button>
                              {o.phone && (
                                <a href={`tel:${o.phone}`} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors" aria-label="Ligar à farmácia">
                                  <Phone className="h-4 w-4 text-white/60" />
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Alternativas do catálogo — padrão mPharma */}
                    {alternatives.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <Zap className="h-4 w-4 text-[#8B9CFF]" /> Alternativas no catálogo MISAU/WHO
                        </h3>
                        <p className="text-xs text-white/40 mt-1">Mesmo genérico, outras marcas e apresentações.</p>
                        <div className="mt-3 grid gap-2">
                          {alternatives.map((a) => (
                            <button
                              key={a.name}
                              onClick={() => search(a.name)}
                              className="text-left rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 flex items-center gap-3 hover:border-[#5B6CFF]/40 transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{a.name}</p>
                                <p className="text-xs text-white/40">
                                  {a.generic_name ?? ''}{a.strength ? ` · ${a.strength}` : ''}{a.form ? ` · ${a.form}` : ''}
                                </p>
                              </div>
                              {a.reference_price_mzn != null && (
                                <span className="text-xs text-white/60 tabular-nums">ref. {fmt(a.reference_price_mzn)}</span>
                              )}
                              <ChevronRight className="h-4 w-4 text-white/30" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex items-start gap-3">
                      <Info className="h-4 w-4 text-white/40 mt-0.5 shrink-0" />
                      <p className="text-xs text-white/50">
                        O stock é informado pelas farmácias e reservas vencem em 24h com reposição automática.
                        Se a farmácia não controla stock online, o estado baseia-se na disponibilidade declarada —
                        confirme por telefone quando for crítico.
                      </p>
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* ══════════ TAB: MINHAS RESERVAS ══════════ */}
        {tab === 'reservations' && (
          <div className="pt-5">
            {!user ? (
              <div className="mt-10 text-center">
                <ShoppingBag className="h-10 w-10 text-white/30 mx-auto mb-3" />
                <p className="text-white/70 mb-4">Inicie sessão para ver as suas reservas.</p>
                <button onClick={() => navigate('/auth')} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#5B6CFF] to-[#7C5CFF] text-white font-bold">
                  Iniciar sessão
                </button>
              </div>
            ) : resLoading ? (
              <div className="mt-6 space-y-3">
                {[0, 1].map((i) => <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />)}
              </div>
            ) : reservations.length === 0 ? (
              <div className="mt-10 text-center">
                <ShoppingBag className="h-10 w-10 text-white/30 mx-auto mb-3" />
                <p className="text-white/70 font-semibold">Ainda não tem reservas</p>
                <p className="text-sm text-white/40 mt-1">Pesquise o medicamento e reserve para levantar com código — vale 24h.</p>
                <button onClick={() => setTab('availability')} className="mt-4 px-5 py-2.5 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/15">
                  Procurar medicamento
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                {reservations.map((r) => {
                  const st = statusLabel[r.status] ?? statusLabel.reserved;
                  const open = r.status === 'reserved' || r.status === 'ready';
                  const hoursLeft = Math.max(0, (new Date(r.expires_at).getTime() - Date.now()) / 36e5);
                  return (
                    <div key={r.id} className={'rounded-2xl border p-4 ' + (open ? 'border-[#5B6CFF]/40 bg-[#5B6CFF]/[0.06]' : 'border-white/10 bg-white/[0.03]')}>
                      <div className="flex items-center gap-2">
                        <p className="flex-1 min-w-0 font-bold text-white text-sm truncate">
                          {r.product_name} × {r.quantity}
                        </p>
                        <span className={'shrink-0 inline-flex px-2 py-1 rounded-full border text-[11px] font-bold ' + st.cls}>
                          {st.label}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-white/50">
                        {r.store_name}{r.store_city ? ` · ${r.store_city}` : ''} · {fmt(r.price)}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <code className="text-lg font-black tracking-widest text-white bg-white/5 rounded-lg px-3 py-1.5 border border-white/10">
                          {r.pickup_code}
                        </code>
                        <button onClick={() => copyCode(r.pickup_code)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors" aria-label="Copiar código">
                          <Copy className="h-4 w-4 text-white/60" />
                        </button>
                        {open && (
                          <span className="ml-auto inline-flex items-center gap-1 text-xs text-amber-300/80">
                            <Clock className="h-3.5 w-3.5" /> {hoursLeft >= 1 ? `${Math.floor(hoursLeft)}h restantes` : `${Math.max(1, Math.round(hoursLeft * 60))} min restantes`}
                          </span>
                        )}
                        {r.status === 'collected' && (
                          <span className="ml-auto inline-flex items-center gap-1 text-xs text-emerald-300">
                            <Check className="h-3.5 w-3.5" /> Levantado
                          </span>
                        )}
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <button onClick={() => navigate(`/store/${r.store_id}`)} className="px-3 py-2 rounded-xl bg-white/5 text-xs font-semibold text-white/70 hover:bg-white/10">
                          Ver farmácia
                        </button>
                        {r.store_phone && (
                          <a href={`tel:${r.store_phone}`} className="px-3 py-2 rounded-xl bg-white/5 text-xs font-semibold text-white/70 hover:bg-white/10 inline-flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" /> Ligar
                          </a>
                        )}
                        {open && (
                          <button onClick={() => cancelReservation(r.id)} className="ml-auto px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-semibold text-red-300 hover:bg-red-500/20 inline-flex items-center gap-1">
                            <Trash2 className="h-3.5 w-3.5" /> Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════ TAB: VIGIAR PREÇO ══════════ */}
        {tab === 'watch' && (
          <div className="pt-5">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <BellRing className="h-4 w-4 text-[#8B9CFF]" /> Avisar-me quando o preço descer
              </h3>
              <p className="text-xs text-white/40 mt-1">Padrão GoodRx Price Alert: defina o alvo e veja aqui quando o melhor preço da plataforma o atinge.</p>
              <div className="mt-3 flex gap-2">
                <input
                  value={watchQuery}
                  onChange={(e) => setWatchQuery(e.target.value)}
                  placeholder="Medicamento (ex.: Coartem)"
                  className="flex-1 min-w-0 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#5B6CFF]/60"
                  aria-label="Medicamento a vigiar"
                />
                <input
                  value={watchTarget}
                  onChange={(e) => setWatchTarget(e.target.value)}
                  placeholder="Alvo MT (opcional)"
                  inputMode="decimal"
                  className="w-36 shrink-0 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#5B6CFF]/60"
                  aria-label="Preço alvo em meticais"
                />
                <button
                  onClick={addWatch}
                  disabled={watchQuery.trim().length < 2}
                  className="shrink-0 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#5B6CFF] to-[#7C5CFF] text-white text-sm font-bold disabled:opacity-40"
                >
                  Vigiar
                </button>
              </div>
            </div>

            {watchLoading ? (
              <div className="mt-4 space-y-3">
                {[0, 1].map((i) => <div key={i} className="h-16 rounded-2xl bg-white/5 animate-pulse" />)}
              </div>
            ) : watches.length === 0 ? (
              <div className="mt-10 text-center">
                <BellRing className="h-10 w-10 text-white/30 mx-auto mb-3" />
                <p className="text-white/70 font-semibold">Nenhum medicamento em vigilância</p>
                <p className="text-sm text-white/40 mt-1">Adicione acima o medicamento e o preço alvo.</p>
              </div>
            ) : (
              <div className="mt-4 grid gap-2">
                {watches.map((w) => (
                  <div key={w.id} className={'rounded-2xl border p-4 flex items-center gap-3 ' + (w.triggered ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-white/10 bg-white/[0.03]')}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{w.query}</p>
                      <p className="text-xs text-white/40 mt-0.5">
                        {w.current_lowest != null ? <>melhor preço hoje: <span className="text-white/80 font-semibold">{fmt(w.current_lowest)}</span></> : 'sem ofertas activas'}
                        {w.target_price != null ? <> · alvo {fmt(w.target_price)}</> : ''}
                      </p>
                    </div>
                    {w.triggered && (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-bold text-emerald-300">
                        <Zap className="h-3 w-3" /> Alvo atingido!
                      </span>
                    )}
                    <button onClick={() => void search(w.query).then(() => setTab('availability'))} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors" aria-label={`Pesquisar ${w.query}`}>
                      <Search className="h-4 w-4 text-white/60" />
                    </button>
                    <button onClick={() => removeWatch(w.id)} className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 transition-colors" aria-label="Remover vigilância">
                      <Trash2 className="h-4 w-4 text-white/40 hover:text-red-300" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

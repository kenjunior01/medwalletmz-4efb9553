/**
 * PatientDeliveries — Entregas do paciente (F14)
 *
 * O cliente pede a recolha de medicamentos/amostras/equipamento numa
 * farmácia, laboratório ou clínica e acompanha a entrega em tempo real:
 *   • estado da linha `health_deliveries` via Postgres Changes (RLS:
 *     o cliente vê/insere/cancela as próprias entregas);
 *   • posição do estafeta via Supabase Realtime BROADCAST
 *     `dw-delivery-{id}` — o estafeta publica a cada ~8 s (app mobile),
 *     aqui apenas subscrevemos. Sem tabelas novas (zero backend).
 *
 * Paridade com a feature `deliveries/` da app Flutter.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Package, MapPin, Navigation, Wallet, X,
  RefreshCw, Radio, ExternalLink, Ban, CheckCircle2, Clock,
} from '@/components/icons/lucide-compat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import { supabase as typedSupabase } from '@/integrations/supabase/client';
import { computeDeliveryFee, type PackageType, type PickupType } from '@/services/healthRiders';
import { formatMZN } from '@/lib/mzPlans';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { logger } from '@/lib/logger';
const supabase = typedSupabase as any;

type DeliveryStatus =
  | 'pending' | 'accepted' | 'arriving_pickup' | 'picked_up'
  | 'in_transit' | 'arriving_dropoff' | 'delivered' | 'cancelled' | 'failed';

interface HealthDelivery {
  id: string;
  rider_id: string | null;
  customer_name: string;
  customer_phone: string;
  country_code: string;
  pickup_type: PickupType;
  pickup_name: string;
  pickup_location: { lat: number; lng: number };
  pickup_address: string | null;
  dropoff_name: string | null;
  dropoff_location: { lat: number; lng: number };
  dropoff_address: string | null;
  dropoff_phone: string | null;
  package_type: PackageType;
  package_description: string | null;
  requires_cold_chain: boolean;
  estimated_distance_km: number | null;
  delivery_fee: number;
  rider_earnings: number;
  platform_fee: number;
  status: DeliveryStatus;
  accepted_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  notes: string | null;
  created_at: string;
}

const STATUS_META: Record<DeliveryStatus, { label: string; emoji: string; cls: string; order: number }> = {
  pending: { label: 'Por aceitar', emoji: '⏳', cls: 'bg-amber-500/15 text-amber-600', order: 0 },
  accepted: { label: 'Aceite', emoji: '🙋', cls: 'bg-sky-500/15 text-sky-600', order: 1 },
  arriving_pickup: { label: 'A caminho da recolha', emoji: '🛵', cls: 'bg-sky-500/15 text-sky-600', order: 2 },
  picked_up: { label: 'Recolhida', emoji: '📦', cls: 'bg-cyan-500/15 text-cyan-600', order: 3 },
  in_transit: { label: 'Em trânsito', emoji: '🛣️', cls: 'bg-cyan-500/15 text-cyan-600', order: 4 },
  arriving_dropoff: { label: 'A chegar', emoji: '📍', cls: 'bg-violet-500/15 text-violet-600', order: 5 },
  delivered: { label: 'Entregue', emoji: '✅', cls: 'bg-emerald-500/15 text-emerald-600', order: 6 },
  cancelled: { label: 'Cancelada', emoji: '✖️', cls: 'bg-red-500/15 text-red-600', order: -1 },
  failed: { label: 'Falhou', emoji: '⚠️', cls: 'bg-red-500/15 text-red-600', order: -1 },
};

const PICKUP_OPTIONS: { key: PickupType; label: string }[] = [
  { key: 'pharmacy', label: '💊 Farmácia' },
  { key: 'lab', label: '🧪 Laboratório' },
  { key: 'clinic', label: '🏥 Clínica' },
  { key: 'warehouse', label: '🏬 Armazém' },
  { key: 'home', label: '🏠 Domicílio' },
];

const PACKAGE_OPTIONS: { key: PackageType; label: string; cold: boolean }[] = [
  { key: 'medication', label: '💊 Medicamentos', cold: true },
  { key: 'lab_sample', label: '🧪 Amostra', cold: true },
  { key: 'equipment', label: '🏥 Equipamento', cold: false },
  { key: 'document', label: '📄 Documentos', cold: false },
  { key: 'other', label: '📦 Outro', cold: false },
];

const VEHICLES = [
  { key: 'foot', label: 'A pé', base: 30 },
  { key: 'bicycle', label: 'Bicicleta', base: 50 },
  { key: 'motorbike', label: 'Mota', base: 80 },
  { key: 'car', label: 'Carro', base: 150 },
];

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function fmtTime(ts: string | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('pt', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function mapsUrl(p: { lat: number; lng: number }): string {
  return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
}

export default function PatientDeliveries() {
  const { t } = useCountry();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [deliveries, setDeliveries] = useState<HealthDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<number | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [tracking, setTracking] = useState<HealthDelivery | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('health_deliveries')
        .select('*')
        .eq('customer_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      setDeliveries((data ?? []) as HealthDelivery[]);
    } catch (e: any) {
      logger.error('PatientDeliveries load failed', { error: e });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('wallets')
      .select('balance_mzn')
      .eq('user_id', user.id)
      .single()
      .then(({ data }: any) => setBalance(data?.balance_mzn ?? 0));
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pb-24 text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-full p-2 hover:bg-white/10"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Entregas de saúde</h1>
            <p className="text-xs text-slate-400">Medicamentos, amostras e equipamento ao domicílio</p>
          </div>
          <Button
            size="sm"
            className="rounded-xl bg-emerald-600 hover:bg-emerald-500"
            onClick={() => setShowNew(true)}
          >
            <Package className="mr-1.5 h-4 w-4" /> Pedir entrega
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-4 pt-5">
        {/* Saldo + CTA */}
        <section className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-600/20 to-slate-900 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">Recolha onde estiver, entrega na sua porta</h2>
              <p className="mt-1 text-sm text-slate-300">
                Estafetas verificados, cadeia de frio para medicamentos térmicos e
                tracking ao vivo no telemóvel do estafeta.
              </p>
            </div>
            <div className="hidden shrink-0 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center sm:block">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-400">
                <Wallet className="h-3 w-3" /> Saldo
              </div>
              <div className="text-sm font-bold text-emerald-400">
                {balance === null ? '…' : formatMZN(balance)}
              </div>
            </div>
          </div>
        </section>

        {/* Lista */}
        <section>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
            As minhas entregas
          </h3>
          {loading ? (
            <div className="flex items-center justify-center py-12" role="status" aria-busy="true">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
            </div>
          ) : deliveries.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
              <div className="text-4xl">🛵</div>
              <p className="mt-2 font-semibold">Ainda sem entregas</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-400">
                Peça a recolha numa farmácia, laboratório ou clínica e acompanhe o
                estafeta em tempo real até à sua porta.
              </p>
              <Button className="mt-4 rounded-xl bg-emerald-600 hover:bg-emerald-500" onClick={() => setShowNew(true)}>
                Pedir a primeira entrega
              </Button>
            </div>
          ) : (
            <ul className="space-y-3">
              {deliveries.map((d) => (
                <li key={d.id}>
                  <button
                    onClick={() => setTracking(d)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-emerald-500/30 hover:bg-white/10"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{STATUS_META[d.status].emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{d.pickup_name}</p>
                        <p className="truncate text-xs text-slate-400">
                          → {d.dropoff_name || d.dropoff_address || 'Destino'}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', STATUS_META[d.status].cls)}>
                            {STATUS_META[d.status].label}
                          </span>
                          {d.requires_cold_chain && (
                            <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-400">
                              ❄️ Cadeia de frio
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500">{fmtTime(d.created_at)}</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-emerald-400">{formatMZN(d.delivery_fee)}</p>
                        {d.estimated_distance_km != null && (
                          <p className="text-[10px] text-slate-500">{d.estimated_distance_km.toFixed(1)} km</p>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {showNew && (
        <NewDeliveryDialog
          onClose={() => setShowNew(false)}
          onCreated={(d) => { setShowNew(false); load(); setTracking(d); }}
        />
      )}

      {tracking && (
        <TrackingDialog
          delivery={tracking}
          onClose={() => { setTracking(null); load(); }}
        />
      )}
    </div>
  );
}

/* ── Diálogo de novo pedido ─────────────────────────────────────────── */

function NewDeliveryDialog({
  onClose, onCreated,
}: {
  onClose: () => void;
  onCreated: (d: HealthDelivery) => void;
}) {
  const { country } = useCountry();
  const { user } = useAuth();

  const [pickupType, setPickupType] = useState<PickupType>('pharmacy');
  const [pickupName, setPickupName] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupPoint, setPickupPoint] = useState<{ lat: number; lng: number } | null>(null);

  const [dropName, setDropName] = useState('');
  const [dropPhone, setDropPhone] = useState(user?.phone ?? '');
  const [dropAddress, setDropAddress] = useState('');
  const [dropPoint, setDropPoint] = useState<{ lat: number; lng: number } | null>(null);

  const [pkg, setPkg] = useState<PackageType>('medication');
  const [description, setDescription] = useState('');
  const [vehicle, setVehicle] = useState('motorbike');
  const [manualKm, setManualKm] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  const distanceKm = useMemo(() => {
    if (pickupPoint && dropPoint) return haversineKm(pickupPoint, dropPoint);
    return manualKm;
  }, [pickupPoint, dropPoint, manualKm]);

  const coldChain = PACKAGE_OPTIONS.find((p) => p.key === pkg)?.cold ?? false;
  const quote = computeDeliveryFee(distanceKm, pkg, vehicle as any);

  const useMyLocation = async (which: 'pickup' | 'drop') => {
    if (!('geolocation' in navigator)) {
      toast.error('Geolocalização não disponível neste dispositivo');
      return;
    }
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 10000 }),
      );
      const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      if (which === 'pickup') setPickupPoint(point);
      else setDropPoint(point);
      toast.success('Localização capturada');
    } catch {
      toast.error('Não foi possível obter a localização');
    }
  };

  const canSubmit =
    pickupName.trim().length >= 3 &&
    dropName.trim().length >= 3 &&
    dropPhone.trim().length >= 9 &&
    dropAddress.trim().length >= 4 &&
    distanceKm > 0 &&
    !submitting;

  const submit = async () => {
    if (!user?.id || !canSubmit) return;
    setSubmitting(true);
    try {
      // Verificar saldo antes (o RPC volta a validar de forma transaccional)
      const { data: w } = await supabase.from('wallets').select('balance_mzn').eq('user_id', user.id).single();
      if ((w?.balance_mzn ?? 0) < quote.fee) {
        toast.error(`Saldo insuficiente (${formatMZN(w?.balance_mzn ?? 0)}). Carregue a carteira.`);
        setSubmitting(false);
        return;
      }
      const { data, error } = await supabase
        .from('health_deliveries')
        .insert({
          customer_user_id: user.id,
          customer_name: dropName.trim(),
          customer_phone: dropPhone.trim(),
          country_code: country?.id || 'MZ',
          pickup_type: pickupType,
          pickup_name: pickupName.trim(),
          pickup_location: pickupPoint ?? { lat: -25.9692, lng: 32.5731 },
          pickup_address: pickupAddress.trim() || null,
          dropoff_name: dropName.trim(),
          dropoff_location: dropPoint ?? { lat: -25.9692, lng: 32.5731 },
          dropoff_address: dropAddress.trim(),
          dropoff_phone: dropPhone.trim(),
          package_type: pkg,
          package_description: description.trim() || null,
          requires_cold_chain: coldChain,
          requires_signature: true,
          estimated_distance_km: Number(distanceKm.toFixed(2)),
          delivery_fee: quote.fee,
          rider_earnings: quote.rider_earnings,
          platform_fee: quote.platform_fee,
          status: 'pending',
          source: 'app',
        })
        .select()
        .single();
      if (error) throw error;
      const delivery = data as HealthDelivery;
      try {
        await supabase.rpc('wallet_debit', {
          _user_id: user.id,
          _amount: quote.fee,
          _service_type: 'delivery',
          _ref_id: delivery.id,
          _description: `Entrega · ${pickupName.trim()} → ${dropAddress.trim() || dropName.trim()}`,
        });
      } catch (payErr: any) {
        // Compensação — sem saldo a entrega não fica pendurada
        await supabase
          .from('health_deliveries')
          .update({ status: 'cancelled', cancel_reason: 'Pagamento da carteira falhou', cancelled_at: new Date().toISOString() })
          .eq('id', delivery.id)
          .eq('status', 'pending');
        throw payErr;
      }
      toast.success('Pedido criado! A acompanhar a entrega…');
      onCreated(delivery);
    } catch (e: any) {
      logger.error('Create delivery failed', { error: e });
      toast.error('Não foi possível criar o pedido. Verifique o saldo e tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-slate-900 p-6 sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Pedir entrega</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Recolha */}
          <section>
            <Label className="text-xs uppercase tracking-wide text-slate-400">Onde recolher</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {PICKUP_OPTIONS.map((o) => (
                <button
                  key={o.key}
                  onClick={() => setPickupType(o.key)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                    pickupType === o.key
                      ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20',
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <Input className="mt-3" placeholder="Ex.: Farmácia Moderna, Av. Nyerere" value={pickupName} onChange={(e) => setPickupName(e.target.value)} />
            <Input className="mt-2" placeholder="Referência / andar (opcional)" value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} />
            <button
              onClick={() => useMyLocation('pickup')}
              className={cn(
                'mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition',
                pickupPoint ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-white/15 text-slate-400 hover:text-slate-200',
              )}
            >
              <MapPin className="h-3.5 w-3.5" />
              {pickupPoint ? `Ponto OK (${pickupPoint.lat.toFixed(4)}, ${pickupPoint.lng.toFixed(4)})` : 'Usar a minha localização'}
            </button>
          </section>

          {/* Destino */}
          <section>
            <Label className="text-xs uppercase tracking-wide text-slate-400">Entrega</Label>
            <Input className="mt-2" placeholder="Nome de quem recebe" value={dropName} onChange={(e) => setDropName(e.target.value)} />
            <Input className="mt-2" placeholder="Telefone (+258…)" value={dropPhone} onChange={(e) => setDropPhone(e.target.value)} />
            <Input className="mt-2" placeholder="Bairro, rua, nº da porta" value={dropAddress} onChange={(e) => setDropAddress(e.target.value)} />
            <button
              onClick={() => useMyLocation('drop')}
              className={cn(
                'mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition',
                dropPoint ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-white/15 text-slate-400 hover:text-slate-200',
              )}
            >
              <Navigation className="h-3.5 w-3.5" />
              {dropPoint ? `Destino OK (${dropPoint.lat.toFixed(4)}, ${dropPoint.lng.toFixed(4)})` : 'Marcar destino no mapa'}
            </button>
          </section>

          {/* Encomenda */}
          <section>
            <Label className="text-xs uppercase tracking-wide text-slate-400">Encomenda</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {PACKAGE_OPTIONS.map((o) => (
                <button
                  key={o.key}
                  onClick={() => setPkg(o.key)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                    pkg === o.key
                      ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20',
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <Input className="mt-3" placeholder="Descrição (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />
          </section>

          {/* Veículo + distância + preço */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <Label className="text-xs uppercase tracking-wide text-slate-400">Estafeta preferido</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {VEHICLES.map((v) => (
                <button
                  key={v.key}
                  onClick={() => setVehicle(v.key)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                    vehicle === v.key
                      ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20',
                  )}
                >
                  {v.label} · base {formatMZN(v.base)}
                </button>
              ))}
            </div>

            {!pickupPoint || !dropPoint ? (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Distância estimada (manual)</span>
                  <span className="font-bold text-slate-200">{manualKm} km</span>
                </div>
                <input
                  type="range" min={1} max={40} step={1} value={manualKm}
                  onChange={(e) => setManualKm(Number(e.target.value))}
                  className="mt-1 w-full accent-emerald-500"
                  aria-label="Distância estimada em km"
                />
              </div>
            ) : (
              <p className="mt-3 text-xs text-slate-400">
                Distância calculada: <span className="font-bold text-slate-200">{distanceKm.toFixed(1)} km</span>
              </p>
            )}

            <div className="mt-4 space-y-1 border-t border-white/10 pt-3 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Tarifa (base + {formatMZN(15)}/km)</span>
                <span>{formatMZN(quote.fee)}</span>
              </div>
              {coldChain && (
                <div className="flex justify-between text-slate-400">
                  <span>Cadeia de frio</span>
                  <span>+{formatMZN(30)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 text-base font-bold text-emerald-400">
                <span>Total (carteira)</span>
                <span>{formatMZN(quote.fee)}</span>
              </div>
            </div>
          </section>

          <Button
            onClick={submit}
            disabled={!canSubmit}
            className="w-full rounded-xl bg-emerald-600 py-5 text-base font-bold hover:bg-emerald-500"
          >
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Package className="mr-2 h-4 w-4" />}
            Confirmar e pagar {formatMZN(quote.fee)}
          </Button>
          <p className="text-center text-[11px] text-slate-500">
            Pode cancelar gratuitamente enquanto o pedido estiver “Por aceitar”.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Diálogo de tracking ────────────────────────────────────────────── */

function TrackingDialog({ delivery, onClose }: { delivery: HealthDelivery; onClose: () => void }) {
  const [current, setCurrent] = useState<HealthDelivery>(delivery);
  const [riderPos, setRiderPos] = useState<{ lat: number; lng: number } | null>(null);
  const [live, setLive] = useState(false);
  const channelsRef = useRef<any[]>([]);

  useEffect(() => {
    const id = delivery.id;
    // 1. Estado da linha via Postgres Changes (RLS do cliente)
    const rowCh = supabase
      .channel(`dw-row-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'health_deliveries', filter: `id=eq.${id}` },
        (payload: any) => {
          if (payload?.new) setCurrent(payload.new as HealthDelivery);
        },
      )
      .subscribe();
    // 2. Posição do estafeta via broadcast (o estafeta publica a cada ~8 s)
    const posCh = supabase
      .channel(`dw-delivery-${id}`)
      .on('broadcast', { event: 'rider_position' }, (msg: any) => {
        const p = msg?.payload;
        if (p?.lat != null && p?.lng != null) {
          setRiderPos({ lat: p.lat, lng: p.lng });
          setLive(true);
        }
      })
      .subscribe();
    channelsRef.current = [rowCh, posCh];
    return () => {
      channelsRef.current.forEach((ch) => { try { supabase.removeChannel(ch); } catch { /* noop */ } });
      channelsRef.current = [];
    };
  }, [delivery.id]);

  const meta = STATUS_META[current.status];
  const cancelled = current.status === 'cancelled' || current.status === 'failed';
  const steps: { key: DeliveryStatus; label: string; ts: string | null }[] = [
    { key: 'pending', label: 'Pedido criado', ts: current.created_at },
    { key: 'accepted', label: 'Aceite pelo estafeta', ts: current.accepted_at },
    { key: 'picked_up', label: 'Encomenda recolhida', ts: current.picked_up_at },
    { key: 'in_transit', label: 'Em trânsito', ts: current.picked_up_at },
    { key: 'delivered', label: 'Entregue', ts: current.delivered_at },
  ];

  const cancel = async () => {
    try {
      const { error } = await supabase
        .from('health_deliveries')
        .update({ status: 'cancelled', cancel_reason: 'Cancelado pelo cliente', cancelled_at: new Date().toISOString() })
        .eq('id', current.id)
        .eq('status', 'pending');
      if (error) throw error;
      toast.success('Entrega cancelada');
      setCurrent({ ...current, status: 'cancelled', cancel_reason: 'Cancelado pelo cliente' });
    } catch (e: any) {
      logger.error('Cancel failed', { error: e });
      toast.error('Só é possível cancelar enquanto o pedido está por aceitar');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-slate-900 p-6 sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Acompanhar entrega</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className={cn('rounded-2xl border p-4', cancelled ? 'border-red-500/30 bg-red-500/10' : 'border-emerald-500/25 bg-emerald-500/10')}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">{meta.emoji}</span>
              <span className="font-bold">{meta.label}</span>
            </div>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold',
                live ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-slate-400',
              )}
            >
              <Radio className={cn('h-3 w-3', live && 'animate-pulse')} />
              {live ? 'GPS do estafeta ao vivo' : current.status === 'pending' ? 'à espera de estafeta' : 'tracking de estados'}
            </span>
          </div>
          {current.cancel_reason && (
            <p className="mt-2 text-xs text-red-300">Motivo: {current.cancel_reason}</p>
          )}
          {riderPos && (
            <a
              href={mapsUrl(riderPos)}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/15"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Ver posição do estafeta no mapa ({riderPos.lat.toFixed(4)}, {riderPos.lng.toFixed(4)})
            </a>
          )}
        </div>

        {/* Timeline */}
        <ol className="mt-5 space-y-0">
          {steps.map((s, i) => {
            const m = STATUS_META[s.key];
            const done = !cancelled && meta.order >= m.order;
            const isLast = i === steps.length - 1;
            return (
              <li key={s.key} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px]',
                      done ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300' : 'border-slate-700 bg-white/5 text-slate-600',
                    )}
                  >
                    {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3 w-3" />}
                  </span>
                  {!isLast && <span className={cn('w-0.5 flex-1', done ? 'bg-emerald-500/50' : 'bg-slate-800')} />}
                </div>
                <div className={cn('flex-1 pb-5', isLast && 'pb-1')}>
                  <p className={cn('text-sm font-semibold', done ? 'text-slate-100' : 'text-slate-500')}>{s.label}</p>
                  <p className="text-[11px] text-slate-500">{fmtTime(s.ts)}</p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-4 space-y-1.5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
          <p className="text-slate-400">🏥 Recolha: <span className="text-slate-200">{current.pickup_name}</span></p>
          <p className="text-slate-400">🏠 Destino: <span className="text-slate-200">{current.dropoff_address || current.dropoff_name || '—'}</span></p>
          <p className="text-slate-400">💰 Taxa: <span className="font-bold text-emerald-400">{formatMZN(current.delivery_fee)}</span></p>
          {current.requires_cold_chain && <p className="text-cyan-400">❄️ Cadeia de frio activa</p>}
        </div>

        <div className="mt-5 flex gap-2">
          {current.status === 'pending' && (
            <Button variant="outline" className="flex-1 rounded-xl border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={cancel}>
              <Ban className="mr-1.5 h-4 w-4" /> Cancelar
            </Button>
          )}
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}

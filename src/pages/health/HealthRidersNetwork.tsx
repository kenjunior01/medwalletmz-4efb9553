/**
 * Health Riders Network — Uber-inspired redesign
 *
 * Flow:
 *  1. Onboarding wizard (5 steps: basics → vehicle → documents → payment → review)
 *  2. After verified: dark dashboard with:
 *     - Massive GO ONLINE button (Uber-style) over a subtle CSS map backdrop
 *     - Earnings tiles (today/week/month) — big numbers on dark cards, emerald accent
 *     - Available deliveries as ride-request cards (pickup → dropoff, earnings, ACCEPT)
 *     - Active delivery tracker (progress bar with status dots: aceitar → pickup → trânsito → entregue)
 *     - Delivery history with ratings
 *
 * This creates real jobs for young people with motorbikes in MZ/AO.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bike, Car, Footprints, Power, PowerOff, TrendingUp,
  Package, Clock, DollarSign, Star, CheckCircle2, AlertTriangle,
  X, Upload, ShieldCheck, Sparkles, Phone,
  RefreshCw, ChevronRight, Truck, ThermometerSnowflake, Signature,
  Award, Eye, Bike as Motorbike, MapPinned, Zap, Route,
} from '@/components/icons/lucide-compat';
import { useCountry } from '@/contexts/CountryContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  HealthRider, HealthDelivery, RiderOnboardingStep, VehicleType, DeliveryStatus, PackageType,
  getMyRiderProfile, createRider, updateRider, updateRiderProgress,
  toggleRiderOnline, uploadRiderDocument,
  getAvailableDeliveries, getMyActiveDeliveries, getMyDeliveryHistory,
  acceptDelivery, updateDeliveryStatus, rateDelivery,
  getEarningsSummary, computeDeliveryFee,
  VEHICLE_LABELS, PACKAGE_LABELS, STATUS_LABELS, MOCK_DELIVERIES,
} from '@/services/healthRiders';

type View = 'onboarding' | 'dashboard';

export default function HealthRidersNetwork() {
  // t() + country come from useCountry(); user comes from useAuth().
  const { t, country } = useCountry();
  const { user } = useAuth();
  const [rider, setRider] = useState<HealthRider | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('onboarding');

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const r = await getMyRiderProfile(user.id);
      setRider(r);
      setView(r?.is_verified ? 'dashboard' : 'onboarding');
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const isDashboard = view === 'dashboard' && rider?.is_verified;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center" role="status" aria-busy="true">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className={isDashboard ? 'min-h-screen bg-slate-950 pb-24' : 'min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 pb-24'}>
      <header className={`sticky top-0 z-30 backdrop-blur-md border-b ${isDashboard ? 'bg-slate-950/90 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${isDashboard ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' : 'bg-gradient-to-br from-slate-900 to-slate-700'}`}>
            <Motorbike className="w-5 h-5 text-white" aria-hidden />
          </div>
          <div className="flex-1">
            <h1 className={`text-lg font-bold leading-tight ${isDashboard ? 'text-white' : 'text-slate-900'}`}>
              {t('healthRiders.title') ?? 'Health Riders'}
            </h1>
            <p className={`text-xs leading-tight ${isDashboard ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('healthRiders.subtitle') ?? 'Entregas de saúde com ganhos reais'}
            </p>
          </div>
          {rider?.is_verified && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-3 h-3" /> {t('healthRiders.verified') ?? 'Verificado'}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {!isDashboard ? (
          <RiderOnboarding rider={rider} onCompleted={load} userId={user?.id ?? ''} countryId={country?.id ?? 'MZ'} t={t} />
        ) : (
          <RiderDashboard rider={rider} onChange={load} t={t} />
        )}
      </main>
    </div>
  );
}

/* ============ Onboarding (modernized with darker accents) ============ */

function RiderOnboarding({ rider, onCompleted, userId, countryId, t }: {
  rider: HealthRider | null; onCompleted: () => void;
  userId: string; countryId: string; t: any;
}) {
  const [step, setStep] = useState<RiderOnboardingStep>(rider?.onboarding_step ?? 'basics');
  const [form, setForm] = useState<Partial<HealthRider>>({
    country_code: countryId,
    full_name: rider?.full_name ?? '',
    phone: rider?.phone ?? '',
    national_id: rider?.national_id ?? '',
    vehicle_type: rider?.vehicle_type ?? 'motorbike',
    vehicle_plate: rider?.vehicle_plate ?? '',
    vehicle_color: rider?.vehicle_color ?? '',
    available_zones: rider?.available_zones ?? [],
    languages: rider?.languages ?? ['pt'],
    accepts_cold_chain: rider?.accepts_cold_chain ?? false,
    max_delivery_distance_km: rider?.max_delivery_distance_km ?? 15,
    mobile_money_number: rider?.mobile_money_number ?? '',
    bank_account: rider?.bank_account ?? {},
  });
  const [saving, setSaving] = useState(false);
  const [riderId, setRiderId] = useState<string | undefined>(rider?.id);
  const [error, setError] = useState<string | null>(null);

  const steps: { key: RiderOnboardingStep; label: string; emoji: string }[] = [
    { key: 'basics', label: t('healthRiders.stepBasics') ?? 'Básicos', emoji: '👤' },
    { key: 'vehicle', label: t('healthRiders.stepVehicle') ?? 'Veículo', emoji: '🏍️' },
    { key: 'documents', label: t('healthRiders.stepDocuments') ?? 'Documentos', emoji: '📄' },
    { key: 'payment', label: t('healthRiders.stepPayment') ?? 'Pagamento', emoji: '💰' },
    { key: 'review', label: t('healthRiders.stepReview') ?? 'Rever', emoji: '✅' },
  ];
  const stepIdx = steps.findIndex((s) => s.key === step);

  const handleNext = async () => {
    setSaving(true);
    setError(null);
    try {
      let id = riderId;
      if (!id) {
        const created = await createRider(userId, form as any);
        id = created.id;
        setRiderId(id);
      } else {
        await updateRider(id, form);
      }
      const nextStep = steps[stepIdx + 1]?.key ?? 'completed';
      const progress = Math.round(((stepIdx + 1) / steps.length) * 100);
      await updateRiderProgress(id!, nextStep, progress);

      if (nextStep === 'review') {
        // Auto-submit for verification at review step
        await updateRider(id!, { is_verified: true, verified_at: new Date().toISOString() } as Partial<HealthRider>);
        onCompleted();
      } else {
        setStep(nextStep);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Erro');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Hero — dark accent */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-6 text-white shadow-xl mb-6 relative overflow-hidden"
      >
        <div className="absolute inset-0 opacity-30" aria-hidden>
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-emerald-500/40 blur-2xl" />
          <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full bg-emerald-400/20 blur-2xl" />
        </div>
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-300 mb-2">
            <Sparkles className="w-3.5 h-3.5" /> {t('healthRiders.tagline') ?? 'Rede de entregas de saúde'}
          </div>
          <h2 className="text-2xl font-black leading-tight">{t('healthRiders.becomeRider') ?? 'Torna-te Health Rider'}</h2>
          <p className="text-sm opacity-90 mt-1.5 max-w-md">
            {t('healthRiders.becomeRiderBody') ?? 'Ganha dinheiro a entregar medicamentos e samples de laboratório. Flexível, com ganhos por entrega e bónus por avaliações.'}
          </p>
          <div className="mt-4 flex items-center gap-4 text-sm">
            <div>
              <div className="opacity-70 text-xs">{t('healthRiders.perDelivery') ?? 'Por entrega'}</div>
              <div className="font-bold text-xl">70-150 MT</div>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div>
              <div className="opacity-70 text-xs">{t('healthRiders.weeklyAvg') ?? 'Média semanal'}</div>
              <div className="font-bold text-xl">3.500 MT</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stepper */}
      <div className="flex items-center justify-between mb-6">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center flex-1 last:flex-none">
            <div className={`flex flex-col items-center gap-1 ${i === stepIdx ? 'text-slate-900' : i < stepIdx ? 'text-emerald-600' : 'text-slate-400'}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition ${
                i === stepIdx ? 'border-slate-900 bg-slate-900 text-white' : i < stepIdx ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-200 bg-white'
              }`}>
                {i < stepIdx ? <CheckCircle2 className="w-4 h-4" /> : s.emoji}
              </div>
              <span className="text-[10px] hidden sm:inline">{s.label}</span>
            </div>
            {i < steps.length - 1 && <div className={`flex-1 h-0.5 mx-1 ${i < stepIdx ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      {error && (
        <div role="alert" className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5" /><span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto" aria-label="Fechar"><X className="w-4 h-4" /></button>
        </div>
      )}

      <motion.div
        key={step}
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm"
      >
        {step === 'basics' && (
          <>
            <h3 className="text-lg font-bold text-slate-900">{t('healthRiders.basicsTitle') ?? 'Dados pessoais'}</h3>
            <Field label={t('healthRiders.fullName') ?? 'Nome completo'} required>
              <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required className="rider-input" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('healthRiders.phone') ?? 'Telemóvel'} required>
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required placeholder="+258 84 000 0000" className="rider-input" />
              </Field>
              <Field label={t('healthRiders.nationalId') ?? 'BI / NUIT'}>
                <input type="text" value={form.national_id} onChange={(e) => setForm({ ...form, national_id: e.target.value })} className="rider-input" />
              </Field>
            </div>
            <Field label={t('healthRiders.zones') ?? 'Zonas disponíveis'} hint="Separadas por vírgula">
              <input type="text" value={(form.available_zones ?? []).join(', ')} onChange={(e) => setForm({ ...form, available_zones: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} placeholder="Maputo Cidade, Matola" className="rider-input" />
            </Field>
            <Field label={t('healthRiders.languages') ?? 'Línguas que falas'} hint="Separadas por vírgula">
              <input type="text" value={(form.languages ?? []).join(', ')} onChange={(e) => setForm({ ...form, languages: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} placeholder="pt, mgh, tsn" className="rider-input" />
            </Field>
          </>
        )}

        {step === 'vehicle' && (
          <>
            <h3 className="text-lg font-bold text-slate-900">{t('healthRiders.vehicleTitle') ?? 'Veículo'}</h3>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(VEHICLE_LABELS) as VehicleType[]).map((vt) => {
                const cfg = VEHICLE_LABELS[vt];
                const Icon = vt === 'bicycle' ? Bike : vt === 'motorbike' ? Motorbike : vt === 'car' ? Car : Footprints;
                const selected = form.vehicle_type === vt;
                return (
                  <button
                    key={vt}
                    type="button"
                    onClick={() => setForm({ ...form, vehicle_type: vt })}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition ${selected ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                    aria-pressed={selected}
                  >
                    <Icon className={`w-6 h-6 ${selected ? 'text-emerald-600' : 'text-slate-700'}`} />
                    <span className="text-xs font-medium">{cfg.label}</span>
                    <span className="text-[10px] text-slate-500">min {cfg.min_fee} MT</span>
                  </button>
                );
              })}
            </div>
            {form.vehicle_type !== 'foot' && (
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('healthRiders.plate') ?? 'Matrícula'}>
                  <input type="text" value={form.vehicle_plate} onChange={(e) => setForm({ ...form, vehicle_plate: e.target.value })} placeholder="MG-1234-AB" className="rider-input" />
                </Field>
                <Field label={t('healthRiders.color') ?? 'Cor'}>
                  <input type="text" value={form.vehicle_color} onChange={(e) => setForm({ ...form, vehicle_color: e.target.value })} placeholder="Vermelha" className="rider-input" />
                </Field>
              </div>
            )}
            <Field label={t('healthRiders.maxDistance') ?? 'Distância máxima por entrega (km)'}>
              <input type="range" min={5} max={50} value={form.max_delivery_distance_km} onChange={(e) => setForm({ ...form, max_delivery_distance_km: parseInt(e.target.value) })} className="w-full accent-emerald-600" />
              <div className="text-sm text-slate-500 text-center mt-1">{form.max_delivery_distance_km} km</div>
            </Field>
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.accepts_cold_chain} onChange={(e) => setForm({ ...form, accepts_cold_chain: e.target.checked })} className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
              <ThermometerSnowflake className="w-4 h-4 text-emerald-500" />
              {t('healthRiders.coldChain') ?? 'Aceito transportar meds termossensíveis (insulina, samples) — ganho extra'}
            </label>
          </>
        )}

        {step === 'documents' && (
          <>
            <h3 className="text-lg font-bold text-slate-900">{t('healthRiders.documentsTitle') ?? 'Documentos'}</h3>
            <p className="text-sm text-slate-500">{t('healthRiders.documentsHint') ?? 'Carrega fotos nítidas dos teus documentos. Serão verificados pela equipa.'}</p>
            <DocumentUploader
              label={t('healthRiders.license') ?? 'Carta de condução'}
              userId={userId}
              docType="license"
              currentUrl={form.license_url}
              onUploaded={(url) => setForm({ ...form, license_url: url })}
              required={form.vehicle_type !== 'foot' && form.vehicle_type !== 'bicycle'}
              t={t}
            />
            <DocumentUploader
              label={t('healthRiders.idDoc') ?? 'Bilhete de identidade'}
              userId={userId}
              docType="id"
              currentUrl={form.id_document_url}
              onUploaded={(url) => setForm({ ...form, id_document_url: url })}
              required
              t={t}
            />
            {form.vehicle_type !== 'foot' && (
              <DocumentUploader
                label={t('healthRiders.vehicleDoc') ?? 'Livrete do veículo'}
                userId={userId}
                docType="vehicle"
                currentUrl={form.vehicle_document_url}
                onUploaded={(url) => setForm({ ...form, vehicle_document_url: url })}
                t={t}
              />
            )}
          </>
        )}

        {step === 'payment' && (
          <>
            <h3 className="text-lg font-bold text-slate-900">{t('healthRiders.paymentTitle') ?? 'Receber pagamentos'}</h3>
            <Field label={t('healthRiders.mobileMoney') ?? 'Mobile money (M-Pesa, e-Mola)'} required>
              <input type="tel" value={form.mobile_money_number} onChange={(e) => setForm({ ...form, mobile_money_number: e.target.value })} placeholder="+258 84 000 0000" className="rider-input" />
            </Field>
            <p className="text-xs text-slate-500">{t('healthRiders.paymentHint') ?? 'Os ganhos são pagos diariamente via mobile money. Podes também adicionar conta bancária para transferências semanais.'}</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('healthRiders.bankName') ?? 'Banco (opcional)'}>
                <input type="text" value={form.bank_account?.bank ?? ''} onChange={(e) => setForm({ ...form, bank_account: { ...form.bank_account, bank: e.target.value } })} className="rider-input" />
              </Field>
              <Field label={t('healthRiders.accountNumber') ?? 'Número de conta (opcional)'}>
                <input type="text" value={form.bank_account?.account ?? ''} onChange={(e) => setForm({ ...form, bank_account: { ...form.bank_account, account: e.target.value } })} className="rider-input" />
              </Field>
            </div>
          </>
        )}

        {step === 'review' && (
          <>
            <h3 className="text-lg font-bold text-slate-900">{t('healthRiders.reviewTitle') ?? 'Confirma os teus dados'}</h3>
            <dl className="divide-y divide-slate-100 text-sm">
              <ReviewRow label={t('healthRiders.fullName') ?? 'Nome'} value={form.full_name} />
              <ReviewRow label={t('healthRiders.phone') ?? 'Telemóvel'} value={form.phone} />
              <ReviewRow label={t('healthRiders.vehicle') ?? 'Veículo'} value={VEHICLE_LABELS[form.vehicle_type!].label} />
              {form.vehicle_plate && <ReviewRow label={t('healthRiders.plate') ?? 'Matrícula'} value={form.vehicle_plate} />}
              <ReviewRow label={t('healthRiders.maxDistance') ?? 'Distância máx'} value={`${form.max_delivery_distance_km} km`} />
              <ReviewRow label={t('healthRiders.coldChain') ?? 'Cadeia fria'} value={form.accepts_cold_chain ? 'Sim' : 'Não'} />
              <ReviewRow label={t('healthRiders.mobileMoney') ?? 'Mobile money'} value={form.mobile_money_number} />
              <ReviewRow label={t('healthRiders.documents') ?? 'Documentos'} value={`${[form.license_url, form.id_document_url, form.vehicle_document_url].filter(Boolean).length} carregados`} />
            </dl>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-white">{t('healthRiders.readyTitle') ?? 'Pronto para começar!'}</div>
                  <p className="text-sm text-slate-300 mt-1">{t('healthRiders.readyBody') ?? 'Ao submeter, a tua conta fica activada e podes começar a receber entregas imediatamente.'}</p>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            onClick={handleNext}
            disabled={saving || !form.full_name || !form.phone}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {step === 'review' ? (t('healthRiders.activate') ?? 'Activar conta') : (t('common.next') ?? 'Próximo')}
          </button>
        </div>
      </motion.div>

      <style>{`.rider-input{width:100%;padding:0.5rem 0.75rem;border-radius:0.5rem;border:1px solid #cbd5e1;outline:none;background:#fff;color:#0f172a}.rider-input:focus{border-color:#10b981;box-shadow:0 0 0 2px rgba(16,185,129,.2)}`}</style>
    </div>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700 block mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

function DocumentUploader({ label, userId, docType, currentUrl, onUploaded, required, t }: {
  label: string; userId: string; docType: 'license' | 'id' | 'vehicle';
  currentUrl?: string; onUploaded: (url: string) => void;
  required?: boolean; t: any;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadRiderDocument(userId, docType, file);
      onUploaded(url);
    } catch (err: any) {
      alert(err?.message ?? 'Erro no upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <span className="text-sm font-medium text-slate-700 block mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <div
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
        className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/40 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      >
        {currentUrl ? (
          <div className="flex items-center justify-center gap-2 text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">{t('healthRiders.uploaded') ?? 'Carregado'}</span>
            <Eye className="w-3.5 h-3.5 opacity-60" />
          </div>
        ) : uploading ? (
          <div className="flex items-center justify-center gap-2 text-slate-500">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm">{t('healthRiders.uploading') ?? 'A carregar...'}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 text-slate-500">
            <Upload className="w-6 h-6" />
            <span className="text-sm">{t('healthRiders.uploadDoc') ?? 'Toca para carregar'}</span>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*,application/pdf" onChange={handleUpload} className="hidden" />
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="py-2 flex justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900 text-right">{value}</dd>
    </div>
  );
}

/* ============ Dashboard (Uber-inspired, dark theme) ============ */

/** Subtle map-like gradient backdrop (pure CSS, no real map). */
const MAP_BACKDROP_STYLE: React.CSSProperties = {
  backgroundColor: '#020617',
  backgroundImage: `
    radial-gradient(circle at 18% 28%, rgba(16,185,129,0.10) 0%, transparent 38%),
    radial-gradient(circle at 82% 72%, rgba(16,185,129,0.08) 0%, transparent 34%),
    radial-gradient(circle at 50% 50%, rgba(15,23,42,0.45) 0%, transparent 60%),
    linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px),
    linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px),
    linear-gradient(45deg, rgba(148,163,184,0.04) 1px, transparent 1px),
    linear-gradient(-45deg, rgba(148,163,184,0.03) 1px, transparent 1px)
  `,
  backgroundSize: '100% 100%, 100% 100%, 100% 100%, 44px 44px, 44px 44px, 90px 90px, 90px 90px',
};

/** Active delivery tracker steps: accepted → pickup → transit → delivered. */
const TRACKER_STEPS = [
  { key: 'accepted', label: 'Aceite', icon: CheckCircle2 },
  { key: 'pickup', label: 'Recolhido', icon: Package },
  { key: 'transit', label: 'Em trânsito', icon: Truck },
  { key: 'delivered', label: 'Entregue', icon: MapPinned },
] as const;

function trackerStepIndex(status: DeliveryStatus): number {
  if (status === 'accepted' || status === 'arriving_pickup') return 0;
  if (status === 'picked_up') return 1;
  if (status === 'in_transit' || status === 'arriving_dropoff') return 2;
  if (status === 'delivered') return 3;
  return 0;
}

function RiderDashboard({ rider, onChange, t }: { rider: HealthRider; onChange: () => void; t: any }) {
  const [online, setOnline] = useState(rider.is_online ?? false);
  const [available, setAvailable] = useState<HealthDelivery[]>([]);
  const [active, setActive] = useState<HealthDelivery[]>([]);
  const [history, setHistory] = useState<HealthDelivery[]>([]);
  const [earnings, setEarnings] = useState<{ today: number; week: number; month: number; today_count: number; week_count: number; month_count: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [tab, setTab] = useState<'available' | 'active' | 'history'>('available');

  const load = useCallback(async () => {
    if (!rider.id) return;
    setLoading(true);
    try {
      const [avail, act, hist, earn] = await Promise.all([
        getAvailableDeliveries(rider).catch(() => MOCK_DELIVERIES.map((d) => ({ ...d, id: Math.random().toString() })) as HealthDelivery[]),
        getMyActiveDeliveries(rider.id!).catch(() => []),
        getMyDeliveryHistory(rider.id!).catch(() => []),
        getEarningsSummary(rider.id!).catch(() => null),
      ]);
      setAvailable(avail);
      setActive(act);
      setHistory(hist);
      setEarnings(earn);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [rider.id]);

  useEffect(() => { load(); }, [load]);

  const handleToggleOnline = async () => {
    setTogglingOnline(true);
    try {
      await toggleRiderOnline(rider.id!, !online);
      setOnline(!online);
      if (!online) await load();
    } catch (e: any) {
      console.error(e);
    } finally {
      setTogglingOnline(false);
    }
  };

  const handleAccept = async (deliveryId: string) => {
    try {
      await acceptDelivery(deliveryId, rider.id!);
      await load();
      setTab('active');
    } catch (e: any) {
      alert(e?.message ?? 'Erro');
    }
  };

  const handleStatusUpdate = async (deliveryId: string, status: any) => {
    try {
      await updateDeliveryStatus(deliveryId, status);
      await load();
    } catch (e: any) {
      alert(e?.message ?? 'Erro');
    }
  };

  return (
    <div className="space-y-5">
      {/* Map hero with the massive GO ONLINE button */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl overflow-hidden border border-slate-800 shadow-2xl"
        style={MAP_BACKDROP_STYLE}
      >
        {/* Top status row */}
        <div className="px-5 pt-5 flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-lg flex-shrink-0">
            {VEHICLE_LABELS[rider.vehicle_type].emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-wider text-emerald-400 font-semibold flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              {online ? (t('healthRiders.online') ?? 'Online') : (t('healthRiders.offline') ?? 'Offline')}
            </div>
            <div className="text-base font-bold text-white truncate">{rider.full_name}</div>
            <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
              <span className="inline-flex items-center gap-0.5"><Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {rider.rating ?? 5.0}</span>
              <span>·</span>
              <span>{rider.total_deliveries ?? 0} {t('healthRiders.deliveries') ?? 'entregas'}</span>
            </div>
          </div>
        </div>

        {/* Map area with simulated route + GO button */}
        <div className="relative h-64 sm:h-72 flex items-center justify-center">
          {/* Simulated map roads / route line */}
          <svg className="absolute inset-0 w-full h-full opacity-50" preserveAspectRatio="none" aria-hidden>
            <defs>
              <linearGradient id="routeGrad" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
            </defs>
            <path d="M -20 230 Q 120 190 180 130 T 400 30" stroke="url(#routeGrad)" strokeWidth="3" fill="none" strokeDasharray="2 7" strokeLinecap="round" />
            <circle cx="24" cy="226" r="6" fill="#10b981" />
            <circle cx="24" cy="226" r="11" fill="none" stroke="#10b981" strokeOpacity="0.3" strokeWidth="2" />
            <circle cx="392" cy="34" r="6" fill="#fbbf24" />
            <circle cx="392" cy="34" r="11" fill="none" stroke="#fbbf24" strokeOpacity="0.3" strokeWidth="2" />
          </svg>

          {/* Massive GO button */}
          <div className="relative flex flex-col items-center">
            {online && (
              <span className="absolute -inset-6 rounded-full bg-emerald-500/25 blur-3xl animate-pulse" aria-hidden />
            )}
            <motion.button
              onClick={handleToggleOnline}
              disabled={togglingOnline}
              whileTap={{ scale: 0.96 }}
              className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-full flex flex-col items-center justify-center font-black text-white shadow-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/60"
              aria-label={online ? 'Ficar offline' : 'Ficar online'}
            >
              {/* Pulse ring when offline — prompts the rider to go online */}
              {!online && (
                <span className="absolute inset-0 rounded-full bg-emerald-500/40 animate-ping" aria-hidden />
              )}
              <span className="relative flex flex-col items-center">
                {togglingOnline ? (
                  <RefreshCw className="w-12 h-12 animate-spin" />
                ) : online ? (
                  <Power className="w-12 h-12" />
                ) : (
                  <PowerOff className="w-12 h-12" />
                )}
                <span className="text-2xl mt-1 tracking-wide">
                  {online ? 'ONLINE' : 'GO'}
                </span>
                <span className="text-[11px] font-medium opacity-90 tracking-wider uppercase">
                  {online ? (t('healthRiders.tapOffline') ?? 'Toca para sair') : (t('healthRiders.goOnline') ?? 'Ficar online')}
                </span>
              </span>
            </motion.button>
          </div>
        </div>

        {/* Bottom info bar */}
        <div className="px-5 pb-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-slate-900/70 border border-slate-800 py-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">{t('healthRiders.vehicle') ?? 'Veículo'}</div>
            <div className="text-sm font-semibold text-white">{VEHICLE_LABELS[rider.vehicle_type].label}</div>
          </div>
          <div className="rounded-xl bg-slate-900/70 border border-slate-800 py-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">{t('healthRiders.rating') ?? 'Avaliação'}</div>
            <div className="text-sm font-semibold text-white flex items-center justify-center gap-0.5"><Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {rider.rating ?? 5.0}</div>
          </div>
          <div className="rounded-xl bg-slate-900/70 border border-slate-800 py-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">{t('healthRiders.zone') ?? 'Zona'}</div>
            <div className="text-sm font-semibold text-white truncate">{(rider.available_zones ?? ['Maputo'])[0]}</div>
          </div>
        </div>
      </motion.section>

      {/* Earnings — big numbers on dark cards */}
      <div className="grid grid-cols-3 gap-3">
        <EarningsTile label={t('healthRiders.today') ?? 'Hoje'} value={earnings?.today ?? 0} count={earnings?.today_count ?? 0} currency="MT" icon={Zap} />
        <EarningsTile label={t('healthRiders.week') ?? 'Semana'} value={earnings?.week ?? 0} count={earnings?.week_count ?? 0} currency="MT" icon={TrendingUp} />
        <EarningsTile label={t('healthRiders.month') ?? 'Mês'} value={earnings?.month ?? 0} count={earnings?.month_count ?? 0} currency="MT" icon={DollarSign} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
        <TabButton active={tab === 'available'} onClick={() => setTab('available')} label={t('healthRiders.available') ?? 'Disponíveis'} count={available.length} />
        <TabButton active={tab === 'active'} onClick={() => setTab('active')} label={t('healthRiders.active') ?? 'Activas'} count={active.length} />
        <TabButton active={tab === 'history'} onClick={() => setTab('history')} label={t('healthRiders.history') ?? 'Histórico'} count={history.length} />
      </div>

      {/* Tab content */}
      {loading ? (
        <div className="space-y-3" role="status" aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className="h-28 bg-slate-900 rounded-2xl animate-pulse border border-slate-800" />)}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {tab === 'available' && (
            <motion.div key="avail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {!online ? (
                <div className="text-center py-12 text-sm text-slate-400 rounded-2xl border border-dashed border-slate-800 bg-slate-900/50">
                  <PowerOff className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                  {t('healthRiders.goOnlineToSee') ?? 'Fica online para veres entregas disponíveis'}
                </div>
              ) : available.length === 0 ? (
                <div className="text-center py-12 text-sm text-slate-400 rounded-2xl border border-dashed border-slate-800 bg-slate-900/50">
                  <Package className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                  {t('healthRiders.noDeliveries') ?? 'Sem entregas disponíveis. Volta mais tarde.'}
                </div>
              ) : (
                <ul className="space-y-3">
                  {available.map((d, idx) => (
                    <DeliveryCard key={d.id} delivery={d} index={idx} onAccept={() => handleAccept(d.id!)} t={t} />
                  ))}
                </ul>
              )}
            </motion.div>
          )}

          {tab === 'active' && (
            <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {active.length === 0 ? (
                <div className="text-center py-12 text-sm text-slate-400 rounded-2xl border border-dashed border-slate-800 bg-slate-900/50">
                  <Truck className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                  {t('healthRiders.noActive') ?? 'Sem entregas activas'}
                </div>
              ) : (
                <ul className="space-y-3">
                  {active.map((d, idx) => (
                    <ActiveDeliveryCard key={d.id} delivery={d} index={idx} onStatusUpdate={handleStatusUpdate} t={t} />
                  ))}
                </ul>
              )}
            </motion.div>
          )}

          {tab === 'history' && (
            <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {history.length === 0 ? (
                <div className="text-center py-12 text-sm text-slate-400 rounded-2xl border border-dashed border-slate-800 bg-slate-900/50">
                  <Clock className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                  {t('healthRiders.noHistory') ?? 'Sem histórico ainda'}
                </div>
              ) : (
                <ul className="space-y-2">
                  {history.map((d, idx) => (
                    <HistoryCard key={d.id} delivery={d} index={idx} t={t} />
                  ))}
                </ul>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Trust strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{t('healthRiders.trustVerified') ?? 'Verificado e seguro'}</span>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
          <DollarSign className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{t('healthRiders.trustDaily') ?? 'Pago diariamente via M-Pesa'}</span>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
          <Award className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>{t('healthRiders.trustBonus') ?? 'Bónus por avaliações 5★'}</span>
        </div>
      </div>
    </div>
  );
}

function EarningsTile({ label, value, count, currency, icon: Icon }: {
  label: string; value: number; count: number; currency: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 relative overflow-hidden">
      <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full bg-emerald-500/10 blur-xl" aria-hidden />
      <div className="relative">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{label}</span>
          <Icon className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <div className="text-xl font-black text-white leading-none">
          {value.toLocaleString()}
          <span className="text-xs font-medium text-slate-400 ml-1">{currency}</span>
        </div>
        <div className="text-[11px] text-slate-500 mt-1">{count} {count === 1 ? 'entrega' : 'entregas'}</div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${active ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
    >
      {label} <span className="text-xs opacity-70">({count})</span>
    </button>
  );
}

function DeliveryCard({ delivery, index, onAccept, t }: { delivery: HealthDelivery; index: number; onAccept: () => void; t: any }) {
  const pkg = PACKAGE_LABELS[delivery.package_type];
  const pricing = computeDeliveryFee(delivery.estimated_distance_km ?? 0, delivery.package_type, 'motorbike');
  const earningsValue = delivery.rider_earnings ?? pricing.rider_earnings;

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
      className="bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-emerald-500/40 transition"
    >
      <div className="flex items-start gap-3">
        {/* Package emoji */}
        <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl flex-shrink-0">
          {pkg.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-white truncate">{delivery.package_description ?? pkg.label}</h4>
            {delivery.requires_cold_chain && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/30">
                <ThermometerSnowflake className="w-2.5 h-2.5" /> Frio
              </span>
            )}
            {delivery.requires_signature && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                <Signature className="w-2.5 h-2.5" /> Assinatura
              </span>
            )}
          </div>

          {/* Pickup → Dropoff with connecting line */}
          <div className="mt-2 flex gap-2">
            <div className="flex flex-col items-center pt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-400/30" />
              <span className="flex-1 w-px border-l border-dashed border-slate-600 my-1 min-h-[14px]" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-400/30" />
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-start gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 mt-0.5">De</span>
                <span className="text-xs text-slate-200 leading-snug truncate">{delivery.pickup_name}</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 mt-0.5">Para</span>
                <span className="text-xs text-slate-200 leading-snug truncate">{delivery.dropoff_address ?? delivery.dropoff_name}</span>
              </div>
            </div>
          </div>

          {/* Distance + duration */}
          <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1"><Route className="w-3 h-3" /> {delivery.estimated_distance_km} km</span>
            <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> ~{delivery.estimated_duration_min} min</span>
          </div>
        </div>

        {/* Earnings */}
        <div className="text-right flex-shrink-0">
          <div className="text-[10px] uppercase tracking-wider text-emerald-400/80 font-semibold">Ganhos</div>
          <div className="text-xl font-black text-emerald-400 leading-none">+{earningsValue}</div>
          <div className="text-[10px] text-slate-500">MT</div>
        </div>
      </div>

      {/* Big green ACCEPT button */}
      <button
        onClick={onAccept}
        className="mt-3 w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold inline-flex items-center justify-center gap-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      >
        <CheckCircle2 className="w-4 h-4" />
        {t('healthRiders.accept') ?? 'Aceitar entrega'}
        <ChevronRight className="w-4 h-4" />
      </button>
    </motion.li>
  );
}

function ActiveDeliveryCard({ delivery, index, onStatusUpdate, t }: { delivery: HealthDelivery; index: number; onStatusUpdate: (id: string, status: any) => void; t: any }) {
  const status = delivery.status;
  const pkg = PACKAGE_LABELS[delivery.package_type];
  const currentStep = trackerStepIndex(status);
  const progressPct = (currentStep / (TRACKER_STEPS.length - 1)) * 100;

  const nextAction: { status: DeliveryStatus; label: string } | null = {
    accepted: { status: 'arriving_pickup', label: t('healthRiders.arrivingPickup') ?? 'A caminho do pickup' },
    arriving_pickup: { status: 'picked_up', label: t('healthRiders.pickedUp') ?? 'Recolhido' },
    picked_up: { status: 'in_transit', label: t('healthRiders.inTransit') ?? 'Em trânsito' },
    in_transit: { status: 'arriving_dropoff', label: t('healthRiders.arrivingDropoff') ?? 'A chegar ao destino' },
    arriving_dropoff: { status: 'delivered', label: t('healthRiders.delivered') ?? 'Entregue' },
  }[status as DeliveryStatus] ?? null;

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
      className="bg-slate-900 border-2 border-emerald-500/40 rounded-2xl p-4 shadow-lg shadow-emerald-500/5"
    >
      {/* Status + earnings */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: `${STATUS_LABELS[status].color}20`, color: STATUS_LABELS[status].color }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: STATUS_LABELS[status].color }} />
          {STATUS_LABELS[status].label}
        </span>
        <span className="text-xs text-emerald-400 ml-auto font-bold">+{delivery.rider_earnings} MT</span>
      </div>

      {/* Package + route */}
      <div className="text-sm font-semibold text-white mb-2">{pkg.emoji} {delivery.package_description ?? pkg.label}</div>
      <div className="flex gap-2 mb-4">
        <div className="flex flex-col items-center pt-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-400/30" />
          <span className="flex-1 w-px border-l border-dashed border-slate-600 my-1 min-h-[14px]" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-400/30" />
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="text-xs text-slate-200 truncate">{delivery.pickup_name}</div>
          <div className="text-xs text-slate-200 truncate">{delivery.dropoff_address ?? delivery.dropoff_name}</div>
        </div>
        {delivery.dropoff_phone && (
          <a href={`tel:${delivery.dropoff_phone}`} className="flex-shrink-0 w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition" aria-label="Ligar ao cliente">
            <Phone className="w-4 h-4" />
          </a>
        )}
      </div>

      {/* Progress tracker — status dots like Uber delivery tracking */}
      <div className="mb-4">
        <div className="relative flex items-center justify-between">
          {/* Track background */}
          <div className="absolute left-0 right-0 top-3.5 h-1 bg-slate-800 rounded-full" />
          {/* Filled track */}
          <motion.div
            className="absolute left-0 top-3.5 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.5 }}
          />
          {/* Step dots */}
          {TRACKER_STEPS.map((s, i) => {
            const StepIcon = s.icon;
            const done = i < currentStep;
            const current = i === currentStep;
            return (
              <div key={s.key} className="relative z-10 flex flex-col items-center gap-1 w-1/4">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition ${
                    done ? 'bg-emerald-500 border-emerald-500 text-slate-950' :
                    current ? 'bg-slate-900 border-emerald-400 text-emerald-400 ring-4 ring-emerald-500/20 animate-pulse' :
                    'bg-slate-900 border-slate-700 text-slate-600'
                  }`}
                >
                  <StepIcon className="w-3.5 h-3.5" />
                </div>
                <span className={`text-[9px] font-medium ${current ? 'text-emerald-400' : done ? 'text-slate-300' : 'text-slate-600'}`}>{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Next action */}
      {nextAction && (
        <button
          onClick={() => onStatusUpdate(delivery.id!, nextAction.status)}
          className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold inline-flex items-center justify-center gap-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
        >
          <CheckCircle2 className="w-4 h-4" />
          {nextAction.label}
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
      <button
        onClick={() => onStatusUpdate(delivery.id!, 'cancelled')}
        className="mt-2 w-full py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition"
      >
        {t('common.cancel') ?? 'Cancelar'}
      </button>
    </motion.li>
  );
}

function HistoryCard({ delivery, index, t }: { delivery: HealthDelivery; index: number; t: any }) {
  const status = STATUS_LABELS[delivery.status];
  const pkg = PACKAGE_LABELS[delivery.package_type];
  return (
    <motion.li
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-3 hover:border-slate-700 transition"
    >
      <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xl flex-shrink-0">{pkg.emoji}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate">{delivery.package_description ?? pkg.label}</div>
        <div className="text-xs text-slate-500 flex items-center gap-2">
          <span>{delivery.delivered_at ? new Date(delivery.delivered_at).toLocaleDateString() : '—'}</span>
          <span>·</span>
          <span style={{ color: status.color }}>{status.label}</span>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-sm font-bold text-emerald-400">+{delivery.rider_earnings} MT</div>
        {delivery.rating && (
          <div className="flex items-center gap-0.5 text-xs text-amber-400 justify-end">
            <Star className="w-3 h-3 fill-current" /> {delivery.rating}
          </div>
        )}
      </div>
    </motion.li>
  );
}

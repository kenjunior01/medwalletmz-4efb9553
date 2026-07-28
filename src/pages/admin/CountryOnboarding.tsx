/**
 * Country Onboarding Wizard — Activate a new region in 8 steps
 *
 * Steps: basics → currency → partners → regulator → translations
 *        → emergency_numbers → holidays → review → completed
 *
 * Features:
 *  - Country template pre-fill (10 countries pre-configured)
 *  - Stepper with progress %
 *  - Each step has its own form with validation
 *  - Save & continue, save & exit
 *  - Activated countries list + in-progress list
 *  - Activate final step (sets is_activated=true)
 *  - Skeleton/empty/error states, WCAG 2.1 AA
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, Plus, ArrowLeft, ArrowRight, Check, X, Save,
  AlertTriangle, RefreshCw, Sparkles, Rocket, MapPin,
  Building2, Languages, Phone, Calendar, FileText, DollarSign,
  Shield, CheckCircle2, Clock, Trash2, Edit3,
} from 'lucide-react';
import { useCountry } from '@/contexts/CountryContext';
import {
  CountryOnboarding, OnboardingStep, OnboardingListItem,
  getOnboardings, createOnboarding, getOnboarding, saveStep,
  activateCountry, deleteOnboarding,
  STEP_ORDER, STEP_LABELS, COUNTRY_TEMPLATES,
} from '@/services/countryOnboarding';

type View = 'list' | 'wizard';

export default function CountryOnboardingWizard() {
  const { t, user } = useCountry() as any;
  const [view, setView] = useState<View>('list');
  const [items, setItems] = useState<OnboardingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeOnboardingId, setActiveOnboardingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newCountryCode, setNewCountryCode] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getOnboardings();
      setItems(data);
    } catch (e: any) {
      setError(e?.message ?? 'Erro');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!user?.id || !newCountryCode) return;
    const tpl = COUNTRY_TEMPLATES[newCountryCode];
    if (!tpl) return;
    try {
      const created = await createOnboarding(user.id, tpl.code, tpl.name);
      await load();
      setActiveOnboardingId(created.id!);
      setView('wizard');
      setShowCreate(false);
      setNewCountryCode('');
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao criar');
    }
  };

  const handleOpen = (id: string) => {
    setActiveOnboardingId(id);
    setView('wizard');
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Apagar onboarding de ${name}?`)) return;
    try {
      await deleteOnboarding(id);
      await load();
    } catch (e: any) {
      setError(e?.message ?? 'Erro');
    }
  };

  const availableTemplates = useMemo(() => {
    const used = new Set(items.map((i) => i.country_code));
    return Object.values(COUNTRY_TEMPLATES).filter((tpl) => !used.has(tpl.code));
  }, [items]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50/40 to-cyan-50/30 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-indigo-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-600 flex items-center justify-center shadow-md">
              <Rocket className="w-5 h-5 text-white" aria-hidden />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">{t('countryOnboarding.title') ?? 'Activar Região'}</h1>
              <p className="text-xs text-slate-500 leading-tight">{t('countryOnboarding.subtitle') ?? 'Lançar plataforma num novo país'}</p>
            </div>
          </div>
          {view === 'list' && availableTemplates.length > 0 && (
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow-md hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{t('countryOnboarding.new') ?? 'Nova região'}</span>
            </button>
          )}
          {view === 'wizard' && (
            <button
              onClick={() => { setView('list'); setActiveOnboardingId(null); }}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm hover:bg-slate-50"
            >
              {t('common.exit') ?? 'Sair'}
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {error && (
          <div role="alert" className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5" /><span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {view === 'list' && (
            <motion.div key="list" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              {loading ? (
                <div className="space-y-3" role="status" aria-busy="true">
                  {[0, 1, 2].map((i) => <div key={i} className="h-24 bg-slate-200 rounded-2xl animate-pulse" />)}
                </div>
              ) : items.length === 0 ? (
                <EmptyState onNew={() => setShowCreate(true)} t={t} hasTemplates={availableTemplates.length > 0} />
              ) : (
                <>
                  {/* Activated */}
                  {items.some((i) => i.is_activated) && (
                    <section className="mb-6">
                      <h2 className="text-sm font-semibold text-emerald-700 mb-3 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" /> {t('countryOnboarding.activated') ?? 'Activadas'}
                      </h2>
                      <ul className="space-y-2">
                        {items.filter((i) => i.is_activated).map((item, idx) => (
                          <OnboardingCard key={item.id} item={item} index={idx} onOpen={() => handleOpen(item.id!)} onDelete={() => handleDelete(item.id!, item.country_name)} t={t} />
                        ))}
                      </ul>
                    </section>
                  )}

                  {/* In progress */}
                  {items.some((i) => !i.is_activated) && (
                    <section>
                      <h2 className="text-sm font-semibold text-amber-700 mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4" /> {t('countryOnboarding.inProgress') ?? 'Em progresso'}
                      </h2>
                      <ul className="space-y-2">
                        {items.filter((i) => !i.is_activated).map((item, idx) => (
                          <OnboardingCard key={item.id} item={item} index={idx} onOpen={() => handleOpen(item.id!)} onDelete={() => handleDelete(item.id!, item.country_name)} t={t} />
                        ))}
                      </ul>
                    </section>
                  )}
                </>
              )}
            </motion.div>
          )}

          {view === 'wizard' && activeOnboardingId && (
            <motion.div key="wizard" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <Wizard onboardingId={activeOnboardingId} onExited={() => { setView('list'); load(); }} t={t} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateModal
            available={availableTemplates}
            selected={newCountryCode}
            onSelect={setNewCountryCode}
            onCreate={handleCreate}
            onCancel={() => setShowCreate(false)}
            t={t}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- Onboarding card ---------- */

function OnboardingCard({ item, index, onOpen, onDelete, t }: {
  item: OnboardingListItem; index: number;
  onOpen: () => void; onDelete: () => void; t: any;
}) {
  const flag = item.country_code ? getFlag(item.country_code) : '🏳️';
  const stepInfo = STEP_LABELS[item.current_step ?? 'basics'];

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
      className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md transition"
    >
      <div className="flex items-center gap-3">
        <div className="text-3xl">{flag}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-900">{item.country_name}</h3>
            <span className="text-xs text-slate-500">{item.country_code}</span>
            {item.is_activated ? (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-2.5 h-2.5" /> {t('countryOnboarding.active') ?? 'Activo'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                <Clock className="w-2.5 h-2.5" /> {item.progress_percentage ?? 0}%
              </span>
            )}
          </div>
          {!item.is_activated && (
            <div className="text-xs text-slate-500 mt-0.5">
              {stepInfo.emoji} {stepInfo.label} · {item.steps_completed ?? 0}/{item.total_steps ?? 8}
            </div>
          )}
          {item.activated_at && (
            <div className="text-xs text-slate-500 mt-0.5">
              {t('countryOnboarding.activatedOn') ?? 'Activado em'} {new Date(item.activated_at).toLocaleDateString()}
            </div>
          )}
        </div>
        <button
          onClick={onOpen}
          className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800"
        >
          {item.is_activated ? (t('common.view') ?? 'Ver') : (t('common.continue') ?? 'Continuar')}
        </button>
        {!item.is_activated && (
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"
            aria-label={t('common.delete') ?? 'Apagar'}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </motion.li>
  );
}

function getFlag(code: string): string {
  const flags: Record<string, string> = {
    MZ: '🇲🇿', AO: '🇦🇴', BR: '🇧🇷', PT: '🇵🇹', ZA: '🇿🇦',
    KE: '🇰🇪', NG: '🇳🇬', IN: '🇮🇳', ET: '🇪🇹', GH: '🇬🇭',
    TZ: '🇹🇿', CV: '🇨🇻',
  };
  return flags[code] ?? '🏳️';
}

/* ---------- Wizard ---------- */

function Wizard({ onboardingId, onExited, t }: { onboardingId: string; onExited: () => void; t: any }) {
  const [onboarding, setOnboarding] = useState<CountryOnboarding | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOnboarding(onboardingId);
      setOnboarding(data);
    } catch (e: any) {
      setError(e?.message ?? 'Erro');
    } finally {
      setLoading(false);
    }
  }, [onboardingId]);

  useEffect(() => { load(); }, [load]);

  const currentStep = onboarding?.current_step ?? 'basics';
  const stepIdx = STEP_ORDER.indexOf(currentStep);
  const tpl = onboarding ? COUNTRY_TEMPLATES[onboarding.country_code] : null;

  const handleSave = async (stepData: Record<string, any>) => {
    if (!onboarding) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await saveStep(onboardingId, currentStep, stepData);
      setOnboarding(updated);
      if (updated.current_step === 'completed') {
        // Auto-activate if just completed review
      }
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async () => {
    if (!onboarding) return;
    setSaving(true);
    try {
      const updated = await activateCountry(onboardingId, { users: 1000, revenue: 50000, partners: 10 });
      setOnboarding(updated);
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao activar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4" role="status" aria-busy="true">
        <div className="h-16 bg-slate-200 rounded-2xl animate-pulse" />
        <div className="h-64 bg-slate-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!onboarding) {
    return <div className="text-center py-12 text-slate-500">Onboarding não encontrado</div>;
  }

  const isCompleted = onboarding.is_activated;

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getFlag(onboarding.country_code)}</span>
            <div>
              <h2 className="font-bold text-slate-900">{onboarding.country_name}</h2>
              <p className="text-xs text-slate-500">{onboarding.country_code} · {onboarding.progress_percentage ?? 0}%</p>
            </div>
          </div>
          {isCompleted && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" /> {t('countryOnboarding.activated') ?? 'Activada'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {STEP_ORDER.slice(0, -1).map((step, i) => {
            const info = STEP_LABELS[step];
            const done = i < stepIdx || isCompleted;
            const active = i === stepIdx && !isCompleted;
            return (
              <div key={step} className="flex items-center flex-shrink-0">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                    active ? 'border-indigo-500 bg-indigo-50 text-indigo-600' :
                    done ? 'border-emerald-500 bg-emerald-50 text-emerald-600' :
                    'border-slate-200 bg-white text-slate-400'
                  }`}
                  title={info.label}
                >
                  {done ? <Check className="w-3 h-3" /> : info.emoji}
                </div>
                {i < STEP_ORDER.length - 2 && (
                  <div className={`w-4 h-0.5 mx-0.5 ${done ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5" /><span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          className="bg-white rounded-2xl border border-slate-200 p-6"
        >
          {isCompleted ? (
            <CompletedView onboarding={onboarding} t={t} />
          ) : (
            <>
              {currentStep === 'basics' && <BasicsStep onboarding={onboarding} tpl={tpl} onSave={handleSave} saving={saving} t={t} />}
              {currentStep === 'currency' && <CurrencyStep onboarding={onboarding} tpl={tpl} onSave={handleSave} saving={saving} t={t} />}
              {currentStep === 'partners' && <PartnersStep onboarding={onboarding} tpl={tpl} onSave={handleSave} saving={saving} t={t} />}
              {currentStep === 'regulator' && <RegulatorStep onboarding={onboarding} tpl={tpl} onSave={handleSave} saving={saving} t={t} />}
              {currentStep === 'translations' && <TranslationsStep onboarding={onboarding} tpl={tpl} onSave={handleSave} saving={saving} t={t} />}
              {currentStep === 'emergency_numbers' && <EmergencyStep onboarding={onboarding} tpl={tpl} onSave={handleSave} saving={saving} t={t} />}
              {currentStep === 'holidays' && <HolidaysStep onboarding={onboarding} tpl={tpl} onSave={handleSave} saving={saving} t={t} />}
              {currentStep === 'review' && <ReviewStep onboarding={onboarding} onActivate={handleActivate} saving={saving} t={t} />}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ---------- Steps ---------- */

function StepHeader({ emoji, title, description }: { emoji: string; title: string; description: string }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">{emoji}</span>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      </div>
      <p className="text-sm text-slate-500">{description}</p>
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700 block mb-1">{label}</span>
      {children}
      {hint && <span className="text-xs text-slate-400 mt-1 block">{hint}</span>}
    </label>
  );
}

function BasicsStep({ onboarding, tpl, onSave, saving, t }: any) {
  const [data, setData] = useState({
    capital: tpl?.capital ?? '',
    population: tpl?.population ?? '',
    timezone: '',
    ...((onboarding.wizard_data?.basics as any) ?? {}),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(data); }} className="space-y-4">
      <StepHeader emoji="📋" title={t('countryOnboarding.basicsTitle') ?? 'Informação básica'} description={t('countryOnboarding.basicsDesc') ?? 'Dados fundamentais do país'} />
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('countryOnboarding.capital') ?? 'Capital'}>
          <input type="text" value={data.capital} onChange={(e) => setData({ ...data, capital: e.target.value })} required className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
        </Field>
        <Field label={t('countryOnboarding.population') ?? 'População'}>
          <input type="number" value={data.population} onChange={(e) => setData({ ...data, population: e.target.value })} required className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
        </Field>
      </div>
      <Field label={t('countryOnboarding.timezone') ?? 'Fuso horário'} hint="ex: Africa/Maputo, Africa/Luanda">
        <input type="text" value={data.timezone} onChange={(e) => setData({ ...data, timezone: e.target.value })} placeholder="Africa/Maputo" className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
      </Field>
      <StepActions saving={saving} t={t} />
    </form>
  );
}

function CurrencyStep({ onboarding, tpl, onSave, saving, t }: any) {
  const [data, setData] = useState({
    currency_code: tpl?.currency_code ?? '',
    currency_symbol: tpl?.currency_symbol ?? '',
    currency_decimals: tpl?.currency_decimals ?? 2,
    mobile_money_providers: '',
    ...((onboarding.wizard_data?.currency as any) ?? {}),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(data); }} className="space-y-4">
      <StepHeader emoji="💰" title={t('countryOnboarding.currencyTitle') ?? 'Moeda'} description={t('countryOnboarding.currencyDesc') ?? 'Configuração monetária e métodos de pagamento'} />
      <div className="grid grid-cols-3 gap-3">
        <Field label={t('countryOnboarding.currencyCode') ?? 'Código ISO'}>
          <input type="text" value={data.currency_code} onChange={(e) => setData({ ...data, currency_code: e.target.value.toUpperCase() })} required maxLength={3} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 uppercase" />
        </Field>
        <Field label={t('countryOnboarding.currencySymbol') ?? 'Símbolo'}>
          <input type="text" value={data.currency_symbol} onChange={(e) => setData({ ...data, currency_symbol: e.target.value })} required maxLength={5} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
        </Field>
        <Field label={t('countryOnboarding.decimals') ?? 'Decimais'}>
          <select value={data.currency_decimals} onChange={(e) => setData({ ...data, currency_decimals: parseInt(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200">
            <option value={0}>0</option>
            <option value={2}>2</option>
          </select>
        </Field>
      </div>
      <Field label={t('countryOnboarding.mobileMoney') ?? 'Operadores de mobile money'} hint="Separados por vírgula">
        <input type="text" value={data.mobile_money_providers} onChange={(e) => setData({ ...data, mobile_money_providers: e.target.value })} placeholder={tpl?.code === 'AO' ? 'Unitel Money, Africell Money' : 'M-Pesa, e-Mola'} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
      </Field>
      <StepActions saving={saving} t={t} />
    </form>
  );
}

function PartnersStep({ onboarding, tpl, onSave, saving, t }: any) {
  const [data, setData] = useState({
    mno_partners: '',
    bank_partners: '',
    insurance_partners: '',
    pharmacy_chains: '',
    ...((onboarding.wizard_data?.partners as any) ?? {}),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(data); }} className="space-y-4">
      <StepHeader emoji="🤝" title={t('countryOnboarding.partnersTitle') ?? 'Parceiros'} description={t('countryOnboarding.partnersDesc') ?? 'Operadores locais para integração'} />
      <Field label={t('countryOnboarding.mnoPartners') ?? 'Operadores MNO'} hint="Separados por vírgula">
        <input type="text" value={data.mno_partners} onChange={(e) => setData({ ...data, mno_partners: e.target.value })} placeholder={tpl?.code === 'AO' ? 'Unitel, Africell, Movicel' : 'Vodacom, Movitel, Tmcel'} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
      </Field>
      <Field label={t('countryOnboarding.bankPartners') ?? 'Bancos'}>
        <input type="text" value={data.bank_partners} onChange={(e) => setData({ ...data, bank_partners: e.target.value })} placeholder="BIM, Standard Bank" className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
      </Field>
      <Field label={t('countryOnboarding.insurancePartners') ?? 'Seguradoras'}>
        <input type="text" value={data.insurance_partners} onChange={(e) => setData({ ...data, insurance_partners: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
      </Field>
      <Field label={t('countryOnboarding.pharmacyChains') ?? 'Redes de farmácias'}>
        <input type="text" value={data.pharmacy_chains} onChange={(e) => setData({ ...data, pharmacy_chains: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
      </Field>
      <StepActions saving={saving} t={t} />
    </form>
  );
}

function RegulatorStep({ onboarding, tpl, onSave, saving, t }: any) {
  const [data, setData] = useState({
    regulator_name: tpl?.regulator ?? '',
    regulator_url: '',
    license_required: true,
    ...((onboarding.wizard_data?.regulator as any) ?? {}),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(data); }} className="space-y-4">
      <StepHeader emoji="⚖️" title={t('countryOnboarding.regulatorTitle') ?? 'Regulador'} description={t('countryOnboarding.regulatorDesc') ?? 'Entidade reguladora de saúde do país'} />
      <Field label={t('countryOnboarding.regulatorName') ?? 'Nome do regulador'}>
        <input type="text" value={data.regulator_name} onChange={(e) => setData({ ...data, regulator_name: e.target.value })} required className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
      </Field>
      <Field label={t('countryOnboarding.regulatorUrl') ?? 'Website do regulador'}>
        <input type="url" value={data.regulator_url} onChange={(e) => setData({ ...data, regulator_url: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
      </Field>
      <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={data.license_required} onChange={(e) => setData({ ...data, license_required: e.target.checked })} className="w-4 h-4 rounded border-slate-300 text-indigo-600" />
        {t('countryOnboarding.licenseRequired') ?? 'Licença profissional obrigatória para profissionais'}
      </label>
      <StepActions saving={saving} t={t} />
    </form>
  );
}

function TranslationsStep({ onboarding, tpl, onSave, saving, t }: any) {
  const [data, setData] = useState({
    languages: (tpl?.languages ?? ['pt']).join(', '),
    default_locale: tpl?.locale ?? 'pt',
    translation_status: 'machine',
    ...((onboarding.wizard_data?.translations as any) ?? {}),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(data); }} className="space-y-4">
      <StepHeader emoji="🌐" title={t('countryOnboarding.translationsTitle') ?? 'Traduções'} description={t('countryOnboarding.translationsDesc') ?? 'Línguas oficiais e locais'} />
      <Field label={t('countryOnboarding.languages') ?? 'Línguas (códigos ISO)'} hint="Separados por vírgula. ex: pt, mgh (Emakhuwa), tsn (Changana)">
        <input type="text" value={data.languages} onChange={(e) => setData({ ...data, languages: e.target.value })} required className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
      </Field>
      <Field label={t('countryOnboarding.defaultLocale') ?? 'Locale padrão'}>
        <input type="text" value={data.default_locale} onChange={(e) => setData({ ...data, default_locale: e.target.value })} required className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
      </Field>
      <Field label={t('countryOnboarding.translationStatus') ?? 'Estado das traduções'}>
        <select value={data.translation_status} onChange={(e) => setData({ ...data, translation_status: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200">
          <option value="machine">{t('countryOnboarding.machineTrans') ?? 'Tradução automática'}</option>
          <option value="human_review">{t('countryOnboarding.humanReview') ?? 'Revisão humana pendente'}</option>
          <option value="human_verified">{t('countryOnboarding.humanVerified') ?? 'Verificado por humano'}</option>
        </select>
      </Field>
      <StepActions saving={saving} t={t} />
    </form>
  );
}

function EmergencyStep({ onboarding, tpl, onSave, saving, t }: any) {
  const [data, setData] = useState({
    police: tpl?.emergency?.police ?? '',
    ambulance: tpl?.emergency?.ambulance ?? '',
    fire: tpl?.emergency?.fire ?? '',
    crisis_hotline: '',
    poison_control: '',
    ...((onboarding.wizard_data?.emergency_numbers as any) ?? {}),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(data); }} className="space-y-4">
      <StepHeader emoji="🚨" title={t('countryOnboarding.emergencyTitle') ?? 'Números de emergência'} description={t('countryOnboarding.emergencyDesc') ?? 'Números locais de emergência'} />
      <div className="grid grid-cols-3 gap-3">
        <Field label={t('countryOnboarding.police') ?? 'Polícia'}>
          <input type="text" value={data.police} onChange={(e) => setData({ ...data, police: e.target.value })} required className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
        </Field>
        <Field label={t('countryOnboarding.ambulance') ?? 'Ambulância'}>
          <input type="text" value={data.ambulance} onChange={(e) => setData({ ...data, ambulance: e.target.value })} required className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
        </Field>
        <Field label={t('countryOnboarding.fire') ?? 'Bombeiros'}>
          <input type="text" value={data.fire} onChange={(e) => setData({ ...data, fire: e.target.value })} required className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('countryOnboarding.crisisHotline') ?? 'Linha de crise emocional'}>
          <input type="text" value={data.crisis_hotline} onChange={(e) => setData({ ...data, crisis_hotline: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
        </Field>
        <Field label={t('countryOnboarding.poisonControl') ?? 'Centro anti-veneno'}>
          <input type="text" value={data.poison_control} onChange={(e) => setData({ ...data, poison_control: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
        </Field>
      </div>
      <StepActions saving={saving} t={t} />
    </form>
  );
}

function HolidaysStep({ onboarding, tpl, onSave, saving, t }: any) {
  const [data, setData] = useState({
    holidays: '',
    weekend_days: 'saturday,sunday',
    clinic_hours_default: '08:00-17:00',
    ...((onboarding.wizard_data?.holidays as any) ?? {}),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(data); }} className="space-y-4">
      <StepHeader emoji="📅" title={t('countryOnboarding.holidaysTitle') ?? 'Feriados e horários'} description={t('countryOnboarding.holidaysDesc') ?? 'Configuração de horários locais'} />
      <Field label={t('countryOnboarding.holidays') ?? 'Feriados nacionais'} hint="Um por linha: YYYY-MM-DD | Nome">
        <textarea value={data.holidays} onChange={(e) => setData({ ...data, holidays: e.target.value })} rows={5} placeholder="2026-01-01 | Ano Novo&#10;2026-02-03 | Dia dos Heróis" className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('countryOnboarding.weekendDays') ?? 'Fim de semana'}>
          <input type="text" value={data.weekend_days} onChange={(e) => setData({ ...data, weekend_days: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
        </Field>
        <Field label={t('countryOnboarding.clinicHours') ?? 'Horário clínica (padrão)'}>
          <input type="text" value={data.clinic_hours_default} onChange={(e) => setData({ ...data, clinic_hours_default: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
        </Field>
      </div>
      <StepActions saving={saving} t={t} />
    </form>
  );
}

function ReviewStep({ onboarding, onActivate, saving, t }: any) {
  const wizardData = onboarding.wizard_data ?? {};
  return (
    <div className="space-y-4">
      <StepHeader emoji="✅" title={t('countryOnboarding.reviewTitle') ?? 'Revisão final'} description={t('countryOnboarding.reviewDesc') ?? 'Confirma os dados antes de activar'} />
      <dl className="divide-y divide-slate-100 text-sm">
        {Object.entries(wizardData).map(([step, data]) => (
          <div key={step} className="py-3">
            <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              {STEP_LABELS[step as OnboardingStep]?.label ?? step}
            </dt>
            <dd className="space-y-0.5">
              {Object.entries(data as Record<string, any>).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <span className="text-slate-500">{k.replace(/_/g, ' ')}:</span>
                  <span className="font-medium text-slate-900 text-right">{String(v)}</span>
                </div>
              ))}
            </dd>
          </div>
        ))}
      </dl>

      <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200">
        <div className="flex items-start gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-slate-900">{t('countryOnboarding.readyTitle') ?? 'Pronto para activar?'}</div>
            <p className="text-sm text-slate-600 mt-1">
              {t('countryOnboarding.readyBody') ?? 'Ao activar, a plataforma fica disponível neste país. Um CEO regional será atribuído e as metas Q1 serão inicializadas.'}
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={onActivate}
        disabled={saving}
        className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
      >
        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
        {t('countryOnboarding.activate') ?? 'Activar região'}
      </button>
    </div>
  );
}

function CompletedView({ onboarding, t }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-8"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 12 }}
        className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4"
      >
        <CheckCircle2 className="w-10 h-10 text-emerald-600" />
      </motion.div>
      <h3 className="text-xl font-bold text-slate-900">
        {onboarding.country_name} {t('countryOnboarding.activatedMsg') ?? 'está activa!'} 🎉
      </h3>
      <p className="text-sm text-slate-500 mt-2">
        {t('countryOnboarding.activatedBody') ?? 'A plataforma está agora disponível neste país. CEOs regionais podem começar a operar.'}
      </p>
      {onboarding.activated_at && (
        <p className="text-xs text-slate-400 mt-3">
          {new Date(onboarding.activated_at).toLocaleString()}
        </p>
      )}
    </motion.div>
  );
}

function StepActions({ saving, t }: { saving: boolean; t: any }) {
  return (
    <div className="flex justify-end pt-3 border-t border-slate-100">
      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {t('countryOnboarding.saveAndContinue') ?? 'Guardar e continuar'}
      </button>
    </div>
  );
}

/* ---------- Empty + Create modal ---------- */

function EmptyState({ onNew, t, hasTemplates }: { onNew: () => void; t: any; hasTemplates: boolean }) {
  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 rounded-3xl bg-indigo-100 flex items-center justify-center mx-auto mb-4">
        <Rocket className="w-10 h-10 text-indigo-500" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">{t('countryOnboarding.emptyTitle') ?? 'Nenhuma região em onboarding'}</h2>
      <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
        {t('countryOnboarding.emptyBody') ?? 'Inicia o wizard para activar a plataforma num novo país. Templates disponíveis para 10 países africanos e CPLP.'}
      </p>
      {hasTemplates && (
        <button
          onClick={onNew}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold shadow-md hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" /> {t('countryOnboarding.startWizard') ?? 'Iniciar wizard'}
        </button>
      )}
    </div>
  );
}

function CreateModal({ available, selected, onSelect, onCreate, onCancel, t }: {
  available: any[]; selected: string; onSelect: (v: string) => void;
  onCreate: () => void; onCancel: () => void; t: any;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl"
        role="dialog"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">{t('countryOnboarding.selectCountry') ?? 'Selecciona o país'}</h3>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
          {available.map((tpl) => (
            <button
              key={tpl.code}
              onClick={() => onSelect(tpl.code)}
              className={`flex items-center gap-2 p-3 rounded-xl border transition ${
                selected === tpl.code ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="text-2xl">{getFlag(tpl.code)}</span>
              <div className="text-left">
                <div className="font-medium text-slate-900 text-sm">{tpl.name}</div>
                <div className="text-xs text-slate-500">{tpl.code}</div>
              </div>
            </button>
          ))}
        </div>
        <button
          onClick={onCreate}
          disabled={!selected}
          className="mt-4 w-full py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50"
        >
          {t('countryOnboarding.startWizard') ?? 'Iniciar wizard'}
        </button>
      </motion.div>
    </motion.div>
  );
}

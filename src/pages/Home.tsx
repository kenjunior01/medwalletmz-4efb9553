import { Fragment, useState, useCallback, lazy, Suspense, useRef, useEffect } from "react";
import { Seo } from "@/components/Seo";
import {
  Stethoscope, Sparkles, Pill, MessageCircle, ArrowRight,
  Plus, Calendar, ShieldCheck, Building2,
  BookOpen, MapPinPlus, Mic, FlaskConical, PawPrint, Crown, Baby, HeartPulse
} from '@/components/icons/lucide-compat';
import { RoleHero } from "@/components/home/RoleHero";


/* ── Lazy-loaded heavy/conditional components ── */
const ViralShareSheet = lazy(() => import("@/components/growth/ViralShareSheet").then(m => ({ default: m.ViralShareSheet })));
const MeddyChat = lazy(() => import("@/components/meddy/MeddyChat").then(m => ({ default: m.MeddyChat })));
const UserTypeHero = lazy(() => import("@/components/home/UserTypeHero").then(m => ({ default: m.UserTypeHero })));
const RoleBasedHome = lazy(() => import("@/components/home/RoleBasedHome").then(m => ({ default: m.RoleBasedHome })));


/* ── Lazy-loaded below-fold components (code-split per chunk) ── */
const FreeTrialBanner = lazy(() => import("@/components/monetization/FreeTrialBanner").then(m => ({ default: m.FreeTrialBanner })));
const FollowUpReminders = lazy(() => import("@/components/health/FollowUpReminders").then(m => ({ default: m.FollowUpReminders })));
const NearbyProvidersWidget = lazy(() => import("@/components/home/NearbyProvidersWidget").then(m => ({ default: m.NearbyProvidersWidget })));
const VisitorProOnboarding = lazy(() => import("@/components/onboarding/VisitorProOnboarding").then(m => ({ default: m.VisitorProOnboarding })));
const KlipyBanner = lazy(() => import("@/components/klipy/KlipyBanner").then(m => ({ default: m.KlipyBanner })));
const PersonalizedForYou = lazy(() => import("@/components/health/PersonalizedForYou").then(m => ({ default: m.PersonalizedForYou })));
const EcosystemFlow = lazy(() => import("@/components/health/EcosystemFlow").then(m => ({ default: m.EcosystemFlow })));
const AirQualityWidget = lazy(() => import("@/components/home/AirQualityWidget").then(m => ({ default: m.AirQualityWidget })));
const ReferralBanner = lazy(() => import("@/components/referrals/ReferralBanner").then(m => ({ default: m.ReferralBanner })));
const MeddyWelcomeCard = lazy(() => import("@/components/mascot/MeddyWelcomeCard").then(m => ({ default: m.MeddyWelcomeCard })));
const MorningGreeting = lazy(() => import("@/components/health/MorningGreeting").then(m => ({ default: m.MorningGreeting })));
const HealthProfileOnboarding = lazy(() => import("@/components/health/HealthProfileOnboarding").then(m => ({ default: m.HealthProfileOnboarding })));
const PillTracker = lazy(() => import("@/components/health/PillTracker").then(m => ({ default: m.PillTracker })));
const EmergencySOS = lazy(() => import("@/components/health/EmergencySOS").then(m => ({ default: m.EmergencySOS })));

/** IntersectionObserver-based lazy mount — defers chunk fetch until near viewport */
function LazyMount({ children, rootMargin = '200px' }: { children: React.ReactNode; rootMargin?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { rootMargin }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [rootMargin]);
  return <div ref={ref}>{visible ? children : null}</div>;
}

/** Lightweight Suspense wrapper — renders nothing until chunk loads */
function LazySuspense({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
};
// Heavy imports removed from Home for mobile performance:
// - EnableNotificationsBanner (rendered elsewhere), MagneticWrapper, ShimmerCard,
//   GradientText, PulseRing, FloatingParticles, NumberTicker (all from premium/)
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRoles } from "@/hooks/useUserRole";
import { useUserType } from "@/hooks/useUserType";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@/hooks/useWallet";
import { useCountry } from "@/contexts/CountryContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { roles } = useUserRoles();
  const { userType } = useUserType();
  const { wallet, loading: walletLoading } = useWallet();
  const { country, t } = useCountry();
  const queryClient = useQueryClient();
  const [shareSheetOpen, setShareSheetOpen] = useState(false);

  const greet = () => {
    const h = new Date().getHours();
    if (h < 12) return t('common.good_morning');
    if (h < 18) return t('common.good_afternoon');
    return t('common.good_night');
  };

  const isProvider = roles.some(r => ['doctor', 'clinic', 'store_owner', 'driver'].includes(r));
  const isAdmin = roles.includes('admin');
  const showRoleHero = isProvider || isAdmin;

  const { data: profile, isPending: profileLoading } = useQuery<any>({
    queryKey: ['profile-name', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const r: any = await supabase.from('profiles').select('full_name').eq('user_id', user!.id).maybeSingle();
      return r.data;
    },
  });

  const { data: upcoming, isPending: upcomingLoading } = useQuery<any>({
    queryKey: ['upcoming-c', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const res: any = await supabase.from('consultations')
        .select('id, scheduled_at, status').eq('patient_id', user!.id)
        .in('status', ['scheduled', 'confirmed', 'in_progress'])
        .order('scheduled_at').limit(1);
      return res.data?.[0];
    },
  });

  const { data: topDoctors } = useQuery<any[]>({
    queryKey: ['top-doctors-home', country?.id],
    queryFn: async () => {
      const query = supabase
        .from('doctor_profiles')
        .select('id, user_id, rating, consultation_fee, medical_specialties(name, icon)')
        .eq('is_available', true);

      if (country?.id) {
        (query as any).eq('country_id', country.id);
      }

      const res: any = await query
        .order('rating', { ascending: false })
        .limit(6);
      const dd: any[] = res.data || [];
      const ids = dd.map((d: any) => d.user_id);
      const { data: profs } = await supabase.from('profiles').select('user_id, full_name').in('user_id', ids);
      return dd.map((d: any) => ({ ...d, full_name: (profs as any[])?.find((p: any) => p.user_id === d.user_id)?.full_name }));
    },
  });

  const firstName = profile?.full_name?.split(' ')[0] || (user ? t('common.friend') : t('common.visitor'));
  const [isListening, setIsListening] = useState(false);
  const [activeTab, setActiveTab] = useState<'today' | 'discover'>(user ? 'today' : 'discover');

  // Lazy voice search — only instantiates SpeechRecognition API on user tap
  const startVoiceSearch = useCallback(() => {
    // Dynamic import of SpeechRecognition API (not available on all browsers)
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error(t('home.voice_not_supported'));
      return;
    }

    setIsListening(true);
    toast.info(t('home.voice_listening'), {
      description: t('home.voice_listening_desc'),
      icon: <Mic className="h-4 w-4 text-primary animate-pulse" />,
    });

    const recognition = new SpeechRecognition();
    recognition.lang = country?.id === 'MZ' ? 'pt-MZ' : country?.id === 'BR' ? 'pt-BR' : 'pt-PT';
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      navigate(`/health/triage?symptoms=${encodeURIComponent(transcript)}`);
    };

    recognition.onerror = () => {
      setIsListening(false);
      toast.error(t('home.voice_error'));
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, [country?.id, navigate, t]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['profile-name'] }),
      queryClient.invalidateQueries({ queryKey: ['upcoming-c'] }),
      queryClient.invalidateQueries({ queryKey: ['top-doctors-home'] }),
      queryClient.invalidateQueries({ queryKey: ['wallet'] }),
    ]);
  }, [queryClient]);

  return (
    <>
      <Seo
        title={`MedWallet Global ${country?.id || ''} — Saúde, Farmácia e Veterinária`}
        description={`Plataforma global de saúde. Consultas, farmácia 24h e veterinária com pagamentos em ${country?.currency_code || 'MZN'}.`}
        path="/"
      />

      {/* ============ OVERLAYS / MODALS (lazy — may not render visible content) ============ */}
      <LazySuspense><HealthProfileOnboarding /></LazySuspense>
      <LazySuspense><MorningGreeting /></LazySuspense>
      <LazySuspense><EmergencySOS /></LazySuspense>

      {/* ============ ROLE-BASED HOME (non-patient types get their own experience) ============ */}
      {userType && userType !== 'patient' ? (
        <div className="animate-fade-in min-h-screen bg-slate-950 pt-4">
          <LazySuspense><RoleBasedHome /></LazySuspense>
          <LazySuspense><MeddyChat /></LazySuspense>
        </div>
      ) : (
        <PullToRefresh onRefresh={handleRefresh}>
        <div className="animate-fade-in space-y-6 stagger-children">
        {/* ============ USER TYPE HERO (personalizado por tipo) ============ */}
        <LazySuspense><UserTypeHero /></LazySuspense>

        {/* ============ HERO SECTION ============ */}
        {showRoleHero ? (
          <RoleHero roles={roles as any} name={firstName !== 'visitante' ? firstName : undefined} />
        ) : (
          <section className="relative px-4 pt-3">
            <div
              className="relative rounded-[2rem] overflow-hidden gradient-ocean p-7 text-white min-h-[220px] flex flex-col justify-center"
              style={country?.branding_config?.home_banner_url ? {
                backgroundImage: `linear-gradient(to bottom right, rgba(0,0,0,0.6), rgba(0,0,0,0.3)), url(${country.branding_config.home_banner_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              } : {}}
            >
              {/* FloatingParticles removed — was 12 animated framer-motion elements on every home load */}
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] opacity-80 mb-2">
                  <Sparkles className="h-3.5 w-3.5" /> {greet()}{user ? `, ${profileLoading ? <Skeleton className="inline-block h-4 w-20 bg-white/20" /> : firstName}` : ''}
                </div>
                <h1 className="text-4xl font-black leading-none tracking-tight">
                  {t('home.hero_title').split(' ').map((word, i, arr) =>
                    i === arr.length - 1 ? (
                      <Fragment key={i}>
                        <br/>
                        <span className="text-secondary">{word}</span>
                      </Fragment>
                    ) : word + ' '
                  )}
                </h1>
                <p className="text-sm opacity-90 mt-4 max-w-[280px] font-medium leading-relaxed">
                  {t('home.hero_subtitle')}
                </p>

                <div className="flex gap-3 mt-6">
                  <Button size="lg" className="flex-1 bg-white text-primary hover:bg-white/90 font-black rounded-2xl shadow-lg" onClick={() => navigate('/health/triage')}>
                    <Sparkles className="h-5 w-5 mr-2" /> {t('home.meddy_consulta')}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    aria-label={t('home.voice_listening')}
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20 font-bold rounded-2xl backdrop-blur-sm min-w-[44px] min-h-[44px]"
                    onClick={startVoiceSearch}
                  >
                    <Mic className={cn("h-5 w-5", isListening && "animate-pulse text-secondary")} />
                  </Button>
                </div>
              </div>
              {/* Decorative glow blob removed — blur(80px) is GPU-heavy on mobile */}
            </div>
          </section>
        )}

        {/* ============ MEDDY WELCOME CARD (logged-in patients only) ============ */}
        {user && !isProvider && !isAdmin && <LazyMount><LazySuspense><MeddyWelcomeCard /></LazySuspense></LazyMount>}

        {/* ============ ENABLE NOTIFICATIONS BANNER (outside tabs) ============ */}
        
        {/* Onboarding leve para visitantes/pacientes: mostrar como registar como profissional */}
        {!isProvider && !isAdmin && <LazyMount><LazySuspense><VisitorProOnboarding /></LazySuspense></LazyMount>}

        {/* ============ FREE TRIAL BANNER (outside tabs) ============ */}
        <section className="px-4">
          <LazyMount><LazySuspense><FreeTrialBanner /></LazySuspense></LazyMount>
        </section>

        {/* ============ TAB SWITCHER (Today / Discover) ============ */}
        <div className="px-4">
          <div
            role="tablist"
            aria-label="Secções principais"
            className="flex gap-2 bg-muted/50 p-1 rounded-2xl"
          >
            <button
              role="tab"
              aria-selected={activeTab === 'today'}
              aria-controls="today-panel"
              id="today-tab"
              onClick={() => setActiveTab('today')}
              className={cn(
                'flex-1 py-3 min-h-[44px] rounded-xl font-black text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                activeTab === 'today'
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-transparent text-muted-foreground hover:bg-muted/80'
              )}
            >
              {t('home.tab_today')}
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'discover'}
              aria-controls="discover-panel"
              id="discover-tab"
              onClick={() => setActiveTab('discover')}
              className={cn(
                'flex-1 py-3 min-h-[44px] rounded-xl font-black text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                activeTab === 'discover'
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-transparent text-muted-foreground hover:bg-muted/80'
              )}
            >
              {t('home.tab_discover')}
            </button>
          </div>
        </div>

        {/* ============ TAB CONTENT ============ */}
        {/* AnimatePresence removed — CSS page transitions handle this */ }
          {activeTab === 'today' ? (
            <div
            role="tabpanel"
            id="today-panel"
            aria-labelledby="today-tab"
            className="space-y-6"
          >
              {/* WALLET & UPCOMING CONSULTATION */}
              <section className="px-4 grid grid-cols-2 gap-4">
                {user ? (
                  walletLoading ? (
                    <div className="h-40 rounded-2xl bg-muted animate-pulse" />
                  ) : (
                    <button
                      onClick={() => navigate('/wallet')}
                      aria-label={`${t('home.wallet_card')} - ${wallet?.balance ?? 0} ${country?.currency_code || 'MZN'}`}
                      className="bento-card p-5 bg-gradient-to-br from-primary to-primary/80 text-white flex flex-col justify-between h-40 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      <div>
                        <p className="text-[10px] uppercase font-bold tracking-widest opacity-70">{t('home.wallet_card')}</p>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-3xl font-black tabular-nums">{Number(wallet?.balance ?? 0).toLocaleString()}</span>
                          <span className="text-xs font-bold opacity-80">{country?.currency_code || 'MZN'}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] opacity-60">{t('wallet.secure_instant')}</span>
                        <div className="relative">
                          {/* PulseRing removed */ }
                          <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur">
                            <Plus className="h-4 w-4" />
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                ) : null}

                {upcomingLoading && user ? (
                  <div className="h-40 rounded-2xl bg-muted animate-pulse" />
                ) : (
                  <button
                    onClick={() => navigate(upcoming ? `/health/consultation/${upcoming.id}` : '/health/doctors')}
                    aria-label={upcoming ? t('health.upcoming_consultation') : t('health.new_consultation')}
                    className={cn(
                      'bento-card p-5 flex flex-col justify-between h-40 border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                      upcoming ? 'bg-secondary/5 border-secondary/20' : 'bg-muted/30 border-transparent'
                    )}
                  >
                    <div>
                      <p className={cn('text-[10px] uppercase font-bold tracking-widest', upcoming ? 'text-secondary' : 'text-muted-foreground')}>
                        {upcoming ? t('health.upcoming_consultation') : t('health.new_consultation')}
                      </p>
                      {upcoming ? (
                        <div className="mt-2">
                          <p className="text-lg font-black leading-tight">
                            {new Date(upcoming.scheduled_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <p className="text-xs font-bold text-muted-foreground">
                            {new Date(upcoming.scheduled_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                          </p>
                        </div>
                      ) : (
                        <div className="mt-2">
                          <p className="text-lg font-black leading-tight">{t('health.book_now')}</p>
                          <p className="text-xs font-medium text-muted-foreground">{t('health.under_2_min')}</p>
                        </div>
                      )}
                    </div>
                    <div className={cn('h-8 w-8 rounded-full flex items-center justify-center shadow-sm', upcoming ? 'bg-secondary text-white' : 'bg-white text-muted-foreground border')}>
                      <Calendar className="h-4 w-4" />
                    </div>
                  </button>
                )}
              </section>

              {/* URGENT BANNER — Meddy Agora */}
              <section className="px-4">
                <button
                  onClick={() => navigate('/health/triage')}
                  aria-label={`${t('health.urgent')} - ${t('health.meddy_now')}`}
                  className="w-full bg-primary text-white p-6 rounded-[2rem] shadow-md relative overflow-hidden text-left group active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
                >
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="max-w-[70%]">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-secondary text-white border-0 font-bold uppercase tracking-widest text-[9px]">{t('health.urgent')}</Badge>
                        <h2 className="text-2xl font-black"><span className="text-gradient-premium">{t('health.meddy_now')}</span></h2>
                      </div>
                      <p className="text-white/80 text-xs font-bold leading-relaxed">
                        {t('health.meddy_now_desc')}
                      </p>
                    </div>
                    <div className="h-14 w-14 rounded-full bg-white/15 flex items-center justify-center border border-white/20 transition-colors">
                      <ShieldCheck className="h-7 w-7 text-secondary" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="absolute -right-10 -bottom-10 h-40 w-40 bg-secondary/10 rounded-full blur-none opacity-30" />
                </button>
              </section>

              <LazyMount><LazySuspense><AirQualityWidget /></LazySuspense></LazyMount>

              <LazyMount><LazySuspense><PillTracker /></LazySuspense></LazyMount>

              <LazyMount><LazySuspense><FollowUpReminders /></LazySuspense></LazyMount>
            </div>
          ) : (
            <div
            role="tabpanel"
            id="discover-panel"
            aria-labelledby="discover-tab"
            className="space-y-6"
          >
              {/* QUICK PILLARS (The 5 Main Actions) */}
              <section className="px-4">
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {[
                    { icon: Pill, label: t('home.pharmacy'), bgClass: 'bg-emerald-500/5 border-emerald-500/10 hover:border-emerald-500/30', textClass: 'text-emerald-500', to: '/pharmacy' },
                    { icon: Stethoscope, label: t('home.clinics'), bgClass: 'bg-primary/5 border-primary/10 hover:border-primary/30', textClass: 'text-primary', to: '/health/facilities?type=clinic' },
                    { icon: PawPrint, label: t('home.veterinary'), bgClass: 'bg-amber-500/5 border-amber-500/10 hover:border-amber-500/30', textClass: 'text-amber-500', to: '/health/veterinary' },
                    { icon: Building2, label: t('home.hospitals'), bgClass: 'bg-destructive/5 border-destructive/10 hover:border-destructive/30', textClass: 'text-destructive', to: '/health/facilities?type=hospital' },
                    { icon: FlaskConical, label: t('home.laboratories'), bgClass: 'bg-secondary/5 border-secondary/10 hover:border-secondary/30', textClass: 'text-secondary', to: '/health/facilities?type=laboratory' },
                  ].map(c => (
                    <button
                      key={c.label}
                      onClick={() => navigate(c.to)}
                      aria-label={c.label}
                      className="group flex flex-col items-center gap-2 no-tap-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-2xl"
                    >
                      
                        <div className={cn(
                          'h-14 w-full min-h-[44px] rounded-2xl flex flex-col items-center justify-center transition-all group-hover:scale-105 active:scale-95 shadow-sm border-2',
                          c.bgClass
                        )}>
                          <c.icon className={cn('h-6 w-6', c.textClass)} aria-hidden="true" />
                        </div>
                      
                      <span className="text-[11px] font-black text-center leading-tight text-foreground/80">{c.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              <LazyMount><LazySuspense><NearbyProvidersWidget /></LazySuspense></LazyMount>

              <LazyMount><LazySuspense><PersonalizedForYou /></LazySuspense></LazyMount>

              {/* ECOSYSTEM INTERCONNECTION — sintonia between user types */}
              {user && <LazyMount><LazySuspense><EcosystemFlow /></LazySuspense></LazyMount>}

              {/* PLANS PREMIUM MZ (upsell) */}
              <section className="px-4">
                <div className="bento-card p-5 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border-amber-500/20 relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl" />
                  <div className="relative flex items-start gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 ">
                      <Crown className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-black text-base">{t('home.plans_premium_title')}</p>
                        <Badge className="bg-amber-500/20 text-amber-700 border-0 text-[10px] font-black">{t('home.plans_premium_from')}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium mt-1.5 leading-relaxed">
                        {t('home.plans_premium_desc')}
                      </p>
                      <div className="flex gap-2 mt-3 flex-wrap">
                        <Badge variant="outline" className="text-[10px] gap-1 border-amber-500/30">
                          <Baby className="h-3 w-3" /> {t('home.plans_pregnant')}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] gap-1 border-amber-500/30">
                          <HeartPulse className="h-3 w-3" /> {t('home.plans_chronic')}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] gap-1 border-amber-500/30">
                          <Crown className="h-3 w-3" /> {t('home.plans_premium')}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        className="mt-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black rounded-xl h-9"
                        onClick={() => navigate('/planos')}
                      >
                        {t('home.plans_see_plans')} <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </section>

              {/* EDUCATIONAL & HELP */}
              <section className="px-4 grid grid-cols-2 gap-4">
                <button
                  onClick={() => navigate('/health/education')}
                  aria-label={t('health.health_education')}
                  className="bento-card p-4 bg-amber-500/5 border-amber-500/20 text-left space-y-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
                >
                  <div className="h-11 w-11 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-black text-sm">{t('health.health_education')}</p>
                    <p className="text-[10px] text-muted-foreground font-medium">{t('home.education_local_guides')}</p>
                  </div>
                </button>

                <button
                  onClick={() => navigate('/help')}
                  aria-label={t('health.help_payment', { method: country?.config?.payment_methods?.[0]?.name || 'M-Pesa' })}
                  className="bento-card p-4 bg-blue-500/5 border-blue-500/20 text-left space-y-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  <div className="h-11 w-11 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-black text-sm">{t('health.help_payment', { method: country?.config?.payment_methods?.[0]?.name || 'M-Pesa' })}</p>
                    <p className="text-[10px] text-muted-foreground font-medium">{t('health.support_24h')}</p>
                  </div>
                </button>
              </section>

              <LazyMount><LazySuspense><ReferralBanner onOpenShareSheet={() => setShareSheetOpen(true)} /></LazySuspense></LazyMount>
              <LazySuspense><ViralShareSheet open={shareSheetOpen} onOpenChange={setShareSheetOpen} /></LazySuspense>

              <LazyMount><LazySuspense><KlipyBanner query={`${country?.name || 'mozambique'} healthcare`} /></LazySuspense></LazyMount>

              {/* BECOME A PROVIDER */}
              <section className="px-4">
                <div className="bento-card p-6 bg-gradient-to-br from-slate-900 to-primary text-white relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className="bg-gold text-gold-foreground border-0 font-black">{t('home.for_professionals')}</Badge>
                    </div>
                    <h3 className="text-2xl font-black leading-tight">{t('health.grow_with_medwallet')}</h3>
                    <p className="text-xs opacity-70 mt-2 font-medium">{t('health.provider_desc')}</p>

                    <div className="grid grid-cols-2 gap-2 mt-5">
                      {[
                        { label: t('common.doctor'), icon: Stethoscope, to: '/register/professional?role=doctor', role: 'doctor' },
                        { label: t('common.pharmacy'), icon: Pill, to: '/register/professional?role=store_owner', role: 'store_owner' },
                        { label: t('home.clinics'), icon: Building2, to: '/register/professional?role=clinic', role: 'clinic' },
                        { label: t('home.laboratories'), icon: FlaskConical, to: '/register/professional?role=laboratory', role: 'laboratory' },
                      ].filter(b => !roles.includes(b.role as any)).map(b => (
                        <Button key={b.label} variant="secondary" size="sm" className="bg-white/10 hover:bg-white/20 border-white/10 text-white font-bold h-10 rounded-xl" onClick={() => navigate(b.to)}>
                          <b.icon className="h-3.5 w-3.5 mr-1.5" /> {b.label}
                        </Button>
                      ))}
                      {roles.length > 0 && roles.some(r => ['doctor', 'store_owner', 'clinic', 'laboratory', 'driver'].includes(r)) && (
                         <Button variant="secondary" size="sm" className="col-span-2 bg-secondary/20 hover:bg-secondary/30 border-secondary/20 text-white font-bold h-10 rounded-xl" onClick={() => {
                           if (roles.includes('doctor')) navigate('/doctor/dashboard');
                           else if (roles.includes('store_owner')) navigate('/store/dashboard');
                           else if (roles.includes('clinic')) navigate('/clinic/dashboard');
                           else if (roles.includes('driver')) navigate('/driver/dashboard');
                         }}>
                           {t('home.go_to_panel')} <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                         </Button>
                      )}
                    </div>
                  </div>
                  {/* Decorative gradient blob — hidden on touch devices to avoid GPU compositing */}
                  <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-secondary/10 rounded-full blur-[100px] hidden [@media(hover:hover)]:block" />
                </div>
              </section>

              {/* SUGGEST A PLACE */}
              <section className="px-4 mb-6">
                <button
                  onClick={() => navigate('/suggest-place')}
                  aria-label={`${t('health.suggest_place')} - +${country?.config?.registration_defaults?.reward_amount || 25} ${country?.currency_code || 'MZN'}`}
                  className="w-full bento-card p-5 text-left bg-gold/5 border-gold/20 relative overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
                >
                  <div className="relative flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-gold flex items-center justify-center shrink-0 ">
                      <MapPinPlus className="h-6 w-6 text-gold-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-base">{t('health.suggest_place')}</p>
                        <Badge className="bg-gold text-gold-foreground border-0 text-[10px] font-black">+{country?.config?.registration_defaults?.reward_amount || 25} {country?.currency_code || 'MZN'}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium mt-0.5">{t('health.map_health_country', { country: country?.name || 'Moçambique' })}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gold group-hover:translate-x-1 transition" />
                  </div>
                </button>
              </section>
            </div>
          )}
        
        <LazySuspense><MeddyChat /></LazySuspense>
      </div>
        </PullToRefresh>
      )}
    </>
  );
}

import { Seo } from "@/components/Seo";
import {
  Stethoscope, Sparkles, Pill, MessageCircle, ArrowRight,
  Plus, Calendar, ShieldCheck, Building2,
  BookOpen, MapPinPlus, Mic, FlaskConical, PawPrint, Crown, Baby, HeartPulse
} from "lucide-react";
import { EnableNotificationsBanner } from "@/components/notifications/EnableNotificationsBanner";
import { FreeTrialBanner } from "@/components/monetization/FreeTrialBanner";
import { FollowUpReminders } from "@/components/health/FollowUpReminders";
import { NearbyProvidersWidget } from "@/components/home/NearbyProvidersWidget";
import { KlipyBanner } from "@/components/klipy/KlipyBanner";
import { PersonalizedForYou } from "@/components/health/PersonalizedForYou";
import { AirQualityWidget } from "@/components/home/AirQualityWidget";
import { ReferralBanner } from "@/components/referrals/ReferralBanner";
import { MeddyWelcomeCard } from "@/components/mascot/MeddyWelcomeCard";
import { MorningGreeting } from "@/components/health/MorningGreeting";
import { HealthProfileOnboarding } from "@/components/health/HealthProfileOnboarding";
import { PillTracker } from "@/components/health/PillTracker";
import { EmergencySOS } from "@/components/health/EmergencySOS";
import { RoleHero } from "@/components/home/RoleHero";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRoles } from "@/hooks/useUserRole";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@/hooks/useWallet";
import { useCountry } from "@/contexts/CountryContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import NumberFlow from "@number-flow/react";
import { motion, AnimatePresence } from "framer-motion";
import { Fragment, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { roles } = useUserRoles();
  const { wallet } = useWallet();
  const { country, t } = useCountry();

  const greet = () => {
    const h = new Date().getHours();
    if (h < 12) return t('common.good_morning');
    if (h < 18) return t('common.good_afternoon');
    return t('common.good_night');
  };

  const isProvider = roles.some(r => ['doctor', 'clinic', 'store_owner', 'driver'].includes(r));
  const isAdmin = roles.includes('admin');
  const showRoleHero = isProvider || isAdmin;

  const { data: profile } = useQuery<any>({
    queryKey: ['profile-name', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const r: any = await supabase.from('profiles').select('full_name').eq('user_id', user!.id).maybeSingle();
      return r.data;
    },
  });

  const { data: upcoming } = useQuery<any>({
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
        .from('doctor_profiles' as any)
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

  const startVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("O seu navegador não suporta reconhecimento de voz.");
      return;
    }

    setIsListening(true);
    toast.info("A ouvir sintomas...", {
      description: "Podes falar agora. A usar Cloud Speech-to-Text via navegador.",
      icon: <Mic className="h-4 w-4 text-primary animate-pulse" />,
    });

    const recognition = new SpeechRecognition();
    recognition.lang = country?.id === 'BR' ? 'pt-BR' : 'pt-PT';

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      navigate(`/health/triage?symptoms=${encodeURIComponent(transcript)}`);
    };

    recognition.onerror = () => {
      setIsListening(false);
      toast.error("Erro ao ouvir. Tente novamente.");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <>
      <Seo
        title={`MedWallet Global ${country?.id || ''} — Saúde, Farmácia e Veterinária`}
        description={`Plataforma global de saúde. Consultas, farmácia 24h e veterinária com pagamentos em ${country?.currency_code || 'MZN'}.`}
        path="/"
      />

      <HealthProfileOnboarding />
      <MorningGreeting />
      <EmergencySOS />

      <div className="pb-24 animate-fade-in space-y-6">
        {/* ============ HERO SECTION ============ */}
        {showRoleHero ? (
          <RoleHero roles={roles as any} name={firstName !== 'visitante' ? firstName : undefined} />
        ) : (
          <section className="relative px-4 pt-3">
            <div
              className="relative rounded-[2.5rem] overflow-hidden gradient-ocean p-7 text-white shadow-premium min-h-[220px] flex flex-col justify-center"
              style={country?.branding_config?.home_banner_url ? {
                backgroundImage: `linear-gradient(to bottom right, rgba(0,0,0,0.6), rgba(0,0,0,0.3)), url(${country.branding_config.home_banner_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              } : {}}
            >
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] opacity-80 mb-2">
                  <Sparkles className="h-3.5 w-3.5" /> {greet()}{user ? `, ${firstName}` : ''}
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
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20 font-bold rounded-2xl backdrop-blur-sm"
                    onClick={startVoiceSearch}
                  >
                    <Mic className={cn("h-5 w-5", isListening && "animate-pulse text-secondary")} />
                  </Button>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-48 h-48 bg-secondary/20 rounded-full blur-[80px] -mr-10 -mt-10" />
            </div>
          </section>
        )}

        {/* ============ ENABLE NOTIFICATIONS BANNER (apenas se ainda não ativou) ============ */}
        <EnableNotificationsBanner />

        {/* ============ FREE TRIAL BANNER (alavanca de adopção) ============ */}
        <section className="px-4">
          <FreeTrialBanner />
        </section>

        {/* ============ QUICK PILLARS (The 5 Main Actions) ============ */}
        <section className="px-4">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {[
              { icon: Pill, label: t('home.pharmacy'), color: 'emerald', to: '/pharmacy' },
              { icon: Stethoscope, label: t('home.clinics'), color: 'primary', to: '/health/facilities?type=clinic' },
              { icon: PawPrint, label: t('home.veterinary'), color: 'amber-600', to: '/health/veterinary' },
              { icon: Building2, label: t('home.hospitals'), color: 'destructive', to: '/health/facilities?type=hospital' },
              { icon: FlaskConical, label: t('home.laboratories'), color: 'secondary', to: '/health/facilities?type=laboratory' },
            ].map(c => (
              <button key={c.label} onClick={() => navigate(c.to)} className="group flex flex-col items-center gap-2 no-tap-target">
                <div className={cn(
                  "h-14 w-full rounded-2xl flex flex-col items-center justify-center transition-all group-hover:scale-105 active:scale-95 shadow-sm border-2",
                  c.color.includes('-') ? `bg-amber-500/5 border-amber-500/10 hover:border-amber-500/30` : `bg-${c.color}/5 border-${c.color}/10 hover:border-${c.color}/30`
                )}>
                  <c.icon className={cn("h-6 w-6", c.color.includes('-') ? `text-${c.color}` : `text-${c.color}`)} />
                </div>
                <span className="text-[10px] font-black text-center leading-tight text-foreground/80">{c.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ============ WALLET & UPCOMING ============ */}
        <section className="px-4 grid grid-cols-2 gap-4">
          {user && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/wallet')}
              className="bento-card p-5 bg-gradient-to-br from-primary to-primary/80 text-white flex flex-col justify-between h-40"
            >
              <div>
                <p className="text-[10px] uppercase font-bold tracking-widest opacity-70">{t('home.wallet_card')}</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <NumberFlow value={Number(wallet?.balance ?? 0)} className="text-3xl font-black tabular-nums" />
                  <span className="text-xs font-bold opacity-80">{country?.currency_code || 'MZN'}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] opacity-60">{t('wallet.secure_instant')}</span>
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur">
                  <Plus className="h-4 w-4" />
                </div>
              </div>
            </motion.button>
          )}

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(upcoming ? `/health/consultation/${upcoming.id}` : '/health/doctors')}
            className={cn(
              "bento-card p-5 flex flex-col justify-between h-40 border-2",
              upcoming ? "bg-secondary/5 border-secondary/20" : "bg-muted/30 border-transparent"
            )}
          >
            <div>
              <p className={cn("text-[10px] uppercase font-bold tracking-widest", upcoming ? "text-secondary" : "text-muted-foreground")}>
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
            <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shadow-sm", upcoming ? "bg-secondary text-white" : "bg-white text-muted-foreground border")}>
              <Calendar className="h-4 w-4" />
            </div>
          </motion.button>
        </section>

        {/* ============ URGENT BANNER ============ */}
        <section className="px-4">
          <button
            onClick={() => navigate('/health/triage')}
            className="w-full bg-primary text-white p-6 rounded-[2rem] shadow-premium relative overflow-hidden text-left group active:scale-95 transition-transform"
          >
            <div className="relative z-10 flex items-center justify-between">
              <div className="max-w-[70%]">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-secondary text-white border-0 font-bold uppercase tracking-widest text-[9px]">{t('health.urgent')}</Badge>
                  <h2 className="text-2xl font-black">{t('health.meddy_now')}</h2>
                </div>
                <p className="text-white/80 text-xs font-bold leading-relaxed">
                  {t('health.meddy_now_desc')}
                </p>
              </div>
              <div className="h-14 w-14 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20 group-hover:bg-white/20 transition-colors">
                <ShieldCheck className="h-7 w-7 text-secondary" />
              </div>
            </div>
            <div className="absolute -right-10 -bottom-10 h-40 w-40 bg-secondary/10 rounded-full blur-3xl" />
          </button>
        </section>

        <AirQualityWidget />

        <PillTracker />

        <FollowUpReminders />

        <NearbyProvidersWidget />

        <PersonalizedForYou />

        {/* ============ PLANS PREMIUM MZ (upsell) ============ */}
        <section className="px-4">
          <div className="bento-card p-5 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border-amber-500/20 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl" />
            <div className="relative flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-glow">
                <Crown className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-black text-base">Planos Premium MZ</p>
                  <Badge className="bg-amber-500/20 text-amber-700 border-0 text-[10px] font-black">Desde 199 MZN/mês</Badge>
                </div>
                <p className="text-xs text-muted-foreground font-medium mt-1.5 leading-relaxed">
                  Consultas grátis, descontos em farmácia, SOS obstétrico 24/7, refills ARV/TB ilimitados.
                </p>
                <div className="flex gap-2 mt-3 flex-wrap">
                  <Badge variant="outline" className="text-[10px] gap-1 border-amber-500/30">
                    <Baby className="h-3 w-3" /> Grávida 299
                  </Badge>
                  <Badge variant="outline" className="text-[10px] gap-1 border-amber-500/30">
                    <HeartPulse className="h-3 w-3" /> Crónico 249
                  </Badge>
                  <Badge variant="outline" className="text-[10px] gap-1 border-amber-500/30">
                    <Crown className="h-3 w-3" /> Premium 499
                  </Badge>
                </div>
                <Button
                  size="sm"
                  className="mt-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black rounded-xl h-9"
                  onClick={() => navigate('/planos')}
                >
                  Ver planos <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ============ EDUCATIONAL & HELP ============ */}
        <section className="px-4 grid grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/health/education')}
            className="bento-card p-4 bg-amber-500/5 border-amber-500/20 text-left space-y-3"
          >
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="font-black text-sm">{t('health.health_education')}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Guias locais</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/help')}
            className="bento-card p-4 bg-blue-500/5 border-blue-500/20 text-left space-y-3"
          >
            <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-black text-sm">{t('health.help_payment', { method: country?.config?.payment_methods?.[0]?.name || 'M-Pesa' })}</p>
              <p className="text-[10px] text-muted-foreground font-medium">{t('health.support_24h')}</p>
            </div>
          </button>
        </section>

        <ReferralBanner />

        <KlipyBanner query={`${country?.name || 'mozambique'} healthcare`} />

        {/* ============ BECOME A PROVIDER ============ */}
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
                  { label: t('common.doctor'), icon: Stethoscope, to: "/doctor/register", role: 'doctor' },
                  { label: t('common.pharmacy'), icon: Pill, to: "/store/register", role: 'store_owner' },
                  { label: t('home.clinics'), icon: Building2, to: "/clinic/register", role: 'clinic' },
                  { label: t('home.laboratories'), icon: FlaskConical, to: "/lab/register", role: 'laboratory' },
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
                     Ir para o meu Painel Profissional <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                   </Button>
                )}
              </div>
            </div>
            <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-secondary/10 rounded-full blur-[100px]" />
          </div>
        </section>

        {/* ============ SUGGEST A PLACE ============ */}
        <section className="px-4 mb-6">
          <button
            onClick={() => navigate('/suggest-place')}
            className="w-full bento-card p-5 text-left bg-gold/5 border-gold/20 relative overflow-hidden group"
          >
            <div className="relative flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-gold flex items-center justify-center shrink-0 shadow-glow">
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
    </>
  );
}

import {
  Stethoscope, Sparkles, FileText, Pill, MessageCircle, ArrowRight, Gift, Wallet,
  Plus, Briefcase, Star, TrendingUp, Calendar, Activity, Zap, Heart, ShieldCheck,
  Truck, Building2, ChevronRight, BookOpen, MapPinPlus, Award, Crown, HandHeart,
  Mic, Search
} from "lucide-react";
import { EnableNotificationsBanner } from "@/components/notifications/EnableNotificationsBanner";
import { FollowUpReminders } from "@/components/health/FollowUpReminders";
import { NearbyProvidersWidget } from "@/components/home/NearbyProvidersWidget";
import { KlipyBanner } from "@/components/klipy/KlipyBanner";
import { PersonalizedForYou } from "@/components/health/PersonalizedForYou";
import { AirQualityWidget } from "@/components/home/AirQualityWidget";
import { ReferralBanner } from "@/components/referrals/ReferralBanner";
import { MeddyWelcomeCard } from "@/components/mascot/MeddyWelcomeCard";
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
import { usePulseIdentity } from "@/hooks/usePulseIdentity";
import { useDataSaver } from "@/contexts/DataSaverContext";
import { Fragment, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { roles } = useUserRoles();
  const { wallet } = useWallet();
  const { country, t } = useCountry();
  const pulse = usePulseIdentity();
  const PulseIcon = pulse.icon;

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

  const firstName = profile?.full_name?.split(' ')[0] || (user ? 'amigo' : 'visitante');
  const { enabled: dataSaver } = useDataSaver();
  const [isListening, setIsListening] = useState(false);

  const startVoiceSearch = () => {
    setIsListening(true);
    toast.info("A ouvir sintomas...", {
      description: "Podes falar agora. A usar Cloud Speech-to-Text.",
      icon: <Mic className="h-4 w-4 text-primary animate-pulse" />,
    });
    // Simulação
    setTimeout(() => {
      setIsListening(false);
      navigate('/health/triage');
    }, 3000);
  };

  return (
    <div
      className="pb-6 animate-fade-in"
      style={{
        '--primary': country?.branding_config?.primary_color || '#047857',
        '--accent': country?.branding_config?.accent_color || '#fbbf24'
      } as any}
    >
      {/* ============ HERO — personalizado por role ============ */}
      {showRoleHero ? (
        <RoleHero roles={roles as any} name={firstName !== 'visitante' ? firstName : undefined} />
      ) : (
      <section className="relative px-4 pt-3">
        <div
          className="relative rounded-[2rem] overflow-hidden gradient-ocean p-6 text-white shadow-premium"
          style={country?.branding_config?.home_banner_url ? {
            backgroundImage: `linear-gradient(to bottom right, rgba(0,0,0,0.4), rgba(0,0,0,0.2)), url(${country.branding_config.home_banner_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          } : {}}
        >
          {/* Layered orbs — profundidade */}
          <span className="float-orb h-56 w-56 -top-14 -right-10 bg-secondary/40" />
          <span className="float-orb h-64 w-64 -bottom-20 -left-14 bg-accent/30" style={{ animationDelay: '-6s' }} />
          <span className="float-orb h-40 w-40 top-1/3 right-1/3 bg-gold/20" style={{ animationDelay: '-3s' }} />
          <div className="relative">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] opacity-80">
              <Sparkles className="h-3 w-3" /> {greet()}{user ? `, ${firstName}` : ''}
            </div>
            <h1 className="text-3xl font-black leading-[1.05] mt-2">
              {t('home.hero_title').split(' ').map((word, i, arr) =>
                i === arr.length - 1 ? (
                  <Fragment key={i}>
                    <br/>
                    <span className="text-secondary">{word}</span>
                  </Fragment>
                ) : word + ' '
              )}
            </h1>
            <p className="text-sm opacity-85 mt-3 max-w-[280px]">
              {t('home.hero_subtitle')}
            </p>

            <div className="flex gap-2 mt-5">
              <Button size="sm" className="flex-1 bg-white text-primary hover:bg-white/90 font-bold" onClick={() => navigate('/health/triage')}>
                <Sparkles className="h-4 w-4 mr-1.5" /> {t('home.meddy_consulta')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-transparent border-white/60 !text-white hover:bg-white/15 hover:!text-white font-bold"
                onClick={startVoiceSearch}
              >
                <Mic className={cn("h-4 w-4 mr-1.5", isListening && "animate-pulse text-secondary")} />
                {isListening ? "A ouvir..." : "Voz"}
              </Button>
            </div>

            {/* Trust strip */}
            <div className="flex items-center gap-3 mt-5 pt-4 border-t border-white/15 text-[10px] opacity-75">
              <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> {country?.config?.payment_methods?.[0]?.name || 'Pagamento'}</span>
              <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {t('home.trust_strip.doctors')}</span>
              <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> {t('home.trust_strip.available')}</span>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Uber-like Urgent Request Banner */}
      <section className="px-4 mt-6">
        <button
          onClick={() => navigate('/health/triage')}
          className="w-full bg-primary text-white p-5 rounded-[2rem] shadow-lg relative overflow-hidden text-left group active:scale-95 transition-transform"
        >
          <div className="relative z-10 flex items-center justify-between">
            <div className="max-w-[70%]">
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Uber Health</span>
                <h2 className="text-xl font-black">Meddy Agora</h2>
              </div>
              <p className="text-white/80 text-xs font-medium">Chamada urgente: O médico mais próximo atende em vídeo agora.</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm group-hover:bg-white/30 transition-colors">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 h-32 w-32 bg-white/5 rounded-full blur-2xl" />
        </button>
      </section>

      <div className="px-4 mt-4">
        {dataSaver && (
          <Badge variant="secondary" className="mb-2 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1.5 py-1">
            <Zap className="h-3 w-3" /> Modo Poupança de Dados Ativo
          </Badge>
        )}
        <EnableNotificationsBanner />
      </div>

      {/* ============ MEDDY (mascote) ============ */}
      <MeddyWelcomeCard message="Posso ajudar-te a encontrar médico, farmácia ou marcar teleconsulta." />

      {/* ============ BENTO GRID ============ */}
      <motion.section
        className="px-4 mt-5 grid grid-cols-6 auto-rows-[80px] gap-3"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
      >
        {/* Wallet — large */}
        {user && (
          <motion.button
            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
            onClick={() => navigate('/wallet')}
            className="col-span-4 row-span-2 bento-card text-left p-4 bg-gradient-to-br from-primary to-secondary text-primary-foreground"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider opacity-75 font-bold">Carteira {country?.currency_code || 'MZN'}</p>
                <p className="text-3xl font-black mt-1 leading-none flex items-baseline num-pulse">
                  <NumberFlow value={Number(wallet?.balance ?? 0)} format={{ maximumFractionDigits: 0 }} className="tabular-nums" />
                  <span className="text-base font-semibold ml-1.5 opacity-80">{country?.currency_code || 'MZN'}</span>
                </p>
              </div>
              <div className="h-9 w-9 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
              <span className="text-[10px] opacity-70">↘ Desconto auto em todas as compras</span>
              <span className="text-xs font-bold flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full">
                <Plus className="h-3 w-3" /> Depositar
              </span>
            </div>
          </motion.button>
        )}

        {/* Planos de Saúde — Highlighting the subscription service */}
        <motion.button
          variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
          onClick={() => navigate('/health/plans')}
          className="col-span-2 row-span-2 bento-card text-left p-3 bg-gradient-to-br from-secondary to-secondary/10 border-secondary/30 relative overflow-hidden"
        >
          <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center mb-2">
            <Crown className="h-5 w-5 text-white" />
          </div>
          <p className="text-xs font-bold leading-tight text-white">Planos</p>
          <p className="text-[10px] text-white/80 mt-1 leading-tight">Health Pass</p>
          <Sparkles className="h-4 w-4 absolute bottom-3 right-3 text-white/50" />
        </motion.button>

        {/* Próxima consulta */}
        <button
          onClick={() => navigate(upcoming ? `/health/consultation/${upcoming.id}` : '/health/doctors')}
          className="col-span-3 row-span-2 bento-card text-left p-3 group"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-pharmacy/15 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-pharmacy" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-pharmacy">Próxima consulta</span>
          </div>
          {upcoming ? (
            <>
              <p className="text-sm font-bold leading-tight">
                {new Date(upcoming.scheduled_at).toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: 'short' })}
              </p>
              <p className="text-2xl font-black mt-1">
                {new Date(upcoming.scheduled_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <Badge variant="outline" className="text-[9px] mt-1 capitalize">{upcoming.status}</Badge>
            </>
          ) : (
            <>
              <p className="text-sm font-bold leading-tight">Marca a tua</p>
              <p className="text-2xl font-black mt-1">1ª consulta</p>
              <p className="text-[10px] text-muted-foreground mt-1">Em &lt; 2min</p>
            </>
          )}
        </button>

        {/* Farmácia */}
        <button onClick={() => navigate('/pharmacy')}
          className="col-span-3 row-span-2 bento-card text-left p-3 bg-gradient-to-br from-pharmacy/15 to-transparent border-pharmacy/30 relative overflow-hidden">
          <div className="h-9 w-9 rounded-xl bg-pharmacy text-pharmacy-foreground flex items-center justify-center mb-1.5">
            <Pill className="h-5 w-5" />
          </div>
          <p className="text-sm font-bold leading-tight">{t('home.pharmacy_24h')}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{t('home.delivery_priority')}</p>
          <Pill className="absolute -right-4 -bottom-4 h-20 w-20 text-pharmacy/10 -rotate-12" />
        </button>

        {/* Meddy Consulta */}
        <button onClick={() => navigate('/health/triage')}
          className="col-span-2 row-span-2 bento-card text-left p-3 bg-gradient-to-br from-accent/30 to-accent/5 border-accent/40">
          <Sparkles className="h-5 w-5 text-secondary mb-1.5" />
          <p className="text-xs font-bold">{t('home.meddy_consulta')}</p>
          <p className="text-[9px] text-muted-foreground mt-1 leading-tight">{t('home.hero_subtitle')}</p>
        </button>

        {/* Receitas */}
        <button onClick={() => navigate('/health/prescriptions')}
          className="col-span-2 row-span-2 bento-card text-left p-3">
          <FileText className="h-5 w-5 text-emerald mb-1.5" />
          <p className="text-xs font-bold">{t('home.prescriptions')}</p>
          <p className="text-[9px] text-muted-foreground mt-1 leading-tight">{t('home.prescriptions_desc')}</p>
        </button>

        {/* Histórico consultas */}
        <button onClick={() => navigate('/health/consultations')}
          className="col-span-2 row-span-2 bento-card text-left p-3 bg-muted/40">
          <MessageCircle className="h-5 w-5 text-primary mb-1.5" />
          <p className="text-xs font-bold">{t('home.chat_medical')}</p>
          <p className="text-[9px] text-muted-foreground mt-1 leading-tight">{t('home.chat_medical_desc')}</p>
        </button>
      </motion.section>

      <FollowUpReminders />

      <AirQualityWidget />

      <NearbyProvidersWidget />

      <PersonalizedForYou />

      {/* Educational content strip (rec 4.1 — Conteúdo Educacional Localizado) */}
      <section className="px-4 mt-5">
        <button
          onClick={() => navigate('/health/education')}
          className="w-full bento-card p-4 flex items-center gap-3 bg-gradient-to-r from-amber-500/10 via-transparent to-secondary/10 border-amber-500/30"
        >
          <div className="h-11 w-11 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
            <BookOpen className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="font-bold text-sm">{t('home.health_in_country', { country: country?.name || 'seu país' })}</p>
            <p className="text-[11px] text-muted-foreground">{t('home.health_team_desc')}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      </section>

      <ReferralBanner />

      <KlipyBanner query="healthcare smile" />

      {/* ============ GANHA COM O MEDWALLET — recruit providers ============ */}
      {!isProvider && !isAdmin && (
        <section className="px-4 mt-6">
          <div className="panel-shell p-5">
            <div className="flex items-center gap-2 text-[11px] uppercase font-black tracking-[0.18em] text-secondary">
              <Briefcase className="h-3.5 w-3.5" /> {t('home.earn_with_medwallet')}
            </div>
            <h3 className="text-2xl font-black mt-1.5 leading-tight">
              {t('home.are_you_professional')}
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-[280px]">
              {t('home.onboarding_desc')}
            </p>
            <div className="grid grid-cols-3 gap-2 mt-4">
              {[
                { icon: Stethoscope, label: t('common.doctor'), to: '/doctor/register' },
                { icon: Pill,        label: t('common.pharmacy'), to: '/store/register' },
                { icon: Truck,       label: t('common.driver'), to: '/driver/register' },
              ].map(o => (
                <button key={o.label} onClick={() => navigate(o.to)}
                  className="neu-btn px-2 py-3 flex flex-col items-center gap-1 text-[11px] font-bold">
                  <o.icon className="h-4 w-4 text-secondary" />
                  {o.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-4 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><Award className="h-3 w-3 text-gold" /> {t('home.fast_verification')}</span>
              <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-secondary" /> {t('home.payments_24h')}</span>
            </div>
          </div>
        </section>
      )}

      {/* ============ TOP MÉDICOS ============ */}
      {topDoctors && topDoctors.length > 0 && (
        <section className="mt-6">
          <div className="px-4 flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xl font-black">{t('home.top_doctors')}</h2>
              <p className="text-xs text-muted-foreground">{t('home.verified_reviews')}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/health/doctors')}>
              {t('home.view_all')} <ChevronRight className="h-4 w-4 ml-0.5" />
            </Button>
          </div>
          <div className="flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar snap-x snap-mandatory">
            {topDoctors.map(d => (
              <button key={d.id} onClick={() => navigate(`/health/book/${d.id}`)}
                className="snap-start shrink-0 w-44 bento-card text-left p-3">
                <div className="h-20 w-full rounded-xl bg-gradient-to-br from-pharmacy/30 via-primary/20 to-secondary/30 mb-2 flex items-center justify-center text-3xl font-black text-primary/40">
                  {d.full_name?.[0] || 'D'}
                </div>
                <p className="font-bold text-sm leading-tight truncate">Dr(a). {d.full_name || '—'}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {d.medical_specialties?.icon} {d.medical_specialties?.name || 'Clínico'}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-0.5 text-[10px] font-bold">
                    <Star className="h-3 w-3 fill-gold text-gold" /> {Number(d.rating || 0).toFixed(1)}
                  </div>
                  <span className="text-[10px] font-black text-primary">{d.consultation_fee} MZN</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ============ CATEGORIAS ============ */}
      <section className="px-4 mt-6">
        <h2 className="text-xl font-black mb-3">{t('home.categories')}</h2>
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: Stethoscope, label: 'Médicos', color: 'pharmacy', to: '/health/doctors' },
            { icon: Pill, label: 'Farmácia', color: 'emerald', to: '/pharmacy' },
            { icon: Activity, label: 'Exames', color: 'secondary', to: '/health/exams' },
            { icon: Heart, label: 'Planos', color: 'destructive', to: '/health/plans' },
            { icon: Heart, label: 'Seguros', color: 'primary', to: '/health/insurance' },
            { icon: HandHeart, label: 'Solidários', color: 'rose-500', to: '/solidarity' },
            { icon: Briefcase, label: 'Anúncios', color: 'secondary', to: '/ads' },
            { icon: Activity, label: 'Clínicas', color: 'primary', to: '/health/facilities?type=clinic' },
            { icon: Activity, label: 'Hospitais', color: 'destructive', to: '/health/facilities?type=hospital' },
            { icon: Activity, label: 'Laboratórios', color: 'secondary', to: '/health/facilities?type=laboratory' },
          ].map(c => (
            <button key={c.label} onClick={() => navigate(c.to)}
              className="bento-card aspect-square p-2 flex flex-col items-center justify-center gap-1.5">
              <div className={`h-10 w-10 rounded-xl bg-${c.color}/15 flex items-center justify-center`}>
                <c.icon className={`h-5 w-5 text-${c.color}`} />
              </div>
              <span className="text-[10px] font-semibold">{c.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ============ PROVIDER PANEL (se já é prestador) ============ */}
      {isProvider && (
        <section className="px-4 mt-6">
          <div className="bento-card p-5 gradient-mesh">
            <div className="flex items-center gap-2 text-[11px] uppercase font-bold tracking-wider text-secondary">
              <Briefcase className="h-3.5 w-3.5" /> Painel profissional
            </div>
            <h3 className="text-xl font-black mt-1.5">O teu negócio</h3>
            <div className="flex gap-2 mt-3 flex-wrap">
              {roles.includes('doctor') && (
                <Button size="sm" variant="secondary" onClick={() => navigate('/doctor/dashboard')}>
                  <Stethoscope className="h-3.5 w-3.5 mr-1" /> Painel médico
                </Button>
              )}
              {roles.includes('store_owner') && (
                <Button size="sm" variant="secondary" onClick={() => navigate('/store/dashboard')}>
                  <Building2 className="h-3.5 w-3.5 mr-1" /> Farmácia
                </Button>
              )}
              {roles.includes('driver') && (
                <Button size="sm" variant="secondary" onClick={() => navigate('/driver/dashboard')}>
                  <Truck className="h-3.5 w-3.5 mr-1" /> Entregas
                </Button>
              )}
              {roles.includes('clinic') && (
                <Button size="sm" variant="secondary" onClick={() => navigate('/clinic/dashboard')}>
                  <Building2 className="h-3.5 w-3.5 mr-1" /> Clínica
                </Button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ============ BECOME A PROVIDER ============ */}
      {!isProvider && (
        <section className="px-4 mt-6">
          <div className="bento-card p-5 bg-gradient-to-br from-primary via-primary to-secondary text-primary-foreground relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-secondary/30 blur-2xl" />
            <div className="relative">
              <Badge className="bg-gold text-gold-foreground border-0 mb-2">PARA PROFISSIONAIS</Badge>
              <h3 className="text-2xl font-black leading-tight">Trabalha com a MedWallet</h3>
              <p className="text-sm opacity-90 mt-2 max-w-[260px]">
                Médico, farmácia, motorista ou clínica — recebe pacientes/pedidos e a tua carteira em MZN.
              </p>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <Button size="sm" variant="secondary" onClick={() => navigate('/doctor/register')}>
                  <Stethoscope className="h-3.5 w-3.5 mr-1" /> Sou médico
                </Button>
                <Button size="sm" variant="secondary" onClick={() => navigate('/store/register')}>
                  <Building2 className="h-3.5 w-3.5 mr-1" /> Tenho farmácia
                </Button>
                <Button size="sm" variant="secondary" onClick={() => navigate('/driver/register')}>
                  <Truck className="h-3.5 w-3.5 mr-1" /> Faço entregas
                </Button>
                <Button size="sm" variant="secondary" onClick={() => navigate('/clinic/register')}>
                  <Building2 className="h-3.5 w-3.5 mr-1" /> Clínica
                </Button>
              </div>
              <div className="flex items-center gap-1 text-[10px] opacity-75 mt-3">
                <TrendingUp className="h-3 w-3" /> Comissão competitiva, pagamentos diários
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ============ SUGGEST A PLACE ============ */}
      <section className="px-4 mt-6">
        <button
          onClick={() => navigate('/suggest-place')}
          className="w-full bento-card p-5 text-left bg-gradient-to-br from-gold/15 via-gold/5 to-secondary/10 border-gold/30 relative overflow-hidden group"
        >
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-gold/20 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gold flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <MapPinPlus className="h-6 w-6 text-gold-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-black text-base">Conheces uma farmácia ou clínica?</p>
                <Badge className="bg-gold text-gold-foreground border-0 text-[9px]">
                  <Award className="h-3 w-3 mr-0.5" /> +25 MZN
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sugere e, quando publicarmos, recebes saldo + Pulse automaticamente.
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-gold group-hover:translate-x-1 transition" />
          </div>
        </button>
      </section>
    </div>
  );
}

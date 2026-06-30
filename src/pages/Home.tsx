import {
  Stethoscope, Sparkles, FileText, Pill, MessageCircle, ArrowRight, Gift, Wallet,
  Plus, Briefcase, Star, TrendingUp, Calendar, Activity, Zap, Heart, ShieldCheck,
  Truck, Building2, ChevronRight, BookOpen,
} from "lucide-react";
import { EnableNotificationsBanner } from "@/components/notifications/EnableNotificationsBanner";
import { FollowUpReminders } from "@/components/health/FollowUpReminders";
import { NearbyProvidersWidget } from "@/components/home/NearbyProvidersWidget";
import { KlipyBanner } from "@/components/klipy/KlipyBanner";
import { PersonalizedForYou } from "@/components/health/PersonalizedForYou";
import { ReferralBanner } from "@/components/referrals/ReferralBanner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRoles } from "@/hooks/useUserRole";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const greet = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
};

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { roles } = useUserRoles();
  const { wallet } = useWallet();

  const isProvider = roles.some(r => ['doctor', 'clinic', 'store_owner', 'driver'].includes(r));

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
    queryKey: ['top-doctors-home'],
    queryFn: async () => {
      const res: any = await supabase
        .from('doctor_profiles' as any)
        .select('id, user_id, rating, consultation_fee, medical_specialties(name, icon)')
        .eq('is_active', true)
        .order('rating', { ascending: false })
        .limit(6);
      const dd: any[] = res.data || [];
      const ids = dd.map((d: any) => d.user_id);
      const { data: profs } = await supabase.from('profiles').select('user_id, full_name').in('user_id', ids);
      return dd.map((d: any) => ({ ...d, full_name: (profs as any[])?.find((p: any) => p.user_id === d.user_id)?.full_name }));
    },
  });

  const firstName = profile?.full_name?.split(' ')[0] || (user ? 'amigo' : 'visitante');

  return (
    <div className="pb-6 animate-fade-in">
      {/* ============ HERO ============ */}
      <section className="relative px-4 pt-3">
        <div className="relative rounded-[2rem] overflow-hidden gradient-ocean p-6 text-white shadow-premium">
          <div className="absolute -top-12 -right-10 w-48 h-48 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-16 -left-12 w-56 h-56 rounded-full bg-secondary/30 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] opacity-80">
              <Sparkles className="h-3 w-3" /> {greet()}{user ? `, ${firstName}` : ''}
            </div>
            <h1 className="text-3xl font-black leading-[1.05] mt-2">
              Saúde, farmácia<br/>
              <span className="text-secondary">numa só carteira.</span>
            </h1>
            <p className="text-sm opacity-85 mt-3 max-w-[280px]">
              Triagem com IA, médicos verificados e entregas em Maputo — pago direto da tua carteira MZN.
            </p>

            <div className="flex gap-2 mt-5">
              <Button size="sm" className="flex-1 bg-white text-primary hover:bg-white/90 font-bold" onClick={() => navigate('/health/triage')}>
                <Sparkles className="h-4 w-4 mr-1.5" /> Triagem IA
              </Button>
              <Button size="sm" variant="outline" className="flex-1 border-white/40 text-white hover:bg-white/10" onClick={() => navigate('/health/doctors')}>
                <Stethoscope className="h-4 w-4 mr-1.5" /> Médicos
              </Button>
            </div>

            {/* Trust strip */}
            <div className="flex items-center gap-3 mt-5 pt-4 border-t border-white/15 text-[10px] opacity-75">
              <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> M-Pesa</span>
              <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> +120 médicos</span>
              <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> 24/7</span>
            </div>
          </div>
        </div>
      </section>

      <div className="px-4 mt-4"><EnableNotificationsBanner /></div>

      {/* ============ BENTO GRID ============ */}
      <section className="px-4 mt-5 grid grid-cols-6 auto-rows-[80px] gap-3">
        {/* Wallet — large */}
        {user && (
          <button
            onClick={() => navigate('/wallet')}
            className="col-span-4 row-span-2 bento-card text-left p-4 bg-gradient-to-br from-primary to-secondary text-primary-foreground"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider opacity-75 font-bold">Carteira MZN</p>
                <p className="text-3xl font-black mt-1 leading-none">
                  {(wallet?.balance_mzn ?? 0).toLocaleString('pt-MZ', { minimumFractionDigits: 0 })}
                  <span className="text-base font-semibold ml-1.5 opacity-80">MZN</span>
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
          </button>
        )}

        {/* Joy / Convites */}
        <button
          onClick={() => navigate('/referrals')}
          className="col-span-2 row-span-2 bento-card text-left p-3 bg-gradient-to-br from-gold/20 to-gold/5 border-gold/30"
        >
          <div className="h-9 w-9 rounded-xl bg-gold flex items-center justify-center mb-2">
            <Gift className="h-5 w-5 text-gold-foreground" />
          </div>
          <p className="text-xs font-bold leading-tight">Convida e<br/>ganha MZN</p>
          <p className="text-[10px] text-muted-foreground mt-1">+ Joy Coins</p>
          <ArrowRight className="h-3 w-3 absolute bottom-3 right-3 text-gold" />
        </button>

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
          <p className="text-sm font-bold leading-tight">Farmácia 24h</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Entrega prioritária</p>
          <Pill className="absolute -right-4 -bottom-4 h-20 w-20 text-pharmacy/10 -rotate-12" />
        </button>

        {/* Triagem IA */}
        <button onClick={() => navigate('/health/triage')}
          className="col-span-2 row-span-2 bento-card text-left p-3 bg-gradient-to-br from-accent/30 to-accent/5 border-accent/40">
          <Sparkles className="h-5 w-5 text-secondary mb-1.5" />
          <p className="text-xs font-bold">Triagem IA</p>
          <p className="text-[9px] text-muted-foreground mt-1 leading-tight">Descreve sintomas</p>
        </button>

        {/* Receitas */}
        <button onClick={() => navigate('/health/prescriptions')}
          className="col-span-2 row-span-2 bento-card text-left p-3">
          <FileText className="h-5 w-5 text-emerald mb-1.5" />
          <p className="text-xs font-bold">Receitas</p>
          <p className="text-[9px] text-muted-foreground mt-1 leading-tight">Histórico + PDF</p>
        </button>

        {/* Histórico consultas */}
        <button onClick={() => navigate('/health/consultations')}
          className="col-span-2 row-span-2 bento-card text-left p-3 bg-muted/40">
          <MessageCircle className="h-5 w-5 text-primary mb-1.5" />
          <p className="text-xs font-bold">Chat médico</p>
          <p className="text-[9px] text-muted-foreground mt-1 leading-tight">Async + anexos</p>
        </button>
      </section>

      <FollowUpReminders />

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
            <p className="font-bold text-sm">Saúde em Moçambique</p>
            <p className="text-[11px] text-muted-foreground">Malária, HIV, hipertensão e mais — pela equipa clínica</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      </section>

      <ReferralBanner />

      <KlipyBanner query="healthcare smile" />

      {/* ============ TOP MÉDICOS ============ */}
      {topDoctors && topDoctors.length > 0 && (
        <section className="mt-6">
          <div className="px-4 flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xl font-black">Profissionais em destaque</h2>
              <p className="text-xs text-muted-foreground">Verificados, com avaliações reais</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/health/doctors')}>
              Ver todos <ChevronRight className="h-4 w-4 ml-0.5" />
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
        <h2 className="text-xl font-black mb-3">Explora por categoria</h2>
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: Stethoscope, label: 'Médicos', color: 'pharmacy', to: '/health/doctors' },
            { icon: Pill, label: 'Farmácia', color: 'emerald', to: '/pharmacy' },
            { icon: Activity, label: 'Exames', color: 'secondary', to: '/health/exams' },
            { icon: Heart, label: 'Planos', color: 'destructive', to: '/health/plans' },
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
    </div>
  );
}

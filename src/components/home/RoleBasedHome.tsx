/**
 * RoleBasedHome — completely different home experience per user type
 *
 * Patient → returns null (uses default Home.tsx content)
 * Rider → dark dashboard-style home with earnings + deliveries
 * Worker → purple agenda-style home with bookings + profile
 * Health Technician → rose care-focused home with sessions + visits
 * Promoter → amber referral-focused home with share link + rewards
 */

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bike, TrendingUp, Wallet, MapPin, Package, Clock, ChevronRight,
  Stethoscope, Calendar, Star, Briefcase, Heart, Home, Users,
  Megaphone, Gift, Copy, Check, ArrowRight, Zap, ShieldCheck,
  Route, CircleDot,
} from '@/components/icons/lucide-compat';
import { useUserType } from '@/hooks/useUserType';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useState, useCallback } from 'react';

export function RoleBasedHome() {
  const { userType, loading } = useUserType();
  const { user } = useAuth();

  if (!user || loading || userType === 'patient') return null;

  switch (userType) {
    case 'rider': return <RiderHome />;
    case 'health_worker': return <WorkerHome />;
    case 'promoter': return <PromoterHome />;
    default: return null;
  }
}

/* ============================================================
   SHARED COMPONENTS
   ============================================================ */

function StatCard({ label, value, icon: Icon, color, delay = 0 }: {
  label: string; value: string; icon: React.ComponentType<{ className?: string }>;
  color: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-4 text-center"
    >
      <Icon className={cn('h-5 w-5 mx-auto mb-1.5', color)} />
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-[10px] text-white/60 mt-0.5">{label}</div>
    </motion.div>
  );
}

function ActionButton({ icon: Icon, label, to, delay = 0, highlight = false }: {
  icon: React.ComponentType<{ className?: string }>; label: string; to: string;
  delay?: number; highlight?: boolean;
}) {
  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay }}>
      <Link
        to={to}
        className={cn(
          'flex items-center gap-3 p-3.5 rounded-xl transition-all',
          highlight
            ? 'bg-white/15 backdrop-blur border border-white/20 hover:bg-white/25'
            : 'hover:bg-white/5'
        )}
      >
        <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center', highlight ? 'bg-white/20' : 'bg-white/10')}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <span className="text-sm font-semibold text-white flex-1">{label}</span>
        <ChevronRight className="h-4 w-4 text-white/40" />
      </Link>
    </motion.div>
  );
}

function SkeletonCard() {
  return <div className="h-20 rounded-2xl bg-white/5 animate-pulse" />;
}

/* ============================================================
   RIDER HOME
   ============================================================ */

function RiderHome() {
  const { t, country } = useCountry();
  const { user } = useAuth();
  const currency = country?.currency_code || 'MZN';

  const { data: earnings } = useQuery({
    queryKey: ['rider-earnings-home', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('health_rider_deliveries' as any)
        .select('rider_earnings, created_at, status')
        .eq('rider_id', user!.id)
        .eq('status', 'delivered');
      const rows = data || [];
      const now = new Date();
      const today = rows.filter((r: any) => new Date(r.created_at).toDateString() === now.toDateString());
      const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
      const week = rows.filter((r: any) => new Date(r.created_at) >= weekStart);
      return {
        today: today.reduce((s: number, r: any) => s + (r.rider_earnings || 0), 0),
        week: week.reduce((s: number, r: any) => s + (r.rider_earnings || 0), 0),
        todayCount: today.length,
        weekCount: week.length,
      };
    },
    enabled: !!user,
  });

  return (
    <div className="px-4 space-y-4 pb-24">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 p-6 text-white"
      >
        <div className="absolute inset-0 opacity-20" aria-hidden>
          <div className="absolute top-0 left-0 w-full h-full" style={{
            background: 'radial-gradient(circle at 30% 70%, rgba(16,185,129,0.4) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(6,182,212,0.3) 0%, transparent 50%)',
          }} />
        </div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] uppercase tracking-wider font-bold bg-emerald-400/20 text-emerald-300 px-2 py-0.5 rounded-full">
              Health Rider
            </span>
          </div>
          <h2 className="text-2xl font-black leading-tight">
            {t('roleHome.rider.readyToDeliver') ?? 'Pronto para entregar?'}
          </h2>
          <p className="text-sm text-white/70 mt-1">
            {t('roleHome.rider.goOnlineHint') ?? 'Fica online para receber entregas perto de ti'}
          </p>
          <Link
            to="/health/riders"
            className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold shadow-lg hover:from-emerald-600 hover:to-emerald-700 transition-all"
          >
            <Bike className="w-5 h-5" />
            {t('roleHome.rider.goToDashboard') ?? 'Ir para o painel'}
          </Link>
        </div>
      </motion.section>

      {/* Earnings */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label={t('roleHome.rider.earningsToday') ?? 'Hoje'}
          value={`${(earnings?.today ?? 0).toLocaleString()} ${currency}`}
          icon={Zap}
          color="text-emerald-400"
          delay={0.1}
        />
        <StatCard
          label={t('roleHome.rider.earningsWeek') ?? 'Semana'}
          value={`${(earnings?.week ?? 0).toLocaleString()} ${currency}`}
          icon={TrendingUp}
          color="text-cyan-400"
          delay={0.15}
        />
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden divide-y divide-slate-800">
        <ActionButton
          icon={Package}
          label={t('roleHome.rider.viewDeliveries') ?? 'Ver entregas'}
          to="/health/riders"
          delay={0.2}
          highlight
        />
        <ActionButton
          icon={MapPin}
          label={t('roleHome.rider.map') ?? 'Mapa de saúde'}
          to="/health/maps"
          delay={0.25}
        />
        <ActionButton
          icon={Wallet}
          label={t('roleHome.rider.wallet') ?? 'Carteira'}
          to="/wallet"
          delay={0.3}
        />
      </div>

      {/* Trust strip */}
      <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400">
        <div className="flex items-center gap-1 p-2 rounded-xl bg-slate-900 border border-slate-800">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
          <span>{t('roleHome.rider.verified') ?? 'Verificado'}</span>
        </div>
        <div className="flex items-center gap-1 p-2 rounded-xl bg-slate-900 border border-slate-800">
          <Zap className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />
          <span>{t('roleHome.rider.dailyPay') ?? 'Pago diário'}</span>
        </div>
        <div className="flex items-center gap-1 p-2 rounded-xl bg-slate-900 border border-slate-800">
          <Star className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          <span>{t('roleHome.rider.bonus5star') ?? 'Bónus 5★'}</span>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   WORKER HOME
   ============================================================ */

function WorkerHome() {
  const { t, country } = useCountry();
  const { user } = useAuth();
  const currency = country?.currency_code || 'MZN';

  const { data: bookings } = useQuery({
    queryKey: ['worker-bookings-home', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('health_worker_bookings')
        .select('id, status, service_type, scheduled_date, customer_name, fee_amount')
        .eq('worker_id', user!.id)
        .in('status', ['confirmed', 'in_progress', 'requested'])
        .order('scheduled_date')
        .limit(5);
      return data || [];
    },
    enabled: !!user,
  });

  return (
    <div className="px-4 space-y-4 pb-24">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-purple-900 via-fuchsia-950 to-purple-900 p-6 text-white"
      >
        <div className="absolute inset-0 opacity-20" aria-hidden>
          <div className="absolute top-0 right-0 w-40 h-40 bg-purple-400/30 rounded-full blur-3xl" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] uppercase tracking-wider font-bold bg-purple-400/20 text-purple-300 px-2 py-0.5 rounded-full">
              {t('roleHome.worker.badge') ?? 'Profissional de Saúde'}
            </span>
            <span className="text-[10px] uppercase tracking-wider font-bold bg-emerald-400/20 text-emerald-300 px-2 py-0.5 rounded-full">
              <ShieldCheck className="w-2.5 h-2.5 inline mr-0.5" />
              80%
            </span>
          </div>
          <h2 className="text-2xl font-black leading-tight">
            {t('roleHome.worker.title') ?? 'As tuas reservas'}
          </h2>
          <p className="text-sm text-white/70 mt-1">
            {t('roleHome.worker.subtitle') ?? 'Gestiona consultas e visitas ao domicílio'}
          </p>
        </div>
      </motion.section>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label={t('roleHome.worker.pending') ?? 'Pendentes'}
          value={String(bookings?.filter((b: any) => b.status === 'requested').length ?? 0)}
          icon={Calendar}
          color="text-purple-400"
          delay={0.1}
        />
        <StatCard
          label={t('roleHome.worker.earningsWeek') ?? 'Semana'}
          value={currency}
          icon={TrendingUp}
          color="text-emerald-400"
          delay={0.15}
        />
        <StatCard
          label={t('roleHome.worker.rating') ?? 'Avaliação'}
          value="5.0★"
          icon={Star}
          color="text-amber-400"
          delay={0.2}
        />
      </div>

      {/* Upcoming bookings */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">{t('roleHome.worker.upcoming') ?? 'Próximas reservas'}</h3>
          <Link to="/health/workers/profile" className="text-[11px] text-purple-400 font-medium">
            {t('common.view_all') ?? 'Ver tudo'} →
          </Link>
        </div>
        {!bookings || bookings.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            {t('roleHome.noData') ?? 'Sem dados ainda'}
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {bookings.slice(0, 3).map((b: any, i: number) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.05 }}
                className="px-4 py-3 flex items-center gap-3"
              >
                <div className={cn(
                  'h-11 w-11 rounded-xl flex items-center justify-center',
                  b.status === 'requested' ? 'bg-amber-500/20' : 'bg-emerald-500/20'
                )}>
                  <Stethoscope className={cn(
                    'w-5 h-5',
                    b.status === 'requested' ? 'text-amber-400' : 'text-emerald-400'
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {b.customer_name ?? b.service_type}
                  </p>
                  <p className="text-xs text-slate-400">
                    {b.scheduled_date ? new Date(b.scheduled_date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </p>
                </div>
                <span className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full font-bold',
                  b.status === 'requested' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                )}>
                  {b.status === 'requested' ? (t('roleHome.worker.confirm') ?? 'Confirmar') : (t('roleHome.worker.inProgress') ?? 'Em curso')}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden divide-y divide-slate-800">
        <ActionButton icon={Calendar} label={t('roleHome.worker.viewBookings') ?? 'Ver reservas'} to="/health/workers/profile" delay={0.3} highlight />
        <ActionButton icon={Stethoscope} label={t('roleHome.worker.myProfile') ?? 'Meu perfil'} to="/health/workers/profile" delay={0.35} />
        <ActionButton icon={Briefcase} label={t('roleHome.worker.marketplace') ?? 'Marketplace'} to="/health/workers" delay={0.4} />
        <ActionButton icon={Wallet} label={t('roleHome.worker.wallet') ?? 'Carteira'} to="/wallet" delay={0.45} />
      </div>
    </div>
  );
}

/* ============================================================
   PROMOTER HOME
   ============================================================ */

function PromoterHome() {
  const { t, country } = useCountry();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const referralLink = `https://medwallet.${country?.id === 'AO' ? 'ao' : 'mz'}/auth?ref=${user?.id}`;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      toast.success(t('roleHome.promoter.copiedLink') ?? 'Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast.error(t('common.error') ?? 'Erro');
    });
  }, [referralLink, t]);

  const { data: conversions } = useQuery({
    queryKey: ['promoter-conversions', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('referrals' as any)
        .select('id, referral_code, created_at, status, reward_amount')
        .eq('referrer_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!user,
  });

  return (
    <div className="px-4 space-y-4 pb-24">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-amber-900 via-orange-950 to-amber-900 p-6 text-white"
      >
        <div className="absolute inset-0 opacity-20" aria-hidden>
          <div className="absolute top-0 right-0 w-40 h-40 bg-amber-400/30 rounded-full blur-3xl" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] uppercase tracking-wider font-bold bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full">
              {t('roleHome.promoter.badge') ?? 'Promotor de Saúde'}
            </span>
          </div>
          <h2 className="text-2xl font-black leading-tight">
            {t('roleHome.promoter.title') ?? 'Convida e ganha'}
          </h2>
          <p className="text-sm text-white/70 mt-1">
            {t('roleHome.promoter.subtitle') ?? 'Partilha o teu link e ganha por cada amigo que entra'}
          </p>
        </div>
      </motion.section>

      {/* Share Link Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 p-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <Megaphone className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-bold text-white">{t('roleHome.promoter.myLink') ?? 'Meu link de convite'}</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-slate-900 rounded-xl px-3 py-2.5 text-xs text-amber-200 font-mono truncate border border-slate-700">
            {referralLink}
          </div>
          <button
            onClick={handleCopy}
            className="h-11 w-11 rounded-xl bg-amber-500 hover:bg-amber-600 flex items-center justify-center transition shrink-0"
            aria-label={t('roleHome.promoter.shareLink') ?? 'Copiar link'}
          >
            {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-white" />}
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label={t('roleHome.promoter.invited') ?? 'Convidados'}
          value={String(conversions?.length ?? 0)}
          icon={Users}
          color="text-amber-400"
          delay={0.15}
        />
        <StatCard
          label={t('roleHome.promoter.converted') ?? 'Convertidos'}
          value={String(conversions?.filter((c: any) => c.status === 'completed').length ?? 0)}
          icon={Check}
          color="text-emerald-400"
          delay={0.2}
        />
        <StatCard
          label={t('roleHome.promoter.earnings') ?? 'Ganhos'}
          value={country?.currency_code || 'MZN'}
          icon={TrendingUp}
          color="text-cyan-400"
          delay={0.25}
        />
      </div>

      {/* Recent conversions */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">{t('roleHome.promoter.recentConversions') ?? 'Conversões recentes'}</h3>
          <Link to="/referrals" className="text-[11px] text-amber-400 font-medium">
            {t('common.view_all') ?? 'Ver tudo'} →
          </Link>
        </div>
        {!conversions || conversions.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">
            <Users className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            {t('roleHome.noData') ?? 'Ainda não convidaste ninguém'}
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {conversions.slice(0, 3).map((c: any, i: number) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="px-4 py-3 flex items-center gap-3"
              >
                <div className="h-11 w-11 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <Check className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{c.referral_code}</p>
                  <p className="text-xs text-slate-400">
                    {c.created_at ? new Date(c.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }) : '—'}
                  </p>
                </div>
                <span className="text-xs text-emerald-400 font-bold">+{c.reward_amount ?? 0}</span>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden divide-y divide-slate-800">
        <ActionButton icon={Megaphone} label={t('roleHome.promoter.myLink') ?? 'Meu link'} to="/referrals" delay={0.35} highlight />
        <ActionButton icon={Gift} label={t('roleHome.promoter.rewards') ?? 'Recompensas'} to="/rewards" delay={0.4} />
        <ActionButton icon={Users} label={t('roleHome.promoter.invite') ?? 'Convidar amigos'} to="/referrals" delay={0.45} />
        <ActionButton icon={Wallet} label={t('roleHome.promoter.wallet') ?? 'Carteira'} to="/wallet" delay={0.5} />
      </div>
    </div>
  );
}

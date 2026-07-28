/**
 * UserTypeHero — personalização do hero da Home por tipo de utilizador
 *
 * Mostra um banner diferente no topo conforme:
 *   - patient: vacinas, consultas, family hub (default)
 *   - rider: painel de entregas + earnings + go online
 *   - worker: reservas recebidas + earnings + toggle disponibilidade
 *   - health_technician: sessões agendadas + visitas
 *   - promoter: conversões + recompensas + link de convite
 */

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Bike, TrendingUp, Power, Stethoscope, Heart, Megaphone,
  ChevronRight, Calendar, Wallet, Users,
} from '@/components/icons/lucide-compat';
import { useUserType } from '@/hooks/useUserType';
import { useAuth } from '@/contexts/AuthContext';

export function UserTypeHero() {
  const { user } = useAuth();
  const { userType } = useUserType();

  if (!user) return null;
  if (userType === 'patient') return null; // patient sees default hero

  const config = CONFIG[userType] ?? CONFIG.patient;
  const Icon = config.icon;

  return (
    <motion.section
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`px-4 pt-3`}
    >
      <div className={`relative rounded-3xl overflow-hidden p-6 text-white shadow-xl bg-gradient-to-r ${config.gradient}`}>
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
            <Icon className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-wider font-bold bg-white/15 px-2 py-0.5 rounded-full backdrop-blur">
                {config.badge}
              </span>
              {config.online && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-emerald-400/30 px-2 py-0.5 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  Online
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {config.title}
            </h1>
            <p className="text-white/90 text-sm mt-1">
              {config.subtitle}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {config.actions.map((a, idx) => (
                <Link
                  key={idx}
                  to={a.to}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 hover:bg-white/25 transition px-3 py-2 text-xs font-semibold backdrop-blur"
                >
                  {a.emoji && <span aria-hidden>{a.emoji}</span>}
                  {a.label}
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Quick stats */}
        {config.stats && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {config.stats.map((s, idx) => (
              <div key={idx} className="rounded-xl bg-white/10 backdrop-blur p-3 text-center">
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-[10px] opacity-80">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.section>
  );
}

interface HeroConfig {
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
  title: string;
  subtitle: string;
  gradient: string;
  online?: boolean;
  actions: { label: string; to: string; emoji?: string }[];
  stats?: { label: string; value: string }[];
}

const CONFIG: Record<string, HeroConfig> = {
  patient: {
    icon: Heart,
    badge: 'Paciente',
    title: 'Bem-vindo',
    subtitle: 'A tua saúde em dia',
    gradient: 'from-blue-500 to-cyan-500',
    actions: [
      { label: 'Consultas', to: '/health/consultations', emoji: '📅' },
      { label: 'Família', to: '/health/family', emoji: '❤️' },
    ],
  },
  rider: {
    icon: Bike,
    badge: 'Health Rider',
    title: 'Pronto para entregas?',
    subtitle: 'Fica online para receberes entregas perto de ti',
    gradient: 'from-emerald-600 to-teal-600',
    online: true,
    actions: [
      { label: 'Ver entregas', to: '/health/riders', emoji: '📦' },
      { label: 'Mapa', to: '/health/maps', emoji: '🗺️' },
      { label: 'Ganhos', to: '/health/riders', emoji: '💰' },
    ],
    stats: [
      { label: 'Hoje', value: '0 MT' },
      { label: 'Semana', value: '0 MT' },
      { label: 'Avaliação', value: '5.0★' },
    ],
  },
  health_worker: {
    icon: Stethoscope,
    badge: 'Profissional de Saúde',
    title: 'Tens reservas por confirmar',
    subtitle: 'Vê pedidos de consulta e visita ao domicílio',
    gradient: 'from-purple-600 to-fuchsia-600',
    online: true,
    actions: [
      { label: 'Reservas', to: '/health/workers/profile', emoji: '📅' },
      { label: 'Meu perfil', to: '/health/workers/profile', emoji: '🩺' },
      { label: 'Ganhos', to: '/health/workers/profile', emoji: '💰' },
    ],
    stats: [
      { label: 'Pendentes', value: '0' },
      { label: 'Hoje', value: '0 MT' },
      { label: 'Avaliação', value: '5.0★' },
    ],
  },
  promoter: {
    icon: Megaphone,
    badge: 'Promotor',
    title: 'Convida e ganha',
    subtitle: 'Partilha o teu link e ganha por cada amigo que entra',
    gradient: 'from-amber-500 to-orange-500',
    actions: [
      { label: 'Meu link', to: '/referrals', emoji: '🔗' },
      { label: 'Recompensas', to: '/rewards', emoji: '🎁' },
      { label: 'Conversões', to: '/referrals', emoji: '📊' },
    ],
    stats: [
      { label: 'Convidados', value: '0' },
      { label: 'Convertidos', value: '0' },
      { label: 'Ganhos', value: '0 MT' },
    ],
  },
};

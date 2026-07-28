/**
 * UserTypeHero — premium hero banner per user type
 * Uses SplitText, GradientText, FloatingParticles from premium UI
 */

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Bike, Stethoscope, Heart, Megaphone, ChevronRight } from '@/components/icons/lucide-compat';
import { useUserType } from '@/hooks/useUserType';
import { useAuth } from '@/contexts/AuthContext';
import { SplitText, GradientText, FloatingParticles } from '@/components/ui/premium';

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

interface HeroConfig {
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
  title: string;
  subtitle: string;
  gradientFrom: string;
  gradientTo: string;
  online?: boolean;
  actions: { label: string; to: string; emoji?: string }[];
  stats?: { label: string; value: string }[];
}

const CONFIG: Record<string, HeroConfig> = {
  patient: {
    icon: Heart, badge: 'Paciente', title: 'Bem-vindo', subtitle: 'A tua saúde em dia',
    gradientFrom: 'hsl(var(--primary))', gradientTo: 'hsl(var(--secondary))',
    actions: [
      { label: 'Consultas', to: '/health/consultations', emoji: '📅' },
      { label: 'Família', to: '/health/family', emoji: '❤️' },
    ],
  },
  rider: {
    icon: Bike, badge: 'Health Rider', title: 'Pronto para entregas?',
    subtitle: 'Fica online para receberes entregas perto de ti',
    gradientFrom: 'hsl(160 60% 35%)', gradientTo: 'hsl(190 56% 40%)', online: true,
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
    icon: Stethoscope, badge: 'Profissional de Saúde', title: 'Tens reservas por confirmar',
    subtitle: 'Vê pedidos de consulta e visita ao domicílio',
    gradientFrom: 'hsl(270 60% 50%)', gradientTo: 'hsl(300 60% 50%)', online: true,
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
    icon: Megaphone, badge: 'Promotor', title: 'Convida e ganha',
    subtitle: 'Partilha o teu link e ganha por cada amigo que entra',
    gradientFrom: 'hsl(38 80% 55%)', gradientTo: 'hsl(25 80% 55%)',
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

export function UserTypeHero() {
  const { user } = useAuth();
  const { userType } = useUserType();
  if (!user || userType === 'patient') return null;
  const hero = CONFIG[userType] ?? CONFIG.patient;
  const Icon = hero.icon;

  return (
    <motion.section initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="px-4 pt-3">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative rounded-3xl overflow-hidden p-6 text-white shadow-xl"
        style={{ background: `linear-gradient(135deg, ${hero.gradientFrom}, hsl(var(--region-logo-secondary, 243 76% 59%)))` }}
      >
        <FloatingParticles count={8} className="absolute inset-0 pointer-events-none" />
        <div className="relative z-10 flex items-start gap-4">
          <motion.div variants={itemVariants}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
            <Icon className="h-7 w-7" />
          </motion.div>
          <div className="flex-1 min-w-0">
            <motion.div variants={itemVariants} className="flex items-center gap-2 mb-1">
              <GradientText className="text-sm font-medium text-white/90">{hero.badge}</GradientText>
              {hero.online && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-emerald-400/30 px-2 py-0.5 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />Online
                </span>
              )}
            </motion.div>
            <motion.div variants={itemVariants}>
              <SplitText text={hero.title} className="text-2xl font-extrabold" delay={20} />
            </motion.div>
            <motion.p variants={itemVariants} className="text-white/90 text-sm mt-1">{hero.subtitle}</motion.p>
            <motion.div variants={itemVariants} className="mt-3 flex flex-wrap gap-2">
              {hero.actions.map((a, idx) => (
                <Link key={idx} to={a.to}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 hover:bg-white/25 transition px-3 py-2 text-xs font-semibold backdrop-blur">
                  {a.emoji && <span aria-hidden>{a.emoji}</span>}{a.label}
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              ))}
            </motion.div>
          </div>
        </div>
        {hero.stats && (
          <div className="relative z-10 mt-4 grid grid-cols-3 gap-2">
            {hero.stats.map((s, idx) => (
              s.value !== '0' && s.value !== '0 MT' && s.value !== '5.0★' ? (
                <motion.div key={idx} variants={itemVariants}
                  className="rounded-xl bg-white/10 backdrop-blur p-3 text-center">
                  <p className="text-lg font-bold">{s.value}</p>
                  <p className="text-[10px] opacity-80">{s.label}</p>
                </motion.div>
              ) : null
            ))}
          </div>
        )}
      </motion.div>
    </motion.section>
  );
}

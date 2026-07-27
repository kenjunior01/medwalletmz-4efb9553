import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bike,
  Stethoscope,
  Package,
  ChevronRight,
  ArrowRight,
  Route,
  Heart,
  Megaphone,
} from 'lucide-react';
import { useUserType } from '@/hooks/useUserType';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import { cn } from '@/lib/utils';

// ─── Card Data Types ──────────────────────────────────────────────
interface EcosystemCard {
  icon: React.ReactNode;
  title: string;
  description: string;
  cta: string;
  action: () => void;
  gradient: string;
  iconBg: string;
  iconColor: string;
}

// ─── Animation Variants ────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 28 } },
};

// ─── Component ─────────────────────────────────────────────────────
export function EcosystemFlow() {
  const { userType } = useUserType();
  const { user } = useAuth();
  const { t } = useCountry();
  const navigate = useNavigate();

  // ─── Build cards per user type ─────────────────────────────────
  const getCards = (): EcosystemCard[] => {
    switch (userType) {
      case 'patient':
        return [
          {
            icon: <Bike className="h-5 w-5" />,
            title: t('ecosystem.book_rider') ?? 'Ir à consulta com Health Rider',
            description:
              t('ecosystem.book_rider_desc') ??
              'Precisas de ir a uma consulta? Um Health Rider leva-te.',
            cta: t('ecosystem.book_now') ?? 'Reservar Rider',
            action: () => navigate('/health/riders'),
            gradient: 'from-emerald-500/10 via-teal-500/5 to-transparent',
            iconBg: 'bg-emerald-500/15',
            iconColor: 'text-emerald-600',
          },
          {
            icon: <Package className="h-5 w-5" />,
            title: t('ecosystem.request_delivery') ?? 'Pedir entrega de medicamentos',
            description:
              t('ecosystem.request_delivery_desc') ??
              'Médico enviou receita? Pede entrega.',
            cta: t('ecosystem.request_now') ?? 'Pedir Entrega',
            action: () => navigate('/health/riders'),
            gradient: 'from-blue-500/10 via-indigo-500/5 to-transparent',
            iconBg: 'bg-blue-500/15',
            iconColor: 'text-blue-600',
          },
          {
            icon: <Stethoscope className="h-5 w-5" />,
            title: t('ecosystem.find_professional') ?? 'Encontrar Profissional',
            description:
              t('ecosystem.find_professional_desc') ??
              'Procura médicos, enfermeiros e farmacêuticos perto de ti.',
            cta: t('ecosystem.browse') ?? 'Explorar',
            action: () => navigate('/health/workers'),
            gradient: 'from-violet-500/10 via-purple-500/5 to-transparent',
            iconBg: 'bg-violet-500/15',
            iconColor: 'text-violet-600',
          },
        ];

      case 'rider':
        return [
          {
            icon: <Route className="h-5 w-5" />,
            title: t('ecosystem.pending_deliveries') ?? 'Entregas pendentes do ecossistema',
            description:
              t('ecosystem.pending_deliveries_desc') ??
              'Tens entregas de saúde atribuídas que precisam da tua atenção.',
            cta: t('ecosystem.view_pending') ?? 'Ver Pendentes (0)',
            action: () => navigate('/health/riders'),
            gradient: 'from-amber-500/10 via-orange-500/5 to-transparent',
            iconBg: 'bg-amber-500/15',
            iconColor: 'text-amber-600',
          },
          {
            icon: <Bike className="h-5 w-5" />,
            title: t('ecosystem.available_deliveries') ?? 'Ver entregas disponíveis',
            description:
              t('ecosystem.available_deliveries_desc') ??
              'Procura entregas de saúde e receitas na tua área.',
            cta: t('ecosystem.browse_deliveries') ?? 'Ver Entregas',
            action: () => navigate('/health/riders'),
            gradient: 'from-emerald-500/10 via-teal-500/5 to-transparent',
            iconBg: 'bg-emerald-500/15',
            iconColor: 'text-emerald-600',
          },
        ];

      case 'health_worker':
        return [
          {
            icon: <Bike className="h-5 w-5" />,
            title: t('ecosystem.request_rider') ?? 'Pedir rider para entrega de receitas',
            description:
              t('ecosystem.request_rider_desc') ??
              'Solicita um rider para entregar receitas ao paciente.',
            cta: t('ecosystem.request') ?? 'Solicitar Rider',
            action: () => navigate('/health/riders'),
            gradient: 'from-sky-500/10 via-cyan-500/5 to-transparent',
            iconBg: 'bg-sky-500/15',
            iconColor: 'text-sky-600',
          },
          {
            icon: <Heart className="h-5 w-5" />,
            title: t('ecosystem.view_bookings') ?? 'Ver reservas',
            description:
              t('ecosystem.view_bookings_desc') ??
              'Consulta as tuas consultas e reservas agendadas.',
            cta: t('ecosystem.view_all') ?? 'Ver Tudo',
            action: () => navigate('/health/workers/profile'),
            gradient: 'from-rose-500/10 via-pink-500/5 to-transparent',
            iconBg: 'bg-rose-500/15',
            iconColor: 'text-rose-600',
          },
        ];

      case 'promoter':
        return [
          {
            icon: <Megaphone className="h-5 w-5" />,
            title: t('ecosystem.refer_patient') ?? 'Referir paciente + Rider',
            description:
              t('ecosystem.refer_patient_desc') ??
              'Referencia um paciente e atribui um rider para a entrega.',
            cta: t('ecosystem.refer_now') ?? 'Referir Agora',
            action: () => navigate('/health/workers'),
            gradient: 'from-fuchsia-500/10 via-pink-500/5 to-transparent',
            iconBg: 'bg-fuchsia-500/15',
            iconColor: 'text-fuchsia-600',
          },
        ];

      default:
        return [];
    }
  };

  const cards = getCards();

  // ─── Don't render if no cards ──────────────────────────────────
  if (!cards.length) return null;

  return (
    <section className="w-full">
      {/* Section header */}
      <div className="mb-4 flex items-center gap-2.5 px-1">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
          <Heart className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-bold leading-tight text-foreground">
            {t('ecosystem.title') ?? 'Ecossistema de Saúde'}
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {t('ecosystem.subtitle') ?? 'Serviços conectados para a tua saúde'}
          </p>
        </div>
      </div>

      {/* Cards grid */}
      <motion.div
        className="grid gap-3"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {cards.map((card, index) => (
          <motion.div key={index} variants={itemVariants}>
            <button
              type="button"
              onClick={card.action}
              className={cn(
                'group relative w-full overflow-hidden rounded-3xl border border-border/50',
                'bg-card p-4 text-left transition-all duration-200',
                'hover:border-border hover:shadow-md active:scale-[0.98]',
              )}
            >
              {/* Subtle gradient overlay */}
              <div
                className={cn(
                  'pointer-events-none absolute inset-0 bg-gradient-to-br opacity-60',
                  card.gradient,
                )}
              />

              {/* Content */}
              <div className="relative flex items-start gap-3.5">
                {/* Icon */}
                <div
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
                    card.iconBg,
                  )}
                >
                  <span className={card.iconColor}>{card.icon}</span>
                </div>

                {/* Text + CTA */}
                <div className="min-w-0 flex-1">
                  <h3 className="text-[13px] font-bold leading-snug text-foreground">
                    {card.title}
                  </h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    {card.description}
                  </p>

                  {/* CTA row */}
                  <div className="mt-3 flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-primary group-hover:underline">
                      {card.cta}
                    </span>
                    <ArrowRight className="h-3 w-3 text-primary transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>

                {/* Chevron */}
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />
              </div>
            </button>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

export default EcosystemFlow;

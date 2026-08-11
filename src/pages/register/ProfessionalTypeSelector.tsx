import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  User, Stethoscope, Truck, Building2, FlaskConical, Store,
  PawPrint, ShieldCheck, ChevronRight, Sparkles, Heart,
} from '@/components/icons/lucide-compat';
import { useCountry } from '@/contexts/CountryContext';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────
interface RoleOption {
  id: string;
  title: string;
  desc: string;
  icon: typeof User;
  color: string;
  gradient: string;
  category: 'Pessoal' | 'Profissional' | 'Instituição';
  badge: string;
}

interface CategoryMeta {
  label: string;
  subtitle: string;
  color: string;
  headerColor: string;
}

// ─── Data ───────────────────────────────────────────────────────
const roleOptions: RoleOption[] = [
  {
    id: 'customer',
    title: 'Paciente',
    desc: 'Triagem IA, consultas, registos — tudo grátis',
    icon: User,
    color: 'bg-emerald-500',
    gradient: 'from-emerald-400 to-teal-500',
    category: 'Pessoal',
    badge: 'GRÁTIS',
  },
  {
    id: 'doctor',
    title: 'Médico',
    desc: 'Atendimento online · agenda · receitas digitais',
    icon: Stethoscope,
    color: 'bg-blue-500',
    gradient: 'from-blue-400 to-indigo-500',
    category: 'Profissional',
    badge: 'Pro',
  },
  {
    id: 'veterinary',
    title: 'Veterinário',
    desc: 'Saúde animal & Pet care',
    icon: PawPrint,
    color: 'bg-rose-500',
    gradient: 'from-rose-400 to-pink-500',
    category: 'Profissional',
    badge: 'Pro',
  },
  {
    id: 'driver',
    title: 'Entregador',
    desc: 'Entregas de medicamentos e exames — auto-emprego',
    icon: Truck,
    color: 'bg-orange-500',
    gradient: 'from-orange-400 to-amber-500',
    category: 'Profissional',
    badge: 'Plus',
  },
  {
    id: 'store_owner',
    title: 'Farmácia',
    desc: 'Venda de medicamentos com entregas',
    icon: Store,
    color: 'bg-emerald-600',
    gradient: 'from-emerald-500 to-green-600',
    category: 'Instituição',
    badge: 'B2B',
  },
  {
    id: 'clinic',
    title: 'Clínica',
    desc: 'Gestão de unidade · médicos · agenda',
    icon: Building2,
    color: 'bg-amber-500',
    gradient: 'from-amber-400 to-orange-500',
    category: 'Instituição',
    badge: 'B2B',
  },
  {
    id: 'laboratory',
    title: 'Laboratório',
    desc: 'Exames · resultados digitais',
    icon: FlaskConical,
    color: 'bg-cyan-500',
    gradient: 'from-cyan-400 to-blue-500',
    category: 'Instituição',
    badge: 'B2B',
  },
  {
    id: 'insurance',
    title: 'Seguradora',
    desc: 'Planos de saúde integrados',
    icon: ShieldCheck,
    color: 'bg-indigo-500',
    gradient: 'from-indigo-400 to-purple-500',
    category: 'Instituição',
    badge: 'B2B',
  },
];

const CATEGORY_META: Record<RoleOption['category'], CategoryMeta> = {
  Pessoal: {
    label: 'Para si e sua família',
    subtitle: 'Sempre grátis · sem cartão · sem limite',
    color: 'text-emerald-700',
    headerColor: 'text-emerald-700',
  },
  Profissional: {
    label: 'Para profissionais de saúde',
    subtitle: 'Planos Pro a partir de 1.500 MZN/mês',
    color: 'text-blue-700',
    headerColor: 'text-blue-700',
  },
  Instituição: {
    label: 'Para instituições',
    subtitle: 'SaaS B2B · gestão completa',
    color: 'text-amber-700',
    headerColor: 'text-amber-700',
  },
};

// ─── Animation variants ──────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: 'easeOut' },
  }),
};

// ─── Component ──────────────────────────────────────────────────
export default function ProfessionalTypeSelector() {
  const navigate = useNavigate();
  const { country } = useCountry();

  const handleSelectRole = (roleId: string) => {
    navigate(`/register?role=${roleId}`);
  };

  const handleBack = () => {
    navigate(-1);
  };

  const personal = roleOptions.filter((r) => r.category === 'Pessoal');
  const professionals = roleOptions.filter((r) => r.category === 'Profissional');
  const institutions = roleOptions.filter((r) => r.category === 'Instituição');

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="mx-auto max-w-lg px-4 pb-12 pt-4">
        {/* ── Header ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex items-center gap-3 mb-6"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="shrink-0 rounded-xl"
          >
            <ChevronRight className="h-5 w-5 rotate-180" />
          </Button>
          <h1 className="text-lg font-black tracking-tight">
            Ser Profissional MedWallet
          </h1>
        </motion.div>

        {/* ── Hero ──────────────────────────────────────────── */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-6 text-white mb-8 shadow-lg shadow-emerald-500/20"
        >
          {/* Decorative circles */}
          <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10" />

          <div className="relative flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black leading-tight">MedWallet</h2>
              <p className="text-sm text-white/80 font-medium">
                {country?.name || 'Moçambique'}
              </p>
            </div>
          </div>
          <p className="relative text-sm leading-relaxed text-white/90">
            Escolha o seu perfil para começar. Pode registar-se como profissional,
            instituição ou simplesmente como paciente — sempre grátis.
          </p>
        </motion.div>

        {/* ── Category: Pessoal ────────────────────────────────── */}
        <motion.section
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={1}
          className="mb-6 space-y-3"
        >
          <div className="px-1">
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-700">
              {CATEGORY_META.Pessoal.label}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {CATEGORY_META.Pessoal.subtitle}
            </p>
          </div>

          {personal.map((role) => (
            <motion.button
              key={role.id}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={2}
              type="button"
              onClick={() => handleSelectRole(role.id)}
              className={cn(
                'w-full text-left rounded-3xl p-4 border-2 transition-all duration-300 relative overflow-hidden',
                'border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50',
                'hover:border-emerald-400 hover:shadow-md hover:scale-[1.01]',
                'active:scale-[0.99]'
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-14 h-14 rounded-2xl bg-gradient-to-br shrink-0 flex items-center justify-center shadow-md',
                    role.gradient
                  )}
                >
                  <role.icon className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-base">{role.title}</h3>
                    <Badge className="bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wider hover:bg-emerald-500 border-0 px-2 py-0.5">
                      {role.badge}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {role.desc}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </div>
            </motion.button>
          ))}
        </motion.section>

        {/* ── Category: Profissional ─────────────────────────── */}
        <motion.section
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={3}
          className="mb-6 space-y-3"
        >
          <div className="flex items-baseline justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-widest text-blue-700">
              {CATEGORY_META.Profissional.label}
            </h3>
            <span className="text-[10px] text-muted-foreground">
              {CATEGORY_META.Profissional.subtitle}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {professionals.map((role, i) => (
              <motion.button
                key={role.id}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={4 + i}
                type="button"
                onClick={() => handleSelectRole(role.id)}
                className={cn(
                  'text-left rounded-2xl p-3 border-2 transition-all duration-300 relative',
                  'border-transparent bg-white',
                  'hover:border-blue-300 hover:shadow-sm hover:scale-[1.02]',
                  'active:scale-[0.98]'
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-2 shadow-sm',
                    role.gradient
                  )}
                >
                  <role.icon className="h-5 w-5 text-white" />
                </div>
                <h4 className="font-bold text-sm">{role.title}</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                  {role.desc}
                </p>
                {role.badge && (
                  <Badge
                    className={cn(
                      'mt-1.5 text-[8px] font-black uppercase tracking-wider border-0 text-white',
                      role.color
                    )}
                  >
                    {role.badge}
                  </Badge>
                )}
                <ChevronRight className="h-3.5 w-3.5 absolute bottom-3 right-3 text-muted-foreground/50" />
              </motion.button>
            ))}
          </div>
        </motion.section>

        {/* ── Category: Instituição ───────────────────────────── */}
        <motion.section
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={7}
          className="mb-8 space-y-3"
        >
          <div className="flex items-baseline justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-widest text-amber-700">
              {CATEGORY_META.Instituição.label}
            </h3>
            <span className="text-[10px] text-muted-foreground">
              {CATEGORY_META.Instituição.subtitle}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {institutions.map((role, i) => (
              <motion.button
                key={role.id}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={8 + i}
                type="button"
                onClick={() => handleSelectRole(role.id)}
                className={cn(
                  'text-left rounded-2xl p-3 border-2 transition-all duration-300 relative',
                  'border-transparent bg-white',
                  'hover:border-amber-300 hover:shadow-sm hover:scale-[1.02]',
                  'active:scale-[0.98]'
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-2 shadow-sm',
                    role.gradient
                  )}
                >
                  <role.icon className="h-5 w-5 text-white" />
                </div>
                <h4 className="font-bold text-sm">{role.title}</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                  {role.desc}
                </p>
                {role.badge && (
                  <Badge
                    className={cn(
                      'mt-1.5 text-[8px] font-black uppercase tracking-wider border-0 text-white',
                      role.color
                    )}
                  >
                    {role.badge}
                  </Badge>
                )}
                <ChevronRight className="h-3.5 w-3.5 absolute bottom-3 right-3 text-muted-foreground/50" />
              </motion.button>
            ))}
          </div>
        </motion.section>

        {/* ── Trust Badge ────────────────────────────────────── */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={12}
          className="flex items-center justify-center gap-1.5 py-6"
        >
          <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
          <span className="text-xs text-muted-foreground">
            Mais de 2.500 profissionais já usam o MedWallet MZ
          </span>
        </motion.div>
      </div>
    </div>
  );
}

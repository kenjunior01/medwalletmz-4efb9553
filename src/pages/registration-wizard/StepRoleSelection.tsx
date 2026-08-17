import { User, CheckCircle2, Sparkles, Heart, ChevronRight } from '@/components/icons/lucide-compat';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Role, roleOptions } from './types';

interface StepRoleSelectionProps {
  selectedRole: Role | null;
  setSelectedRole: (role: Role) => void;
  nextStep: () => void;
  user: any;
}

export function StepRoleSelection({ selectedRole, setSelectedRole, nextStep, user }: StepRoleSelectionProps) {
  return (
    <div className="space-y-5">
      {/* Hero compacto */}
      <div className="text-center mb-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18 }}
          className="w-16 h-16 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-[1.5rem] flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/30 relative"
        >
          <Sparkles className="h-8 w-8 text-white" />
          <div className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 border-2 border-white">
            MZ
          </div>
        </motion.div>
        <h2 className="text-2xl font-black tracking-tight mb-1">
          Como deseja usar o MedWallet?
        </h2>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
          Pacientes usam grátis para sempre. Profissionais e instituições têm planos pagos.
        </p>
      </div>

      {!user && (
        <div className="rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-3 flex gap-3 items-start">
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="text-xs leading-relaxed">
            <p className="font-black text-primary mb-0.5">Olá! Sou a Meddy 👋</p>
            <p className="text-muted-foreground">
              Escolha o seu perfil abaixo. Se ainda não tem conta, pedirei o email e senha
              logo a seguir — depois voltamos exactamente para este passo para completar
              o registo profissional.
            </p>
          </div>
        </div>
      )}

      {/* Paciente — destaque gratuito (card grande no topo) */}
      <motion.button
        type="button"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        onClick={() => setSelectedRole('customer')}
        className={cn(
          "w-full text-left rounded-3xl p-4 border-2 transition-all duration-300 relative overflow-hidden",
          selectedRole === 'customer'
            ? "border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-500/20 scale-[1.01]"
            : "border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 hover:border-emerald-400"
        )}
      >
        {selectedRole === 'customer' && (
          <div className="absolute top-3 right-3 bg-emerald-500 text-white p-1 rounded-full">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        )}
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-md shrink-0">
            <User className="h-7 w-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-base">Paciente</h3>
              <span className="bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wider rounded-full px-2 py-0.5">
                Grátis para sempre
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Triagem IA ilimitada · consultas · registos · lembretes WhatsApp
            </p>
          </div>
        </div>
      </motion.button>

      {/* Profissionais — header + grid 2 cols */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between px-1">
          <h3 className="text-xs font-black uppercase tracking-widest text-blue-700">
            Profissionais
          </h3>
          <span className="text-[10px] text-muted-foreground">Planos Pro pagos</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {roleOptions.filter(r => r.category === 'Profissional').map((role, i) => (
            <motion.button
              key={role.id}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.04 }}
              onClick={() => setSelectedRole(role.id)}
              className={cn(
                "text-left rounded-2xl p-3 border-2 transition-all duration-300 relative",
                selectedRole === role.id
                  ? "border-blue-500 bg-blue-50 shadow-md scale-[1.02]"
                  : "border-transparent bg-white hover:border-blue-300 hover:shadow-sm"
              )}
            >
              {selectedRole === role.id && (
                <div className="absolute top-2 right-2 bg-blue-500 text-white p-0.5 rounded-full">
                  <CheckCircle2 className="h-3 w-3" />
                </div>
              )}
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center mb-2 shadow-sm",
                `bg-gradient-to-br ${role.gradient}`
              )}>
                <role.icon className="h-5 w-5 text-white" />
              </div>
              <h4 className="font-bold text-sm">{role.title}</h4>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                {role.description}
              </p>
              {role.badge && (
                <span className={cn(
                  "inline-block mt-1.5 text-[8px] font-black uppercase tracking-wider rounded-full px-1.5 py-0.5 text-white",
                  role.badgeColor
                )}>
                  {role.badge}
                </span>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Instituições / Parceiros — header + grid 2 cols */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between px-1">
          <h3 className="text-xs font-black uppercase tracking-widest text-amber-700">
            Instituições
          </h3>
          <span className="text-[10px] text-muted-foreground">SaaS B2B</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {roleOptions.filter(r => r.category === 'Parceiro').map((role, i) => (
            <motion.button
              key={role.id}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.04 }}
              onClick={() => setSelectedRole(role.id)}
              className={cn(
                "text-left rounded-2xl p-3 border-2 transition-all duration-300 relative",
                selectedRole === role.id
                  ? "border-amber-500 bg-amber-50 shadow-md scale-[1.02]"
                  : "border-transparent bg-white hover:border-amber-300 hover:shadow-sm"
              )}
            >
              {selectedRole === role.id && (
                <div className="absolute top-2 right-2 bg-amber-500 text-white p-0.5 rounded-full">
                  <CheckCircle2 className="h-3 w-3" />
                </div>
              )}
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center mb-2 shadow-sm",
                `bg-gradient-to-br ${role.gradient}`
              )}>
                <role.icon className="h-5 w-5 text-white" />
              </div>
              <h4 className="font-bold text-sm">{role.title}</h4>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                {role.description}
              </p>
              {role.badge && (
                <span className={cn(
                  "inline-block mt-1.5 text-[8px] font-black uppercase tracking-wider rounded-full px-1.5 py-0.5 text-white",
                  role.badgeColor
                )}>
                  {role.badge}
                </span>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Trust badge */}
      <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground pt-1">
        <Heart className="h-3 w-3 text-rose-500 fill-rose-500" />
        <span>Mais de 2.500 profissionais já usam o MedWallet MZ</span>
      </div>

      <Button
        className="w-full h-14 rounded-2xl font-black text-base mt-2"
        disabled={!selectedRole}
        onClick={nextStep}
      >
        Continuar <ChevronRight className="ml-2 h-5 w-5" />
      </Button>
    </div>
  );
}

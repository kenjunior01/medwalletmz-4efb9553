import { useNavigate } from 'react-router-dom';
import { Meddy } from './Meddy';
import { MeddySpeechBubble } from './MeddySpeechBubble';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRoles } from '@/hooks/useUserRole';
import { Sparkles, ArrowRight } from 'lucide-react';
import type { MeddyRole } from './Meddy';

interface Props {
  message?: string;
  actionLabel?: string;
  actionHref?: string;
}

/**
 * MeddyWelcomeCard — cartão de boas-vindas na Home.
 * Mostra Meddy grande + mensagem personalizada + CTA primário.
 */
export function MeddyWelcomeCard({
  message = "Olá! Sou a Meddy 🌿 Posso ajudar-te a encontrar médico, farmácia ou marcar uma teleconsulta.",
  actionLabel = "Ver médicos",
  actionHref = "/health/doctors",
}: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { roles } = useUserRoles();

  if (!user) return null;

  const role: MeddyRole = (() => {
    if (roles.includes('admin')) return 'admin';
    if (roles.includes('doctor')) return 'doctor';
    if (roles.includes('store_owner')) return 'pharmacist';
    if (roles.includes('driver')) return 'driver';
    if (roles.includes('clinic')) return 'clinic';
    return 'patient';
  })();

  const firstName = user.email?.split('@')[0] || 'amigo';

  return (
    <section className="px-4 mt-5">
      <Card className="overflow-hidden border-none bg-gradient-to-br from-primary/10 via-secondary/5 to-pharmacy/10 p-0 relative">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-secondary/15 blur-2xl" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-primary/15 blur-2xl" />
        <div className="relative p-4 flex items-center gap-3">
          <div className="shrink-0">
            <Meddy role={role} state="waving" size={88} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 mb-1">
              <Sparkles className="h-3.5 w-3.5 text-secondary" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                Meddy · {roleLabel(role)}
              </span>
            </div>
            <MeddySpeechBubble variant="default">
              <p className="text-sm leading-relaxed">
                Olá <strong>{firstName}</strong>! {message}
              </p>
            </MeddySpeechBubble>
            <Button size="sm" className="mt-2" onClick={() => navigate(actionHref)}>
              {actionLabel}
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </Card>
    </section>
  );
}

function roleLabel(r: MeddyRole): string {
  return {
    patient: 'Paciente',
    doctor: 'Médico',
    pharmacist: 'Farmacêutico',
    driver: 'Entregador',
    clinic: 'Clínica',
    admin: 'Admin',
  }[r];
}
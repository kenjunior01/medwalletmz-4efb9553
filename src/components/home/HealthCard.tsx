import { Stethoscope, ArrowRight, FileText, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';

export function HealthCard() {
  const navigate = useNavigate();
  return (
    <section className="px-4 space-y-2">
      <Card
        onClick={() => navigate('/health/doctors')}
        className="cursor-pointer overflow-hidden border-none bg-gradient-to-br from-pharmacy via-pharmacy/90 to-primary p-5 text-pharmacy-foreground shadow-premium transition-all active:scale-[0.98]"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
            <Stethoscope className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
              Novo
            </div>
            <h3 className="text-lg font-bold leading-tight">Consulta Médica Online</h3>
            <p className="text-sm opacity-90">Fala com um médico em minutos</p>
          </div>
          <ArrowRight className="h-5 w-5 opacity-80" />
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => navigate('/health/prescriptions')}
          className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition py-1.5 rounded-lg border border-border"
        >
          <FileText className="h-3 w-3" /> Receitas
        </button>
        <button
          onClick={() => navigate('/health/plans')}
          className="flex items-center justify-center gap-1.5 text-xs text-gold hover:text-gold/80 transition py-1.5 rounded-lg border border-gold/30 bg-gold/5"
        >
          <Crown className="h-3 w-3" /> Health Pass
        </button>
      </div>
    </section>
  );
}
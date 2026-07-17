import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check, Crown, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_mzn: number;
  billing_period: string;
  features: any;
  badge: string | null;
}

const periodLabel: Record<string, string> = {
  monthly: '/mês',
  quarterly: '/trimestre',
  yearly: '/ano',
  one_time: '',
};

export default function HealthPlans() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { country } = useCountry();
  const currency = country?.currency_code || 'MZN';
  const paymentMethods = (country?.config?.payment_methods || []).map((m: any) => m.name).filter(Boolean).join(', ') || 'M-Pesa, e-Mola ou Mkesh';
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('subscription_plans')
      .select('*')
      .eq('target_audience', 'patient')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => {
        setPlans((data as Plan[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-background/80 px-4 py-3 backdrop-blur border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg font-bold">Health Pass</h1>
          <p className="text-xs text-muted-foreground">Saúde sem complicações</p>
        </div>
      </header>

      <section className="px-4 pt-4">
        <Card className="border-none bg-gradient-to-br from-pharmacy to-primary p-5 text-pharmacy-foreground">
          <Crown className="h-8 w-8 mb-2" />
          <h2 className="text-xl font-bold">Cuide da sua saúde com prioridade</h2>
          <p className="text-sm opacity-90 mt-1">
            Consultas mais rápidas, descontos em farmácia e entregas prioritárias.
          </p>
        </Card>
      </section>

      <section className="px-4 pt-5 space-y-4">
        {loading ? (
          <p className="text-center text-muted-foreground">A carregar planos...</p>
        ) : (
          plans.map((plan) => (
            <Card key={plan.id} className="p-5 relative">
              {plan.badge && (
                <Badge className="absolute -top-2 left-4 bg-gold text-gold-foreground">
                  <Sparkles className="h-3 w-3 mr-1" /> {plan.badge}
                </Badge>
              )}
              <h3 className="text-lg font-bold">{plan.name}</h3>
              {plan.description && (
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
              )}
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-primary">
                  {plan.price_mzn.toLocaleString()}
                </span>
                <span className="text-sm text-muted-foreground">
                  {currency}{periodLabel[plan.billing_period] ?? ''}
                </span>
              </div>
              {Array.isArray(plan.features) && (
                <ul className="mt-4 space-y-2">
                  {plan.features.map((f: string, i: number) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              )}
              <Button
                className="w-full mt-5"
                onClick={() => navigate(user ? `/subscribe/${plan.id}` : '/auth')}
              >
                Subscrever agora
              </Button>
            </Card>
          ))
        )}
      </section>

      <p className="text-center text-xs text-muted-foreground px-6 mt-6">
        Pagamentos via {paymentMethods}. Após enviar o comprovativo, a equipa valida em até 24h.
      </p>
    </div>
  );
}
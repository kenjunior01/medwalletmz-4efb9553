import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Crown } from 'lucide-react';
import { format } from 'date-fns';
import { useCountry } from '@/contexts/CountryContext';

const statusColor: Record<string, string> = {
  pending: 'bg-warning text-warning-foreground',
  active: 'bg-primary text-primary-foreground',
  expired: 'bg-muted text-muted-foreground',
  rejected: 'bg-destructive text-destructive-foreground',
  cancelled: 'bg-muted text-muted-foreground',
};
const statusLabel: Record<string, string> = {
  pending: 'Aguarda validação',
  active: 'Ativa',
  expired: 'Expirada',
  rejected: 'Rejeitada',
  cancelled: 'Cancelada',
};

export default function MySubscriptions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { country } = useCountry();
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const currencySymbol = country?.currency_symbol || country?.currency_code || 'MZN';
  const locale = country?.default_locale || 'pt-MZ';

  useEffect(() => {
    if (!user) return;
    supabase
      .from('subscriptions')
      .select('*, plan:subscription_plans(name, price_mzn, billing_period, target_audience)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setSubs(data ?? []);
        setLoading(false);
      });
  }, [user]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-background/80 px-4 py-3 backdrop-blur border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">Minhas Subscrições</h1>
      </header>

      <section className="p-4 space-y-3">
        {loading ? (
          <p className="text-center text-muted-foreground">A carregar...</p>
        ) : subs.length === 0 ? (
          <Card className="p-6 text-center">
            <Crown className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="font-semibold">Sem subscrições</p>
            <p className="text-sm text-muted-foreground mt-1">
              Conhece o Health Pass e desbloqueia benefícios exclusivos.
            </p>
            <Button className="mt-4" onClick={() => navigate('/health/plans')}>
              Ver planos
            </Button>
          </Card>
        ) : (
          subs.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{s.plan?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.amount_paid?.toLocaleString(locale)} {currencySymbol} · {s.payment_method?.toUpperCase()}
                  </p>
                </div>
                <Badge className={statusColor[s.status]}>{statusLabel[s.status]}</Badge>
              </div>
              {s.expires_at && (
                <p className="text-xs text-muted-foreground mt-2">
                  Expira: {format(new Date(s.expires_at), 'dd/MM/yyyy')}
                </p>
              )}
              {s.admin_notes && (
                <p className="text-xs bg-muted p-2 rounded mt-2">{s.admin_notes}</p>
              )}
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
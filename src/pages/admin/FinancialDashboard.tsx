import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, Users, Wallet, Globe, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatCurrency } from '@/lib/currency';

interface CurrencyTotal {
  currency: string;
  total_balance: number;
  total_deposited: number;
  total_spent: number;
  count: number;
}

export default function FinancialDashboard() {
  const navigate = useNavigate();
  const [totals, setTotals] = useState<CurrencyTotal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTotals = async () => {
      // In a real scenario, this would be an RPC or a dedicated view
      // Here we simulate the aggregation
      const { data, error } = await supabase
        .from('wallets')
        .select('currency, balance_mzn, total_deposited, total_spent');

      if (!error && data) {
        const aggregation: Record<string, CurrencyTotal> = {};
        data.forEach((w: any) => {
          const curr = w.currency || 'MZN';
          if (!aggregation[curr]) {
            aggregation[curr] = { currency: curr, total_balance: 0, total_deposited: 0, total_spent: 0, count: 0 };
          }
          aggregation[curr].total_balance += Number(w.balance_mzn);
          aggregation[curr].total_deposited += Number(w.total_deposited);
          aggregation[curr].total_spent += Number(w.total_spent);
          aggregation[curr].count += 1;
        });
        setTotals(Object.values(aggregation));
      }
      setLoading(false);
    };

    fetchTotals();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-background/80 px-4 py-3 backdrop-blur border-b">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">Dashboard Financeiro Global</h1>
      </header>

      <main className="p-4 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {totals.map((t) => (
            <Card key={t.currency} className="p-4 space-y-3 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <Globe className="h-12 w-12" />
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                <Wallet className="h-4 w-4" /> Saldo Total em {t.currency}
              </div>
              <p className="text-3xl font-black">
                {formatCurrency(t.total_balance, t.currency as any)}
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Depósitos</p>
                  <p className="text-sm font-bold text-pharmacy flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3" /> {formatCurrency(t.total_deposited, t.currency as any)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Gastos</p>
                  <p className="text-sm font-bold text-destructive flex items-center gap-1">
                    <ArrowDownRight className="h-3 w-3" /> {formatCurrency(t.total_spent, t.currency as any)}
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                Baseado em {t.count} carteiras ativas
              </p>
            </Card>
          ))}
        </div>

        <Card className="p-4">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Distribuição de Volume por Moeda
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={totals}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="currency" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{fill: 'transparent'}}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border p-2 rounded-lg shadow-xl text-xs">
                          <p className="font-bold border-b mb-1 pb-1">{data.currency}</p>
                          <p>Volume: {formatCurrency(data.total_deposited, data.currency)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="total_deposited" radius={[4, 4, 0, 0]}>
                  {totals.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'hsl(var(--primary))' : 'hsl(var(--pharmacy))'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <section className="space-y-3">
          <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Ações Rápidas</h3>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-20 flex-col gap-2 border-dashed">
              <Users className="h-5 w-5" />
              <span className="text-xs">Gerir Médicos</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2 border-dashed">
              <TrendingUp className="h-5 w-5" />
              <span className="text-xs">Taxas de Câmbio</span>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}

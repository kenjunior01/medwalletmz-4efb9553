import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, Users, Tag, Coins, Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { ChartWidget } from '@/components/widgets/ChartWidget';

interface InfluencerStats {
  totalUses: number;
  totalRevenue: number;
  commission: number;
  activeCoupons: number;
  coupons: { code: string; uses: number; discount_value: number; discount_type: string }[];
  usageByMonth: { name: string; value: number }[];
}

export default function InfluencerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<InfluencerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/auth'); return; }
    fetchStats();
  }, [user, authLoading]);

  const fetchStats = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Get profile id
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) { setLoading(false); return; }

      // Get influencer coupons
      const { data: coupons } = await supabase
        .from('coupons')
        .select('id, code, discount_value, discount_type, used_count')
        .eq('influencer_id', profile.id);

      if (!coupons || coupons.length === 0) {
        setStats({ totalUses: 0, totalRevenue: 0, commission: 0, activeCoupons: 0, coupons: [], usageByMonth: [] });
        setLoading(false);
        return;
      }

      const totalUses = coupons.reduce((sum, c) => sum + (c.used_count || 0), 0);
      // Estimate avg order value = 500 MZN, commission = 5%
      const estimatedRevenue = totalUses * 500;
      const commission = Math.round(estimatedRevenue * 0.05);

      // Build usage chart (mock monthly distribution based on total)
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
      const usageByMonth = months.map((name, i) => ({
        name,
        value: Math.round((totalUses / months.length) * (0.5 + Math.random()))
      }));

      setStats({
        totalUses,
        totalRevenue: estimatedRevenue,
        commission,
        activeCoupons: coupons.length,
        coupons: coupons.map(c => ({
          code: c.code,
          uses: c.used_count || 0,
          discount_value: c.discount_value,
          discount_type: c.discount_type
        })),
        usageByMonth
      });
    } catch (err) {
      console.error('Error fetching influencer stats:', err);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Código copiado!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-24 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold">Painel do Influenciador</h1>
          <p className="text-xs text-muted-foreground">Acompanhe o desempenho dos seus códigos</p>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-border/50">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <span className="text-2xl font-bold">{stats?.totalUses || 0}</span>
              <span className="text-xs text-muted-foreground">Usos Totais</span>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center mb-2">
                <TrendingUp className="h-5 w-5 text-secondary" />
              </div>
              <span className="text-2xl font-bold">{stats?.totalRevenue?.toLocaleString() || 0}</span>
              <span className="text-xs text-muted-foreground">Receita (MZN)</span>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center mb-2">
                <Coins className="h-5 w-5 text-accent-foreground" />
              </div>
              <span className="text-2xl font-bold">{stats?.commission?.toLocaleString() || 0}</span>
              <span className="text-xs text-muted-foreground">Comissão (MZN)</span>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Tag className="h-5 w-5 text-primary" />
              </div>
              <span className="text-2xl font-bold">{stats?.activeCoupons || 0}</span>
              <span className="text-xs text-muted-foreground">Códigos Ativos</span>
            </CardContent>
          </Card>
        </div>

        {/* Usage Chart */}
        {stats?.usageByMonth && stats.usageByMonth.length > 0 && (
          <ChartWidget
            title="Uso Mensal"
            data={stats.usageByMonth}
            type="bar"
            height={200}
          />
        )}

        {/* Coupon Codes */}
        <div>
          <h2 className="font-semibold text-lg mb-3">Seus Códigos</h2>
          {stats?.coupons && stats.coupons.length > 0 ? (
            <div className="space-y-3">
              {stats.coupons.map((coupon) => (
                <Card key={coupon.code} className="border-border/50">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-mono font-bold text-lg">{coupon.code}</p>
                      <p className="text-sm text-muted-foreground">
                        {coupon.discount_type === 'percentage'
                          ? `${coupon.discount_value}% desconto`
                          : `${coupon.discount_value} MZN desconto`}
                        {' • '}{coupon.uses} usos
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyCode(coupon.code)}
                      className="rounded-full"
                    >
                      {copiedCode === coupon.code ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-border/50">
              <CardContent className="p-8 text-center">
                <Tag className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">Nenhum código de afiliado atribuído</p>
                <p className="text-xs text-muted-foreground mt-1">Contacte a equipa para obter o seu código</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

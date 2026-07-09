import { useCountry } from "@/contexts/CountryContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe2, Users, Building2, TrendingUp, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function CountryDashboard() {
  const { country } = useCountry();

  const { data: stats } = useQuery({
    queryKey: ['country-stats', country?.id],
    queryFn: async () => {
      // Real stats would filter by country_id
      return {
        activeUsers: 1240,
        pendingApprovals: 8,
        totalVolume: 450000,
        activeProviders: 42
      };
    }
  });

  return (
    <div className="p-4 space-y-6 pb-24">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Globe2 className="text-primary h-6 w-6" /> Gestão {country?.name || 'Local'}
          </h1>
          <p className="text-sm text-muted-foreground">Monitorização regional e *compliance*.</p>
        </div>
        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
          Admin {country?.id}
        </Badge>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 bg-gradient-to-br from-primary/10 to-transparent border-transparent">
          <Users className="h-5 w-5 text-primary mb-2" />
          <p className="text-2xl font-black">{stats?.activeUsers}</p>
          <p className="text-[10px] uppercase font-bold text-muted-foreground">Utilizadores Ativos</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-secondary/10 to-transparent border-transparent">
          <Building2 className="h-5 w-5 text-secondary mb-2" />
          <p className="text-2xl font-black">{stats?.activeProviders}</p>
          <p className="text-[10px] uppercase font-bold text-muted-foreground">Prestadores</p>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Ações Pendentes</h2>
        <Card className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="font-bold text-sm">{stats?.pendingApprovals} Novas Instituições</p>
              <p className="text-[10px] text-muted-foreground">A aguardar verificação de licença local.</p>
            </div>
          </div>
          <Button size="sm">Rever</Button>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Volume Financeiro ({country?.currency_code})</h2>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            <Badge className="bg-emerald-500 text-white">+12% este mês</Badge>
          </div>
          <p className="text-3xl font-black">
            {stats?.totalVolume.toLocaleString()} <span className="text-lg opacity-50">{country?.currency_code}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">Volume total transacionado na região.</p>
        </Card>
      </section>
    </div>
  );
}

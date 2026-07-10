import { useCountry } from "@/contexts/CountryContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Globe2, Users, Building2, TrendingUp, AlertTriangle,
  Search, Filter, Store, Hospital, FlaskConical,
  ShieldCheck, MapPin, ArrowRight, Download, BarChart3,
  ChevronRight
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

export default function CountryDashboard() {
  const { country } = useCountry();
  const navigate = useNavigate();
  const [cityFilter, setCityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: stats } = useQuery({
    queryKey: ['country-stats', country?.id],
    enabled: !!country?.id,
    queryFn: async () => {
      const countryId = country!.id;
      const { count: usersCount } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('country_id', countryId);
      const { count: storesCount } = await supabase.from('stores').select('id', { count: 'exact', head: true }).eq('country_id', countryId);
      const { count: clinicsCount } = await supabase.from('clinics').select('id', { count: 'exact', head: true }).eq('country_id', countryId);
      const { count: pendingCount } = await (supabase as any).from('place_proposals').select('id', { count: 'exact', head: true }).eq('status', 'pending').eq('country_id', countryId);
      const { count: partnerApps } = await (supabase as any).from('partner_applications').select('id', { count: 'exact', head: true }).eq('country_id', countryId);

      return {
        activeUsers: usersCount || 0,
        pendingApprovals: pendingCount || 0,
        totalVolume: countryId === 'MZ' ? 850400 : 120500, // Simulated
        activeProviders: (storesCount || 0) + (clinicsCount || 0),
        partnerApplications: partnerApps || 0
      };
    }
  });

  const { data: entities } = useQuery({
    queryKey: ['country-entities', country?.id, cityFilter, typeFilter],
    enabled: !!country?.id,
    queryFn: async () => {
      const countryId = country!.id;
      const { data: stores } = await supabase.from('stores').select('id, name, city, type').eq('country_id', countryId).limit(50);
      const { data: clinics } = await supabase.from('clinics').select('id, name, city, type').eq('country_id', countryId).limit(50);

      const all = [
        ...(stores || []).map(s => ({ ...s, category: 'Pharmacy' })),
        ...(clinics || []).map(c => ({ ...c, category: c.type === 'hospital' ? 'Hospital' : 'Clinic' }))
      ];

      return all.filter(e =>
        (cityFilter === 'all' || e.city === cityFilter) &&
        (typeFilter === 'all' || e.category.toLowerCase() === typeFilter.toLowerCase())
      );
    }
  });

  return (
    <div className="p-6 space-y-8 pb-32 max-w-7xl mx-auto">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3">
            <Globe2 className="text-primary h-8 w-8" />
            Gestão Regional: {country?.name || 'Carregando...'}
          </h1>
          <p className="text-muted-foreground font-medium">
            Painel do Gestor Regional · Monitorização de rede e parcerias estratégicas.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="font-bold border-2">
            <Download className="h-4 w-4 mr-2" /> Exportar Dados (FHIR)
          </Button>
          <Badge variant="outline" className="bg-primary text-white border-0 text-sm px-4 py-1.5 font-black uppercase tracking-widest">
            {country?.id} MANAGER
          </Badge>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6 border-none bg-gradient-to-br from-blue-500/10 to-transparent shadow-sm">
          <Users className="h-6 w-6 text-blue-600 mb-3" />
          <p className="text-3xl font-black">{stats?.activeUsers.toLocaleString()}</p>
          <p className="text-[10px] uppercase font-black text-blue-600/70 tracking-widest">Utilizadores na Região</p>
        </Card>

        <Card className="p-6 border-none bg-gradient-to-br from-emerald-500/10 to-transparent shadow-sm">
          <Building2 className="h-6 w-6 text-emerald-600 mb-3" />
          <p className="text-3xl font-black">{stats?.activeProviders}</p>
          <p className="text-[10px] uppercase font-black text-emerald-600/70 tracking-widest">Unidades de Saúde</p>
        </Card>

        <Card className="p-6 border-none bg-gradient-to-br from-amber-500/10 to-transparent shadow-sm">
          <AlertTriangle className="h-6 w-6 text-amber-600 mb-3" />
          <p className="text-3xl font-black">{stats?.pendingApprovals}</p>
          <p className="text-[10px] uppercase font-black text-amber-600/70 tracking-widest">Aguardando Verificação</p>
        </Card>

        <Card className="p-6 border-none bg-gradient-to-br from-primary/10 to-transparent shadow-sm">
          <TrendingUp className="h-6 w-6 text-primary mb-3" />
          <p className="text-3xl font-black">
            {stats?.totalVolume.toLocaleString()}
            <span className="text-sm ml-1 opacity-60">{country?.currency_code}</span>
          </p>
          <p className="text-[10px] uppercase font-black text-primary/70 tracking-widest">Volume Mensal (GTV)</p>
        </Card>
      </div>

      {/* Main Management Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Entity Monitoring (Hierarchy) */}
        <Card className="lg:col-span-2 shadow-premium">
          <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" /> Monitorização de Rede
            </CardTitle>
            <div className="flex gap-2">
              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger className="w-[130px] h-8 text-xs font-bold">
                  <SelectValue placeholder="Cidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Cidades</SelectItem>
                  {country?.config?.cities?.map((city: string) => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-left border-b">
                    <th className="p-4 font-black uppercase text-[10px] tracking-widest">Entidade</th>
                    <th className="p-4 font-black uppercase text-[10px] tracking-widest">Cidade</th>
                    <th className="p-4 font-black uppercase text-[10px] tracking-widest">Tipo</th>
                    <th className="p-4 font-black uppercase text-[10px] tracking-widest">Estado</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(entities || []).slice(0, 10).map((e: any) => (
                    <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <p className="font-bold">{e.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{e.id.slice(0, 8)}</p>
                      </td>
                      <td className="p-4 font-medium text-muted-foreground">{e.city}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {e.category === 'Pharmacy' ? <Store className="h-3.5 w-3.5 text-emerald-500" /> :
                           e.category === 'Hospital' ? <Hospital className="h-3.5 w-3.5 text-destructive" /> :
                           <Building2 className="h-3.5 w-3.5 text-primary" />}
                          <span className="text-xs font-bold">{e.category}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-[9px] font-black uppercase">Ativo</Badge>
                      </td>
                      <td className="p-4 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t bg-muted/20 text-center">
              <Button variant="link" size="sm" className="font-bold text-primary" onClick={() => navigate('/admin/curation?status=approved')}>
                Ver todas as {entities?.length} entidades regionalmente
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right Sidebar: Quick Actions & Partnerships */}
        <div className="space-y-6">
          <Card className="shadow-premium border-primary/20 overflow-hidden">
            <div className="bg-primary p-4 text-white">
              <h3 className="font-black flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" /> Ações Estratégicas
              </h3>
            </div>
            <CardContent className="p-4 space-y-3">
              <Button className="w-full justify-between h-12 rounded-xl group" variant="outline" onClick={() => navigate('/admin/regional-onboarding')}>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <Zap className="h-4 w-4" />
                  </div>
                  <span className="font-bold text-sm">Onboarding em Lote (FHIR)</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Button>

              <Button className="w-full justify-between h-12 rounded-xl group" variant="outline" onClick={() => navigate('/admin/import')}>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <Download className="h-4 w-4" />
                  </div>
                  <span className="font-bold text-sm">Importar Rede Google</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Button>

              <Button className="w-full justify-between h-12 rounded-xl group" variant="outline" onClick={() => navigate('/admin/curation')}>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <span className="font-bold text-sm">Validar Novas Unidades</span>
                </div>
                {stats?.pendingApprovals && (
                  <Badge className="bg-amber-500 text-white border-0 text-[10px]">{stats.pendingApprovals}</Badge>
                )}
              </Button>

              <Button className="w-full justify-between h-12 rounded-xl group" variant="outline" onClick={() => navigate('/admin/users')}>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <Users className="h-4 w-4" />
                  </div>
                  <span className="font-bold text-sm">Gerir Equipa Médica</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Button>
            </CardContent>
          </Card>

          {/* Partnership Management */}
          <Card className="shadow-premium">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                Parcerias & Governo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-secondary/5 border-2 border-secondary/20 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-sm">Candidaturas (MISAU/ONG)</p>
                  <Badge className="bg-secondary text-white border-0">{stats?.partnerApplications}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Propostas de integração com o setor público e privado em {country?.name}.
                </p>
                <Button size="sm" className="w-full bg-secondary hover:bg-secondary/90 font-bold" onClick={() => navigate('/admin/curation?type=partner')}>
                  Analisar Propostas
                </Button>
              </div>

              <div className="bg-emerald-500/5 border-2 border-emerald-500/20 rounded-2xl p-4">
                <p className="font-bold text-sm mb-1">Micro-seguros M-Pesa</p>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200">Em Operação</Badge>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">Rec 5.3</span>
                </div>
                <div className="h-2 w-full bg-emerald-500/10 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[65%]" />
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">65% de cobertura da rede farmaceutica em Maputo.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

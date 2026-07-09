import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Globe, Users, CreditCard, TrendingUp, MapPin, ShieldCheck, Plus, Trash2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function GlobalCommandCenter() {
  const [countries, setCountries] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [newManagerEmail, setNewManagerEmail] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const { data: cData } = await supabase.from('countries').select('*').order('name');
    const { data: mData } = await supabase
      .from('country_management' as any)
      .select('*, profiles:user_id(full_name, phone)');

    setCountries(cData || []);
    setManagers(mData || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const addManager = async (countryId: string) => {
    if (!newManagerEmail) return toast.error("Insira o email do gestor");

    try {
      // 1. Buscar o ID do usuário pelo email (via profiles ou auth)
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('phone', newManagerEmail) // No MVP simplificado usamos o telefone como ID ou busca por email se disponível
        .maybeSingle();

      if (!userData) throw new Error("Utilizador não encontrado. Peça ao gestor para se registar primeiro.");

      // 2. Inserir na tabela de gestão
      const { error } = await supabase.from('country_management' as any).insert({
        user_id: userData.user_id,
        country_id: countryId,
        permissions: { can_approve_doctors: true, can_view_revenue: true }
      });

      if (error) throw error;

      // 3. Garantir que ele tem a role de country_manager
      await supabase.from('user_roles').upsert({ user_id: userData.user_id, role: 'country_manager' });

      toast.success("Gestor atribuído com sucesso!");
      setNewManagerEmail('');
      loadData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const removeManager = async (id: string) => {
    const { error } = await supabase.from('country_management' as any).delete().eq('id', id);
    if (error) toast.error("Erro ao remover");
    else {
      toast.success("Gestor removido");
      loadData();
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen pb-24">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-2">
            <Globe className="text-primary h-8 w-8" /> Global Command Center
          </h1>
          <p className="text-muted-foreground">Gestão de império: Países, Gestores e Receitas.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData}>Atualizar Dados</Button>
          <Button className="font-bold">Expandir para Novo País</Button>
        </div>
      </header>

      {/* Visão Macro */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Receita Global Estimada" value="1.2M MT" icon={<TrendingUp className="text-emerald-500" />} />
        <StatCard title="Países Ativos" value={countries.length} icon={<MapPin className="text-blue-500" />} />
        <StatCard title="Total de Gestores" value={managers.length} icon={<ShieldCheck className="text-purple-500" />} />
        <StatCard title="Taxa de Crescimento" value="+24%" icon={<TrendingUp className="text-orange-500" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Países e Gestores */}
        <Card className="lg:col-span-2 shadow-sm border-2">
          <CardHeader>
            <CardTitle>Mercados e Liderança</CardTitle>
            <CardDescription>Gerencie quem comanda cada território.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {countries.map(country => (
                <div key={country.id} className="border rounded-2xl p-4 bg-white hover:border-primary/40 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{country.id === 'MZ' ? '🇲🇿' : country.id === 'BR' ? '🇧🇷' : '🌐'}</span>
                      <div>
                        <h3 className="font-bold text-lg">{country.name}</h3>
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">
                          {country.currency_code} ({country.currency_symbol}) • Taxa: {country.config?.tax || '10'}%
                        </p>
                      </div>
                    </div>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="rounded-full">
                          <Plus className="h-4 w-4 mr-1" /> Adicionar Gestor
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Atribuir Gestor para {country.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Email ou Telefone do Utilizador</Label>
                            <div className="flex gap-2">
                              <Input
                                placeholder="ex: gestor@medwallet.com"
                                value={newManagerEmail}
                                onChange={e => setNewManagerEmail(e.target.value)}
                              />
                              <Button onClick={() => addManager(country.id)}>Atribuir</Button>
                            </div>
                            <p className="text-[10px] text-muted-foreground">O usuário já deve ter uma conta criada no MedWallet.</p>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] uppercase font-black text-slate-400 mb-1">Gestores Ativos</p>
                    {managers.filter(m => m.country_id === country.id).length === 0 ? (
                      <p className="text-xs italic text-muted-foreground">Nenhum gestor atribuído. O Super Admin (Você) gere este país.</p>
                    ) : (
                      managers.filter(m => m.country_id === country.id).map(m => (
                        <div key={m.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-dashed">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-bold">{m.profiles?.full_name || 'Gestor Regional'}</p>
                              <p className="text-[10px] text-muted-foreground">{m.profiles?.phone}</p>
                            </div>
                          </div>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeManager(m.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notificações de Expansão */}
        <Card className="shadow-sm border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" /> Candidaturas de Parceria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border rounded-xl bg-orange-50 border-orange-200">
              <p className="text-xs font-bold text-orange-800">NOVA SOLICITAÇÃO: ANGOLA</p>
              <p className="text-sm mt-1">Clínica Sagrada Esperança quer aderir à plataforma.</p>
              <Button size="sm" variant="outline" className="mt-2 w-full border-orange-300 text-orange-800 hover:bg-orange-100">Ver Detalhes</Button>
            </div>
            <div className="p-4 border rounded-xl bg-slate-50">
              <p className="text-xs font-bold">HISTÓRICO</p>
              <p className="text-sm text-muted-foreground mt-1">8 novas farmácias aprovadas em Lagos, Nigéria.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: any) {
  return (
    <Card className="border-2 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-black uppercase text-muted-foreground tracking-widest">{title}</CardTitle>
        <div className="h-8 w-8 bg-muted rounded-full flex items-center justify-center">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-black text-slate-800">{value}</div>
      </CardContent>
    </Card>
  );
}

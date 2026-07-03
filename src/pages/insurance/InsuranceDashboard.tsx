import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Shield, Plus, Trash2, Megaphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function InsuranceDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState({ name: "", description: "", monthly_price_mzn: 0, coverage_percent: 50, max_coverage_mzn: 0 });

  const { data: company } = useQuery({
    queryKey: ["my-insurance", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("insurance_companies").select("*").eq("owner_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: plans } = useQuery({
    queryKey: ["my-insurance-plans", company?.id],
    queryFn: async () => {
      const { data } = await supabase.from("insurance_plans").select("*").eq("company_id", company!.id).order("created_at");
      return data || [];
    },
    enabled: !!company?.id,
  });

  const addPlan = async () => {
    if (!company) return;
    const { error } = await supabase.from("insurance_plans").insert({ ...plan, company_id: company.id });
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Plano criado" });
    setOpen(false);
    setPlan({ name: "", description: "", monthly_price_mzn: 0, coverage_percent: 50, max_coverage_mzn: 0 });
    qc.invalidateQueries({ queryKey: ["my-insurance-plans"] });
  };

  const del = async (id: string) => {
    await supabase.from("insurance_plans").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["my-insurance-plans"] });
  };

  if (!company) return (
    <div className="p-8 text-center">
      <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
      <p className="mb-4">Ainda não tens perfil de seguradora.</p>
      <Button onClick={() => (window.location.href = "/insurance/register")}>Criar perfil</Button>
    </div>
  );

  return (
    <div className="p-4 flex flex-col gap-4 animate-fade-in">
      <div className="bento-card p-5 flex items-center gap-4">
        <Shield className="h-10 w-10 text-primary" />
        <div className="flex-1">
          <h1 className="text-xl font-black">{company.name}</h1>
          <p className="text-xs text-muted-foreground">
            {company.city} · {company.is_verified ? "✓ Verificada e pública" : "⏳ Aguarda aprovação do admin"}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => navigate("/ads/new")}>
          <Megaphone className="h-4 w-4 mr-1" /> Publicar anúncio
        </Button>
      </div>

      {!company.is_verified && (
        <div className="bento-card p-4 border-l-4 border-l-yellow-500 bg-yellow-500/5">
          <p className="text-sm font-semibold">Perfil em revisão</p>
          <p className="text-xs text-muted-foreground">
            Podes já criar planos, mas o teu perfil e planos só aparecerão publicamente após a aprovação do admin.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black">Planos ({plans?.length || 0})</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Novo plano</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>Novo plano</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={plan.name} onChange={e => setPlan({ ...plan, name: e.target.value })} /></div>
              <div><Label>Descrição</Label><Textarea value={plan.description} onChange={e => setPlan({ ...plan, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Preço mensal (MZN)</Label><Input type="number" value={plan.monthly_price_mzn} onChange={e => setPlan({ ...plan, monthly_price_mzn: +e.target.value })} /></div>
                <div><Label>Cobertura %</Label><Input type="number" max={100} value={plan.coverage_percent} onChange={e => setPlan({ ...plan, coverage_percent: +e.target.value })} /></div>
                <div className="col-span-2"><Label>Cobertura máxima mensal (MZN)</Label><Input type="number" value={plan.max_coverage_mzn} onChange={e => setPlan({ ...plan, max_coverage_mzn: +e.target.value })} /></div>
              </div>
              <Button onClick={addPlan} className="w-full">Criar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {plans?.map((p: any) => (
          <div key={p.id} className="bento-card p-4">
            <div className="flex items-start justify-between">
              <div><h3 className="font-bold">{p.name}</h3><p className="text-xs text-muted-foreground">{p.description}</p></div>
              <Button size="icon" variant="ghost" onClick={() => del(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
            <p className="text-2xl font-black text-primary mt-2">{Number(p.monthly_price_mzn).toLocaleString("pt-MZ")}<span className="text-xs text-muted-foreground"> MZN/mês</span></p>
            <p className="text-xs mt-1">Cobertura {p.coverage_percent}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}
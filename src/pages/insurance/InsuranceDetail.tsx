import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, CheckCircle2, Phone, Globe, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";

export default function InsuranceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["insurance-detail", id],
    queryFn: async () => {
      const { data: c } = await supabase.from("insurance_companies").select("*").eq("id", id).single();
      const { data: plans } = await supabase.from("insurance_plans").select("*").eq("company_id", id).eq("is_active", true).order("monthly_price_mzn");
      return { company: c, plans: plans || [] };
    },
    enabled: !!id,
  });

  const subscribe = async (planId: string) => {
    if (!user) return navigate("/auth");
    const { error } = await supabase.from("user_insurance").insert({
      user_id: user.id,
      plan_id: planId,
      status: "pending",
      member_number: `M${Date.now().toString().slice(-8)}`,
    });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else toast({ title: "Subscrição pedida", description: "A seguradora vai contactar-te para activar." });
  };

  if (isLoading) return <div className="p-4"><Skeleton className="h-40 rounded-2xl mb-4" /><Skeleton className="h-64 rounded-2xl" /></div>;
  if (!data?.company) return <div className="p-8 text-center text-muted-foreground">Seguradora não encontrada</div>;

  const c = data.company;
  return (
    <div className="p-4 flex flex-col gap-4 animate-fade-in">
      <div className="bento-card p-5">
        <div className="flex items-start gap-4">
          {c.logo_url ? <img src={c.logo_url} alt={`Logótipo ${c.name ?? 'da seguradora'}`} className="h-20 w-20 rounded-2xl object-cover" /> :
            <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center"><Shield className="h-10 w-10 text-primary" /></div>}
          <div className="flex-1">
            <div className="flex items-center gap-2"><h1 className="text-2xl font-black">{c.name}</h1>{c.is_verified && <CheckCircle2 className="h-5 w-5 text-primary" />}</div>
            <p className="text-sm text-muted-foreground mt-1">{c.description}</p>
            <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
              {c.phone && <a href={`tel:${c.phone}`} className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</a>}
              {c.website && <a href={c.website} target="_blank" rel="noopener" className="flex items-center gap-1"><Globe className="h-3 w-3" />Website</a>}
              {c.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{c.city}</span>}
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-lg font-black">Planos disponíveis</h2>
      {data.plans.length === 0 ? (
        <div className="bento-card p-6 text-center text-sm text-muted-foreground">Esta seguradora ainda não publicou planos.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.plans.map((p: any) => (
            <div key={p.id} className="bento-card p-5">
              <h3 className="font-black text-lg">{p.name}</h3>
              <p className="text-xs text-muted-foreground mb-3">{p.description}</p>
              <p className="text-3xl font-black text-primary">{Number(p.monthly_price_mzn).toLocaleString("pt-MZ")}<span className="text-sm font-semibold text-muted-foreground"> MZN/mês</span></p>
              <div className="mt-3 space-y-1 text-xs">
                <div className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-primary" /> Cobertura {p.coverage_percent}%</div>
                {p.max_coverage_mzn && <div className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-primary" /> Máx. {Number(p.max_coverage_mzn).toLocaleString("pt-MZ")} MZN/mês</div>}
                {(p.covered_services || []).map((s: string) => (
                  <div key={s} className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-primary" />{s}</div>
                ))}
              </div>
              <Button className="w-full mt-4" onClick={() => subscribe(p.id)}>Subscrever</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
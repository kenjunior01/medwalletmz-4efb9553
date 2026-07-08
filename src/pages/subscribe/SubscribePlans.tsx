import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Sparkles, ArrowLeft } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_mzn: number;
  billing_period: string;
  target_audience: string;
  features: any;
  is_active: boolean;
  badge?: string | null;
}

const audiences = [
  { key: "customer", label: "Utilizadores" },
  { key: "doctor", label: "Médicos" },
  { key: "clinic", label: "Clínicas/Hospitais" },
  { key: "lab", label: "Laboratórios" },
  { key: "pharmacy", label: "Farmácias" },
];

export default function SubscribePlans() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [audience, setAudience] = useState(sp.get("audience") || "customer");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .eq("target_audience", audience)
        .order("price_mzn");
      setPlans((data as any) || []);
      setLoading(false);
    })();
  }, [audience]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-background/80 px-4 py-3 backdrop-blur border-b">
        <Button variant="ghost" size="icon" onClick={() => nav(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg font-bold">Planos de subscrição</h1>
          <p className="text-xs text-muted-foreground">Escolha o plano ideal para si</p>
        </div>
      </header>

      <section className="p-4 space-y-4">
        <Tabs value={audience} onValueChange={setAudience}>
          <TabsList className="w-full flex overflow-x-auto">
            {audiences.map(a => (
              <TabsTrigger key={a.key} value={a.key} className="flex-1 whitespace-nowrap">
                {a.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {loading ? (
          <p className="text-center text-muted-foreground py-8">A carregar...</p>
        ) : plans.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            Sem planos disponíveis para este perfil por enquanto.
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {plans.map(p => {
              const feats: string[] = Array.isArray(p.features)
                ? p.features
                : (p.features?.items ?? []);
              return (
                <Card
                  key={p.id}
                  className={`p-5 relative ${p.badge ? "border-primary border-2" : ""}`}
                >
                  {p.badge && (
                    <Badge className="absolute -top-2 right-4 gap-1">
                      <Sparkles className="h-3 w-3" /> {p.badge}
                    </Badge>
                  )}
                  <h3 className="text-xl font-bold">{p.name}</h3>
                  {p.description && (
                    <p className="text-sm text-muted-foreground mt-1">{p.description}</p>
                  )}
                  <div className="my-4">
                    <span className="text-3xl font-black text-primary">
                      {p.price_mzn.toLocaleString("pt-MZ")}
                    </span>
                    <span className="text-muted-foreground text-sm"> MZN / {p.billing_period === "monthly" ? "mês" : p.billing_period === "yearly" ? "ano" : p.billing_period}</span>
                  </div>
                  <ul className="space-y-1.5 mb-4 text-sm">
                    {feats.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" onClick={() => nav(`/subscribe/${p.id}`)}>
                    Subscrever
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
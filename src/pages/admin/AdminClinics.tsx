import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Building2, CheckCircle2, XCircle, Pause, MapPin, Phone, Stethoscope } from "lucide-react";
import { useCountry } from "@/contexts/CountryContext";

export default function AdminClinics() {
  const [clinics, setClinics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { country } = useCountry();

  const load = async () => {
    setLoading(true);
    let query = supabase.from("clinics").select("*").neq("type", "laboratory").order("created_at", { ascending: false });

    if (country?.id) {
        query = query.eq('country_id', country.id);
    }

    const { data } = await query;
    setClinics(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [country]);

  const toggleStatus = async (id: string, active: boolean) => {
    const { error } = await supabase.from("clinics").update({ is_active: active, is_verified: true }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(active ? "Unidade ativada" : "Unidade suspensa");
    load();
  };

  const pending = clinics.filter((l) => !l.is_verified);
  const approved = clinics.filter((l) => l.is_verified && l.is_active);
  const suspended = clinics.filter((l) => l.is_verified && !l.is_active);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" /> Unidades de Saúde
          </h1>
          <p className="text-muted-foreground text-sm">Gerencie Clínicas, Hospitais e Centros de {country?.name}</p>
        </div>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="pending">Pendentes ({pending.length})</TabsTrigger>
          <TabsTrigger value="approved">Ativas ({approved.length})</TabsTrigger>
          <TabsTrigger value="suspended">Suspensas ({suspended.length})</TabsTrigger>
        </TabsList>

        {["pending", "approved", "suspended"].map((tab) => {
          const list = tab === "pending" ? pending : tab === "approved" ? approved : suspended;
          return (
            <TabsContent key={tab} value={tab} className="space-y-4 mt-6">
              {loading ? <p>Carregando...</p> : list.length === 0 ? (
                <div className="text-center py-12 bg-muted/20 rounded-2xl border-2 border-dashed">
                  <p className="text-muted-foreground">Nenhuma unidade encontrada nesta categoria.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {list.map((c) => (
                    <div key={c.id} className="bg-card border rounded-2xl p-5 shadow-sm space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-3">
                          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            {c.type === 'veterinary' ? <Stethoscope className="h-6 w-6 text-primary" /> : <Building2 className="h-6 w-6 text-primary" />}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold truncate">{c.name}</h3>
                            <Badge variant="outline" className="text-[10px] uppercase font-black">{c.type}</Badge>
                          </div>
                        </div>
                        <Badge className={c.is_active ? "bg-emerald-500" : "bg-amber-500"}>{c.is_active ? "Ativo" : "Inativo"}</Badge>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {c.city}, {c.address}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" /> {c.phone || "N/A"}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        {!c.is_verified ? (
                          <Button size="sm" className="flex-1" onClick={() => toggleStatus(c.id, true)}>
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Aprovar
                          </Button>
                        ) : c.is_active ? (
                          <Button size="sm" variant="outline" className="flex-1 text-destructive" onClick={() => toggleStatus(c.id, false)}>
                            <Pause className="h-4 w-4 mr-1" /> Suspender
                          </Button>
                        ) : (
                          <Button size="sm" className="flex-1" onClick={() => toggleStatus(c.id, true)}>
                            Reativar
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-muted-foreground">Editar</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

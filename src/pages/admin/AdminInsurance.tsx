import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Shield, CheckCircle2, XCircle, MapPin, Mail, Phone, Globe } from "lucide-react";

export default function AdminInsurance() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-insurance"],
    queryFn: async () => {
      const { data } = await supabase
        .from("insurance_companies")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const approve = async (id: string) => {
    const { error } = await supabase
      .from("insurance_companies")
      .update({ is_verified: true, is_active: true })
      .eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Seguradora aprovada" });
    qc.invalidateQueries({ queryKey: ["admin-insurance"] });
  };

  const reject = async (id: string) => {
    const { error } = await supabase
      .from("insurance_companies")
      .update({ is_verified: false, is_active: false })
      .eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Seguradora suspensa" });
    qc.invalidateQueries({ queryKey: ["admin-insurance"] });
  };

  const pending = (data || []).filter((c: any) => !c.is_verified);
  const approved = (data || []).filter((c: any) => c.is_verified);

  return (
    <div className="p-4 flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" /> Seguradoras
        </h1>
        <p className="text-sm text-muted-foreground">
          Aprova ou rejeita perfis de seguradoras. Só as aprovadas aparecem publicamente.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
      ) : (
        <>
          <section>
            <h2 className="text-lg font-bold mb-2">
              Pendentes <Badge variant="secondary" className="ml-1">{pending.length}</Badge>
            </h2>
            {pending.length === 0 ? (
              <p className="text-sm text-muted-foreground bento-card p-4">Nenhum pedido pendente.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {pending.map((c: any) => <Card key={c.id} c={c} onApprove={approve} onReject={reject} />)}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">
              Aprovadas <Badge className="ml-1">{approved.length}</Badge>
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {approved.map((c: any) => <Card key={c.id} c={c} onApprove={approve} onReject={reject} />)}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Card({ c, onApprove, onReject }: { c: any; onApprove: (id: string) => void; onReject: (id: string) => void }) {
  return (
    <div className="bento-card p-4">
      <div className="flex items-start gap-3">
        {c.logo_url ? (
          <img src={c.logo_url} alt={c.name} className="h-14 w-14 rounded-xl object-cover" />
        ) : (
          <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="h-7 w-7 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold truncate">{c.name}</h3>
            {c.is_verified ? (
              <Badge className="text-[10px] gap-1"><CheckCircle2 className="h-3 w-3" />Aprovada</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px]">Pendente</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{c.description || "—"}</p>
          <div className="flex flex-wrap gap-2 mt-2 text-[11px] text-muted-foreground">
            {c.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{c.city}</span>}
            {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
            {c.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
            {c.website && <a href={c.website} target="_blank" rel="noopener" className="flex items-center gap-1 text-primary"><Globe className="h-3 w-3" />site</a>}
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        {!c.is_verified ? (
          <>
            <Button size="sm" className="flex-1" onClick={() => onApprove(c.id)}>
              <CheckCircle2 className="h-4 w-4 mr-1" />Aprovar
            </Button>
            <Button size="sm" variant="outline" onClick={() => onReject(c.id)}>
              <XCircle className="h-4 w-4 mr-1" />Rejeitar
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" className="w-full" onClick={() => onReject(c.id)}>
            <XCircle className="h-4 w-4 mr-1" />Suspender
          </Button>
        )}
      </div>
    </div>
  );
}
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Megaphone, MapPin, Phone, CheckCircle2, XCircle, PauseCircle, Clock } from "lucide-react";

const STATUSES = [
  { key: "pending", label: "Pendentes", icon: Clock },
  { key: "approved", label: "Aprovados", icon: CheckCircle2 },
  { key: "rejected", label: "Rejeitados", icon: XCircle },
  { key: "suspended", label: "Suspensos", icon: PauseCircle },
] as const;

export default function AdminAds() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<string>("pending");
  const [selected, setSelected] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [action, setAction] = useState<string>("approved");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-ads", tab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("advertisements")
        .select("*")
        .eq("status", tab)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const openReview = (ad: any, act: string) => {
    setSelected(ad);
    setAction(act);
    setNotes(ad.admin_notes || "");
  };

  const confirm = async () => {
    if (!selected) return;
    const { error } = await supabase.rpc("moderate_ad", {
      _id: selected.id,
      _action: action,
      _notes: notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success(`Anúncio marcado como ${action}`);
    setSelected(null);
    qc.invalidateQueries({ queryKey: ["admin-ads"] });
  };

  return (
    <div className="p-4 flex flex-col gap-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-primary" /> Moderação de anúncios
        </h1>
        <p className="text-sm text-muted-foreground">
          Aprova ou rejeita anúncios antes de aparecerem na busca pública por cidade.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-4 w-full">
          {STATUSES.map((s) => (
            <TabsTrigger key={s.key} value={s.key} className="flex items-center gap-1 text-xs">
              <s.icon className="h-3.5 w-3.5" />
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="bento-card p-8 text-center text-muted-foreground">
          <Megaphone className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="font-semibold">Sem anúncios {STATUSES.find(s => s.key === tab)?.label.toLowerCase()}.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.map((ad: any) => (
            <div key={ad.id} className="bento-card p-4 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                {ad.image_url ? (
                  <img src={ad.image_url} alt={ad.title} className="h-16 w-16 rounded-xl object-cover" />
                ) : (
                  <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Megaphone className="h-7 w-7 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold truncate">{ad.title}</h3>
                    <Badge variant="outline" className="text-[10px]">{ad.category}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{ad.description}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{ad.city || "—"}</span>
                    {ad.contact_phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{ad.contact_phone}</span>}
                    {ad.price_mzn > 0 && <span className="font-semibold text-foreground">{Number(ad.price_mzn).toLocaleString()} MZN</span>}
                  </div>
                </div>
              </div>
              {ad.admin_notes && (
                <div className="text-xs bg-muted/50 rounded-lg p-2">
                  <span className="font-semibold">Notas: </span>{ad.admin_notes}
                </div>
              )}
              <div className="flex flex-wrap gap-2 mt-1">
                {tab !== "approved" && (
                  <Button size="sm" onClick={() => openReview(ad, "approved")}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Aprovar
                  </Button>
                )}
                {tab !== "rejected" && (
                  <Button size="sm" variant="destructive" onClick={() => openReview(ad, "rejected")}>
                    <XCircle className="h-4 w-4 mr-1" /> Rejeitar
                  </Button>
                )}
                {tab === "approved" && (
                  <Button size="sm" variant="outline" onClick={() => openReview(ad, "suspended")}>
                    <PauseCircle className="h-4 w-4 mr-1" /> Suspender
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar acção: {action}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">"{selected?.title}"</p>
            <Textarea
              placeholder="Notas / motivo (opcional, visível ao anunciante)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Cancelar</Button>
            <Button onClick={confirm}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
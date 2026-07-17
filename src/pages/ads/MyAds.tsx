import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Megaphone } from "lucide-react";

const STATUS: Record<string, string> = { pending: "Pendente", approved: "Aprovado", rejected: "Rejeitado", expired: "Expirado" };

export default function MyAds() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { data } = useQuery({
    queryKey: ["my-ads", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("advertisements").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  return (
    <div className="p-4 flex flex-col gap-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black flex items-center gap-2"><Megaphone className="h-6 w-6 text-primary" />Meus anúncios</h1>
        <Button size="sm" onClick={() => nav("/ads/new")}><Plus className="h-4 w-4 mr-1" />Novo</Button>
      </div>
      {!data || data.length === 0 ? (
        <div className="bento-card p-8 text-center text-muted-foreground"><p>Ainda não publicaste anúncios.</p></div>
      ) : (
        <div className="grid gap-3">
          {data.map((a: any) => (
            <div key={a.id} className="bento-card p-4 flex items-start gap-3">
              {a.image_url && <img src={a.image_url} className="h-16 w-16 rounded-xl object-cover" />}
              <div className="flex-1">
                <div className="flex items-center justify-between"><h3 className="font-bold">{a.title}</h3>
                  <Badge variant={a.status === "approved" ? "default" : a.status === "rejected" ? "destructive" : "outline"}>{STATUS[a.status] || a.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">{a.description}</p>
                <p className="text-xs mt-1">{a.city}{a.neighborhood ? ` · ${a.neighborhood}` : ""}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
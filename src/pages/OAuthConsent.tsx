import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ShieldCheck } from "lucide-react";

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    console.log("OAuthConsent: authorizationId", authorizationId);
    (async () => {
      if (!authorizationId) {
        setError("Pedido de autorização inválido (falta authorization_id).");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await (supabase.auth as any).oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message);
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => { active = false; };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const oauth = (supabase.auth as any).oauth;
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) { setBusy(false); return setError(error.message); }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); return setError("O servidor não devolveu um redirect."); }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full"><CardContent className="p-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </CardContent></Card>
      </main>
    );
  }
  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <div>
              <h1 className="font-bold text-lg">Autorizar acesso</h1>
              <p className="text-xs text-muted-foreground">
                {details.client?.name ?? "Uma aplicação externa"} quer aceder à tua conta MedWallet.
              </p>
            </div>
          </div>
          <p className="text-sm">
            Ao aprovar, esta aplicação poderá usar as ferramentas do MedWallet em teu nome.
            Podes revogar o acesso a qualquer momento nas definições.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>
              Recusar
            </Button>
            <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aprovar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
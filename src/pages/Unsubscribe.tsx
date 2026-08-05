import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Mail, CheckCircle2, AlertCircle } from "@/components/icons/lucide-compat";

type State = "loading" | "valid" | "invalid" | "already" | "success" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>("loading");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
    fetch(`${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`, {
      headers: { apikey: anonKey },
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (data?.valid) setState("valid");
        else if (data?.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      })
      .catch(() => setState("error"));
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
    setSubmitting(false);
    if (error) setState("error");
    else if (data?.success) setState("success");
    else if (data?.reason === "already_unsubscribed") setState("already");
    else setState("error");
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Helmet>
        <title>Cancelar subscrição | MedWallet MZ</title>
        <meta name="description" content="Cancele a subscrição dos emails da MedWallet MZ." />
        <meta name="robots" content="noindex" />
      </Helmet>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            {state === "success" || state === "already" ? (
              <CheckCircle2 className="h-6 w-6 text-primary" />
            ) : state === "invalid" || state === "error" ? (
              <AlertCircle className="h-6 w-6 text-destructive" />
            ) : (
              <Mail className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <CardTitle>
            {state === "loading" && "A verificar…"}
            {state === "valid" && "Cancelar subscrição"}
            {state === "already" && "Subscrição já cancelada"}
            {state === "success" && "Subscrição cancelada"}
            {state === "invalid" && "Link inválido"}
            {state === "error" && "Ocorreu um erro"}
          </CardTitle>
          <CardDescription>
            {state === "valid" && "Deixará de receber emails da MedWallet MZ neste endereço."}
            {state === "success" && "Já não receberá mais emails neste endereço."}
            {state === "already" && "Este endereço já não recebe os nossos emails."}
            {state === "invalid" && "Este link de cancelamento é inválido ou expirou."}
            {state === "error" && "Não foi possível processar o pedido. Tente novamente."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          {state === "loading" && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          {state === "valid" && (
            <Button onClick={confirm} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar cancelamento
            </Button>
          )}
          {(state === "success" || state === "already" || state === "invalid" || state === "error") && (
            <Button variant="outline" asChild>
              <a href="/">Voltar ao início</a>
            </Button>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

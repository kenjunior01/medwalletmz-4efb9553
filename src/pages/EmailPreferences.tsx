import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Loader2, Mail, ShoppingBag, Bell } from "@/components/icons/lucide-compat";

type Prefs = { welcome: boolean; orders: boolean; alerts: boolean };
const DEFAULTS: Prefs = { welcome: true, orders: true, alerts: true };

const OPTIONS: { key: keyof Prefs; icon: typeof Mail; title: string; desc: string }[] = [
  { key: "welcome", icon: Mail, title: "Boas-vindas e novidades da conta", desc: "Mensagem inicial e informações essenciais sobre a sua conta." },
  { key: "orders", icon: ShoppingBag, title: "Pedidos e pagamentos", desc: "Confirmações de pedidos, entregas e recibos de pagamento." },
  { key: "alerts", icon: Bell, title: "Alertas e lembretes de saúde", desc: "Consultas, receitas, resultados e outros avisos importantes." },
];

export default function EmailPreferences() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth?redirect=/settings/emails");
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("email_prefs")
        .eq("id", user.id)
        .maybeSingle();
      const stored = (data as { email_prefs?: Partial<Prefs> } | null)?.email_prefs;
      setPrefs({ ...DEFAULTS, ...(stored ?? {}) });
      setLoading(false);
    })();
  }, [user, navigate]);

  const save = async (next: Prefs) => {
    if (!user) return;
    setPrefs(next);
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ email_prefs: next } as never)
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Não foi possível guardar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Preferências guardadas" });
    }
  };

  return (
    <main className="container max-w-2xl py-8 px-4">
      <Helmet>
        <title>Preferências de email | MedWallet MZ</title>
        <meta name="description" content="Escolha que emails quer receber da MedWallet MZ: boas-vindas, pedidos e alertas de saúde." />
      </Helmet>

      <h1 className="text-2xl font-bold mb-2">Preferências de email</h1>
      <p className="text-muted-foreground mb-6">
        Escolha que mensagens quer receber em {user?.email ?? "o seu email"}.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tipos de email</CardTitle>
          <CardDescription>
            Emails de segurança (recuperação de palavra-passe e confirmação de conta) são sempre enviados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            OPTIONS.map(({ key, icon: Icon, title, desc }) => (
              <div key={key} className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <Icon className="h-5 w-5 mt-0.5 text-primary shrink-0" />
                  <div>
                    <Label htmlFor={`pref-${key}`} className="text-sm font-semibold">{title}</Label>
                    <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                  </div>
                </div>
                <Switch
                  id={`pref-${key}`}
                  checked={prefs[key]}
                  disabled={saving}
                  aria-label={title}
                  onCheckedChange={(checked) => save({ ...prefs, [key]: checked })}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex gap-3">
        <Button variant="outline" onClick={() => navigate("/settings")}>Voltar às definições</Button>
        <Button
          variant="ghost"
          onClick={() => save({ welcome: false, orders: false, alerts: false })}
          disabled={loading || saving}
        >
          Desativar todos
        </Button>
      </div>
    </main>
  );
}

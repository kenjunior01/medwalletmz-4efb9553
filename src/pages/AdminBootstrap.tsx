import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Loader2, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';

/**
 * /admin/bootstrap
 *
 * Resolve o problema "não consigo entrar como admin":
 *  - Se ainda não existir NENHUM admin no sistema, qualquer utilizador
 *    autenticado pode auto-promover-se.
 *  - Depois de existir 1 admin, esta rota fica bloqueada — a promoção
 *    passa a ser feita por outro admin via SQL ou /admin/users.
 *
 * Quick fix para destrancar o painel numa instalação fresh.
 */
export default function AdminBootstrap() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" /> Bootstrap de admin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Precisas estar autenticado para usar esta página. <br/>
              Cria a tua conta em <code>/auth</code> e regressa.
            </p>
            <Button className="mt-3 w-full" onClick={() => navigate("/auth")}>
              Ir para login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const start = async () => {
    setBusy(true);
    setErr(null);
    try {
      const { data, error } = await (supabase as any).rpc("bootstrap_admin");
      if (error) throw error;
      setOk(true);
      // Após 1.5s, recarregar para o AuthContext ir buscar a role nova
      setTimeout(() => {
        window.location.href = "/admin";
      }, 1500);
    } catch (e: any) {
      setErr(e?.message ?? "Erro desconhecido");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Bootstrap de admin
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-xs flex gap-2">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <div>
              Esta página <strong>auto-promove o teu user a admin</strong> APENAS quando
              ainda não existir nenhum admin no sistema. Caso já exista, vais ver um erro abaixo.
            </div>
          </div>

          <p className="text-sm">
            Sessão actual: <strong>{user.email}</strong>
          </p>

          {err && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg p-3 text-xs">
              {err}
            </div>
          )}

          {ok ? (
            <div className="bg-primary/10 border border-primary/30 text-primary rounded-lg p-3 text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Promovido! A redirecionar para o painel admin…
            </div>
          ) : (
            <Button onClick={start} disabled={busy || !!err} className="w-full">
              {busy
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> A promover…</>
                : <>Tornar-me admin <ArrowRight className="h-4 w-4 ml-1" /></>}
            </Button>
          )}

          <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
            Voltar à app
          </Button>

          <p className="text-[10px] text-muted-foreground text-center">
            Esta rota não passa de "1 admin por sistema" para evitar auto-promoções
            abusivas em produção. Configura políticas antes de expor publicamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
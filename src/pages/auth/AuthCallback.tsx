import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Loader2 } from '@/components/icons/lucide-compat';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';

const sanitizeNextPath = (value: string | null) => {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
};

const consumePendingNextPath = () => {
  const next = sanitizeNextPath(window.localStorage.getItem('pending_auth_next'));
  window.localStorage.removeItem('pending_auth_next');
  return next;
};

/**
 * AuthCallback
 *
 * Destino do redirect OAuth (fluxo PKCE): o Supabase devolve o utilizador
 * a /auth/callback?code=... — o cliente supabase-js (detectSessionInUrl)
 * troca automaticamente o código pela sessão. Este ecrã aguarda a sessão,
 * redireciona para o destino guardado (pending_auth_next) e mostra estados
 * de erro amigáveis quando o login falha.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get('error');
    const oauthErrorDescription = params.get('error_description');

    if (oauthError) {
      const friendly: Record<string, string> = {
        access_denied: 'Cancelaste o login com o Google. Tenta novamente quando quiseres.',
        server_error: 'Ocorreu um erro no servidor do Google. Tenta novamente em alguns segundos.',
        redirect_uri_mismatch: 'Configuração de redirect incorreta. Contacta o suporte.',
        invalid_request: 'Pedido de autenticação inválido. Tenta novamente.',
        unauthorized_client: 'Cliente não autorizado. Contacta o suporte.',
      };
      setError(friendly[oauthError] ?? oauthErrorDescription ?? 'Falha no login.');
      return;
    }

    const waitForSession = async () => {
      const startedAt = Date.now();
      // O supabase-js troca ?code= pela sessão em segundo plano (detectSessionInUrl).
      let session = null as null | { user: { id: string } };
      while (Date.now() - startedAt < 8000) {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          session = data.session as unknown as { user: { id: string } };
          break;
        }
        await new Promise((r) => setTimeout(r, 300));
      }
      if (cancelled) return;

      if (session) {
        const next = consumePendingNextPath();
        toastSuccess();
        // replace evita que /auth/callback fique no histórico
        window.location.replace(next || '/');
      } else {
        logger.warn('[AuthCallback] Sessão não disponível após troca PKCE');
        setError('O login demorou demasiado. Tenta novamente ou usa e-mail/password.');
      }
    };

    const toastSuccess = () => {
      // Toast simples via evento — a app principal mostra a notificação
      window.dispatchEvent(new Event('medwallet:oauth-complete'));
    };

    waitForSession();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="h-11 w-11 text-destructive" />
          </div>
          <div>
            <h2 className="text-xl font-bold mb-2">Falha no Login Google</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={() => { window.location.href = '/auth'; }}>Tentar novamente</Button>
            <Button variant="outline" onClick={() => { window.location.href = '/'; }}>Voltar ao início</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 p-8 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div>
          <h2 className="text-lg font-bold">A finalizar login Google...</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Aguarda uns segundos enquanto configuramos a tua sessão.
          </p>
        </div>
      </div>
    </div>
  );
}

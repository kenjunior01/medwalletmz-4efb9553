import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "@/components/icons/lucide-compat";
import { Button } from "@/components/ui/button";

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
 * OAuthCallbackHandler
 *
 * Processa o regresso do login Google (OAuth directo via Supabase).
 *
 * Fluxo:
 *  1. App chama supabase.auth.signInWithOAuth({ provider: 'google' })
 *  2. Google autentica → Supabase troca o código → redirect para a app:
 *       - Fluxo implicit (hash):  https://medwalletmz.online/#access_token=...&refresh_token=...
 *       - Fluxo PKCE (query):    https://medwalletmz.online/?code=...
 *     OU com erro:
 *       https://medwalletmz.online/#error=...&error_description=...
 *
 * Este componente:
 *  - Detecta tokens no hash e aguarda o Supabase processá-los (detectSessionInUrl)
 *  - Detecta código PKCE em ?code= e aguarda a troca automática do cliente
 *  - Detecta erros no hash/query e mostra toast amigável
 *  - Limpa o URL depois de processar (segurança)
 *  - Mostra um overlay de loading enquanto processa
 *
 * Deve ser renderizado DENTRO do <BrowserRouter> mas ANTES das routes,
 * para capturar o hash antes de qualquer redirect do router.
 */
export function OAuthCallbackHandler({ children }: { children: React.ReactNode }) {
  const [oauthState, setOauthState] = useState<'idle' | 'processing' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash || '';
    const search = window.location.search || '';
    const fullPath = window.location.pathname + hash + search;

    // Helper: extrair params do hash (formato: #key=value&key2=value2)
    const parseHashParams = (hashStr: string): Record<string, string> => {
      if (!hashStr || !hashStr.startsWith('#')) return {};
      const query = hashStr.slice(1);
      const params: Record<string, string> = {};
      new URLSearchParams(query).forEach((value, key) => {
        params[key] = value;
      });
      return params;
    };

    // Helper: extrair params do search (formato: ?key=value)
    const parseSearchParams = (searchStr: string): Record<string, string> => {
      if (!searchStr || !searchStr.startsWith('?')) return {};
      const params: Record<string, string> = {};
      new URLSearchParams(searchStr).forEach((value, key) => {
        params[key] = value;
      });
      return params;
    };

    const hashParams = parseHashParams(hash);
    const queryParams = parseSearchParams(search);

    // Combina params do hash e query (hash tem precedência)
    const allParams = { ...queryParams, ...hashParams };

    const hasAccessToken = !!allParams.access_token;
    const hasError = !!allParams.error;
    const hasErrorCode = !!allParams.error_code;
    const hasErrorDescription = !!allParams.error_description;

    // ────────────────────────────────────────────────────────────────────────
    // CASO 1: Erro OAuth no URL
    //   Ex: #error=access_denied&error_description=...
    //   Ex: ?error=server_error&error_description=...
    // ────────────────────────────────────────────────────────────────────────
    if (hasError || hasErrorCode) {
      const errorCode = allParams.error || allParams.error_code || 'unknown_error';
      const errorDesc = allParams.error_description || allParams.error_message || 'Erro desconhecido no login.';

      // Mensagens amigáveis em português para erros comuns
      const friendlyMessages: Record<string, string> = {
        'access_denied': 'Cancelaste o login com o Google. Tenta novamente quando quiseres.',
        'server_error': 'Ocorreu um erro no servidor do Google. Tenta novamente em alguns segundos.',
        'redirect_uri_mismatch': 'Configuração de redirect URI incorreta. Contacta o suporte.',
        'invalid_request': 'Pedido de autenticação inválido. Tenta novamente.',
        'unauthorized_client': 'Cliente não autorizado. Contacta o suporte.',
        'unsupported_response_type': 'Tipo de resposta não suportado. Contacta o suporte.',
        'invalid_grant': 'A autorização expirou ou foi revogada. Tenta novamente.',
        'legacy_flow': 'Este fluxo não é suportado em modo preview. Abre a app num novo separador.',
      };

      const friendly = friendlyMessages[errorCode] || errorDesc;

      setOauthState('error');
      setErrorMessage(`${friendly} (código: ${errorCode})`);

      toast.error('Falha no login Google', {
        description: friendly,
        duration: 8000,
      });

      // Limpa o hash/search para evitar mostrar o erro em refreshes futuros
      try {
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      } catch (e) {
        logger.warn('[OAuthCallbackHandler] Não foi possível limpar a URL:', { error: e });
      }
      return;
    }

    // ────────────────────────────────────────────────────────────────────────
    // CASO 2: Tokens OAuth no URL (fluxo implicit)
    //   Ex: #access_token=...&refresh_token=...&expires_in=3600&token_type=bearer
    //
    // O cliente Supabase (com detectSessionInUrl: true) processa automaticamente
    // este hash e chama setSession internamente. Mas pode haver race conditions
    // com o router. Por isso:
    //   1. Mostramos overlay de loading
    //   2. Aguardamos o Supabase processar (onAuthStateChange SIGNED_IN)
    //   3. Se demorar demasiado, mostramos erro
    // ────────────────────────────────────────────────────────────────────────
    if (hasAccessToken) {
      setOauthState('processing');

      let cancelled = false;
      (async () => {
        try {
          const accessToken = allParams.access_token;
          const refreshToken = allParams.refresh_token;

          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) throw error;
          } else {
            const { data, error } = await supabase.auth.getSession();
            if (error) throw error;
            if (!data.session) throw new Error('Sessão Google não foi criada.');
          }

          if (cancelled) return;
          const next = consumePendingNextPath();
          window.history.replaceState(null, '', next);
          setOauthState('idle');
          toast.success('Login Google concluído');
          window.dispatchEvent(new Event('medwallet:oauth-complete'));
        } catch (e) {
          if (cancelled) return;
          const message = e instanceof Error ? e.message : String(e);
          setOauthState('error');
          setErrorMessage(message || 'Não foi possível finalizar o login Google.');
          toast.error('Falha no login Google', {
            description: 'Tenta novamente ou usa e-mail/password.',
            duration: 8000,
          });
          window.history.replaceState(null, '', window.location.pathname);
        }
      })();

      return () => {
        cancelled = true;
      };
    }

    // ────────────────────────────────────────────────────────────────────────
    // CASO 2b: Código PKCE em ?code= (fluxo pkce — padrão deste projecto)
    //   Ex: ?code=abc123...
    // O cliente Supabase (detectSessionInUrl: true + flowType: 'pkce') troca
    // automaticamente o código por uma sessão. Aqui apenas mostramos o overlay
    // e aguardamos a sessão ficar disponível (com timeout de segurança).
    // ────────────────────────────────────────────────────────────────────────
    if (allParams.code && !hasAccessToken && !hasError && !hasErrorCode) {
      setOauthState('processing');

      let cancelled = false;
      const deadline = Date.now() + 15000; // timeout de 15 s
      const poll = async (): Promise<void> => {
        while (!cancelled && Date.now() < deadline) {
          try {
            const { data, error } = await supabase.auth.getSession();
            if (error) throw error;
            if (data.session) {
              if (cancelled) return;
              const next = consumePendingNextPath();
              window.history.replaceState(null, '', next);
              setOauthState('idle');
              toast.success('Login Google concluído');
              window.dispatchEvent(new Event('medwallet:oauth-complete'));
              return;
            }
          } catch {
            // rede instável — continuar a tentar até ao timeout
          }
          await new Promise((r) => setTimeout(r, 400));
        }
        if (!cancelled) {
          setOauthState('error');
          setErrorMessage('Não foi possível finalizar o login Google.');
          toast.error('Falha no login Google', {
            description: 'Tenta novamente ou usa e-mail/password.',
            duration: 8000,
          });
          window.history.replaceState(null, '', window.location.pathname);
        }
      };
      void poll();

      return () => {
        cancelled = true;
      };
    }

    // ────────────────────────────────────────────────────────────────────────
    // CASO 3: URL normal sem tokens nem erros
    //   Não fazer nada — fluxo normal da app
    // ────────────────────────────────────────────────────────────────────────
  }, []);

  // ── Overlay de processamento ──────────────────────────────────────────────
  if (oauthState === 'processing') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur">
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

  // ── Overlay de erro ───────────────────────────────────────────────────────
  if (oauthState === 'error') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="h-11 w-11 text-destructive" />
          </div>
          <div>
            <h2 className="text-xl font-bold mb-2">Falha no Login Google</h2>
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={() => {
              setOauthState('idle');
              setErrorMessage(null);
              window.location.href = '/auth';
            }}>
              Tentar novamente
            </Button>
            <Button variant="outline" onClick={() => {
              setOauthState('idle');
              setErrorMessage(null);
              window.location.href = '/';
            }}>
              Voltar ao início
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render normal ─────────────────────────────────────────────────────────
  return <>{children}</>;
}

import { useEffect, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * OAuthBrokerRedirect
 *
 * Workaround para PWA: quando o service worker antigo (anterior a 2026-07-17)
 * intercepta o pedido de navegação para /~oauth/initiate e serve o index.html
 * em vez de deixar o servidor da Lovable Cloud redirecionar para o Google.
 *
 * Sintoma: user clica em "Login com Google" no PWA instalado e vê a página
 * "Esta página ainda não existe no MedWallet" em vez do redirect Google.
 *
 * Solução implementada:
 *  1. Detectar que o React Router recebeu o path /~oauth/*
 *  2. Desregistar TODOS os service workers antigos (força SW novo a instalar)
 *  3. Limpar caches antigos do Workbox
 *  4. Recarregar a página com o URL completo
 *  5. Como o SW novo tem /~oauth/ no navigateFallbackDenylist, o browser faz
 *     fetch directo ao servidor da Lovable Cloud que responde com 302 redirect
 *     para o Google → login funciona normalmente
 *
 * Rota registada em App.tsx:
 *   <Route path="/~oauth/*" element={<OAuthBrokerRedirect/>}/>
 */
export function OAuthBrokerRedirect() {
  const [status, setStatus] = useState<'cleaning' | 'reloading' | 'error'>('cleaning');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fullUrl =
      window.location.origin +
      window.location.pathname +
      window.location.search +
      window.location.hash;

    console.log("[OAuthBrokerRedirect] URL interceptada:", fullUrl);

    (async () => {
      try {
        // 1. Desregistar todos os service workers antigos
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          console.log(`[OAuthBrokerRedirect] ${registrations.length} SW(s) ativos — a desregistar...`);

          await Promise.all(
            registrations.map(async (reg) => {
              try {
                await reg.unregister();
                console.log('[OAuthBrokerRedirect] SW desregistado:', reg.scope);
              } catch (e) {
                console.warn('[OAuthBrokerRedirect] Falha ao desregistar SW:', e);
              }
            })
          );
        }

        // 2. Limpar todos os caches do Workbox/SW antigos
        if ('caches' in window) {
          const cacheKeys = await caches.keys();
          console.log(`[OAuthBrokerRedirect] ${cacheKeys.length} cache(s) — a limpar...`);

          await Promise.all(
            cacheKeys.map(async (key) => {
              try {
                await caches.delete(key);
                console.log('[OAuthBrokerRedirect] Cache removido:', key);
              } catch (e) {
                console.warn('[OAuthBrokerRedirect] Falha ao remover cache:', key, e);
              }
            })
          );
        }

        // 3. Pequeno delay para garantir que o unregister propagou
        await new Promise(r => setTimeout(r, 500));

        // 4. Reload hard do URL completo
        //    Usamos location.replace para não criar entrada no histórico.
        //    O parâmetro true (forceReload) força reload ignorando cache.
        setStatus('reloading');
        console.log('[OAuthBrokerRedirect] A fazer reload hard do URL:', fullUrl);

        // location.replace com o URL completo — o SW novo será instalado no
        // próximo carregamento e vai bypass /~oauth/ via navigateFallbackDenylist
        window.location.replace(fullUrl);

      } catch (e) {
        console.error('[OAuthBrokerRedirect] Erro ao limpar SW:', e);
        setStatus('error');
        setErrorMsg(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  // Estado: cleaning
  if (status === 'cleaning') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div>
            <h2 className="text-lg font-bold">A atualizar a app...</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Limpando versão antigas do cache para garantir que o login Google
              funcione corretamente.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Estado: reloading
  if (status === 'reloading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div>
            <h2 className="text-lg font-bold">A redirecionar para o Google...</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Se não fores redirecionado em 10 segundos, fecha a app e volta a abrir.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Estado: error
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="flex flex-col items-center gap-4 text-center max-w-md">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>
        <div>
          <h2 className="text-xl font-bold mb-2">Não foi possível atualizar a app</h2>
          <p className="text-sm text-muted-foreground">
            Ocorreu um erro ao limpar o cache antigo: {errorMsg}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Tenta desinstalar e reinstalar a app, ou usa o login por e-mail/password.
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full">
          <Button onClick={() => {
            window.location.href = '/auth';
          }}>
            Ir para login
          </Button>
          <Button variant="outline" onClick={() => {
            window.location.href = '/';
          }}>
            Voltar ao início
          </Button>
        </div>
      </div>
    </div>
  );
}

export default OAuthBrokerRedirect;

import { supabase } from '@/integrations/supabase/client';
import { logError, logInfo, logWarn, newRequestId } from '@/lib/logger';

/**
 * Garante uma sessão válida antes de chamadas autenticadas.
 * Faz refresh automático quando o token expira em menos de 60s.
 */
export async function ensureFreshSession(requestId = newRequestId('sess')) {
  const { data, error } = await supabase.auth.getSession();
  if (error) logError('auth', 'getSession falhou', error, requestId);

  const session = data?.session ?? null;
  if (!session) {
    logWarn('auth', 'Sem sessão activa', null, requestId);
    return { session: null, requestId };
  }

  const expiresAt = (session.expires_at ?? 0) * 1000;
  if (expiresAt && expiresAt - Date.now() < 60_000) {
    logInfo('auth', 'Token quase expirado — a renovar', { expiresAt }, requestId);
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshed.session) {
      logError('auth', 'Refresh de sessão falhou', refreshError, requestId);
      return { session: null, requestId };
    }
    return { session: refreshed.session, requestId };
  }

  return { session, requestId };
}

function isAuthError(error: unknown): boolean {
  const e = error as { status?: number; statusCode?: number | string; message?: string } | null;
  if (!e) return false;
  const status = Number(e.status ?? e.statusCode ?? 0);
  const msg = (e.message || '').toLowerCase();
  return (
    status === 401 ||
    msg.includes('jwt expired') ||
    msg.includes('invalid jwt') ||
    msg.includes('not authenticated') ||
    msg.includes('unauthorized')
  );
}

/**
 * Executa uma operação autenticada. Em caso de 401/JWT expirado tenta
 * um refresh e repete uma vez; se falhar, redirecciona para /auth com `next`.
 */
export async function withAuthRetry<T>(
  scope: string,
  fn: (requestId: string) => Promise<T>,
  options?: { redirectOnFail?: boolean },
): Promise<T> {
  const requestId = newRequestId(scope);
  try {
    await ensureFreshSession(requestId);
    return await fn(requestId);
  } catch (error) {
    if (!isAuthError(error)) {
      logError(scope, 'Falha na operação', error, requestId);
      throw error;
    }
    logWarn(scope, '401 — a tentar renovar sessão', error, requestId);
    const { data, error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError && data.session) {
      logInfo(scope, 'Sessão renovada — a repetir operação', null, requestId);
      return await fn(requestId);
    }
    logError(scope, 'Sessão inválida — redireccionar para login', refreshError, requestId);
    if (options?.redirectOnFail !== false && typeof window !== 'undefined') {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/auth?next=${next}`;
    }
    throw error;
  }
}
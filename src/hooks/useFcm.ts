/**
 * useFcm — Hook React para Firebase Cloud Messaging
 *
 * Encapsula o FcmService singleton para uso em componentes React.
 * Automatiza a inicialização quando o utilizador está autenticado,
 * gere o refresh do token e expõe o estado das notificações.
 *
 * Uso:
 *   const { permissionGranted, token, messages } = useFcm();
 *
 * Nota: Firebase é usado EXCLUSIVAMENTE para push notifications.
 * O restante (auth, bd) usa Supabase.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fcmService } from '@/services/fcm/FcmService';
import { useAuth } from '@/contexts/AuthContext';
import type { FcmMessage, FcmServiceState } from '@/services/fcm/FcmService';

/** Estado retornado pelo hook useFcm */
interface UseFcmReturn {
  /** Estado completo do serviço FCM */
  state: FcmServiceState;
  /** Se a permissão de notificação foi concedida */
  permissionGranted: boolean;
  /** Token FCM actual (null se não disponível) */
  token: string | null;
  /** Se o serviço já foi inicializado */
  initialized: boolean;
  /** Plataforma detectada */
  platform: FcmServiceState['platform'];
  /** Lista de mensagens FCM recebidas durante a sessão */
  messages: FcmMessage[];
  /** Se está a carregar/inicializar */
  loading: boolean;
  /** Limpar histórico de mensagens recebidas */
  clearMessages: () => void;
  /** Pedir permissão e inicializar manualmente (caso init automático falhe) */
  requestPermission: () => Promise<void>;
}

/**
 * Hook React que gere o ciclo de vida do FCM.
 *
 * - Inicializa automaticamente quando o utilizador está autenticado
 * - Escuta mensagens FCM recebidas e actualiza o estado
 * - Gere o refresh do token quando necessário
 * - Faz cleanup ao desmontar ou ao fazer logout
 */
export function useFcm(): UseFcmReturn {
  const { user } = useAuth();

  // Estado local
  const [state, setState] = useState<FcmServiceState>(fcmService.getState());
  const [messages, setMessages] = useState<FcmMessage[]>([]);
  const [loading, setLoading] = useState(false);

  // Ref para evitar race conditions no init
  const initInProgressRef = useRef(false);
  const userIdRef = useRef<string | null>(null);

  // -----------------------------------------------------------------------
  // Polling do estado do serviço (para sincronizar com actualizações internas)
  // -----------------------------------------------------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      const newState = fcmService.getState();
      setState(prev => {
        if (
          prev.initialized !== newState.initialized ||
          prev.permissionGranted !== newState.permissionGranted ||
          prev.currentToken !== newState.currentToken
        ) {
          return newState;
        }
        return prev;
      });
    }, 2_000);

    return () => clearInterval(interval);
  }, []);

  // -----------------------------------------------------------------------
  // Inicialização automática quando o utilizador está autenticado
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!user?.id) {
      // Utilizador não autenticado — destruir serviço
      fcmService.destroy();
      userIdRef.current = null;
      setState(fcmService.getState());
      return;
    }

    // Evitar re-inicialização para o mesmo utilizador
    if (userIdRef.current === user.id && fcmService.getState().initialized) {
      return;
    }

    userIdRef.current = user.id;
    setLoading(true);

    const initFcm = async () => {
      if (initInProgressRef.current) return;
      initInProgressRef.current = true;

      try {
        await fcmService.init(user.id);
        setState(fcmService.getState());
      } catch (err) {
        console.warn('[useFcm] Erro ao inicializar FCM:', err);
      } finally {
        initInProgressRef.current = false;
        setLoading(false);
      }
    };

    initFcm();
  }, [user?.id]);

  // -----------------------------------------------------------------------
  // Escutar mensagens FCM
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!user?.id || !fcmService.getState().initialized) return;

    const unsubscribe = fcmService.onMessage((message: FcmMessage) => {
      setMessages(prev => [message, ...prev].slice(0, 50)); // Manter últimos 50
      // Actualizar estado do serviço após receber mensagem
      setState(fcmService.getState());
    });

    return unsubscribe;
  }, [user?.id, fcmService.getState().initialized]);

  // -----------------------------------------------------------------------
  // Cleanup ao desmontar
  // -----------------------------------------------------------------------
  useEffect(() => {
    return () => {
      fcmService.destroy();
    };
  }, []);

  // -----------------------------------------------------------------------
  // Ações
  // -----------------------------------------------------------------------

  /** Limpar histórico de mensagens recebidas */
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  /** Pedir permissão e inicializar manualmente */
  const requestPermission = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Destruir e recriar para forçar novo pedido de permissão
      fcmService.destroy();
      await fcmService.init(user.id);
      setState(fcmService.getState());
    } catch (err) {
      console.warn('[useFcm] Erro ao pedir permissão:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  return {
    state,
    permissionGranted: state.permissionGranted,
    token: state.currentToken,
    initialized: state.initialized,
    platform: state.platform,
    messages,
    loading,
    clearMessages,
    requestPermission,
  };
}

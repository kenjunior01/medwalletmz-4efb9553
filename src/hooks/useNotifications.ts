import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Notificações em tempo real para o utilizador autenticado.
 * Usa a API Notification do browser + Supabase Realtime.
 * Não requer VAPID — funciona enquanto o PWA está aberto/instalado em foreground/background recente.
 */
export function useNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const request = async () => {
    if (typeof Notification === 'undefined') return 'denied' as NotificationPermission;
    const p = await Notification.requestPermission();
    setPermission(p);
    if (p === 'granted' && user) {
      // Regista um registo "marcador" — futuramente pode receber VAPID/endpoint real.
      await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: `local:${user.id}:${navigator.userAgent.slice(0, 40)}`,
        p256dh: 'local',
        auth: 'local',
        user_agent: navigator.userAgent,
      }, { onConflict: 'endpoint' });
    }
    return p;
  };

  const notify = (title: string, body: string, url?: string) => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    try {
      const n = new Notification(title, { body, icon: '/icon.svg', badge: '/icon.svg', tag: title });
      if (url) n.onclick = () => { window.focus(); window.location.href = url; };
    } catch {}
  };

  useEffect(() => {
    if (!user || permission !== 'granted') return;

    const channels = [
      supabase
        .channel(`notif-consult-${user.id}`)
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'consultations', filter: `patient_id=eq.${user.id}` },
          (p: any) => {
            const n = p.new;
            if (n.status === 'confirmed') notify('Consulta confirmada', `O médico aceitou a tua consulta.`, `/health/consultation/${n.id}`);
            else if (n.status === 'in_progress') notify('Consulta iniciada', `O médico está disponível agora.`, `/health/consultation/${n.id}`);
          })
        .subscribe(),
      supabase
        .channel(`notif-orders-${user.id}`)
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'orders', filter: `customer_id=eq.${user.id}` },
          (p: any) => {
            const n = p.new;
            if (n.status === 'out_for_delivery') notify('A caminho!', 'O teu pedido saiu para entrega.', `/order/${n.id}`);
            else if (n.status === 'delivered') notify('Entregue', 'Pedido entregue. Bom apetite!', `/order/${n.id}`);
          })
        .subscribe(),
      supabase
        .channel(`notif-rx-${user.id}`)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'prescriptions', filter: `patient_id=eq.${user.id}` },
          (p: any) => {
            notify('Nova receita', 'O médico emitiu uma receita para ti.', `/health/prescription/${p.new.id}`);
          })
        .subscribe(),
      supabase
        .channel(`notif-reminders-${user.id}`)
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'consultation_reminders', filter: `patient_id=eq.${user.id}` },
          (p: any) => {
            const n = p.new;
            if (n.sent_at && !p.old?.sent_at) {
              const when = new Date(n.scheduled_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
              notify('Consulta em 1 hora', `Lembrete: tens consulta às ${when}.`, `/health/consultation/${n.consultation_id}`);
            }
          })
        .subscribe(),
    ];

    return () => { channels.forEach(c => supabase.removeChannel(c)); };
  }, [user, permission]);

  return { permission, request, notify };
}
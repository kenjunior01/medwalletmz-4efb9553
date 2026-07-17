import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';

/**
 * Notificações em tempo real para o utilizador autenticado.
 * Usa a API Notification do browser + Supabase Realtime.
 * Não requer VAPID — funciona enquanto o PWA está aberto/instalado em foreground/background recente.
 */
export function useNotifications() {
  const { user } = useAuth();
  const { settings } = usePlatformSettings();
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

  const inQuietHours = () => {
    const start = Number(settings.notify_quiet_hours_start ?? 22);
    const end = Number(settings.notify_quiet_hours_end ?? 7);
    const h = new Date().getHours();
    return start === end ? false : start < end ? h >= start && h < end : h >= start || h < end;
  };

  const todayKey = () => `notif-count-${new Date().toISOString().slice(0, 10)}`;
  const underDailyCap = () => {
    const cap = Number(settings.notify_max_per_day ?? 20);
    const c = parseInt(localStorage.getItem(todayKey()) || '0', 10);
    return c < cap;
  };
  const bumpCounter = () => {
    const k = todayKey();
    localStorage.setItem(k, String(parseInt(localStorage.getItem(k) || '0', 10) + 1));
  };

  const notify = async (title: string, body: string, url?: string, typeKey?: string) => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    if (typeKey && (settings as any)[typeKey] === false) return;
    if (inQuietHours()) return;
    if (!underDailyCap()) return;
    try {
      const opts: NotificationOptions = { body, icon: '/icon-512.png', badge: '/icon.svg', tag: title, data: { url } };
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) { await reg.showNotification(title, opts); bumpCounter(); return; }
      }
      const n = new Notification(title, opts);
      if (url) n.onclick = () => { window.focus(); window.location.href = url; };
      bumpCounter();
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
            if (n.status === 'confirmed') notify('Consulta confirmada', `O médico aceitou a tua consulta.`, `/health/consultation/${n.id}`, 'notify_consultation_status');
            else if (n.status === 'in_progress') notify('Consulta iniciada', `O médico está disponível agora.`, `/health/consultation/${n.id}`, 'notify_consultation_status');
          })
        .subscribe(),
      supabase
        .channel(`notif-orders-${user.id}`)
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'orders', filter: `customer_id=eq.${user.id}` },
          (p: any) => {
            const n = p.new;
            if (n.status === 'out_for_delivery' || n.status === 'in_transit') notify('A caminho!', 'O teu pedido está em trânsito.', `/order/${n.id}`, 'notify_order_in_transit');
            else if (n.status === 'delivered') notify('Entregue', 'O teu pedido foi entregue.', `/order/${n.id}`, 'notify_order_delivered');
          })
        .subscribe(),
      supabase
        .channel(`notif-rx-${user.id}`)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'prescriptions', filter: `patient_id=eq.${user.id}` },
          (p: any) => {
            notify('Nova receita', 'O médico emitiu uma receita para ti.', `/health/prescription/${p.new.id}`, 'notify_new_prescription');
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
              notify('Consulta em 1 hora', `Lembrete: tens consulta às ${when}.`, `/health/consultation/${n.consultation_id}`, 'notify_reminders');
            }
          })
        .subscribe(),
    ];

    return () => { channels.forEach(c => supabase.removeChannel(c)); };
  }, [user, permission]);

  return { permission, request, notify };
}
import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { useCountry } from '@/contexts/CountryContext';
import { notificationService } from '@/services/notifications';
import { NotificationTemplates, resolveTemplate } from '@/services/notifications/NotificationTemplates';
import type {
  NotificationPayload,
  NotificationPermissionStatus,
  NotificationTemplate,
} from '@/services/notifications';

// ---------------------------------------------------------------------------
// Quiet-hours & daily-cap helpers (from original hook)
// ---------------------------------------------------------------------------

function useNotificationGuard() {
  const { settings } = usePlatformSettings();

  const inQuietHours = (): boolean => {
    const start = Number(settings.notify_quiet_hours_start ?? 22);
    const end = Number(settings.notify_quiet_hours_end ?? 7);
    const h = new Date().getHours();
    return start === end ? false : start < end ? h >= start && h < end : h >= start || h < end;
  };

  const todayKey = () => `notif-count-${new Date().toISOString().slice(0, 10)}`;

  const underDailyCap = (): boolean => {
    const cap = Number(settings.notify_max_per_day ?? 20);
    const c = parseInt(localStorage.getItem(todayKey()) || '0', 10);
    return c < cap;
  };

  const bumpCounter = () => {
    const k = todayKey();
    localStorage.setItem(k, String(parseInt(localStorage.getItem(k) || '0', 10) + 1));
  };

  const isNotificationTypeEnabled = (typeKey?: string): boolean => {
    if (!typeKey) return true;
    return (settings as any)[typeKey] !== false;
  };

  const canDeliver = (typeKey?: string): boolean => {
    return !inQuietHours() && underDailyCap() && isNotificationTypeEnabled(typeKey);
  };

  return { canDeliver, bumpCounter };
}

// ---------------------------------------------------------------------------
// Main hook
// ---------------------------------------------------------------------------

/**
 * useNotifications — comprehensive notification hook.
 *
 * Wraps the singleton NotificationService with React state management,
 * Supabase realtime subscriptions, i18n resolution, and quiet-hours/cap guards.
 *
 * Backward compatible: exposes `permission` and `request` (renamed from
 * `requestPermission` for legacy consumers).
 */
export function useNotifications() {
  const { user } = useAuth();
  const { country, t } = useCountry();
  const { canDeliver, bumpCounter } = useNotificationGuard();

  // ---- Permission state ----
  const [permission, setPermission] = useState<NotificationPermissionStatus>(
    notificationService.getPermissionStatus()
  );

  // ---- Initialize the service once on mount ----
  useEffect(() => {
    notificationService.initialize().then(() => {
      setPermission(notificationService.getPermissionStatus());
    });
  }, []);

  // ---- Register notification tap handler → deep-link navigation ----
  useEffect(() => {
    const unsubscribe = notificationService.onNotificationTap((payload) => {
      notificationService.handleNotificationTap(payload);
    });
    return unsubscribe;
  }, []);

  // ---- Request permission ----
  const requestPermission = useCallback(async (): Promise<NotificationPermissionStatus> => {
    const granted = await notificationService.requestPermission();
    const status = notificationService.getPermissionStatus();
    setPermission(status);

    // Register push token with Supabase for native
    if (granted && user) {
      if (typeof navigator !== 'undefined') {
        await supabase.from('push_subscriptions').upsert(
          {
            user_id: user.id,
            endpoint: `local:${user.id}:${navigator.userAgent.slice(0, 40)}`,
            p256dh: 'local',
            auth: 'local',
            user_agent: navigator.userAgent,
          },
          { onConflict: 'endpoint' }
        );
      }
    }

    return status;
  }, [user]);

  // Backward-compatible alias
  const request = requestPermission;

  // ---- Show a local notification (with guard) ----
  const showNotification = useCallback(
    async (payload: NotificationPayload, typeKey?: string): Promise<void> => {
      if (!canDeliver(typeKey)) return;
      await notificationService.showLocal(payload);
      bumpCounter();
    },
    [canDeliver, bumpCounter]
  );

  // ---- Show from a template (resolves i18n) ----
  const showFromTemplate = useCallback(
    async (template: NotificationTemplate, typeKey?: string): Promise<void> => {
      if (!canDeliver(typeKey)) return;
      const resolved = resolveTemplate(template, t);
      await notificationService.showLocal({
        category: resolved.category,
        title: resolved.title,
        body: resolved.body,
        deepLink: resolved.deepLink,
        icon: resolved.icon,
        data: resolved.data,
      });
      bumpCounter();
    },
    [canDeliver, bumpCounter, t]
  );

  // ---- Schedule appointment reminder ----
  const scheduleAppointmentReminder = useCallback(
    async (date: Date, doctorName: string, consultationId: string): Promise<void> => {
      if (!canDeliver()) return;
      const template = NotificationTemplates.appointmentReminder(
        date.toLocaleTimeString(country?.default_locale || 'pt', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        doctorName,
        consultationId
      );
      const resolved = resolveTemplate(template, t);
      await notificationService.schedule(
        {
          category: resolved.category,
          title: resolved.title,
          body: resolved.body,
          deepLink: resolved.deepLink,
          icon: resolved.icon,
          data: resolved.data,
        },
        date
      );
      bumpCounter();
    },
    [canDeliver, bumpCounter, t, country]
  );

  // ---- Clear badge ----
  const clearBadge = useCallback(async () => {
    await notificationService.clearBadge();
  }, []);

  // ---- Supabase Realtime subscriptions (preserved from original hook) ----
  useEffect(() => {
    if (!user || permission !== 'granted') return;

    const notify = (titleKey: string, bodyKey: string, url: string, typeKey?: string) => {
      if (!canDeliver(typeKey)) return;
      const title = t(titleKey);
      const body = t(bodyKey);
      notificationService.showLocal({
        category: 'system',
        title,
        body,
        deepLink: url,
        icon: '/icon-512.png',
      });
      bumpCounter();
    };

    const channels = [
      supabase
        .channel(`notif-consult-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'consultations', filter: `patient_id=eq.${user.id}` },
          (p: any) => {
            const n = p.new;
            if (n.status === 'confirmed') {
              notify('notifications.consultation_confirmed.title', 'notifications.consultation_confirmed.body', `/health/consultation/${n.id}`, 'notify_consultation_status');
            } else if (n.status === 'in_progress') {
              notify('notifications.consultation_started.title', 'notifications.consultation_started.body', `/health/consultation/${n.id}`, 'notify_consultation_status');
            }
          }
        )
        .subscribe(),
      supabase
        .channel(`notif-orders-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'orders', filter: `customer_id=eq.${user.id}` },
          (p: any) => {
            const n = p.new;
            if (n.status === 'out_for_delivery' || n.status === 'in_transit') {
              notify('notifications.order_update.in_transit.title', 'notifications.order_update.in_transit.body', `/order/${n.id}`, 'notify_order_in_transit');
            } else if (n.status === 'delivered') {
              notify('notifications.order_delivered.title', 'notifications.order_delivered.body', `/order/${n.id}`, 'notify_order_delivered');
            }
          }
        )
        .subscribe(),
      supabase
        .channel(`notif-rx-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'prescriptions', filter: `patient_id=eq.${user.id}` },
          (p: any) => {
            notify('notifications.prescription_ready.title', 'notifications.prescription_ready.body', `/health/prescription/${p.new.id}`, 'notify_new_prescription');
          }
        )
        .subscribe(),
      supabase
        .channel(`notif-reminders-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'consultation_reminders', filter: `patient_id=eq.${user.id}` },
          (p: any) => {
            const n = p.new;
            if (n.sent_at && !p.old?.sent_at) {
              const when = new Date(n.scheduled_at).toLocaleTimeString(country?.default_locale || 'pt', {
                hour: '2-digit',
                minute: '2-digit',
              });
              notify(
                'notifications.appointment_reminder.title',
                'notifications.appointment_reminder.body',
                `/health/consultation/${n.consultation_id}`,
                'notify_reminders'
              );
            }
          }
        )
        .subscribe(),
    ];

    return () => {
      channels.forEach((c) => supabase.removeChannel(c));
    };
  }, [user, permission, canDeliver, bumpCounter, t, country]);

  return useMemo(
    () => ({
      // Legacy API (backward compatible with EnableNotificationsBanner)
      permission,
      request,
      // New API
      requestPermission,
      showNotification,
      showFromTemplate,
      scheduleAppointmentReminder,
      clearBadge,
      // Access to the raw service for advanced usage
      service: notificationService,
    }),
    [permission, request, requestPermission, showNotification, showFromTemplate, scheduleAppointmentReminder, clearBadge]
  );
}

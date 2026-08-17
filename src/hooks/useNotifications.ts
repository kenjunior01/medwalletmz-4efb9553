import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { useCountry } from '@/contexts/CountryContext';
import { notificationService } from '@/services/notifications';
import { NotificationTemplates, resolveTemplate } from '@/services/notifications/NotificationTemplates';
import { fcmService } from '@/services/fcm/FcmService';
import { logger } from '@/lib/logger';
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

  // ---- Initialize FCM for push notifications (native + web) ----
  const fcmInitializedRef = useRef(false);
  useEffect(() => {
    if (!user || permission !== 'granted' || fcmInitializedRef.current) return;
    fcmInitializedRef.current = true;
    fcmService.init(user.id).then(() => {
      logger.info('[useNotifications] FCM initialized for user');
    }).catch(() => {
      // FCM is best-effort — don't break the app if it fails
      logger.info('[useNotifications] FCM not available (no Firebase config)');
    });
    // Cleanup FCM on unmount
    return () => { fcmService.destroy(); fcmInitializedRef.current = false; };
  }, [user, permission]);

  // ---- Offline catchup: fetch automated notifications sent while app was closed ----
  // This bridges the gap when realtime was disconnected (app backgrounded/closed)
  const catchupRef = useRef(false);
  useEffect(() => {
    if (!user || permission !== 'granted' || catchupRef.current) return;
    catchupRef.current = true;

    const lastSeenKey = `automated-notif-last-seen`;
    const lastSeen = localStorage.getItem(lastSeenKey) || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    (async () => {
      const { data: recent } = await supabase
        .from('automated_notifications')
        .select('id, title, body, metadata, sent_at')
        .eq('user_id', user.id)
        .eq('status', 'sent')
        .gt('sent_at', lastSeen)
        .order('sent_at', { ascending: false })
        .limit(5);

      if (!recent || recent.length === 0) return;

      // Only show the most recent one to avoid spam on app open
      const notif = recent[0];
      if (canDeliver('notify_daily_health')) {
        await notificationService.showLocal({
          category: 'health_tip',
          title: notif.title || 'MedWallet',
          body: notif.body || '',
          deepLink: notif.metadata?.action_url || '/notifications',
          icon: '/icon-512.png',
          data: { notification_id: notif.id, content_type: notif.metadata?.content_type },
        });
        bumpCounter();
      }

      // Update last-seen timestamp
      localStorage.setItem(lastSeenKey, new Date().toISOString());
    })();
  }, [user, permission]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Keep last-seen timestamp updated when realtime fires ----
  useEffect(() => {
    if (!user) return;
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        localStorage.setItem(`automated-notif-last-seen`, new Date().toISOString());
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [user]);

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
      // ---- Automated notifications (daily health tips, check-ins from cron) ----
      supabase
        .channel(`notif-automated-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'automated_notifications', filter: `user_id=eq.${user.id}` },
          (p: any) => {
            const n = p.new;
            // Only show when status changes to 'sent' and wasn't already seen
            if (n.status === 'sent' && p.old?.status !== 'sent') {
              const contentType = n.metadata?.content_type || 'health_tip';
              const deepLink = n.metadata?.action_url || '/notifications';
              notificationService.showLocal({
                category: 'health_tip',
                title: n.title || 'MedWallet',
                body: n.body || '',
                deepLink,
                icon: '/icon-512.png',
                data: { notification_id: n.id, content_type: contentType },
              });
              bumpCounter();
              // Update last-seen so catchup doesn't re-show this notification
              localStorage.setItem(`automated-notif-last-seen`, new Date().toISOString());
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

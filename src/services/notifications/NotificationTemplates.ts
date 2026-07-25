// ========================================================================
// Notification Templates — Pre-built notification payloads with i18n keys
// All user-facing strings use i18n keys resolved via useCountry().t()
// ========================================================================

import type { NotificationCategory } from './NotificationService';

// ---------------------------------------------------------------------------
// Template helper type
// ---------------------------------------------------------------------------

export interface NotificationTemplate {
  /** Semantic category */
  category: NotificationCategory;
  /** i18n key for the notification title */
  titleKey: string;
  /** i18n key for the notification body */
  bodyKey: string;
  /** Parameters to interpolate into the i18n strings */
  params: Record<string, string>;
  /** In-app deep-link destination */
  deepLink: string;
  /** Icon asset path */
  icon?: string;
}

// ---------------------------------------------------------------------------
// Template factory functions
// ---------------------------------------------------------------------------

export const NotificationTemplates = {
  // ---- Health / Consultation ----

  /** New message from a doctor in an active consultation */
  newMessage: (doctorName: string, consultationId: string): NotificationTemplate => ({
    category: 'message',
    titleKey: 'notifications.new_message.title',
    bodyKey: 'notifications.new_message.body',
    params: { doctorName },
    deepLink: `/health/consultation/${consultationId}`,
    icon: '/icon-512.png',
  }),

  /** Appointment reminder — 1 hour before consultation */
  appointmentReminder: (time: string, doctorName: string, consultationId: string): NotificationTemplate => ({
    category: 'appointment',
    titleKey: 'notifications.appointment_reminder.title',
    bodyKey: 'notifications.appointment_reminder.body',
    params: { time, doctorName },
    deepLink: `/health/consultation/${consultationId}`,
    icon: '/icon-512.png',
  }),

  /** Consultation confirmed by the doctor */
  consultationConfirmed: (doctorName: string, consultationId: string): NotificationTemplate => ({
    category: 'appointment',
    titleKey: 'notifications.consultation_confirmed.title',
    bodyKey: 'notifications.consultation_confirmed.body',
    params: { doctorName },
    deepLink: `/health/consultation/${consultationId}`,
    icon: '/icon-512.png',
  }),

  /** Consultation started — doctor is online */
  consultationStarted: (doctorName: string, consultationId: string): NotificationTemplate => ({
    category: 'appointment',
    titleKey: 'notifications.consultation_started.title',
    bodyKey: 'notifications.consultation_started.body',
    params: { doctorName },
    deepLink: `/health/consultation/${consultationId}`,
    icon: '/icon-512.png',
  }),

  // ---- Prescriptions ----

  /** New prescription issued by the doctor */
  prescriptionReady: (prescriptionId: string, doctorName: string): NotificationTemplate => ({
    category: 'prescription',
    titleKey: 'notifications.prescription_ready.title',
    bodyKey: 'notifications.prescription_ready.body',
    params: { doctorName },
    deepLink: `/health/prescription/${prescriptionId}`,
    icon: '/icon-512.png',
  }),

  // ---- Orders ----

  /** Order status update (e.g. in_transit, out_for_delivery, delivered) */
  orderUpdate: (orderId: string, status: string): NotificationTemplate => ({
    category: 'order',
    titleKey: `notifications.order_update.${status}.title`,
    bodyKey: `notifications.order_update.${status}.body`,
    params: { orderId, status },
    deepLink: `/orders`,
    icon: '/icon-512.png',
  }),

  /** Order delivered */
  orderDelivered: (orderId: string): NotificationTemplate => ({
    category: 'order',
    titleKey: 'notifications.order_delivered.title',
    bodyKey: 'notifications.order_delivered.body',
    params: {},
    deepLink: `/orders`,
    icon: '/icon-512.png',
  }),

  // ---- Wallet ----

  /** Wallet deposit received */
  walletDeposit: (amount: string, currency: string): NotificationTemplate => ({
    category: 'wallet',
    titleKey: 'notifications.wallet_deposit.title',
    bodyKey: 'notifications.wallet_deposit.body',
    params: { amount, currency },
    deepLink: '/wallet',
    icon: '/icon-512.png',
  }),

  /** Wallet withdrawal processed */
  walletWithdrawal: (amount: string, currency: string): NotificationTemplate => ({
    category: 'wallet',
    titleKey: 'notifications.wallet_withdrawal.title',
    bodyKey: 'notifications.wallet_withdrawal.body',
    params: { amount, currency },
    deepLink: '/wallet',
    icon: '/icon-512.png',
  }),

  // ---- Insurance ----

  /** Insurance plan expiring soon */
  insuranceExpiry: (daysLeft: number, planName: string): NotificationTemplate => ({
    category: 'insurance',
    titleKey: 'notifications.insurance_expiry.title',
    bodyKey: 'notifications.insurance_expiry.body',
    params: { daysLeft: String(daysLeft), planName },
    deepLink: '/insurance',
    icon: '/icon-512.png',
  }),

  // ---- Health Tips ----

  /** Daily health tip / reminder (e.g. medication, blood pressure) */
  healthTip: (tipType: string): NotificationTemplate => ({
    category: 'health_tip',
    titleKey: `notifications.health_tip.${tipType}.title`,
    bodyKey: `notifications.health_tip.${tipType}.body`,
    params: {},
    deepLink: '/health',
    icon: '/icon-512.png',
  }),

  // ---- Marketing ----

  /** Promotional notification */
  promotion: (promoTitle: string, promoId: string): NotificationTemplate => ({
    category: 'marketing',
    titleKey: 'notifications.promotion.title',
    bodyKey: 'notifications.promotion.body',
    params: { promoTitle },
    deepLink: `/subscribe`,
    icon: '/icon-512.png',
  }),

  // ---- System ----

  /** General system notification */
  systemAlert: (messageKey: string): NotificationTemplate => ({
    category: 'system',
    titleKey: 'notifications.system_alert.title',
    bodyKey: `notifications.system_alert.${messageKey}`,
    params: {},
    deepLink: '/',
    icon: '/icon-512.png',
  }),
};

// ---------------------------------------------------------------------------
// Convenience: resolve a template into a display-ready payload
// Call this inside React components where t() is available
// ---------------------------------------------------------------------------

export interface ResolvedNotificationPayload {
  category: NotificationCategory;
  title: string;
  body: string;
  deepLink: string;
  icon?: string;
  data?: Record<string, any>;
}

/**
 * Resolve i18n keys in a NotificationTemplate into plain strings.
 * Must be called inside a React component where useCountry().t is available.
 */
export function resolveTemplate(
  template: NotificationTemplate,
  t: (key: string, params?: Record<string, string>) => string
): ResolvedNotificationPayload {
  return {
    category: template.category,
    title: t(template.titleKey, template.params),
    body: t(template.bodyKey, template.params),
    deepLink: template.deepLink,
    icon: template.icon,
    data: {
      templateTitleKey: template.titleKey,
      templateBodyKey: template.bodyKey,
      ...template.params,
    },
  };
}

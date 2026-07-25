// ========================================================================
// Notification Service — Barrel Export
// ========================================================================

export {
  notificationService,
} from './NotificationService';

export type {
  NotificationCategory,
  NotificationPayload,
  NotificationPermissionStatus,
  NotificationTapHandler,
} from './NotificationService';

export {
  NotificationTemplates,
  resolveTemplate,
} from './NotificationTemplates';

export type {
  NotificationTemplate,
  ResolvedNotificationPayload,
} from './NotificationTemplates';

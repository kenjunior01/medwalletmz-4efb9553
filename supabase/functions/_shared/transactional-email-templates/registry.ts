import type * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  to?: string
}

import { template as welcome } from './welcome.tsx'
import { template as orderConfirmation } from './order-confirmation.tsx'
import { template as notification } from './notification.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'welcome': welcome,
  'order-confirmation': orderConfirmation,
  'notification': notification,
}

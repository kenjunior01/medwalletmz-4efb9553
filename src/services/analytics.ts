/**
 * MedWallet Analytics Service — Event tracking abstraction
 *
 * Supports PostHog as the primary analytics backend with a no-op fallback
 * when VITE_POSTHOG_KEY is not configured.
 *
 * Usage:
 *   import { trackEvent, identifyUser, setPersonProperties } from '@/services/analytics';
 *   trackEvent('page_view', { page: 'home', country: 'MZ' });
 *   identifyUser('user-id');
 */

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';

let posthogInstance: any = null;
let isInitialized = false;

/**
 * Lazily initializes PostHog only once.
 * Returns null if the key is not configured (graceful no-op mode).
 */
async function getPostHog(): Promise<any> {
  if (isInitialized) return posthogInstance;

  if (!POSTHOG_KEY || POSTHOG_KEY.includes('your_')) {
    console.info('[Analytics] PostHog key not configured — analytics disabled');
    isInitialized = true;
    return null;
  }

  try {
    const { default: posthog } = await import('posthog-js');
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      // Disable in development unless explicitly enabled
      loaded: (ph: any) => {
        if (import.meta.env.DEV) {
          ph.opt_out_capturing();
        }
      },
      capture_pageview: false, // We handle page views manually
      persistence: 'localStorage+cookie',
      // Respect privacy regulations across African markets
      respect_dnt: true,
      property_denylist: ['$session_id', '$device_id'],
    });
    posthogInstance = posthog;
    isInitialized = true;
    console.info('[Analytics] PostHog initialized successfully');
    return posthog;
  } catch (err) {
    console.warn('[Analytics] Failed to load PostHog, analytics disabled:', err);
    isInitialized = true;
    return null;
  }
}

/**
 * Track a custom event.
 *
 * @param event — Event name (e.g., 'consultation_booked', 'payment_completed')
 * @param properties — Event properties (flat object, no nested structures)
 */
export async function trackEvent(event: string, properties?: Record<string, any>) {
  try {
    const ph = await getPostHog();
    if (!ph) return;
    ph.capture(event, properties);
  } catch (err) {
    console.warn(`[Analytics] Failed to track "${event}":`, err);
  }
}

/**
 * Identify a user with a unique ID and optional properties.
 *
 * @param userId — Unique user identifier
 * @param properties — User properties (name, email, country, role, etc.)
 */
export async function identifyUser(userId: string, properties?: Record<string, any>) {
  try {
    const ph = await getPostHog();
    if (!ph) return;
    ph.identify(userId, properties);
  } catch (err) {
    console.warn('[Analytics] Failed to identify user:', err);
  }
}

/**
 * Update person properties for the currently identified user.
 *
 * @param properties — Properties to set/update
 */
export async function setPersonProperties(properties: Record<string, any>) {
  try {
    const ph = await getPostHog();
    if (!ph) return;
    ph.setPersonProperties(properties);
  } catch (err) {
    console.warn('[Analytics] Failed to set person properties:', err);
  }
}

/**
 * Track a page view.
 *
 * @param page — Page name/path (e.g., '/home', '/health/triage')
 * @param properties — Additional page properties
 */
export async function trackPageView(page: string, properties?: Record<string, any>) {
  try {
    const ph = await getPostHog();
    if (!ph) return;
    ph.capture('$pageview', { $current_url: page, ...properties });
  } catch (err) {
    console.warn(`[Analytics] Failed to track page view "${page}":`, err);
  }
}

/**
 * Reset user identity (on logout).
 */
export async function resetAnalytics() {
  try {
    const ph = await getPostHog();
    if (!ph) return;
    ph.reset();
  } catch (err) {
    console.warn('[Analytics] Failed to reset:', err);
  }
}

/**
 * Opt user out of analytics tracking (GDPR/privacy compliance).
 */
export async function optOut() {
  try {
    const ph = await getPostHog();
    if (!ph) return;
    ph.opt_out_capturing();
  } catch (err) {
    console.warn('[Analytics] Failed to opt out:', err);
  }
}

/**
 * Opt user back into analytics tracking.
 */
export async function optIn() {
  try {
    const ph = await getPostHog();
    if (!ph) return;
    ph.opt_in_capturing();
  } catch (err) {
    console.warn('[Analytics] Failed to opt in:', err);
  }
}

/**
 * Check if analytics is currently active.
 */
export function isAnalyticsActive(): boolean {
  return !!POSTHOG_KEY && !POSTHOG_KEY.includes('your_');
}

// ─── Predefined Event Names ──────────────────────────────────────────────────

export const ANALYTICS_EVENTS = {
  // Auth
  USER_SIGNED_UP: 'user_signed_up',
  USER_SIGNED_IN: 'user_signed_in',
  USER_SIGNED_OUT: 'user_signed_out',

  // Health
  TRIAGE_STARTED: 'triage_started',
  TRIAGE_COMPLETED: 'triage_completed',
  CONSULTATION_BOOKED: 'consultation_booked',
  CONSULTATION_COMPLETED: 'consultation_completed',
  FACILITY_SEARCHED: 'facility_searched',
  DOCTOR_SEARCHED: 'doctor_searched',
  HEALTH_WALLET_OPENED: 'health_wallet_opened',
  MISAU_LINKED: 'misau_card_linked',
  VACCINATION_VIEWED: 'vaccination_viewed',
  PRESCRIPTION_VIEWED: 'prescription_viewed',

  // Payments
  PAYMENT_STARTED: 'payment_started',
  PAYMENT_COMPLETED: 'payment_completed',
  PAYMENT_FAILED: 'payment_failed',
  WALLET_TOPPED_UP: 'wallet_topped_up',

  // Blood
  BLOOD_DONOR_REGISTERED: 'blood_donor_registered',
  BLOOD_REQUEST_CREATED: 'blood_request_created',
  BLOOD_MATCH_FOUND: 'blood_match_found',

  // Insurance
  INSURANCE_SUBSCRIBED: 'insurance_subscribed',
  INSURANCE_CLAIM_FILED: 'insurance_claim_filed',

  // Navigation
  PAGE_VIEWED: '$pageview',
  FEATURE_USED: 'feature_used',
} as const;

export type AnalyticsEventName = typeof ANALYTICS_EVENTS[keyof typeof ANALYTICS_EVENTS];

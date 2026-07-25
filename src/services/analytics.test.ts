import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  trackEvent,
  identifyUser,
  setPersonProperties,
  trackPageView,
  resetAnalytics,
  optOut,
  optIn,
  isAnalyticsActive,
  ANALYTICS_EVENTS,
} from './analytics';

// Mock posthog-js module
const mockCapture = vi.fn();
const mockIdentify = vi.fn();
const mockSetPersonProperties = vi.fn();
const mockReset = vi.fn();
const mockOptOutCapturing = vi.fn();
const mockOptInCapturing = vi.fn();
const mockInit = vi.fn();

vi.mock('posthog-js', () => ({
  default: {
    init: mockInit,
    capture: mockCapture,
    identify: mockIdentify,
    setPersonProperties: mockSetPersonProperties,
    reset: mockReset,
    opt_out_capturing: mockOptOutCapturing,
    opt_in_capturing: mockOptInCapturing,
  },
}));

describe('ANALYTICS_EVENTS', () => {
  it('defines all expected event categories', () => {
    expect(ANALYTICS_EVENTS.USER_SIGNED_UP).toBe('user_signed_up');
    expect(ANALYTICS_EVENTS.TRIAGE_STARTED).toBe('triage_started');
    expect(ANALYTICS_EVENTS.CONSULTATION_BOOKED).toBe('consultation_booked');
    expect(ANALYTICS_EVENTS.PAYMENT_COMPLETED).toBe('payment_completed');
    expect(ANALYTICS_EVENTS.BLOOD_DONOR_REGISTERED).toBe('blood_donor_registered');
    expect(ANALYTICS_EVENTS.INSURANCE_SUBSCRIBED).toBe('insurance_subscribed');
    expect(ANALYTICS_EVENTS.PAGE_VIEWED).toBe('$pageview');
  });
});

describe('isAnalyticsActive', () => {
  it('returns false when VITE_POSTHOG_KEY is not set', () => {
    // In test env, import.meta.env.VITE_POSTHOG_KEY is undefined
    expect(isAnalyticsActive()).toBe(false);
  });
});

describe('Analytics functions (no-op when not configured)', () => {
  it('trackEvent does not throw when PostHog is not configured', async () => {
    await expect(trackEvent('test_event', { key: 'value' })).resolves.not.toThrow();
  });

  it('identifyUser does not throw when PostHog is not configured', async () => {
    await expect(identifyUser('user-123')).resolves.not.toThrow();
  });

  it('setPersonProperties does not throw when PostHog is not configured', async () => {
    await expect(setPersonProperties({ name: 'Test' })).resolves.not.toThrow();
  });

  it('trackPageView does not throw when PostHog is not configured', async () => {
    await expect(trackPageView('/home')).resolves.not.toThrow();
  });

  it('resetAnalytics does not throw when PostHog is not configured', async () => {
    await expect(resetAnalytics()).resolves.not.toThrow();
  });

  it('optOut does not throw when PostHog is not configured', async () => {
    await expect(optOut()).resolves.not.toThrow();
  });

  it('optIn does not throw when PostHog is not configured', async () => {
    await expect(optIn()).resolves.not.toThrow();
  });
});

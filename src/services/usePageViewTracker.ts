/**
 * usePageViewTracker — Automatically tracks page views on route changes.
 *
 * Wraps React Router's useLocation to send analytics events on every navigation.
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '@/services/analytics';

/**
 * Call this once in App.tsx (inside the Router) to track all page views.
 */
export function usePageViewTracker() {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname, {
      search: location.search,
      hash: location.hash,
    }).catch(() => {});
  }, [location.pathname, location.search, location.hash]);
}

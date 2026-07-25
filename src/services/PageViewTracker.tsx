/**
 * PageViewTracker — Renders usePageViewTracker inside BrowserRouter.
 *
 * Usage: Place <PageViewTracker /> inside <BrowserRouter> in App.tsx.
 */

import { usePageViewTracker } from './usePageViewTracker';

export function PageViewTracker() {
  usePageViewTracker();
  return null;
}

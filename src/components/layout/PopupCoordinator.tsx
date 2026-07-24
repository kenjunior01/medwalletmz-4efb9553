/**
 * PopupCoordinator — Global popup queue manager.
 * Ensures only ONE popup shows at a time on mobile to prevent overlap.
 * Priority order: Notification Permission > PWA Install > Smart Engagement
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type PopupId = 'notification' | 'pwa' | 'engagement' | 'onboarding';

interface PopupCoordinatorContext {
  /** Request to show a popup. Returns true if granted, false if another popup is active. */
  requestShow: (id: PopupId) => boolean;
  /** Release the slot when popup is dismissed/hidden. */
  release: (id: PopupId) => void;
  /** Currently active popup (or null). */
  activePopup: PopupId | null;
}

const Ctx = createContext<PopupCoordinatorContext>({
  requestShow: () => false,
  release: () => {},
  activePopup: null,
});

export const usePopupCoordinator = () => useContext(Ctx);

// Priority: lower number = higher priority
const PRIORITY: Record<PopupId, number> = {
  notification: 1,
  pwa: 2,
  engagement: 3,
  onboarding: 4,
};

export function PopupCoordinatorProvider({ children }: { children: ReactNode }) {
  const [activePopup, setActivePopup] = useState<PopupId | null>(null);

  const requestShow = useCallback((id: PopupId): boolean => {
    setActivePopup((current) => {
      if (current === null) {
        return id; // No active popup — grant
      }
      // If a lower-priority popup is active, preempt it
      if (PRIORITY[id] < PRIORITY[current]) {
        return id;
      }
      // Otherwise deny
      return current;
    });
    return true; // Always return true to allow the component to check activePopup
  }, []);

  const release = useCallback((id: PopupId) => {
    setActivePopup((current) => (current === id ? null : current));
  }, []);

  return (
    <Ctx.Provider value={{ requestShow, release, activePopup }}>
      {children}
    </Ctx.Provider>
  );
}

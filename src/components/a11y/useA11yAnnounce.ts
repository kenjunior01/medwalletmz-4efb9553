/**
 * useA11yAnnounce — React hook that proxies to the global
 * `window.a11yAnnounce()` installed by `A11yProvider`.
 *
 * Usage:
 * ```tsx
 * const { announce } = useA11yAnnounce();
 * announce('Province selected: Nampula');
 * ```
 */

type AnnouncePriority = 'polite' | 'assertive';

export function useA11yAnnounce() {
  const announce = (message: string, priority: AnnouncePriority = 'polite') => {
    if (typeof window !== 'undefined' && window.a11yAnnounce) {
      window.a11yAnnounce(message, priority);
    }
  };
  return { announce };
}

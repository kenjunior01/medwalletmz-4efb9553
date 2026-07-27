import { useEffect, useCallback, type ReactNode } from 'react';
import { useDataSaver } from '@/contexts/DataSaverContext';
import { useTranslation } from '@/contexts/CountryContext';

type AnnouncePriority = 'polite' | 'assertive';

declare global {
  interface Window {
    a11yAnnounce?: (message: string, priority?: AnnouncePriority) => void;
  }
}

interface A11yProviderProps {
  children: ReactNode;
}

/**
 * Comprehensive accessibility enhancement provider.
 *
 * Injects:
 *  1. A skip-to-content link (visible only on keyboard focus)
 *  2. An `a11yAnnounce()` function on `window` for live-region announcements
 *  3. Escape-key handling to close open modal dialogs
 *  4. Reduced-motion detection and `data-reduced-motion` attribute on `<html>`
 *
 * Respects the DataSaver context — when data-saver is on, particle / animation
 * side-effects are skipped.
 */
export function A11yProvider({ children }: A11yProviderProps) {
  const { enabled: dataSaverEnabled } = useDataSaver();
  const { t } = useTranslation();

  // 2. Announce dynamic content changes to screen readers
  const announce = useCallback((message: string, priority: AnnouncePriority = 'polite') => {
    const el = document.createElement('div');
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', priority);
    el.setAttribute('aria-atomic', 'true');
    el.className = 'sr-only';
    el.textContent = message;
    document.body.appendChild(el);
    // Delay removal so screen readers have time to read
    setTimeout(() => el.remove(), 1000);
  }, []);

  useEffect(() => {
    // 1. Skip link click handler
    const skipLink = document.getElementById('a11y-skip-link');
    const handleSkipClick = (e: Event) => {
      e.preventDefault();
      const main = document.getElementById('main-content');
      if (main) {
        main.focus();
        main.scrollIntoView({ behavior: 'smooth' });
      }
    };
    skipLink?.addEventListener('click', handleSkipClick);

    // 3. Handle reduced motion preference
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionQuery.matches) {
      document.documentElement.setAttribute('data-reduced-motion', 'true');
    }
    const handleMotionChange = (e: MediaQueryListEvent) => {
      document.documentElement.setAttribute(
        'data-reduced-motion',
        e.matches ? 'true' : 'false',
      );
    };
    motionQuery.addEventListener('change', handleMotionChange);

    // 4. Focus management for modals — close on Escape
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const openDialog = document.querySelector<HTMLElement>(
          '[role="dialog"][aria-modal="true"]',
        );
        if (openDialog) {
          const closeBtn = openDialog.querySelector<HTMLElement>(
            'button[aria-label="Close"], button[aria-label="Fechar"], button[aria-label="Cerrar"]',
          );
          closeBtn?.click();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Expose announce function globally
    window.a11yAnnounce = announce;

    return () => {
      skipLink?.removeEventListener('click', handleSkipClick);
      motionQuery.removeEventListener('change', handleMotionChange);
      window.removeEventListener('keydown', handleKeyDown);
      delete window.a11yAnnounce;
    };
  }, [announce, dataSaverEnabled]);

  const skipLabel = t('skip_to_content', { defaultValue: 'Saltar para o conteúdo' });

  return (
    <>
      {/* Skip to content link — visible only on keyboard focus */}
      <a
        id="a11y-skip-link"
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:text-sm focus:font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:shadow-md"
      >
        {skipLabel}
      </a>
      {children}
    </>
  );
}

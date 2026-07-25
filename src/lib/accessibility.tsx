import { useEffect, useCallback, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KeyboardNavOptions {
  containerRef: React.RefObject<HTMLElement | null>;
  selector?: string;
  orientation?: 'horizontal' | 'vertical' | 'both';
  wrap?: boolean;
  onSelect?: (index: number, element: HTMLElement) => void;
}

export interface AriaOptions {
  label?: string;
  describedBy?: string;
  expanded?: boolean;
  controls?: string;
  role?: string;
  live?: 'polite' | 'assertive' | 'off';
  busy?: boolean;
}

// ---------------------------------------------------------------------------
// 1. useKeyboardNav
// ---------------------------------------------------------------------------

const DEFAULT_SELECTOR =
  '[data-focusable], a, button, [tabindex]:not([tabindex="-1"])';

export function useKeyboardNav({
  containerRef,
  selector = DEFAULT_SELECTOR,
  orientation = 'vertical',
  wrap = true,
  onSelect,
}: KeyboardNavOptions): void {
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const getFocusableElements = useCallback(() => {
    const container = containerRef.current;
    if (!container) return [];
    return Array.from(
      container.querySelectorAll<HTMLElement>(selector),
    ).filter((el) => !el.hasAttribute('disabled') && !el.hidden);
  }, [containerRef, selector]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleKeyDown(e: KeyboardEvent) {
      const items = getFocusableElements();
      if (items.length === 0) return;

      const currentIndex = items.indexOf(
        document.activeElement as HTMLElement,
      );
      let nextIndex = -1;

      const isVertical =
        orientation === 'vertical' || orientation === 'both';
      const isHorizontal =
        orientation === 'horizontal' || orientation === 'both';

      switch (e.key) {
        case 'ArrowDown':
          if (isVertical) {
            e.preventDefault();
            nextIndex = wrap
              ? (currentIndex + 1) % items.length
              : Math.min(currentIndex + 1, items.length - 1);
          }
          break;
        case 'ArrowUp':
          if (isVertical) {
            e.preventDefault();
            nextIndex = wrap
              ? (currentIndex - 1 + items.length) % items.length
              : Math.max(currentIndex - 1, 0);
          }
          break;
        case 'ArrowRight':
          if (isHorizontal) {
            e.preventDefault();
            nextIndex = wrap
              ? (currentIndex + 1) % items.length
              : Math.min(currentIndex + 1, items.length - 1);
          }
          break;
        case 'ArrowLeft':
          if (isHorizontal) {
            e.preventDefault();
            nextIndex = wrap
              ? (currentIndex - 1 + items.length) % items.length
              : Math.max(currentIndex - 1, 0);
          }
          break;
        case 'Home':
          e.preventDefault();
          nextIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          nextIndex = items.length - 1;
          break;
        case 'Enter':
        case ' ': {
          e.preventDefault();
          const target = currentIndex >= 0 ? currentIndex : 0;
          items[target]?.focus();
          onSelectRef.current?.(target, items[target]);
          return;
        }
        default:
          return;
      }

      if (nextIndex >= 0 && nextIndex < items.length) {
        items[nextIndex].focus();
      }
    }

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [containerRef, getFocusableElements, orientation, wrap]);
}

// ---------------------------------------------------------------------------
// 2. announceToScreenReader
// ---------------------------------------------------------------------------

const LIVE_REGION_ID = 'medwallet-sr-announce';

export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite',
): void {
  let region = document.getElementById(LIVE_REGION_ID) as HTMLElement | null;

  if (!region) {
    region = document.createElement('div');
    region.id = LIVE_REGION_ID;
    region.setAttribute('aria-live', priority);
    region.setAttribute('aria-atomic', 'true');
    Object.assign(region.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      borderWidth: '0',
    });
    document.body.appendChild(region);
  }

  // Update aria-live priority if it changed
  region.setAttribute('aria-live', priority);

  // Clear then set — forces screen readers to re-announce even if the text is the same
  region.textContent = '';
  requestAnimationFrame(() => {
    region!.textContent = message;
  });

  // Auto-cleanup after 5 seconds
  setTimeout(() => {
    region?.remove();
  }, 5_000);
}

// ---------------------------------------------------------------------------
// 3. getAriaProps
// ---------------------------------------------------------------------------

export function getAriaProps(options: AriaOptions): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  if (options.label !== undefined) {
    props['aria-label'] = options.label;
  }
  if (options.describedBy !== undefined) {
    props['aria-describedby'] = options.describedBy;
  }
  if (options.expanded !== undefined) {
    props['aria-expanded'] = options.expanded;
  }
  if (options.controls !== undefined) {
    props['aria-controls'] = options.controls;
  }
  if (options.role !== undefined) {
    props.role = options.role;
  }
  if (options.live !== undefined) {
    props['aria-live'] = options.live;
  }
  if (options.busy !== undefined) {
    props['aria-busy'] = options.busy;
  }

  return props;
}

// ---------------------------------------------------------------------------
// 4. VisuallyHidden
// ---------------------------------------------------------------------------

export function VisuallyHidden({
  children,
  as: Tag = 'span',
}: {
  children: React.ReactNode;
  as?: React.ElementType;
}) {
  return <Tag className="sr-only">{children}</Tag>;
}

// ---------------------------------------------------------------------------
// 5. FocusTrap
// ---------------------------------------------------------------------------

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function FocusTrap({
  children,
  restoreFocus = true,
}: {
  children: React.ReactNode;
  /** Return focus to the previously focused element on unmount. Default true. */
  restoreFocus?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Capture the element that had focus before the trap activated
    previouslyFocusedRef.current = document.activeElement as HTMLElement;

    // Focus the first focusable element inside the container
    const firstFocusable = container.querySelector<HTMLElement>(
      FOCUSABLE_SELECTOR,
    );
    firstFocusable?.focus();

    function getFocusableElements(): HTMLElement[] {
      return Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;

      const items = getFocusableElements();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: if focus is on the first item, wrap to last
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab: if focus is on the last item, wrap to first
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      if (restoreFocus && previouslyFocusedRef.current) {
        previouslyFocusedRef.current.focus();
      }
    };
  }, [restoreFocus]);

  return <div ref={containerRef}>{children}</div>;
}

// ---------------------------------------------------------------------------
// 6. useReducedMotion
// ---------------------------------------------------------------------------

export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');

    function handleChange(e: MediaQueryListEvent) {
      setPrefersReducedMotion(e.matches);
    }

    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

/**
 * PageTransition — lightweight CSS-only page transition.
 * Replaces framer-motion AnimatePresence for route changes.
 * Uses CSS `@starting-style` + `transition-behavior: allow-discrete`
 * for enter/exit without any JS animation library.
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Trigger reflow for the enter animation on route change
    const el = containerRef.current;
    if (!el) return;
    el.classList.remove('page-enter-active');
    // Force reflow
    void el.offsetWidth;
    el.classList.add('page-enter-active');
  }, [location.pathname]);

  return (
    <div
      ref={containerRef}
      className="page-enter page-enter-active"
      style={{ minHeight: '100%' }}
    >
      {children}
    </div>
  );
}

/**
 * PageTransition — lightweight CSS-only page transition.
 * Uses a key-based approach: when pathname changes, React unmounts/remounts
 * the wrapper div, triggering the CSS animation fresh — NO forced reflow.
 */
import { useLocation } from 'react-router-dom';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div
      key={location.pathname}
      className="page-enter-active"
      style={{ minHeight: '100%' }}
    >
      {children}
    </div>
  );
}

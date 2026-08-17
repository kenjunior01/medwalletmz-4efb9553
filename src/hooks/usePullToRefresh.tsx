import { useState, useCallback, useRef, useEffect } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  disabled?: boolean;
}

interface PullToRefreshReturn {
  ref: React.RefObject<HTMLDivElement | null>;
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
  refresh: () => void;
}

/**
 * usePullToRefresh — native-feeling pull-to-refresh for mobile.
 *
 * Works inside App Shell where the scroll container is the parent <main>,
 * not the PullToRefresh div itself. Finds the nearest scrollable ancestor.
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  disabled = false,
}: PullToRefreshOptions): PullToRefreshReturn {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const currentY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    isRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  const refresh = useCallback(async () => {
    if (isRefreshingRef.current) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
    }
  }, [onRefresh]);

  /** Find the nearest scrollable ancestor element */
  const findScrollParent = useCallback((el: HTMLElement | null): HTMLElement | null => {
    let node = el?.parentElement;
    while (node) {
      const style = getComputedStyle(node);
      const overflow = style.overflowY;
      if ((overflow === 'auto' || overflow === 'scroll') && node.scrollHeight > node.clientHeight) {
        return node;
      }
      node = node.parentElement;
    }
    return null;
  }, []);

  useEffect(() => {
    if (disabled) return;

    const el = containerRef.current;
    if (!el) return;
    const scrollParent = findScrollParent(el);

    const onTouchStart = (e: TouchEvent) => {
      if (isRefreshingRef.current) return;
      // Only trigger when the scroll parent is at the top
      const scrollTop = scrollParent ? scrollParent.scrollTop : el.scrollTop;
      if (scrollTop <= 0) {
        startY.current = e.touches[0].clientY;
        currentY.current = 0;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startY.current === 0 || isRefreshingRef.current) return;

      const diff = e.touches[0].clientY - startY.current;
      if (diff <= 0) return;

      // Dampen the pull — feels more native
      currentY.current = diff * 0.4;
      const distance = Math.min(currentY.current, threshold * 1.5);
      setPullDistance(distance);
      setIsPulling(distance > 10);

      // If at threshold, show overscroll feedback
      if (distance >= threshold) {
        el.style.transform = `translateY(${threshold * 0.3}px)`;
      }
    };

    const onTouchEnd = () => {
      if (currentY.current === 0) return;

      const distance = Math.min(currentY.current, threshold * 1.5);
      el.style.transform = '';

      if (distance >= threshold) {
        refresh();
      } else {
        setPullDistance(0);
        setIsPulling(false);
      }

      startY.current = 0;
      currentY.current = 0;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.style.transform = '';
    };
  }, [disabled, threshold, refresh, findScrollParent]);

  return { ref: containerRef, isPulling, isRefreshing, pullDistance, refresh };
}

/** Minimal pull indicator — shows a spinner when pulled past threshold */
export function PullIndicator({ distance, threshold = 80 }: { distance: number; threshold?: number }) {
  const progress = Math.min(distance / threshold, 1);
  const isReady = progress >= 1;

  return (
    <div
      className="flex justify-center py-2 transition-opacity duration-150"
      style={{ opacity: Math.min(distance / 30, 1) }}
    >
      <div
        className="h-6 w-6 rounded-full border-2 border-primary/30 flex items-center justify-center transition-all duration-150"
        style={{
          transform: isReady ? `rotate(${progress * 360}deg)` : `rotate(${progress * 180}deg)`,
          borderTopColor: isReady ? 'hsl(var(--primary))' : 'transparent',
        }}
      >
        {isReady && (
          <div className="h-2 w-2 rounded-full bg-primary" />
        )}
      </div>
    </div>
  );
}

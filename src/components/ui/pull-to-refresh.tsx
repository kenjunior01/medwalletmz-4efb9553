/**
 * PullToRefresh — wraps page content with native-feeling pull-to-refresh.
 *
 * Usage:
 *   <PullToRefresh onRefresh={refetch}>
 *     <YourPageContent />
 *   </PullToRefresh>
 */
import { type ReactNode } from 'react';
import { usePullToRefresh, PullIndicator } from '@/hooks/usePullToRefresh';

interface Props {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  threshold?: number;
  disabled?: boolean;
}

export function PullToRefresh({ children, onRefresh, threshold, disabled }: Props) {
  const { ref, isPulling, isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh,
    threshold,
    disabled,
  });

  return (
    <div ref={ref} className="min-h-full">
      {(isPulling || isRefreshing) && (
        <PullIndicator distance={pullDistance} threshold={threshold} />
      )}
      {isRefreshing ? (
        <div className="flex items-center justify-center py-8 gap-2">
          <div className="h-5 w-5 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <span className="text-xs text-muted-foreground">A atualizar...</span>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

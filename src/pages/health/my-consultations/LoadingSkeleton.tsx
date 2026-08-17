import { Skeleton } from '@/components/ui/skeleton';
import { ShimmerCard } from '@/components/ui/premium';

type TranslateFn = (key: string, params?: Record<string, string>) => string;

interface LoadingSkeletonProps {
  t: TranslateFn;
}

export function LoadingSkeleton({ t }: LoadingSkeletonProps) {
  return (
    <div className="min-h-screen bg-background" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{t('myConsultations.loading')}</span>
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4 flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-5 w-32 rounded mb-1" />
          <Skeleton className="h-3 w-48 rounded" />
        </div>
        <Skeleton className="h-9 w-20 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </header>
      <div className="p-4 space-y-3">
        <ShimmerCard className="h-12" lines={1} />
        <div className="flex gap-2" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-28 rounded-full" />
          ))}
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

import { Skeleton } from '@/components/ui/skeleton';

/**
 * Full-page skeleton loader for a smooth loading experience.
 * Mimics the layout of the home page to prevent layout shift.
 */
export function SkeletonPage() {
  return (
    <div className="space-y-6 p-4 max-w-lg mx-auto">
      {/* Hero skeleton */}
      <div className="space-y-3 pt-4">
        <Skeleton className="h-8 w-3/4 rounded-lg" />
        <Skeleton className="h-4 w-1/2 rounded-lg" />
        <div className="flex gap-3 pt-2">
          <Skeleton className="h-10 w-32 rounded-full" />
          <Skeleton className="h-10 w-24 rounded-full" />
        </div>
      </div>

      {/* Search bar skeleton */}
      <Skeleton className="h-12 w-full rounded-xl" />

      {/* Stats row skeleton */}
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>

      {/* Feature cards skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-40 rounded-lg" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </div>

      {/* Recent activity skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-48 rounded-lg" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

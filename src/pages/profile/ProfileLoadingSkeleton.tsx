import { Skeleton } from "@/components/ui/skeleton";
import { useCountry } from "@/contexts/CountryContext";

export function ProfileLoadingSkeleton() {
  const { t } = useCountry();

  return (
    <div
      className="flex flex-col gap-6 p-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={t("profile.loading")}
    >
      <span className="sr-only">{t("profile.loading")}</span>
      <div className="flex items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-11 w-11 rounded-md" />
      </div>

      {/* Trust badges skeleton */}
      <div className="flex gap-2" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-6 w-28 rounded-full" />
        ))}
      </div>

      {/* Completion bar skeleton */}
      <Skeleton className="h-20 rounded-xl" />

      {/* Tabs skeleton */}
      <Skeleton className="h-10 w-full rounded-md" />

      {/* Stats skeleton */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      {/* Quick actions skeleton */}
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

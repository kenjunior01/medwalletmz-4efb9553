import { AlertCircle, RefreshCw } from '@/components/icons/lucide-compat';
import { Button } from '@/components/ui/button';
import { useCountry } from '@/contexts/CountryContext';

interface ProfileErrorStateProps {
  onRetry: () => void;
}

export function ProfileErrorState({ onRetry }: ProfileErrorStateProps) {
  const { t } = useCountry();

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center text-center py-16 px-4"
    >
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <AlertCircle className="h-8 w-8 text-red-500" aria-hidden="true" />
      </div>
      <h2 className="text-lg font-bold text-foreground">{t("profile.error_title")}</h2>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm">{t("profile.error_desc")}</p>
      <Button
        onClick={onRetry}
        className="mt-5 min-h-[44px] gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-label={t("profile.retry")}
      >
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        {t("profile.retry")}
      </Button>
    </div>
  );
}
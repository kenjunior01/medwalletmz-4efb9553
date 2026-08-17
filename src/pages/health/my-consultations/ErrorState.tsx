import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, ArrowLeft } from '@/components/icons/lucide-compat';

type TranslateFn = (key: string, params?: Record<string, string>) => string;

interface ErrorStateProps {
  t: TranslateFn;
  onRetry: () => void;
  onBack: () => void;
}

export function ErrorState({ t, onRetry, onBack }: ErrorStateProps) {
  return (
    <div className="min-h-screen bg-background" role="alert">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          aria-label={t('common.back')}
          className="min-h-[44px] min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Button>
        <h1 className="font-bold flex-1">{t('home.my_consultations')}</h1>
      </header>
      <div className="flex flex-col items-center justify-center text-center py-16 px-4">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <AlertCircle className="h-8 w-8 text-red-500" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-bold text-foreground">{t('myConsultations.error_title')}</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm">
          {t('myConsultations.error_desc')}
        </p>
        <Button
          onClick={onRetry}
          className="mt-5 min-h-[44px] gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label={t('myConsultations.retry')}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {t('myConsultations.retry')}
        </Button>
      </div>
    </div>
  );
}

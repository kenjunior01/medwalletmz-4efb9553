import { Button } from '@/components/ui/button';
import { ArrowLeft, CalendarDays, List, FileText } from '@/components/icons/lucide-compat';
import { cn } from '@/lib/utils';
import type { ViewMode } from './types';

type TranslateFn = (key: string, params?: Record<string, string>) => string;

interface PageHeaderProps {
  t: TranslateFn;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onBack: () => void;
  onPrescriptions: () => void;
}

export function PageHeader({
  t,
  viewMode,
  onViewModeChange,
  onBack,
  onPrescriptions,
}: PageHeaderProps) {
  return (
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

      <div className="flex-1 min-w-0">
        <h1 className="font-bold text-lg truncate">{t('home.my_consultations')}</h1>
        <p className="text-xs text-muted-foreground truncate">{t('myConsultations.subtitle')}</p>
      </div>

      {/* View toggle (segmented control) */}
      <div
        role="group"
        aria-label={t('myConsultations.view_toggle_label')}
        className="flex items-center rounded-lg bg-muted p-0.5"
      >
        <button
          type="button"
          onClick={() => onViewModeChange('calendar')}
          aria-pressed={viewMode === 'calendar'}
          aria-label={t('myConsultations.calendar_view')}
          className={cn(
            'min-h-[44px] min-w-[44px] p-2 rounded-md transition-all flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            viewMode === 'calendar'
              ? 'bg-card shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange('list')}
          aria-pressed={viewMode === 'list'}
          aria-label={t('myConsultations.list_view')}
          className={cn(
            'min-h-[44px] min-w-[44px] p-2 rounded-md transition-all flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            viewMode === 'list'
              ? 'bg-card shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <List className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onPrescriptions}
        className="min-h-[44px] gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-label={t('myConsultations.recipes')}
      >
        <FileText className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">{t('myConsultations.recipes')}</span>
      </Button>
    </header>
  );
}

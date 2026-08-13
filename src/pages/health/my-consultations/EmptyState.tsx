import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Stethoscope, CalendarCheck, Ban, Filter, X } from '@/components/icons/lucide-compat';
import type { TabKey } from './types';

type TranslateFn = (key: string, params?: Record<string, string>) => string;

interface EmptyStateProps {
  t: TranslateFn;
  activeTab: TabKey;
  totalInTab: number;
  onBookDoctor: () => void;
  onClearFilters: () => void;
}

const EMPTY_CONFIG: Record<
  TabKey,
  { titleKey: string; descKey: string; ctaKey?: string; icon: typeof Stethoscope }
> = {
  upcoming: {
    titleKey: 'myConsultations.empty_upcoming_title',
    descKey: 'myConsultations.empty_upcoming_desc',
    ctaKey: 'myConsultations.empty_upcoming_cta',
    icon: Stethoscope,
  },
  past: {
    titleKey: 'myConsultations.empty_past_title',
    descKey: 'myConsultations.empty_past_desc',
    icon: CalendarCheck,
  },
  cancelled: {
    titleKey: 'myConsultations.empty_cancelled_title',
    descKey: 'myConsultations.empty_cancelled_desc',
    icon: Ban,
  },
};

export function EmptyState({ t, activeTab, totalInTab, onBookDoctor, onClearFilters }: EmptyStateProps) {
  return (
    <motion.div
      key="empty"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      role="status"
      className="flex flex-col items-center justify-center text-center py-12 px-4"
    >
      {totalInTab === 0 ? (
        // Tab is fully empty — show tab-specific empty state
        (() => {
          const cfg = EMPTY_CONFIG[activeTab];
          const Icon = cfg.icon;
          return (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4"
              >
                <Icon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
              </motion.div>
              <h3 className="text-lg font-bold text-foreground">
                {t(cfg.titleKey)}
              </h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                {t(cfg.descKey)}
              </p>
              {cfg.ctaKey && (
                <Button
                  onClick={onBookDoctor}
                  className="mt-5 min-h-[44px] gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <Stethoscope className="h-4 w-4" aria-hidden="true" />
                  {t(cfg.ctaKey)}
                </Button>
              )}
            </>
          );
        })()
      ) : (
        // Tab has items but filters narrowed to 0 — show filter empty state
        <>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
            className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4"
          >
            <Filter className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          </motion.div>
          <h3 className="text-lg font-bold text-foreground">
            {t('myConsultations.empty_filter_title')}
          </h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm">
            {t('myConsultations.empty_filter_desc')}
          </p>
          <Button
            onClick={onClearFilters}
            variant="outline"
            className="mt-5 min-h-[44px] gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            {t('myConsultations.clear_filters')}
          </Button>
        </>
      )}
    </motion.div>
  );
}

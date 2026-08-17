import { cn } from '@/lib/utils';
import { TAB_KEYS } from './types';
import type { TabKey } from './types';

type TranslateFn = (key: string, params?: Record<string, string>) => string;

interface TabBarProps {
  t: TranslateFn;
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  counts: Record<TabKey, number>;
}

export function TabBar({ t, activeTab, onTabChange, counts }: TabBarProps) {
  return (
    <div
      role="tablist"
      aria-label={t('myConsultations.tablist_label')}
      className="flex gap-1 p-1 bg-muted rounded-lg overflow-x-auto"
    >
      {TAB_KEYS.map((key) => {
        const isActive = activeTab === key;
        const label = t(`myConsultations.tab_${key}`);
        const count = counts[key];
        const tabId = `tab-${key}`;
        const panelId = `panel-${key}`;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            id={tabId}
            aria-selected={isActive}
            aria-controls={panelId}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onTabChange(key)}
            className={cn(
              'flex-1 min-h-[44px] px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              isActive
                ? 'bg-card shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <span>{label}</span>
            <span
              className={cn(
                'text-xs px-1.5 py-0.5 rounded-full',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted-foreground/10 text-muted-foreground',
              )}
              aria-hidden="true"
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

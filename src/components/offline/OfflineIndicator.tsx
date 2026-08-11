// =============================================================================
// OfflineIndicator — Fixed position bar showing offline / syncing / synced state
// =============================================================================
// Uses CSS transitions instead of framer-motion for lighter bundle.
// =============================================================================

import { WifiOff, RefreshCw, Cloud, CloudOff } from "@/components/icons/lucide-compat";
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/contexts/CountryContext';
import { useOfflineMode } from '@/hooks/useOfflineMode';
import { toast } from 'sonner';

export function OfflineIndicator() {
  const { t } = useTranslation();
  const {
    isOnline,
    queueSize,
    isSyncing,
    syncNow,
  } = useOfflineMode();

  const showOfflineBar = !isOnline;
  const showQueueBadge = isOnline && queueSize > 0 && !isSyncing;
  const showSyncing = isSyncing;

  const handleSyncNow = async () => {
    const result = await syncNow();
    if (result.success > 0) {
      toast.success(t('offline.sync_complete'), {
        description: t('offline.cached_profiles'),
      });
    } else if (result.failed > 0) {
      toast.error(t('offline.sync_failed'));
    }
  };

  return (
    <>
      {/* Offline Bar */}
      <div
        className="fixed top-0 inset-x-0 z-[70] flex items-center justify-between px-3 py-2 gap-2 shadow-md transition-all duration-300 ease-out"
        style={{
          backgroundColor: '#92400e',
          opacity: showOfflineBar ? 1 : 0,
          transform: showOfflineBar ? 'translateY(0)' : 'translateY(-40px)',
          pointerEvents: showOfflineBar ? 'auto' : 'none',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <WifiOff className="h-4 w-4 text-amber-100 shrink-0" />
          <span className="text-xs font-semibold text-amber-100 truncate">
            {t('offline.offline_message')}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {queueSize > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-200 bg-amber-900/50 rounded-full px-2 py-0.5">
              <CloudOff className="h-3 w-3" />
              {queueSize}
            </span>
          )}
        </div>
      </div>

      {/* Syncing Bar */}
      <div
        className="fixed top-0 inset-x-0 z-[70] flex items-center justify-between px-3 py-2 gap-2 shadow-md transition-all duration-300 ease-out"
        style={{
          backgroundColor: '#1e40af',
          opacity: showSyncing ? 1 : 0,
          transform: showSyncing ? 'translateY(0)' : 'translateY(-40px)',
          pointerEvents: showSyncing ? 'auto' : 'none',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className={isSyncing ? 'animate-spin' : ''}>
            <RefreshCw className="h-4 w-4 text-blue-100 shrink-0" />
          </div>
          <span className="text-xs font-semibold text-blue-100 truncate">
            {t('offline.syncing')}
          </span>
        </div>
      </div>

      {/* Queue Badge (floating, top-right) */}
      <div
        className="fixed top-2 right-2 z-[70] flex items-center gap-1.5 shadow-lg rounded-full px-3 py-1.5 transition-all duration-300 ease-out"
        style={{
          backgroundColor: '#92400e',
          opacity: showQueueBadge ? 1 : 0,
          transform: showQueueBadge ? 'translateY(0) scale(1)' : 'translateY(-10px) scale(0.8)',
          pointerEvents: showQueueBadge ? 'auto' : 'none',
        }}
      >
        <Cloud className="h-3.5 w-3.5 text-amber-100" />
        <span className="text-xs font-bold text-amber-100">
          {t('offline.items_waiting_sync', { count: String(queueSize) })}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleSyncNow}
          className="h-6 px-2 text-[10px] font-bold text-amber-100 hover:text-white hover:bg-amber-700 rounded-full"
        >
          {t('offline.sync_now')}
        </Button>
      </div>
    </>
  );
}

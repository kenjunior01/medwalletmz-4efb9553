// =============================================================================
// OfflineIndicator — Fixed position bar showing offline / syncing / synced state
// =============================================================================
// Renders at the top of the viewport:
//   - Yellow/amber bar when offline: "You're offline — data will sync when connected"
//   - Queue badge when pending items: "3 items waiting to sync"
//   - Blue syncing animation with spinning icon
//   - Green checkmark when fully synced (transient)
//   - "Sync Now" button to manually trigger sync
//
// Uses i18n keys from the `offline` translation section.
// Uses framer-motion for entrance/exit animations.
// =============================================================================

import { AnimatePresence, motion } from 'framer-motion';
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

  // Determine what to show
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
    <AnimatePresence mode="wait">
      {/* ── Offline Bar ────────────────────────────────────────────────── */}
      {showOfflineBar && (
        <motion.div
          key="offline-bar"
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          className="fixed top-0 inset-x-0 z-[70] flex items-center justify-between px-3 py-2 gap-2 shadow-md"
          style={{ backgroundColor: '#92400e' /* amber-800 */ }}
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
        </motion.div>
      )}

      {/* ── Syncing Bar ────────────────────────────────────────────────── */}
      {showSyncing && (
        <motion.div
          key="syncing-bar"
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          className="fixed top-0 inset-x-0 z-[70] flex items-center justify-between px-3 py-2 gap-2 shadow-md"
          style={{ backgroundColor: '#1e40af' /* blue-800 */ }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            >
              <RefreshCw className="h-4 w-4 text-blue-100 shrink-0" />
            </motion.div>
            <span className="text-xs font-semibold text-blue-100 truncate">
              {t('offline.syncing')}
            </span>
          </div>
        </motion.div>
      )}

      {/* ── Queue Badge (floating, top-right) ──────────────────────────── */}
      {showQueueBadge && (
        <motion.div
          key="queue-badge"
          initial={{ opacity: 0, scale: 0.8, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -10 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="fixed top-2 right-2 z-[70] flex items-center gap-1.5 shadow-lg rounded-full px-3 py-1.5"
          style={{ backgroundColor: '#92400e' /* amber-800 */ }}
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}

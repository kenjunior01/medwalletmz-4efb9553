// =============================================================================
// OfflineBanner — Prominent banner shown when user goes offline
// =============================================================================
// Shows:
//   - Cached data summary: "Profile cached, 3 prescriptions available offline"
//   - Reassuring message that data is safe
//   - Auto-hides after a few seconds (can be re-shown via OfflineIndicator)
//
// Uses i18n keys from the `offline` translation section.
// Uses framer-motion for entrance/exit animations.
// =============================================================================

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CloudOff, ShieldCheck, X, FileText, Wallet } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useTranslation } from '@/contexts/CountryContext';
import { useOfflineMode } from '@/hooks/useOfflineMode';
import { offlineManager } from '@/services/offline/OfflineManager';

const AUTO_HIDE_MS = 5000;

export function OfflineBanner() {
  const { t } = useTranslation();
  const { isOnline, getCachedProfile, getCachedPrescriptions, getCachedWalletBalance } =
    useOfflineMode();

  const [visible, setVisible] = useState(false);
  const [cachedPrescriptionCount, setCachedPrescriptionCount] = useState(0);
  const [hasProfile, setHasProfile] = useState(false);
  const [hasWallet, setHasWallet] = useState(false);

  // Show banner when going offline, hide when online
  useEffect(() => {
    if (!isOnline) {
      // Read cached data state
      const profile = getCachedProfile();
      const prescriptions = getCachedPrescriptions();
      const wallet = getCachedWalletBalance();

      setHasProfile(!!profile);
      setCachedPrescriptionCount(prescriptions?.length ?? 0);
      setHasWallet(wallet !== null);

      setVisible(true);

      // Auto-hide after timeout
      const timer = setTimeout(() => {
        setVisible(false);
      }, AUTO_HIDE_MS);

      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [isOnline, getCachedProfile, getCachedPrescriptions, getCachedWalletBalance]);

  const dismiss = () => setVisible(false);

  const handleClearCache = async () => {
    await offlineManager.clearCache();
    dismiss();
  };

  // Build cached data summary parts
  const summaryParts: string[] = [];
  if (hasProfile) summaryParts.push('1');
  if (cachedPrescriptionCount > 0) summaryParts.push(String(cachedPrescriptionCount));

  return (
    <AnimatePresence>
      {visible && !isOnline && (
        <motion.div
          key="offline-banner"
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed inset-x-0 top-0 z-[65] p-2 pt-12 pointer-events-none"
        >
          <Card
            className="pointer-events-auto rounded-xl border-0 shadow-xl p-4 max-w-md mx-auto"
            style={{ backgroundColor: '#78350f' /* amber-900 */ }}
          >
            {/* Dismiss button */}
            <button
              onClick={dismiss}
              aria-label="Close"
              className="absolute right-3 top-3 rounded-full p-1 bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="h-3.5 w-3.5 text-amber-200" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-2.5 mb-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15">
                <CloudOff className="h-4.5 w-4.5 text-amber-200" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-100">
                  {t('offline.mode_active')}
                </h3>
                <p className="text-xs text-amber-200/70">
                  {t('offline.offline_message')}
                </p>
              </div>
            </div>

            {/* Cached data summary chips */}
            {summaryParts.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {hasProfile && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-100 bg-white/10 rounded-full px-2.5 py-1">
                    <ShieldCheck className="h-3 w-3" />
                    {t('offline.profile_cached')}
                  </span>
                )}
                {cachedPrescriptionCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-100 bg-white/10 rounded-full px-2.5 py-1">
                    <FileText className="h-3 w-3" />
                    {t('offline.prescriptions_available', {
                      count: String(cachedPrescriptionCount),
                    })}
                  </span>
                )}
                {hasWallet && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-100 bg-white/10 rounded-full px-2.5 py-1">
                    <Wallet className="h-3 w-3" />
                    {t('offline.wallet_cached')}
                  </span>
                )}
              </div>
            )}

            {/* Reassuring message */}
            {summaryParts.length > 0 ? (
              <p className="text-[11px] text-amber-200/60 flex items-center gap-1.5">
                <ShieldCheck className="h-3 w-3" />
                {t('offline.data_safe')}
              </p>
            ) : (
              <p className="text-[11px] text-amber-200/60">
                {t('offline.no_connection')}
              </p>
            )}

            {/* Clear cache action */}
            <div className="mt-3 pt-2 border-t border-white/10">
              <button
                onClick={handleClearCache}
                className="text-[10px] font-medium text-amber-300/60 hover:text-amber-200 transition-colors"
              >
                {t('offline.clear_cache')}
              </button>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
